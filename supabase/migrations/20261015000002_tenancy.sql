-- 0002 — Stores (tenants), profiles, membership, settings, number counters.
-- Every business table in later migrations carries store_id. Isolation is
-- enforced by RLS (0008) and by composite foreign keys (store_id, id).

create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  business_type text not null default 'Clothing & garments'
                check (business_type in ('Clothing & garments','Retail boutique','Accessories')),
  phone         text check (phone is null or char_length(phone) <= 30),
  address       text check (address is null or char_length(address) <= 300),
  currency_code text not null default 'PKR' check (currency_code = 'PKR'),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text check (full_name is null or char_length(full_name) <= 120),
  phone      text check (phone is null or char_length(phone) <= 30),
  theme      text not null default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Who may access which store, and with what role.
--   owner   : everything, including store profile/settings
--   manager : catalog, customers, suppliers, expenses, employees, settings
--   cashier : sell, look up products and customers
create table public.store_members (
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','manager','cashier')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_members_user_idx on public.store_members (user_id);
-- A store has exactly one owner (small-shop model).
create unique index store_members_one_owner_idx on public.store_members (store_id) where role = 'owner';

-- Per-store settings (mirrors the Settings screen toggles and defaults).
create table public.store_settings (
  store_id                    uuid primary key references public.stores(id) on delete cascade,
  show_sku                    boolean not null default true,
  warn_low_stock              boolean not null default true,
  ask_customer_each_sale      boolean not null default true,
  allow_discounts             boolean not null default true,
  show_receipt_after_checkout boolean not null default true,
  default_min_stock           integer not null default 5 check (default_min_stock >= 0),
  stock_unit                  text not null default 'Pieces' check (stock_unit in ('Pieces','Sets','Bundles')),
  compact_tables              boolean not null default false,
  receipt_footer              text check (receipt_footer is null or char_length(receipt_footer) <= 300),
  updated_at                  timestamptz not null default now()
  -- "Allow negative inventory" is intentionally NOT stored: negative stock is
  -- rejected by CHECK constraints and cannot be enabled.
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Per-store running numbers for sales (#1001...) and purchase orders (PO-101...).
-- Never exposed to clients; only called from SECURITY DEFINER functions.
create table public.store_counters (
  store_id   uuid not null references public.stores(id) on delete cascade,
  kind       text not null check (kind in ('sale','purchase_order')),
  last_value bigint not null check (last_value >= 0),
  primary key (store_id, kind)
);

-- Membership helpers used by RLS. SECURITY DEFINER so policies on
-- store_members itself cannot recurse.
create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_store_role(p_store_id uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

create or replace function public.next_store_number(p_store_id uuid, p_kind text)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v_start bigint := case p_kind when 'sale' then 1000 when 'purchase_order' then 100 else null end;
  v_next  bigint;
begin
  if v_start is null then
    raise exception 'unknown counter kind %', p_kind;
  end if;
  insert into public.store_counters as c (store_id, kind, last_value)
  values (p_store_id, p_kind, v_start + 1)
  on conflict (store_id, kind) do update set last_value = c.last_value + 1
  returning c.last_value into v_next;
  return v_next;
end;
$$;
