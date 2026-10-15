-- 0007 — Expenses and employee directory.

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  category     text not null default 'Supplies'
               check (category in ('Rent','Utilities','Supplies','Transport','Salaries','Other')),
  amount       bigint not null check (amount > 0),
  expense_date date not null default current_date,
  note         text check (note is null or char_length(note) <= 300),
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_store_date_idx on public.expenses (store_id, expense_date desc);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- Staff directory (what the Employees screen shows). Optionally linked to a
-- login; the login's access level lives in store_members, not here.
create table public.employees (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  role_title text not null default 'Sales assistant' check (char_length(btrim(role_title)) between 1 and 80),
  phone      text check (phone is null or char_length(phone) <= 30),
  status     text not null default 'active' check (status in ('active','inactive')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employees_store_idx on public.employees (store_id, status);
create unique index employees_store_user_uidx on public.employees (store_id, user_id) where user_id is not null;
create trigger employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();
