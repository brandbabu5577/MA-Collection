-- 0017 — Khata payment allocation for partial payments across multiple sales.
-- Backward compatible: existing customer_payments, khata_entries, sales tables unchanged.
-- Existing customer_payments rows: unallocated_amount = 0, request_hash = NULL (fully allocated by inference).
-- Existing khata_entries payment rows: sale_id = NULL (no invented relationships).

-- 1. Track payment amount not yet assigned to any sale.
alter table public.customer_payments
  add column if not exists unallocated_amount bigint not null default 0
  check (unallocated_amount >= 0);

-- 2. Store full-request fingerprint for idempotency validation on retry.
alter table public.customer_payments
  add column if not exists request_hash text;

-- 3. Junction table linking one customer payment to one or more sales.
create table if not exists public.payment_allocations (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  payment_id      uuid not null,
  sale_id         uuid not null,
  amount          bigint not null check (amount > 0),
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (store_id, id),
  foreign key (store_id, payment_id) references public.customer_payments (store_id, id),
  foreign key (store_id, sale_id)    references public.sales (store_id, id)
);

create index if not exists payment_allocations_payment_idx on public.payment_allocations (store_id, payment_id);
create index if not exists payment_allocations_sale_idx    on public.payment_allocations (store_id, sale_id);

alter table public.payment_allocations enable row level security;

grant select on public.payment_allocations to authenticated;

create policy payment_allocations_select on public.payment_allocations
  for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager','cashier']));

-- No client INSERT/UPDATE/DELETE — all writes via SECURITY DEFINER RPCs only.

-- Keep sale status consistent with its actual allocated amount. A credit sale is
-- pending until payment_allocations cover its total; a full allocation completes it.
create or replace function public.sync_sale_status_from_allocations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_sale_id uuid;
  v_allocated bigint;
  v_total bigint;
  v_status text;
begin
  v_store_id := coalesce(new.store_id, old.store_id);
  v_sale_id := coalesce(new.sale_id, old.sale_id);

  select coalesce(sum(amount), 0) into v_allocated
    from public.payment_allocations
   where store_id = v_store_id and sale_id = v_sale_id;

  select total, status into v_total, v_status
    from public.sales
   where store_id = v_store_id and id = v_sale_id;

  if v_total is null or v_status = 'voided' then
    return null;
  end if;

  if v_allocated >= v_total then
    update public.sales
       set status = 'completed'
     where store_id = v_store_id and id = v_sale_id and status = 'pending';
  elsif v_allocated = 0 then
    update public.sales
       set status = 'pending'
     where store_id = v_store_id and id = v_sale_id and status = 'completed';
  end if;

  return null;
end;
$$;

drop trigger if exists payment_allocations_sync_sale_status on public.payment_allocations;
create trigger payment_allocations_sync_sale_status
after insert or update of amount or delete on public.payment_allocations
for each row execute function public.sync_sale_status_from_allocations();

-- 4. Idempotency registry for allocation requests (genuine idempotency for allocate_unallocated_payment).
create table if not exists public.payment_allocation_idempotency (
  store_id        uuid not null,
  idempotency_key text not null,
  payment_id      uuid not null,
  request_hash    text not null,
  created_at      timestamptz not null default now(),
  unique (store_id, idempotency_key),
  foreign key (store_id, payment_id) references public.customer_payments (store_id, id)
);

alter table public.payment_allocation_idempotency enable row level security;

grant select on public.payment_allocation_idempotency to authenticated;

create policy payment_allocation_idempotency_select on public.payment_allocation_idempotency
  for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

