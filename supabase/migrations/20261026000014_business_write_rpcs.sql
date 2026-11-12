-- Upgrade-safe additive schema for stores that already applied the original 0006 migration.
alter table public.purchase_orders add column if not exists idempotency_key text;
alter table public.purchase_orders add column if not exists request_hash text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.purchase_orders'::regclass and conname='purchase_orders_idempotency_key_check') then
    alter table public.purchase_orders add constraint purchase_orders_idempotency_key_check check (idempotency_key is null or char_length(idempotency_key) between 8 and 100);
  end if;
end $$;
create unique index if not exists purchase_orders_store_idempotency_uidx on public.purchase_orders(store_id,idempotency_key);

-- 0014 — Transactional write APIs for ledgers, inventory and purchasing.
-- Every entry point validates store membership/role and keeps cached balances,
-- append-only ledgers and stock movements in one PostgreSQL transaction.

create or replace function public.adjust_stock(
  p_store_id uuid, p_product_id uuid, p_quantity_change integer, p_reason text
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_stock integer;
begin
  if auth.uid() is null or not public.has_store_role(p_store_id, array['owner','manager']) then
    raise exception 'owner or manager access required' using errcode='42501';
  end if;
  if p_quantity_change is null or p_quantity_change = 0 or abs(p_quantity_change::bigint) > 1000000
     or length(coalesce(p_reason,'')) > 300 then
    raise exception 'invalid stock adjustment' using errcode='22023';
  end if;
  update public.products set stock_quantity=stock_quantity+p_quantity_change
   where store_id=p_store_id and id=p_product_id and is_active
     and stock_quantity+p_quantity_change >= 0
   returning stock_quantity into v_stock;
  if not found then raise exception 'product missing or insufficient stock' using errcode='23514'; end if;
  insert into public.stock_movements(store_id,product_id,movement_type,quantity_change,quantity_after,reason,created_by)
  values(p_store_id,p_product_id,case when p_quantity_change>0 then 'adjustment_add' else 'adjustment_remove' end,
    p_quantity_change,v_stock,nullif(btrim(p_reason),''),auth.uid());
  return v_stock;
end; $$;

create or replace function public.set_stock_quantity(
 p_store_id uuid,p_product_id uuid,p_quantity integer,p_reason text
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_old integer; v_delta integer;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<0 or p_quantity>2147483647 or length(coalesce(p_reason,''))>300 then raise exception 'invalid stock quantity' using errcode='22023'; end if;
 select stock_quantity into v_old from public.products where store_id=p_store_id and id=p_product_id and is_active for update;
 if not found then raise exception 'product not found' using errcode='P0002'; end if;
 v_delta:=p_quantity-v_old;
 if v_delta=0 then return v_old; end if;
 update public.products set stock_quantity=p_quantity where store_id=p_store_id and id=p_product_id;
 insert into public.stock_movements(store_id,product_id,movement_type,quantity_change,quantity_after,reason,created_by)
 values(p_store_id,p_product_id,case when v_delta>0 then 'adjustment_add' else 'adjustment_remove' end,v_delta,p_quantity,nullif(btrim(p_reason),''),auth.uid());
 return p_quantity;
end; $$;
create or replace function public.record_customer_payment(
 p_store_id uuid,p_customer_id uuid,p_amount bigint,p_method text,p_note text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_balance bigint; v_key text:=btrim(coalesce(p_idempotency_key,'')); v_prior public.customer_payments%rowtype;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or length(v_key) not between 8 and 100 or length(coalesce(p_note,''))>300 then raise exception 'invalid payment' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':cp:'||v_key,0));
 select * into v_prior from public.customer_payments where store_id=p_store_id and idempotency_key=v_key;
 if found then
  if v_prior.customer_id<>p_customer_id or v_prior.amount<>p_amount or v_prior.method<>coalesce(nullif(p_method,''),'cash') or v_prior.note is distinct from nullif(btrim(p_note),'') then raise exception 'idempotency key already used with different payment data' using errcode='22023'; end if;
  return v_prior.id;
 end if;
 update public.customers set khata_balance=khata_balance-p_amount where store_id=p_store_id and id=p_customer_id and khata_balance>=p_amount returning khata_balance into v_balance;
 if not found then raise exception 'customer missing or payment exceeds balance' using errcode='23514'; end if;
 insert into public.customer_payments(store_id,customer_id,amount,method,note,idempotency_key,created_by)
 values(p_store_id,p_customer_id,p_amount,coalesce(nullif(p_method,''),'cash'),nullif(btrim(p_note),''),v_key,auth.uid()) returning id into v_id;
 insert into public.khata_entries(store_id,customer_id,entry_type,amount_change,balance_after,payment_id,note,created_by)
 values(p_store_id,p_customer_id,'payment',-p_amount,v_balance,v_id,nullif(btrim(p_note),''),auth.uid());
 return v_id;
end; $$;

create or replace function public.create_purchase_order(
 p_store_id uuid,p_supplier_id uuid,p_order_date date,p_note text,p_items jsonb,p_idempotency_key text
) returns table(po_id uuid,po_number bigint,total bigint)
language plpgsql security definer set search_path = '' as $$
declare v_key text:=btrim(coalesce(p_idempotency_key,'')); v_po uuid; v_num bigint; v_total bigint:=0; v_item jsonb; v_product uuid; v_desc text; v_qty integer; v_cost bigint; v_old_total bigint; v_old_count integer; v_supplier uuid; v_hash text; v_existing_hash text;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid purchase order items' using errcode='22023'; end if;
 if length(v_key) not between 8 and 100 or length(coalesce(p_note,''))>500 or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>200 then raise exception 'invalid purchase order' using errcode='22023'; end if;
 if not exists(select 1 from public.suppliers where store_id=p_store_id and id=p_supplier_id and is_active) then raise exception 'supplier not found' using errcode='23503'; end if;
 -- Canonicalize item JSON by supported fields/order-independent object keys; reject unknown fields.
 for v_item in select value from jsonb_array_elements(p_items) loop
  if (v_item - array['product_id','description','quantity','unit_cost']) <> '{}'::jsonb then raise exception 'unknown purchase order line field' using errcode='22023'; end if;
  v_product:=nullif(v_item->>'product_id','')::uuid; v_desc:=btrim(coalesce(v_item->>'description','')); v_qty:=nullif(v_item->>'quantity','')::integer; v_cost:=nullif(v_item->>'unit_cost','')::bigint;
  if length(v_desc) not between 1 and 160 or v_qty is null or v_qty<=0 or v_cost is null or v_cost<0 or (v_product is not null and not exists(select 1 from public.products where store_id=p_store_id and id=v_product and is_active)) then raise exception 'invalid purchase order line' using errcode='22023'; end if;
 end loop;
 v_hash:=jsonb_build_object('supplier',p_supplier_id,'order_date',coalesce(p_order_date,current_date),'note',nullif(btrim(p_note),''),'items',p_items)::text;
 perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':po:'||v_key,0));
 select po.id,po.po_number,po.total,po.supplier_id,po.request_hash into v_po,v_num,v_total,v_supplier,v_existing_hash from public.purchase_orders po where po.store_id=p_store_id and po.idempotency_key=v_key;
 if found then
  if v_existing_hash is distinct from v_hash then raise exception 'idempotency key reused with different order data' using errcode='22023'; end if;
  return query select v_po,v_num,v_total; return;
 end if;
 -- SELECT INTO resets targets to NULL when the idempotency key is new.
 v_total:=0;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_product:=nullif(v_item->>'product_id','')::uuid; v_desc:=btrim(coalesce(v_item->>'description','')); v_qty:=nullif(v_item->>'quantity','')::integer; v_cost:=nullif(v_item->>'unit_cost','')::bigint;
  v_total:=v_total+v_qty::bigint*v_cost; if v_total>9000000000000000000 then raise exception 'purchase order total exceeds limit' using errcode='22003'; end if;
 end loop;
 v_num:=public.next_store_number(p_store_id,'purchase_order');
 insert into public.purchase_orders(store_id,po_number,supplier_id,order_date,status,total,note,created_by,idempotency_key,request_hash)
 values(p_store_id,v_num,p_supplier_id,coalesce(p_order_date,current_date),'pending',v_total,nullif(btrim(p_note),''),auth.uid(),v_key,v_hash) returning id into v_po; for v_item in select value from jsonb_array_elements(p_items) loop
  v_product:=nullif(v_item->>'product_id','')::uuid; v_desc:=btrim(v_item->>'description'); v_qty:=(v_item->>'quantity')::integer; v_cost:=(v_item->>'unit_cost')::bigint;
  insert into public.purchase_order_items(store_id,purchase_order_id,product_id,description,quantity_ordered,unit_cost,line_total)
  values(p_store_id,v_po,v_product,v_desc,v_qty,v_cost,v_qty::bigint*v_cost);
 end loop;
 return query select v_po,v_num,v_total;
