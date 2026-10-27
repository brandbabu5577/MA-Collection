-- Structural and isolation checks for Phase 1 (local plain PostgreSQL only).
create schema tests;
create function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
-- Runs a statement and returns 'OK' or the SQLSTATE; savepoint-safe.
create function tests.try(stmt text) returns text language plpgsql as $$
begin execute stmt; return 'OK';
exception when others then return sqlstate; end $$;
create function tests.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text,''), true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;
create function tests.as_admin() returns void language plpgsql as $$
begin perform set_config('role', current_setting('session.admin_role'), true); end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
select set_config('session.admin_role', current_user, false);

-- 1. Structure ---------------------------------------------------------------
do $$
declare v_missing text; v_empty text; r record; n bigint;
begin
  select string_agg(c.relname, ', ') into v_missing
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  perform tests.ok(v_missing is null, 'RLS enabled on every public table (missing: ' || coalesce(v_missing,'none') || ')');

  for r in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
            where ns.nspname = 'public' and c.relkind = 'r' loop
    execute format('select count(*) from public.%I', r.relname) into n;
    if n > 0 then v_empty := coalesce(v_empty,'') || r.relname || ' '; end if;
  end loop;
  perform tests.ok(v_empty is null, 'fresh database has zero rows in every table (non-empty: ' || coalesce(v_empty,'none') || ')');

  select string_agg(table_name, ', ') into v_missing from (
    select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
       and table_name not in ('stores','profiles','store_members','store_settings','store_counters')
       and not exists (select 1 from information_schema.columns c
                        where c.table_schema='public' and c.table_name = tables.table_name and c.column_name = 'store_id')
  ) t;
  perform tests.ok(v_missing is null, 'every business table has store_id (missing: ' || coalesce(v_missing,'none') || ')');

  select count(*) into n from information_schema.columns
   where table_schema='public' and data_type in ('real','double precision');
  perform tests.ok(n = 0, 'no floating-point columns anywhere');

  select string_agg(table_name || '.' || column_name, ', ') into v_missing from information_schema.columns
   where table_schema='public' and data_type = 'numeric';
  perform tests.ok(v_missing is null, 'no numeric/float money columns (found: ' || coalesce(v_missing,'none') || ')');
end $$;

-- 2. Two stores, three users ---------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1','owner1@test'),
  ('00000000-0000-0000-0000-0000000000b2','owner2@test'),
  ('00000000-0000-0000-0000-0000000000c3','cashier1@test');

do $$
declare
  u1 uuid := '00000000-0000-0000-0000-0000000000a1';
  u2 uuid := '00000000-0000-0000-0000-0000000000b2';
  u3 uuid := '00000000-0000-0000-0000-0000000000c3';
  s1 uuid; s2 uuid; cat1 uuid; p1 uuid; c1 uuid; n bigint; r text;