-- 5. RPC: record_customer_payment_and_allocate (atomic payment + allocation).
create or replace function public.record_customer_payment_and_allocate(
  p_store_id        uuid,
  p_customer_id     uuid,
  p_amount          bigint,
  p_method          text,
  p_note            text,
  p_idempotency_key text,
  p_allocations     jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_balance bigint;
  v_key text := btrim(coalesce(p_idempotency_key,''));
  v_prior public.customer_payments%rowtype;
  v_method text := coalesce(nullif(p_method, ''), 'cash');
  v_alloc_total bigint := 0;
  v_unallocated bigint := 0;
  v_dup_count integer;
  v_arr jsonb[];
  v_len int;
  v_idx int;
  v_elem jsonb;
  v_sale_id uuid;
  v_alloc_amount bigint;
  v_sale public.sales%rowtype;
  v_existing_alloc bigint;
  v_sale_outstanding bigint;
  v_request_hash text;
begin
  -- Role check
  if auth.uid() is null or not public.has_store_role(p_store_id, array['owner','manager']) then
    raise exception 'owner or manager access required' using errcode='42501';
  end if;

  -- Validate parameters against schema constraints
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid payment amount' using errcode='22023';
  end if;
  if length(v_key) not between 8 and 100 then
    raise exception 'idempotency key must be 8-100 characters' using errcode='22023';
  end if;
  if length(coalesce(p_note,'')) > 300 then
    raise exception 'note too long' using errcode='22023';
  end if;
  if v_method not in ('cash','bank_transfer','card','online','other') then
    raise exception 'invalid payment method' using errcode='22023';
  end if;

  -- Build complete request fingerprint: customer, amount, method, note, allocations
  v_request_hash := md5(jsonb_build_object(
    'customer_id', p_customer_id,
    'amount', p_amount,
    'method', v_method,
    'note', coalesce(p_note, ''),
    'allocations', coalesce(p_allocations, '[]'::jsonb)
  )::text);

  -- Normalize allocations into a postgres array for safe indexed iteration
  select array_agg(e) into v_arr
  from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as e;
  v_len := coalesce(array_length(v_arr, 1), 0);

  -- Validate total allocation amount <= payment amount
  v_alloc_total := 0;
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    v_alloc_total := v_alloc_total + coalesce((v_elem->>'amount')::bigint, 0);
  end loop;
  if v_alloc_total > p_amount then
    raise exception 'allocations exceed payment amount' using errcode='22023';
  end if;

  -- Reject duplicate sale_ids within the same request
  select count(*) into v_dup_count
  from (
    select (elem->>'sale_id') as sid, count(*) as cnt
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as elem
    group by (elem->>'sale_id')
    having count(*) > 1
  ) sub;
  if v_dup_count > 0 then
    raise exception 'duplicate sale_id in allocation request' using errcode='22023';
  end if;

  v_unallocated := p_amount - v_alloc_total;

  -- IDEMPOTENCY: lock and check existing payment BEFORE outstanding-balance validation.
  -- A legitimate retry returns the existing payment_id without re-validating allocations.
  -- Same key with different customer/amount/method/note/allocations raises an exception.
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':cp:' || v_key, 0));
  select * into v_prior
    from public.customer_payments
   where store_id = p_store_id and idempotency_key = v_key;
  if found then
    if v_prior.customer_id <> p_customer_id
       or v_prior.amount <> p_amount
       or v_prior.method <> v_method
       or v_prior.note is distinct from nullif(btrim(p_note), '')
       or v_prior.request_hash is distinct from v_request_hash then
      raise exception 'idempotency key reused with different payment or allocation data' using errcode='22023';
    end if;
    return v_prior.id;
  end if;

  -- Validate each allocation against its sale (locks sale row to prevent concurrent overallocation)
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    v_sale_id := nullif(v_elem->>'sale_id', '')::uuid;
    v_alloc_amount := coalesce((v_elem->>'amount')::bigint, 0);

    if v_sale_id is null then
      raise exception 'allocation missing sale_id' using errcode='22023';
    end if;
    if v_alloc_amount <= 0 then
      raise exception 'allocation amount must be positive' using errcode='22023';
    end if;

    -- Sale must belong to this store AND this customer, and be pending (credit/Khata)
    select * into v_sale
      from public.sales
     where store_id = p_store_id
       and id = v_sale_id
       and customer_id = p_customer_id
     for update;
    if not found then
      raise exception 'sale not found in this store for this customer' using errcode='23503';
    end if;
    if v_sale.status <> 'pending' then
      raise exception 'only pending credit sales can receive payment allocations' using errcode='22023';
    end if;

    -- Allocation cannot exceed sale's outstanding balance (total minus prior allocations)
    select coalesce(sum(amount), 0) into v_existing_alloc
      from public.payment_allocations
     where store_id = p_store_id and sale_id = v_sale_id;
    v_sale_outstanding := v_sale.total - v_existing_alloc;
    if v_alloc_amount > v_sale_outstanding then
      raise exception 'allocation exceeds sale outstanding balance' using errcode='22023';
    end if;
  end loop;

  -- Record customer payment (full amount reduces customer-level Khata balance)
  update public.customers
     set khata_balance = khata_balance - p_amount
   where store_id = p_store_id
     and id = p_customer_id
     and khata_balance >= p_amount
   returning khata_balance into v_balance;
  if not found then
    raise exception 'customer missing or payment exceeds balance' using errcode='23514';
  end if;

  insert into public.customer_payments(
    store_id, customer_id, amount, method, note, idempotency_key,
    unallocated_amount, request_hash, created_by
  ) values (
    p_store_id, p_customer_id, p_amount, v_method,
    nullif(btrim(p_note), ''),
    v_key,
    v_unallocated,
    v_request_hash,
    auth.uid()
  ) returning id into v_id;

  -- Customer-level Khata ledger entry (full payment, linked via payment_id, sale_id=NULL)
  insert into public.khata_entries(
    store_id, customer_id, entry_type, amount_change, balance_after,
    payment_id, note, created_by
  ) values (
    p_store_id, p_customer_id, 'payment', -p_amount, v_balance,
    v_id, nullif(btrim(p_note), ''), auth.uid()
  );

  -- Per-sale allocations
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    insert into public.payment_allocations(
      store_id, payment_id, sale_id, amount, created_by
    ) values (
      p_store_id, v_id,
      (v_elem->>'sale_id')::uuid,
      (v_elem->>'amount')::bigint,
      auth.uid()
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function public.record_customer_payment_and_allocate(
  uuid, uuid, bigint, text, text, text, jsonb
) from public, anon;
grant execute on function public.record_customer_payment_and_allocate(
  uuid, uuid, bigint, text, text, text, jsonb
) to authenticated;

-- 6. RPC: allocate_unallocated_payment (genuinely idempotent).
--    Allocates an existing payment's unallocated_amount to one or more sales.
--    No new customer payment, no khata_balance change. Atomic, prevents over-allocation.
create or replace function public.allocate_unallocated_payment(
  p_store_id        uuid,
  p_payment_id      uuid,
  p_allocations     jsonb,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_payment_id;
  v_prior public.customer_payments%rowtype;
  v_alloc_total bigint := 0;
  v_new_unallocated bigint;
  v_dup_count integer;
  v_arr jsonb[];
  v_len int;
  v_idx int;
  v_elem jsonb;
  v_sale_id uuid;
  v_alloc_amount bigint;
  v_sale public.sales%rowtype;
  v_existing_alloc bigint;
  v_sale_outstanding bigint;
  v_key text := btrim(coalesce(p_idempotency_key,''));
  v_request_hash text;
  v_idem public.payment_allocation_idempotency%rowtype;
begin
  if auth.uid() is null or not public.has_store_role(p_store_id, array['owner','manager']) then
    raise exception 'owner or manager access required' using errcode='42501';
  end if;
  if p_allocations is null then
    raise exception 'allocations are required' using errcode='22023';
  end if;
  if length(v_key) not between 8 and 100 then
    raise exception 'idempotency key must be 8-100 characters' using errcode='22023';
  end if;

  -- Build request fingerprint for this allocation call
  v_request_hash := md5(jsonb_build_object(
    'payment_id', p_payment_id,
    'allocations', p_allocations
  )::text);

  -- Lock the payment row to serialize concurrent allocations to the same payment
  select * into v_prior
    from public.customer_payments
   where store_id = p_store_id and id = p_payment_id
   for update;
  if not found then
    raise exception 'payment not found in this store' using errcode='23503';
  end if;

  -- IDEMPOTENCY: check allocation idempotency registry BEFORE outstanding-balance validation.
  -- Same key + same payload: already processed, return original payment_id without inserting duplicates.
  -- Same key + different payload: raise exception.
  select * into v_idem
    from public.payment_allocation_idempotency
   where store_id = p_store_id and idempotency_key = v_key;
  if found then
    if v_idem.payment_id <> p_payment_id
       or v_idem.request_hash is distinct from v_request_hash then
      raise exception 'allocation idempotency key reused with different payment or payload' using errcode='22023';
    end if;
    return v_idem.payment_id;
  end if;

  -- Normalize allocations
  select array_agg(e) into v_arr
  from jsonb_array_elements(p_allocations) as e;
  v_len := coalesce(array_length(v_arr, 1), 0);

  -- Validate total allocation amount <= unallocated_amount
  v_alloc_total := 0;
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    v_alloc_total := v_alloc_total + coalesce((v_elem->>'amount')::bigint, 0);
  end loop;
  if v_alloc_total > v_prior.unallocated_amount then
    raise exception 'allocations exceed payment unallocated amount' using errcode='22023';
  end if;

  -- Reject duplicate sale_ids within the same request
  select count(*) into v_dup_count
  from (
    select (elem->>'sale_id') as sid, count(*) as cnt
    from jsonb_array_elements(p_allocations) as elem
    group by (elem->>'sale_id')
    having count(*) > 1
  ) sub;
  if v_dup_count > 0 then
    raise exception 'duplicate sale_id in allocation request' using errcode='22023';
  end if;

  v_new_unallocated := v_prior.unallocated_amount - v_alloc_total;

  -- Advisory lock before outstanding-balance validation
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':alloc:' || v_key, 0));

  -- Validate each allocation against its sale
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    v_sale_id := nullif(v_elem->>'sale_id', '')::uuid;
    v_alloc_amount := coalesce((v_elem->>'amount')::bigint, 0);

    if v_sale_id is null then
      raise exception 'allocation missing sale_id' using errcode='22023';
    end if;
    if v_alloc_amount <= 0 then
      raise exception 'allocation amount must be positive' using errcode='22023';
    end if;

    -- Sale must belong to this store AND this customer (the payment's customer), and be pending
    select * into v_sale
      from public.sales
     where store_id = p_store_id
       and id = v_sale_id
       and customer_id = v_prior.customer_id
     for update;
    if not found then
      raise exception 'sale not found in this store for this customer' using errcode='23503';
    end if;
    if v_sale.status <> 'pending' then
      raise exception 'only pending credit sales can receive payment allocations' using errcode='22023';
    end if;

    select coalesce(sum(amount), 0) into v_existing_alloc
      from public.payment_allocations
     where store_id = p_store_id and sale_id = v_sale_id;
    v_sale_outstanding := v_sale.total - v_existing_alloc;
    if v_alloc_amount > v_sale_outstanding then
      raise exception 'allocation exceeds sale outstanding balance' using errcode='22023';
    end if;
  end loop;

  -- Update unallocated_amount
  update public.customer_payments
     set unallocated_amount = v_new_unallocated
   where store_id = p_store_id and id = p_payment_id
   returning id into v_id;

  -- Insert per-sale allocations
  for v_idx in 1..v_len loop
    v_elem := v_arr[v_idx];
    insert into public.payment_allocations(
      store_id, payment_id, sale_id, amount, created_by
    ) values (
      p_store_id, v_id,
      (v_elem->>'sale_id')::uuid,
      (v_elem->>'amount')::bigint,
      auth.uid()
    );
  end loop;

  -- Record idempotency key for this allocation
  insert into public.payment_allocation_idempotency(
    store_id, idempotency_key, payment_id, request_hash
  ) values (
    p_store_id, v_key, v_id, v_request_hash
  );

  return v_id;
end;
$$;

revoke all on function public.allocate_unallocated_payment(
  uuid, uuid, jsonb, text
) from public, anon;
grant execute on function public.allocate_unallocated_payment(
  uuid, uuid, jsonb, text
) to authenticated;