end; $$;

create or replace function public.receive_purchase_order(
 p_store_id uuid,p_purchase_order_id uuid,p_receipts jsonb
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_po public.purchase_orders%rowtype; v_item public.purchase_order_items%rowtype; v_receipt jsonb; v_item_id uuid; v_qty integer; v_stock integer; v_cost_delta bigint:=0; v_balance bigint;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if p_receipts is null or jsonb_typeof(p_receipts)<>'array' then raise exception 'invalid receipts' using errcode='22023'; end if;
 if jsonb_array_length(p_receipts)=0 or jsonb_array_length(p_receipts)>200 then raise exception 'invalid receipts' using errcode='22023'; end if;
 select * into v_po from public.purchase_orders where store_id=p_store_id and id=p_purchase_order_id for update;
 if not found or v_po.status<>'pending' then raise exception 'pending purchase order not found' using errcode='P0002'; end if;
 for v_receipt in select value from jsonb_array_elements(p_receipts) loop
  v_item_id:=(v_receipt->>'item_id')::uuid; v_qty:=(v_receipt->>'quantity')::integer;
  if v_qty is null or v_qty<=0 then raise exception 'received quantity must be positive' using errcode='22023'; end if;
  select * into v_item from public.purchase_order_items where store_id=p_store_id and purchase_order_id=v_po.id and id=v_item_id for update;
  if not found or v_item.product_id is null or v_qty>v_item.quantity_ordered-v_item.quantity_received then raise exception 'invalid item or quantity exceeds remaining order' using errcode='23514'; end if;
  update public.products set stock_quantity=stock_quantity+v_qty where store_id=p_store_id and id=v_item.product_id and is_active and stock_quantity<=2147483647-v_qty returning stock_quantity into v_stock;
  if not found then raise exception 'product unavailable or stock limit exceeded' using errcode='23514'; end if;
  update public.purchase_order_items set quantity_received=quantity_received+v_qty where id=v_item.id;
  insert into public.stock_movements(store_id,product_id,movement_type,quantity_change,quantity_after,reason,reference_type,reference_id,created_by)
   values(p_store_id,v_item.product_id,'purchase_receipt',v_qty,v_stock,'PO-'||v_po.po_number,'purchase_order',v_po.id,auth.uid());
  v_cost_delta:=v_cost_delta+v_qty::bigint*v_item.unit_cost;
 end loop;
 if v_cost_delta>0 then
  update public.suppliers set payable_balance=payable_balance+v_cost_delta where store_id=p_store_id and id=v_po.supplier_id returning payable_balance into v_balance;
  if not found then raise exception 'supplier not found' using errcode='23503'; end if;
  insert into public.supplier_entries(store_id,supplier_id,entry_type,amount_change,balance_after,purchase_order_id,created_by)
  values(p_store_id,v_po.supplier_id,'purchase_received',v_cost_delta,v_balance,v_po.id,auth.uid());
 end if; if not exists(select 1 from public.purchase_order_items where store_id=p_store_id and purchase_order_id=v_po.id and quantity_received<quantity_ordered) then
  update public.purchase_orders set status='received',received_at=now(),received_by=auth.uid() where id=v_po.id;
 end if;
 return v_cost_delta;
end; $$;

create or replace function public.record_supplier_payment(
 p_store_id uuid,p_supplier_id uuid,p_amount bigint,p_method text,p_note text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_prior public.supplier_payments%rowtype; v_balance bigint; v_key text:=btrim(coalesce(p_idempotency_key,'')); v_method text:=coalesce(nullif(p_method,''),'cash');
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or v_method not in ('cash','bank_transfer','card','online','other') or length(v_key) not between 8 and 100 or length(coalesce(p_note,''))>300 then raise exception 'invalid supplier payment' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':sp:'||v_key,0));
 select * into v_prior from public.supplier_payments where store_id=p_store_id and idempotency_key=v_key;
 if found then if v_prior.supplier_id<>p_supplier_id or v_prior.amount<>p_amount or v_prior.method<>v_method or v_prior.note is distinct from nullif(btrim(p_note),'') then raise exception 'idempotency key reused with different payment data' using errcode='22023'; end if; return v_prior.id; end if;
 update public.suppliers set payable_balance=payable_balance-p_amount where store_id=p_store_id and id=p_supplier_id and payable_balance>=p_amount returning payable_balance into v_balance;
 if not found then raise exception 'supplier missing or payment exceeds payable balance' using errcode='23514'; end if;
 insert into public.supplier_payments(store_id,supplier_id,amount,method,note,idempotency_key,created_by) values(p_store_id,p_supplier_id,p_amount,v_method,nullif(btrim(p_note),''),v_key,auth.uid()) returning id into v_id;
 insert into public.supplier_entries(store_id,supplier_id,entry_type,amount_change,balance_after,payment_id,note,created_by) values(p_store_id,p_supplier_id,'payment',-p_amount,v_balance,v_id,nullif(btrim(p_note),''),auth.uid());
 return v_id;