begin
  perform tests.ok((select count(*) from public.profiles) = 3, 'signup trigger created a profile per user');

  perform tests.as_anon();
  perform tests.ok(tests.try('select * from public.stores') = '42501', 'anon cannot read stores');
  perform tests.ok(tests.try($q$select public.create_store('x')$q$) = '42501', 'anon cannot call create_store');

  perform tests.as_user(u1);  s1 := public.create_store('Store One');
  perform tests.as_user(u2);  s2 := public.create_store('Store Two');
  perform tests.ok(tests.try(format($q$select public.create_store('Again')$q$)) = '23505', 'one owned store per account');
  perform tests.as_admin();
  insert into public.store_members (store_id, user_id, role) values (s1, u3, 'cashier');
  perform tests.ok((select count(*) from public.store_settings) = 2, 'create_store made default settings');

  -- Owner of store 1 builds data; store 2 must not see it.
  perform tests.as_user(u1);
  insert into public.categories (store_id, name) values (s1, 'Unstitched') returning id into cat1;
  insert into public.products (store_id, category_id, name, sku, price, cost)
    values (s1, cat1, 'Lawn suit', 'MA-1', 4250, 2950) returning id into p1;
  insert into public.customers (store_id, name, phone) values (s1, 'Ayesha', '03012345678') returning id into c1;
  insert into public.expenses (store_id, title, amount) values (s1, 'Rent', 35000);
  perform tests.ok((select count(*) from public.products) = 1, 'owner1 sees own product');

  perform tests.as_user(u2);
  perform tests.ok((select count(*) from public.products)   = 0, 'owner2 cannot see store1 products');
  perform tests.ok((select count(*) from public.customers)  = 0, 'owner2 cannot see store1 customers');
  perform tests.ok((select count(*) from public.expenses)   = 0, 'owner2 cannot see store1 expenses');
  perform tests.ok((select count(*) from public.stores)     = 1, 'owner2 sees only own store row');
  perform tests.ok(tests.try(format($q$insert into public.products (store_id,name,price,cost) values (%L,'Evil',1,1)$q$, s1)) = '42501',
                   'owner2 cannot insert a product into store1 (RLS)');
  perform tests.ok(tests.try(format($q$update public.products set price = 1 where id = %L$q$, p1)) = 'OK'
                   and (select price from public.products where id = p1) is null, 'owner2 cannot update store1 product (0 rows)');
  perform tests.as_admin();
  perform tests.ok((select price from public.products where id = p1) = 4250, 'store1 product unchanged after cross-store update attempt');

  -- Composite FK blocks cross-store references even for the superuser.
  perform tests.ok(tests.try(format($q$insert into public.products (store_id,category_id,name,price,cost) values (%L,%L,'X',1,1)$q$, s2, cat1)) = '23503',
                   'composite FK rejects product in store2 pointing at store1 category');

  -- Protected columns / read-only tables for a legitimate owner.
  perform tests.as_user(u1);
  perform tests.ok(tests.try($q$insert into public.products (store_id,name,price,cost,stock_quantity) select id,'S',1,1,50 from public.stores$q$) = '42501',
                   'client cannot set stock_quantity on insert');
  perform tests.ok(tests.try(format($q$update public.products set stock_quantity = 999 where id = %L$q$, p1)) = '42501', 'client cannot edit stock_quantity');
  perform tests.ok(tests.try(format($q$update public.customers set khata_balance = 0 where id = %L$q$, c1)) = '42501', 'client cannot edit khata_balance');
  perform tests.ok(tests.try(format($q$update public.products set store_id = %L where id = %L$q$, s2, p1)) = '42501', 'client cannot move a product to another store');
  perform tests.ok(tests.try(format($q$insert into public.sales (store_id,sale_number,subtotal,total,cost_total,profit,payment_method,idempotency_key) values (%L,1,1,1,0,1,'cash','abcdefgh')$q$, s1)) = '42501',
                   'client cannot insert sales directly');
  perform tests.ok(tests.try(format($q$insert into public.stock_movements (store_id,product_id,movement_type,quantity_change,quantity_after) values (%L,%L,'adjustment_add',1,1)$q$, s1, p1)) = '42501',
                   'client cannot insert stock movements directly');
  perform tests.ok(tests.try(format($q$insert into public.store_members (store_id,user_id,role) values (%L,%L,'owner')$q$, s1, u2)) = '42501',
                   'client cannot grant itself membership');
  perform tests.ok(tests.try('select * from public.store_counters') = '42501', 'store_counters unreachable by clients');
  perform tests.ok(tests.try('select public.next_store_number(gen_random_uuid(), ''sale'')') = '42501', 'next_store_number not callable by clients');

  -- Cashier: can read and register customers, cannot change catalog/expenses.
  perform tests.as_user(u3);
  perform tests.ok((select count(*) from public.products) = 1, 'cashier can read store1 products');
  perform tests.ok(tests.try(format($q$insert into public.products (store_id,name,price,cost) values (%L,'N',1,1)$q$, s1)) = '42501', 'cashier cannot create products');
  perform tests.ok(tests.try(format($q$insert into public.expenses (store_id,title,amount) values (%L,'N',1)$q$, s1)) = '42501', 'cashier cannot create expenses');
  perform tests.ok(tests.try(format($q$insert into public.customers (store_id,name) values (%L,'Walk')$q$, s1)) = 'OK', 'cashier can register a customer');
  perform tests.ok(tests.try(format($q$update public.stores set name = 'Hacked' where id = %L$q$, s1)) = 'OK'
                   and (select name from public.stores where id = s1) = 'Store One', 'cashier cannot rename the store');
