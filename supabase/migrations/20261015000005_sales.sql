-- 0005 — Sales, line items, payments. Designed for the atomic checkout RPC
-- (Phase 4): everything a sale needs is snapshotted on the row so receipts and
-- profit stay correct even if the catalog changes later.

create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  sale_number       bigint not null check (sale_number > 0),     -- human receipt number
  customer_id       uuid,                                          -- null = walk-in
  customer_name     text not null default 'Walk-in customer' check (char_length(btrim(customer_name)) between 1 and 120),
  customer_phone    text check (customer_phone is null or char_length(customer_phone) <= 20),
  sold_at           timestamptz not null default now(),
  subtotal          bigint not null check (subtotal >= 0),
  discount          bigint not null default 0 check (discount >= 0),
  total             bigint not null check (total >= 0),
  cost_total        bigint not null check (cost_total >= 0),
  profit            bigint not null,                               -- may be negative after a big discount
  payment_method    text not null check (payment_method in ('cash','card','credit')),
  status            text not null default 'completed' check (status in ('completed','pending','voided')),
  idempotency_key   text not null check (char_length(idempotency_key) between 8 and 100),
  voided_at         timestamptz,
  voided_by         uuid references auth.users(id) on delete set null,
  void_reason       text check (void_reason is null or char_length(void_reason) <= 300),
  created_by        uuid default auth.uid() references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, sale_number),
  unique (store_id, idempotency_key),                              -- blocks duplicate submissions
  foreign key (store_id, customer_id) references public.customers (store_id, id),
  check (discount <= subtotal),
  check (total = subtotal - discount),
  check (profit = total - cost_total),
  check (payment_method <> 'credit' or customer_id is not null),   -- Khata sale needs a registered customer
  check ((status = 'voided') = (voided_at is not null)),
  check (status <> 'pending' or payment_method = 'credit')
);
create index sales_store_date_idx     on public.sales (store_id, sold_at desc);
create index sales_store_customer_idx on public.sales (store_id, customer_id, sold_at desc);
create index sales_store_status_idx   on public.sales (store_id, status);

create table public.sale_items (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  sale_id       uuid not null,
  product_id    uuid not null,
  product_name  text not null,                         -- snapshot
  sku           text,                                  -- snapshot
  quantity      integer not null check (quantity > 0),
  unit_price    bigint  not null check (unit_price >= 0),  -- price actually charged (may be edited on the bill)
  catalog_price bigint  not null check (catalog_price >= 0), -- catalog price at sale time; catalog itself is never changed
  unit_cost     bigint  not null check (unit_cost >= 0),   -- cost at sale time, used for profit
  line_total    bigint  not null,
  line_cost     bigint  not null,
  created_at    timestamptz not null default now(),
  foreign key (store_id, sale_id)    references public.sales (store_id, id) on delete cascade,
  foreign key (store_id, product_id) references public.products (store_id, id),
  check (line_total = quantity * unit_price),
  check (line_cost  = quantity * unit_cost)
);
create index sale_items_sale_idx    on public.sale_items (store_id, sale_id);
create index sale_items_product_idx on public.sale_items (store_id, product_id);

-- How a sale was paid. Card/online are RECORDS ONLY: no payment provider is
-- integrated, nothing here means money was actually charged.
create table public.sale_payments (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  sale_id    uuid not null,
  method     text not null check (method in ('cash','card','khata')),
  amount     bigint not null check (amount > 0),
  reference  text check (reference is null or char_length(reference) <= 100),
  created_at timestamptz not null default now(),
  foreign key (store_id, sale_id) references public.sales (store_id, id) on delete cascade
);
create index sale_payments_sale_idx on public.sale_payments (store_id, sale_id);

-- Now that sales exists, link the Khata ledger to it.
alter table public.khata_entries
  add constraint khata_entries_sale_fk
  foreign key (store_id, sale_id) references public.sales (store_id, id);