end; $$;

create or replace function public.adjust_supplier_balance(
 p_store_id uuid,p_supplier_id uuid,p_amount_change bigint,p_note text,p_idempotency_key text
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_balance bigint; v_key text:=btrim(coalesce(p_idempotency_key,'')); v_prior public.supplier_entries%rowtype;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner']) then raise exception 'owner access required' using errcode='42501'; end if;
 if p_amount_change is null or p_amount_change=0 or length(v_key) not between 8 and 100 or length(coalesce(p_note,''))>300 then raise exception 'invalid balance adjustment' using errcode='22023'; end if;
 if p_note is null or btrim(p_note)='' then raise exception 'adjustment note required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':sa:'||v_key,0));
 select * into v_prior from public.supplier_entries where store_id=p_store_id and left(note,length('adjustment-key:'||v_key||'|'))='adjustment-key:'||v_key||'|';
 if found then if v_prior.supplier_id<>p_supplier_id or v_prior.amount_change<>p_amount_change or substr(v_prior.note,length('adjustment-key:'||v_key||'|')+1) is distinct from coalesce(nullif(btrim(p_note),''),'') then raise exception 'idempotency key reused with different adjustment' using errcode='22023'; end if; return v_prior.balance_after; end if;
 update public.suppliers set payable_balance=payable_balance+p_amount_change where store_id=p_store_id and id=p_supplier_id and payable_balance+p_amount_change>=0 returning payable_balance into v_balance;
 if not found then raise exception 'supplier missing or adjustment would create negative payable' using errcode='23514'; end if;
 insert into public.supplier_entries(store_id,supplier_id,entry_type,amount_change,balance_after,note,created_by)
 values(p_store_id,p_supplier_id,case when p_amount_change>0 and v_balance=p_amount_change then 'opening_balance' else 'adjustment' end,p_amount_change,v_balance,left('adjustment-key:'||v_key||'|'||coalesce(nullif(btrim(p_note),''),''),300),auth.uid());
 return v_balance;
end; $$;

create or replace function public.cancel_purchase_order(p_store_id uuid,p_purchase_order_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_po public.purchase_orders%rowtype;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'cancellation reason required' using errcode='22023'; end if;
 select * into v_po from public.purchase_orders where store_id=p_store_id and id=p_purchase_order_id for update;
 if not found or v_po.status<>'pending' then raise exception 'only pending orders can be cancelled' using errcode='P0002'; end if;
 if exists(select 1 from public.purchase_order_items where store_id=p_store_id and purchase_order_id=v_po.id and quantity_received>0) then raise exception 'order with received items cannot be cancelled; use a return workflow' using errcode='23514'; end if;
 update public.purchase_orders set status='cancelled',note=left(concat_ws(E'\n',note,'Cancellation: '||btrim(p_reason)),500) where id=v_po.id;
 return true;
end; $$;
create or replace function public.save_expense(
 p_store_id uuid,p_expense_id uuid,p_title text,p_category text,p_amount bigint,p_date date,p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then raise exception 'owner or manager access required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 160 or p_amount is null or p_amount<=0 or p_category not in ('Rent','Utilities','Supplies','Transport','Salaries','Other') or length(coalesce(p_note,''))>300 then raise exception 'invalid expense' using errcode='22023'; end if;
 if p_expense_id is null then
  insert into public.expenses(store_id,title,category,amount,expense_date,note,created_by) values(p_store_id,btrim(p_title),p_category,p_amount,coalesce(p_date,current_date),nullif(btrim(p_note),''),auth.uid()) returning id into v_id;
 else
  update public.expenses set title=btrim(p_title),category=p_category,amount=p_amount,expense_date=coalesce(p_date,current_date),note=nullif(btrim(p_note),'') where store_id=p_store_id and id=p_expense_id returning id into v_id;
  if not found then raise exception 'expense not found' using errcode='P0002'; end if;
 end if;
 return v_id;
end; $$;

revoke all on function public.adjust_stock(uuid,uuid,integer,text), public.set_stock_quantity(uuid,uuid,integer,text), public.record_customer_payment(uuid,uuid,bigint,text,text,text), public.adjust_supplier_balance(uuid,uuid,bigint,text,text), public.cancel_purchase_order(uuid,uuid,text), public.save_expense(uuid,uuid,text,text,bigint,date,text), public.create_purchase_order(uuid,uuid,date,text,jsonb,text), public.receive_purchase_order(uuid,uuid,jsonb), public.record_supplier_payment(uuid,uuid,bigint,text,text,text) from public,anon;
grant execute on function public.adjust_stock(uuid,uuid,integer,text), public.set_stock_quantity(uuid,uuid,integer,text), public.record_customer_payment(uuid,uuid,bigint,text,text,text), public.adjust_supplier_balance(uuid,uuid,bigint,text,text), public.cancel_purchase_order(uuid,uuid,text), public.save_expense(uuid,uuid,text,text,bigint,date,text), public.create_purchase_order(uuid,uuid,date,text,jsonb,text), public.receive_purchase_order(uuid,uuid,jsonb), public.record_supplier_payment(uuid,uuid,bigint,text,text,text) to authenticated;
