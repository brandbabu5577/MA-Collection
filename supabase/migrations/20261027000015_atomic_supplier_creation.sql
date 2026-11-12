-- Atomic, retry-safe supplier creation with an optional opening payable.
-- Additive migration: existing supplier records and ledger rows are untouched.
alter table public.suppliers add column if not exists create_idempotency_key text;
alter table public.suppliers add column if not exists create_request_hash text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.suppliers'::regclass and conname='suppliers_create_idempotency_key_check') then
    alter table public.suppliers add constraint suppliers_create_idempotency_key_check
      check (create_idempotency_key is null or char_length(create_idempotency_key) between 8 and 100);
  end if;
end $$;
create unique index if not exists suppliers_store_create_idempotency_uidx
  on public.suppliers(store_id,create_idempotency_key) where create_idempotency_key is not null;

create or replace function public.create_supplier_with_opening_balance(
  p_store_id uuid,
  p_name text,
  p_contact_person text,
  p_phone text,
  p_category text,
  p_opening_balance bigint,
  p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_key text := btrim(coalesce(p_idempotency_key,''));
  v_name text := btrim(coalesce(p_name,''));
  v_contact text := nullif(btrim(p_contact_person),'');
  v_phone text := nullif(btrim(p_phone),'');
  v_category text := nullif(btrim(p_category),'');
  v_hash text;
  v_prior_hash text;
begin
  if auth.uid() is null or not public.has_store_role(p_store_id,array['owner','manager']) then
    raise exception 'owner or manager access required' using errcode='42501';
  end if;
  if length(v_name) not between 1 and 120
     or (v_contact is not null and length(v_contact)>120)
     or (v_phone is not null and length(v_phone)>30)
     or (v_category is not null and length(v_category)>80)
     or p_opening_balance is null or p_opening_balance<0
     or length(v_key) not between 8 and 100 then
    raise exception 'invalid supplier details or opening balance' using errcode='22023';
  end if;

  v_hash := md5(jsonb_build_object('name',v_name,'contact_person',v_contact,'phone',v_phone,
    'category',v_category,'opening_balance',p_opening_balance)::text);
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':supplier-create:'||v_key,0));
  select id,create_request_hash into v_id,v_prior_hash
    from public.suppliers where store_id=p_store_id and create_idempotency_key=v_key;
  if found then
    if v_prior_hash is distinct from v_hash then
      raise exception 'idempotency key reused with different supplier data' using errcode='22023';
    end if;
    return v_id;
  end if;

  insert into public.suppliers(store_id,name,contact_person,phone,category,payable_balance,create_idempotency_key,create_request_hash)
  values(p_store_id,v_name,v_contact,v_phone,v_category,p_opening_balance,v_key,v_hash)
  returning id into v_id;
  if p_opening_balance>0 then
    insert into public.supplier_entries(store_id,supplier_id,entry_type,amount_change,balance_after,note,created_by)
    values(p_store_id,v_id,'opening_balance',p_opening_balance,p_opening_balance,'Opening balance',auth.uid());
  end if;
  return v_id;
end; $$;

revoke all on function public.create_supplier_with_opening_balance(uuid,text,text,text,text,bigint,text) from public,anon;
grant execute on function public.create_supplier_with_opening_balance(uuid,text,text,text,text,bigint,text) to authenticated;