end $$;

-- 3. Constraints and audit behaviour (superuser, i.e. what an RPC would do) ------
do $$
declare
  s1 uuid := (select id from public.stores where name = 'Store One');
  p1 uuid := (select id from public.products limit 1);
  c1 uuid := (select id from public.customers where name = 'Ayesha');
  sale uuid; sup uuid; po uuid; n1 bigint; n2 bigint;
begin
  perform tests.as_admin();
  perform tests.ok(tests.try(format($q$insert into public.products (store_id,name,price,cost) values (%L,'Neg',-1,1)$q$, s1)) = '23514', 'negative price rejected');
  perform tests.ok(tests.try(format($q$update public.products set stock_quantity = -1 where id = %L$q$, p1)) = '23514', 'negative stock rejected');
  perform tests.ok(tests.try(format($q$insert into public.customers (store_id,name,khata_balance) values (%L,'N',-5)$q$, s1)) = '23514', 'negative khata balance rejected');
  perform tests.ok(tests.try(format($q$insert into public.expenses (store_id,title,amount) values (%L,'Zero',0)$q$, s1)) = '23514', 'zero expense rejected');

  perform tests.ok(tests.try(format($q$insert into public.sales (store_id,sale_number,subtotal,discount,total,cost_total,profit,payment_method,idempotency_key) values (%L,1,100,200,0,0,0,'cash','key-00001')$q$, s1)) = '23514', 'discount greater than subtotal rejected');
  perform tests.ok(tests.try(format($q$insert into public.sales (store_id,sale_number,subtotal,discount,total,cost_total,profit,payment_method,idempotency_key) values (%L,1,100,0,90,0,90,'cash','key-00001')$q$, s1)) = '23514', 'total <> subtotal - discount rejected');
  perform tests.ok(tests.try(format($q$insert into public.sales (store_id,sale_number,subtotal,discount,total,cost_total,profit,payment_method,idempotency_key) values (%L,1,100,0,100,40,60,'credit','key-00001')$q$, s1)) = '23514', 'credit sale without a customer rejected');

  insert into public.sales (store_id,sale_number,customer_id,customer_name,subtotal,discount,total,cost_total,profit,payment_method,status,idempotency_key)
    values (s1, public.next_store_number(s1,'sale'), c1, 'Ayesha', 4250, 250, 4000, 2950, 1050, 'credit', 'pending', 'idem-key-001') returning id into sale;
  perform tests.ok((select sale_number from public.sales where id = sale) = 1001, 'first sale number is 1001');
  perform tests.ok(tests.try(format($q$insert into public.sales (store_id,sale_number,subtotal,total,cost_total,profit,payment_method,idempotency_key) values (%L,1002,1,1,0,1,'cash','idem-key-001')$q$, s1)) = '23505', 'duplicate idempotency key rejected');
  perform tests.ok(tests.try(format($q$insert into public.sale_items (store_id,sale_id,product_id,product_name,quantity,unit_price,catalog_price,unit_cost,line_total,line_cost) values (%L,%L,%L,'Lawn',1,4250,4250,2950,4250,2950)$q$, s1, sale, p1)) = 'OK', 'valid sale item accepted (edited price allowed apart from catalog)');
  perform tests.ok(tests.try(format($q$insert into public.sale_items (store_id,sale_id,product_id,product_name,quantity,unit_price,catalog_price,unit_cost,line_total,line_cost) values (%L,%L,%L,'Lawn',2,100,4250,2950,999,5900)$q$, s1, sale, p1)) = '23514', 'sale item with wrong line_total rejected');
  perform tests.ok(tests.try(format($q$insert into public.sale_items (store_id,sale_id,product_id,product_name,quantity,unit_price,catalog_price,unit_cost,line_total,line_cost) values (%L,%L,%L,'Lawn',0,100,4250,2950,0,0)$q$, s1, sale, p1)) = '23514', 'zero quantity rejected');

  perform tests.ok(tests.try(format($q$insert into public.khata_entries (store_id,customer_id,entry_type,amount_change,balance_after,sale_id) values (%L,%L,'credit_sale',4000,4000,%L)$q$, s1, c1, sale)) = 'OK', 'khata ledger entry accepted');
  perform tests.ok(tests.try(format($q$update public.khata_entries set balance_after = 0 where store_id = %L$q$, s1)) = '23001', 'khata ledger is append-only (update)');
  perform tests.ok(tests.try(format($q$delete from public.khata_entries where store_id = %L$q$, s1)) = '23001', 'khata ledger is append-only (delete)');
  perform tests.ok(tests.try(format($q$insert into public.khata_entries (store_id,customer_id,entry_type,amount_change,balance_after) values (%L,%L,'payment',-10,0)$q$, s1, c1)) = '23514', 'khata payment entry without payment_id rejected');
  perform tests.ok(tests.try(format($q$insert into public.stock_movements (store_id,product_id,movement_type,quantity_change,quantity_after) values (%L,%L,'sale',-1,0)$q$, s1, p1)) = 'OK', 'stock movement accepted');
  perform tests.ok(tests.try(format($q$update public.stock_movements set quantity_after = 9 where store_id = %L$q$, s1)) = '23001', 'stock movements are append-only');

  perform tests.ok(tests.try(format($q$insert into public.customer_payments (store_id,customer_id,amount,idempotency_key) values (%L,%L,0,'pay-key-001')$q$, s1, c1)) = '23514', 'zero customer payment rejected');

  insert into public.suppliers (store_id,name) values (s1,'Al-Noor') returning id into sup;
  insert into public.purchase_orders (store_id,po_number,supplier_id,total) values (s1, public.next_store_number(s1,'purchase_order'), sup, 500) returning id into po;
  perform tests.ok((select po_number from public.purchase_orders where id = po) = 101, 'first PO number is 101');
  perform tests.ok(tests.try(format($q$insert into public.purchase_order_items (store_id,purchase_order_id,description,quantity_ordered,unit_cost,line_total) values (%L,%L,'Fabric',10,50,500)$q$, s1, po)) = 'OK', 'consistent PO item accepted');
  -- A second item makes the lines sum to 600 while the header says 500: must fail when constraints are checked.
  perform tests.ok(tests.try(format($q$insert into public.purchase_order_items (store_id,purchase_order_id,description,quantity_ordered,unit_cost,line_total) values (%L,%L,'Extra',1,100,100); set constraints all immediate$q$, s1, po)) = '23514',
                   'PO total must equal sum of its items');
  perform tests.ok(tests.try(format($q$insert into public.purchase_order_items (store_id,purchase_order_id,description,quantity_ordered,quantity_received,unit_cost,line_total) values (%L,%L,'Over',1,2,10,10)$q$, s1, po)) = '23514', 'received quantity above ordered rejected');
end $$;


-- 4. Deleting a whole store cascades cleanly despite append-only audit tables.
do $$
begin
  perform tests.as_admin();
  perform tests.ok(tests.try($q$delete from public.stores where name = 'Store One'$q$) = 'OK', 'deleting a store cascades through all its data');
  perform tests.ok((select count(*) from public.sales) = 0 and (select count(*) from public.khata_entries) = 0
                   and (select count(*) from public.stock_movements) = 0, 'no orphaned rows remain after store deletion');
end $$;

select 'ALL PHASE 1 LOCAL CHECKS PASSED' as result;
