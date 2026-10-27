-- 0014 — Server-side Khata repayment and manual stock adjustment.
--
-- Clients cannot write customer_payments, khata_entries or stock_movements, and
-- cannot update customers.khata_balance or products.stock_quantity (0008/0011).
-- Before this migration the frontend recorded repayments and stock adjustments
-- only in browser memory. These SECURITY DEFINER functions are now the only
-- write path. Both are additive: no table, column or existing row is changed.

-- 1. Record a customer's repayment against their Khata balance.
--    Any store member (cashiers take payments at the till). Idempotent on
--    (store_id, idempotency_key). Cannot exceed the outstanding balance.
create or replace function public.record_khata_payment(
  p_store_id        uuid,
  p_customer_id     uuid,
  p_amount          bigint,
  p_idempotency_key text,
  p_method          text default 'cash',
  p_note            text default null
)
returns table (payment_id uuid, balance_after bigint)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_method   text := lower(btrim(coalesce(p_method, 'cash')));
  v_balance  bigint;
  v_new      bigint;
  v_payment  uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_store_member(p_store_id) then
    raise exception 'not a member of this store' using errcode = '42501';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then
    raise exception 'idempotency key must be 8-100 characters' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'payment amount must be greater than zero' using errcode = '22023';
  end if;
  if v_method not in ('cash','bank_transfer','card','online','other') then
    raise exception 'invalid payment method %', v_method using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'note is too long' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':kp:' || p_idempotency_key, 0));

  -- Duplicate submission: return the original result, change nothing.
  select cp.id into v_payment
    from public.customer_payments cp
   where cp.store_id = p_store_id and cp.idempotency_key = p_idempotency_key;
  if v_payment is not null then
    return query
      select v_payment, c.khata_balance
        from public.customers c
       where c.store_id = p_store_id and c.id = p_customer_id;
    return;
  end if;

  select c.khata_balance into v_balance
    from public.customers c
   where c.store_id = p_store_id and c.id = p_customer_id
   for update;
  if not found then
    raise exception 'customer not found in this store' using errcode = '23503';
  end if;
  if p_amount > v_balance then
    raise exception 'payment (%) exceeds the outstanding balance (%)', p_amount, v_balance
      using errcode = '22023';
  end if;
  v_new := v_balance - p_amount;

  insert into public.customer_payments (store_id, customer_id, amount, method, note, idempotency_key, created_by)
  values (p_store_id, p_customer_id, p_amount, v_method, nullif(btrim(coalesce(p_note, '')), ''), p_idempotency_key, v_user)
  returning id into v_payment;

  insert into public.khata_entries (store_id, customer_id, entry_type, amount_change, balance_after, payment_id, note, created_by)
  values (p_store_id, p_customer_id, 'payment', -p_amount, v_new, v_payment, nullif(btrim(coalesce(p_note, '')), ''), v_user);

  update public.customers set khata_balance = v_new
   where store_id = p_store_id and id = p_customer_id;

  return query select v_payment, v_new;
end;
$$;

revoke all on function public.record_khata_payment(uuid, uuid, bigint, text, text, text) from public, anon;
grant execute on function public.record_khata_payment(uuid, uuid, bigint, text, text, text) to authenticated;

-- 2. Manual stock adjustment (owner / manager only). Writes an append-only
--    stock_movements row and updates the cached stock in the same transaction.
--    p_type: 'add' | 'remove' | 'set'. Stock can never go below zero.
create or replace function public.adjust_stock(
  p_store_id   uuid,
  p_product_id uuid,
  p_type       text,
  p_quantity   integer,
  p_reason     text default null
)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_type    text := lower(btrim(coalesce(p_type, '')));
  v_current integer;
  v_new     integer;
  v_kind    text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.has_store_role(p_store_id, array['owner','manager']) then
    raise exception 'Owner or manager access required.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'quantity must be zero or more' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception 'reason is too long' using errcode = '22023';
  end if;

  select p.stock_quantity into v_current
    from public.products p
   where p.store_id = p_store_id and p.id = p_product_id
   for update;
  if not found then
    raise exception 'product not found in this store' using errcode = '23503';
  end if;

  if v_type = 'add' then
    if p_quantity = 0 then raise exception 'quantity must be greater than zero' using errcode = '22023'; end if;
    v_new := v_current + p_quantity; v_kind := 'adjustment_add';
  elsif v_type = 'remove' then
    if p_quantity = 0 then raise exception 'quantity must be greater than zero' using errcode = '22023'; end if;
    if p_quantity > v_current then
      raise exception 'cannot remove % (only % in stock)', p_quantity, v_current using errcode = '22023';
    end if;
    v_new := v_current - p_quantity; v_kind := 'adjustment_remove';
  elsif v_type = 'set' then
    v_new := p_quantity; v_kind := 'adjustment_set';
  else
    raise exception 'invalid adjustment type %', v_type using errcode = '22023';
  end if;

  if v_new = v_current then
    return v_current;  -- nothing to record
  end if;

  insert into public.stock_movements (store_id, product_id, movement_type, quantity_change, quantity_after, reason, created_by)
  values (p_store_id, p_product_id, v_kind, v_new - v_current, v_new, nullif(btrim(coalesce(p_reason, '')), ''), v_user);

  update public.products set stock_quantity = v_new
   where store_id = p_store_id and id = p_product_id;

  return v_new;
end;
$$;

revoke all on function public.adjust_stock(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.adjust_stock(uuid, uuid, text, integer, text) to authenticated;
