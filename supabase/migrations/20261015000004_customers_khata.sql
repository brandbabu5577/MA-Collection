-- 0004 — Customers, customer payments, Khata/Udhaar ledger.
-- customers.khata_balance and order_count are cached totals maintained only by
-- SECURITY DEFINER functions; every change is backed by a khata_entries row.

create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  phone         text check (phone is null or char_length(phone) between 7 and 20),
  email         text check (email is null or char_length(email) <= 200),
  notes         text check (notes is null or char_length(notes) <= 500),
  khata_balance bigint  not null default 0 check (khata_balance >= 0), -- amount customer owes, PKR
  order_count   integer not null default 0 check (order_count >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, id)
);
create unique index customers_store_phone_uidx on public.customers (store_id, phone) where phone is not null;
create index customers_store_name_idx on public.customers (store_id, lower(name));
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Money received from a customer against their Khata balance.
create table public.customer_payments (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  customer_id     uuid not null,
  amount          bigint not null check (amount > 0),
  method          text not null default 'cash' check (method in ('cash','bank_transfer','card','online','other')),
  note            text check (note is null or char_length(note) <= 300),
  received_at     timestamptz not null default now(),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, idempotency_key),
  foreign key (store_id, customer_id) references public.customers (store_id, id)
);
create index customer_payments_customer_idx on public.customer_payments (store_id, customer_id, received_at desc);

-- Append-only Khata ledger. amount_change > 0 increases what the customer owes
-- (credit sale), < 0 reduces it (payment). balance_after is the running balance.
-- The sale_id / payment_id foreign keys are added in 0005 once `sales` exists.
create table public.khata_entries (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  customer_id   uuid not null,
  entry_type    text not null check (entry_type in ('credit_sale','payment','adjustment','sale_void')),
  amount_change bigint not null check (amount_change <> 0),
  balance_after bigint not null check (balance_after >= 0),
  sale_id       uuid,
  payment_id    uuid,
  note          text check (note is null or char_length(note) <= 300),
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  foreign key (store_id, customer_id) references public.customers (store_id, id),
  foreign key (store_id, payment_id)  references public.customer_payments (store_id, id),
  check (entry_type <> 'credit_sale' or (sale_id is not null and amount_change > 0)),
  check (entry_type <> 'payment'     or (payment_id is not null and amount_change < 0))
);
create index khata_entries_customer_idx on public.khata_entries (store_id, customer_id, created_at desc);
create trigger khata_entries_append_only before update or delete on public.khata_entries
  for each row execute function public.prevent_mutation();
