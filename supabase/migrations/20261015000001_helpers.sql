-- 0001 — Shared trigger helpers.
-- Money rule for this whole schema: every money column is BIGINT holding whole
-- Pakistani rupees (PKR), matching the frontend, which only accepts whole
-- numbers. There is no floating point anywhere in this schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Used on audit tables (stock movements, ledgers): rows are append-only.
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A cascading delete caused by removing a whole store runs at trigger depth > 1
  -- and is allowed; any direct UPDATE/DELETE is rejected.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception '% rows are append-only; % is not allowed', tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;
