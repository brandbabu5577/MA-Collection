-- 0003 — Categories, products, stock movement history.
-- products.stock_quantity is a cached running total. It is NOT writable by
-- clients (see 0008); it changes only through SECURITY DEFINER functions that
-- also append a row to stock_movements.

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, id)
);
create unique index categories_store_name_uidx on public.categories (store_id, lower(btrim(name)));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  category_id    uuid,
  name           text not null check (char_length(btrim(name)) between 1 and 160),
  sku            text check (sku is null or char_length(btrim(sku)) between 1 and 60),
  price          bigint not null check (price >= 0),   -- selling price, PKR
  cost           bigint not null check (cost  >= 0),   -- unit cost, PKR
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  min_stock      integer not null default 5 check (min_stock >= 0),
  color          text check (color is null or char_length(color) <= 60),
  size           text check (size  is null or char_length(size)  <= 60),
  is_active      boolean not null default true,        -- soft delete: sold products are never hard-deleted
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (store_id, id),
  -- Same-store category only. Deleting a category leaves products uncategorised.
  foreign key (store_id, category_id) references public.categories (store_id, id)
    on delete set null (category_id)
);
create unique index products_store_sku_uidx on public.products (store_id, sku) where sku is not null;
create index products_store_name_idx     on public.products (store_id, lower(name));
create index products_store_category_idx on public.products (store_id, category_id);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Append-only history of every stock change.
create table public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  product_id      uuid not null,
  movement_type   text not null check (movement_type in (
                    'opening_stock','adjustment_add','adjustment_remove','adjustment_set',
                    'sale','sale_void','purchase_receipt','return')),
  quantity_change integer not null check (quantity_change <> 0),
  quantity_after  integer not null check (quantity_after >= 0),
  reason          text check (reason is null or char_length(reason) <= 300),
  reference_type  text check (reference_type in ('sale','purchase_order')),
  reference_id    uuid,
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (store_id, product_id) references public.products (store_id, id)
);
create index stock_movements_product_idx on public.stock_movements (store_id, product_id, created_at desc);
create index stock_movements_ref_idx     on public.stock_movements (store_id, reference_type, reference_id);
create trigger stock_movements_append_only before update or delete on public.stock_movements
  for each row execute function public.prevent_mutation();
