-- 0009 — Onboarding: profile auto-creation and create_store().
-- A signed-in user creates their own store through this function (a direct
-- INSERT into stores is not permitted). It makes them the owner and creates the
-- default settings. No demo data is inserted.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_store(
  p_name          text,
  p_business_type text default 'Clothing & garments',
  p_phone         text default null,
  p_address       text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_store uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if exists (select 1 from public.store_members where user_id = v_user and role = 'owner') then
    raise exception 'this account already owns a store' using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

  insert into public.stores (name, business_type, phone, address, created_by)
  values (p_name, coalesce(p_business_type, 'Clothing & garments'), p_phone, p_address, v_user)
  returning id into v_store;

  insert into public.store_members (store_id, user_id, role) values (v_store, v_user, 'owner');
  insert into public.store_settings (store_id) values (v_store);
  return v_store;
end;
$$;

revoke all on function public.create_store(text, text, text, text) from public, anon;
grant execute on function public.create_store(text, text, text, text) to authenticated;
