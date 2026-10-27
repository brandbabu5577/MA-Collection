-- 0006 — Suppliers, supplier ledger, purchase orders with line items.
-- Design decision (documented assumption): receiving a purchase order adds its
-- value to what the shop owes the supplier (payable_balance) and adds the stock,
-- both inside one function and both with audit rows.

create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  contact_person  text check (contact_person is null or char_length(contact_person) <= 120),
  phone           text check (phone is null or char_length(phone) <= 30),
  email           text check (email is null or char_length(email) <= 200),
  category        text check (category is null or char_length(category) <= 80),
  payable_balance bigint not null default 0 check (payable_balance >= 0), -- amount we owe the supplier, PKR
  notes           text check (notes is null or char_length(notes) <= 500),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (store_id, id)
);
create unique index suppliers_store_name_uidx on public.suppliers (store_id, lower(btrim(name)));
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

create table public.supplier_payments (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  supplier_id     uuid not null,
  amount          bigint not null check (amount > 0),
  method          text not null default 'cash' check (method in ('cash','bank_transfer','card','online','other')),
  note            text check (note is null or char_length(note) <= 300),
  paid_at         timestamptz not null default now(),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, idempotency_key),
  foreign key (store_id, supplier_id) references public.suppliers (store_id, id)
);
create index supplier_payments_supplier_idx on public.supplier_payments (store_id, supplier_id, paid_at desc);

create table public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  po_number   bigint not null check (po_number > 0),
  supplier_id uuid not null,
  order_date  date not null default current_date,
  status      text not null default 'pending' check (status in ('pending','received','cancelled')),
  total       bigint not null default 0 check (total >= 0),
  note        text check (note is null or char_length(note) <= 500),
  received_at timestamptz,
  received_by uuid references auth.users(id) on delete set null,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, po_number),
  foreign key (store_id, supplier_id) references public.suppliers (store_id, id),
  check ((status = 'received') = (received_at is not null))
);
create index purchase_orders_store_date_idx     on public.purchase_orders (store_id, order_date desc);
create index purchase_orders_store_supplier_idx on public.purchase_orders (store_id, supplier_id);
create trigger purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create table public.purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  purchase_order_id uuid not null,
  product_id        uuid,                                -- null = item not yet in the catalog
  description       text not null check (char_length(btrim(description)) between 1 and 160),
  quantity_ordered  integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost         bigint  not null check (unit_cost >= 0),
  line_total        bigint  not null,
  foreign key (store_id, purchase_order_id) references public.purchase_orders (store_id, id) on delete cascade,
  foreign key (store_id, product_id)        references public.products (store_id, id),
  check (quantity_received <= quantity_ordered),
  check (line_total = quantity_ordered * unit_cost)
);
create index po_items_po_idx      on public.purchase_order_items (store_id, purchase_order_id);
create index po_items_product_idx on public.purchase_order_items (store_id, product_id);

-- A PO's total must equal the sum of its lines whenever it has lines.
-- Deferred so lines and header can be written in any order inside one transaction.
create or replace function public.check_po_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row   jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_po_id uuid  := (case tg_table_name when 'purchase_orders' then v_row->>'id'
                                       else v_row->>'purchase_order_id' end)::uuid;
  v_store uuid  := (v_row->>'store_id')::uuid;
  v_sum   bigint;
  v_cnt   bigint;
  v_total bigint;
begin
  select coalesce(sum(line_total),0), count(*) into v_sum, v_cnt
    from public.purchase_order_items where store_id = v_store and purchase_order_id = v_po_id;
  select total into v_total from public.purchase_orders where store_id = v_store and id = v_po_id;
  if v_total is not null and v_cnt > 0 and v_total <> v_sum then
    raise exception 'purchase order total % does not match sum of items %', v_total, v_sum
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;
create constraint trigger po_total_matches_items_items
  after insert or update or delete on public.purchase_order_items
  deferrable initially deferred for each row execute function public.check_po_total();
create constraint trigger po_total_matches_items_header
  after insert or update of total on public.purchase_orders
  deferrable initially deferred for each row execute function public.check_po_total();

-- Append-only supplier ledger (what the shop owes each supplier).
create table public.supplier_entries (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  supplier_id       uuid not null,
  entry_type        text not null check (entry_type in ('opening_balance','purchase_received','payment','adjustment')),
  amount_change     bigint not null check (amount_change <> 0), -- > 0 we owe more, < 0 we paid
  balance_after     bigint not null check (balance_after >= 0),
  purchase_order_id uuid,
  payment_id        uuid,
  note              text check (note is null or char_length(note) <= 300),
  created_by        uuid default auth.uid() references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  foreign key (store_id, supplier_id)       references public.suppliers (store_id, id),
  foreign key (store_id, purchase_order_id) references public.purchase_orders (store_id, id),
  foreign key (store_id, payment_id)        references public.supplier_payments (store_id, id),
  check (entry_type <> 'purchase_received' or (purchase_order_id is not null and amount_change > 0)),
  check (entry_type <> 'payment'           or (payment_id is not null and amount_change < 0))
);
create index supplier_entries_supplier_idx on public.supplier_entries (store_id, supplier_id, created_at desc);
create trigger supplier_entries_append_only before update or delete on public.supplier_entries
  for each row execute function public.prevent_mutation();
