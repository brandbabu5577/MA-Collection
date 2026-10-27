-- 0012 — Atomic checkout RPC. Clients cannot write sales, items, payments, the
-- stock ledger or the Khata ledger directly (0008); this SECURITY DEFINER
-- function is the only path. It prices every line from the catalog (never the
-- client), deducts stock with a conditional UPDATE (no oversell), records the
-- payment method (cash / card / online / khata) WITHOUT charging anything,
-- updates the customer's Khata for credit sales, and is idempotent on
-- (store_id, idempotency_key). All statements share the caller's transaction,
-- so any RAISE aborts the whole sale: one call = all-or-nothing.

-- 1. Allow 'online' as a recorded payment method. This records a method only;
--    no payment provider or gateway is integrated anywhere.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.sales'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%payment_method%'
       and pg_get_constraintdef(oid) like '%''cash''%'
  loop
    execute format('alter table public.sales drop constraint %I', c.conname);
  end loop;
  for c in
    select conname from pg_constraint
     where conrelid = 'public.sale_payments'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%method%'
       and pg_get_constraintdef(oid) like '%''cash''%'
  loop
    execute format('alter table public.sale_payments drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.sales add constraint sales_payment_method_check
  check (payment_method in ('cash', 'card', 'online', 'credit'));
alter table public.sale_payments add constraint sale_payments_method_check
  check (method in ('cash', 'card', 'online', 'khata'));

-- 2. The checkout function. Required parameters first, optional ones after.
create or replace function public.create_sale(
  p_store_id        uuid,
  p_items           jsonb,
  p_payment_method  text,
  p_idempotency_key text,
  p_discount        bigint default 0,
  p_customer_id     uuid   default null,
  p_customer_name   text   default null,
  p_customer_phone  text   default null,
  p_reference       text   default null,
  p_note            text   default null
)
returns table (sale_id uuid, sale_number bigint, total bigint)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user      uuid   := auth.uid();
  v_method    text   := lower(btrim(coalesce(p_payment_method, '')));
  v_items     jsonb  := coalesce(p_items, '[]'::jsonb);
  v_discount  bigint := coalesce(p_discount, 0);
  v_item      jsonb;
  v_qty       integer;
  v_price     bigint;
  v_prod      public.products%rowtype;
  v_subtotal  bigint := 0;
  v_cost      bigint := 0;
  v_total     bigint;
  v_profit    bigint;
  v_sale      uuid;
  v_number    bigint;
  v_new_stock integer;
  v_balance   bigint;
  v_existing  uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_store_member(p_store_id) then
    raise exception 'not a member of this store' using errcode = '42501';
  end if;
  if v_method not in ('cash', 'card', 'online', 'credit') then
    raise exception 'invalid payment method %', v_method using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or char_length(btrim(p_idempotency_key)) not between 8 and 100 then
    raise exception 'idempotency key must be 8-100 characters' using errcode = '22023';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'at least one sale item is required' using errcode = '22023';
  end if;
  if v_method = 'credit' and p_customer_id is null then
    raise exception 'a credit sale requires a registered customer' using errcode = '22023';
  end if;
  if p_customer_id is not null and not exists (
       select 1 from public.customers c
        where c.store_id = p_store_id and c.id = p_customer_id) then
    raise exception 'customer not found in this store' using errcode = '23503';
  end if;

  -- Serialize callers that share a key: a concurrent duplicate waits here until
  -- the first sale commits, then the SELECT below finds it and returns it. The
  -- unique (store_id, idempotency_key) stays as the hard backstop, but a
  -- simultaneous retry now replays gracefully instead of raising a duplicate-key
  -- error. The lock is transaction-scoped and released on commit or rollback.
  perform pg_advisory_xact_lock(
    hashtextextended(p_store_id::text || ':' || btrim(p_idempotency_key), 0));

  -- Idempotent replay: unique (store_id, idempotency_key) is the hard backstop.
  select s.id into v_existing
    from public.sales s
   where s.store_id = p_store_id and s.idempotency_key = btrim(p_idempotency_key);
  if v_existing is not null then
    return query
      select s.id, s.sale_number, s.total from public.sales s where s.id = v_existing;
    return;
  end if;

  -- Pass 1: validate the lines and price them from the catalog, not the client.
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_qty   := nullif(v_item ->> 'quantity', '')::integer;
    v_price := nullif(v_item ->> 'unit_price', '')::bigint;
    if v_qty is null or v_qty <= 0 then
      raise exception 'quantity must be a positive number' using errcode = '22023';
    end if;
    if v_price is null or v_price < 0 then
      raise exception 'unit price cannot be negative' using errcode = '22023';
    end if;
    select * into v_prod from public.products pr
     where pr.store_id = p_store_id and pr.id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'product % not found in this store', v_item ->> 'product_id'
        using errcode = '23503';
    end if;
    if not v_prod.is_active then
      raise exception 'product % is not active', v_prod.name using errcode = '22023';
    end if;
    v_subtotal := v_subtotal + v_qty * v_price;
    v_cost     := v_cost + v_qty * v_prod.cost;
  end loop;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'discount must be between 0 and %', v_subtotal using errcode = '22023';
  end if;
  v_total  := v_subtotal - v_discount;
  v_profit := v_total - v_cost;

  v_number := public.next_store_number(p_store_id, 'sale');

  insert into public.sales (store_id, sale_number, customer_id, customer_name,
                            customer_phone, subtotal, discount, total, cost_total,
                            profit, payment_method, status, idempotency_key, created_by)
  values (p_store_id, v_number, p_customer_id,
          coalesce(nullif(btrim(coalesce(p_customer_name, '')), ''), 'Walk-in customer'),
          nullif(btrim(coalesce(p_customer_phone, '')), ''),
          v_subtotal, v_discount, v_total, v_cost, v_profit, v_method,
          case when v_method = 'credit' then 'pending' else 'completed' end,
          btrim(p_idempotency_key), v_user)
  returning id into v_sale;

  -- Pass 2: line items, safe stock deduction and its append-only history row.
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_qty   := (v_item ->> 'quantity')::integer;
    v_price := (v_item ->> 'unit_price')::bigint;
    select * into v_prod from public.products pr
     where pr.store_id = p_store_id and pr.id = (v_item ->> 'product_id')::uuid;

    update public.products
       set stock_quantity = stock_quantity - v_qty
     where store_id = p_store_id and id = v_prod.id and stock_quantity >= v_qty
     returning stock_quantity into v_new_stock;
    if not found then
      raise exception 'insufficient stock for % (have %, need %)',
        v_prod.name, v_prod.stock_quantity, v_qty using errcode = '23514';
    end if;

    insert into public.sale_items (store_id, sale_id, product_id, product_name, sku,
      quantity, unit_price, catalog_price, unit_cost, line_total, line_cost)
    values (p_store_id, v_sale, v_prod.id, v_prod.name, v_prod.sku,
      v_qty, v_price, v_prod.price, v_prod.cost, v_qty * v_price, v_qty * v_prod.cost);

    insert into public.stock_movements (store_id, product_id, movement_type,
      quantity_change, quantity_after, reason, reference_type, reference_id, created_by)
    values (p_store_id, v_prod.id, 'sale', -v_qty, v_new_stock,
      nullif(btrim(coalesce(p_note, '')), ''), 'sale', v_sale, v_user);
  end loop;

  -- Payment is recorded only: no gateway is called and no money is moved.
  if v_total > 0 then
    insert into public.sale_payments (store_id, sale_id, method, amount, reference)
    values (p_store_id, v_sale,
      case when v_method = 'credit' then 'khata' else v_method end,
      v_total, nullif(btrim(coalesce(p_reference, '')), ''));
  end if;

  -- Customer totals: Khata for credit sales, plus the order count.
  if p_customer_id is not null then
    update public.customers
       set order_count = order_count + 1,
           khata_balance = khata_balance
             + case when v_method = 'credit' then v_total else 0 end
     where store_id = p_store_id and id = p_customer_id
     returning khata_balance into v_balance;

    if v_method = 'credit' and v_total > 0 then
      insert into public.khata_entries (store_id, customer_id, entry_type,
        amount_change, balance_after, sale_id, note, created_by)
      values (p_store_id, p_customer_id, 'credit_sale', v_total, v_balance,
        v_sale, nullif(btrim(coalesce(p_note, '')), ''), v_user);
    end if;
  end if;

  return query select v_sale, v_number, v_total;
end;
$$;

revoke all on function public.create_sale(uuid, jsonb, text, text, bigint, uuid, text, text, text, text)
  from public, anon;
grant execute on function public.create_sale(uuid, jsonb, text, text, bigint, uuid, text, text, text, text)
  to authenticated;
