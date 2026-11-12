-- Harden the SECURITY DEFINER archive RPC without rewriting an applied migration.
create or replace function public.archive_product(
  p_store_id uuid,
  p_product_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or
     not public.has_store_role(p_store_id, array['owner','manager']::text[]) then
    raise exception 'Owner or manager access required.' using errcode = '42501';
  end if;

  update public.products
  set is_active = false
  where id = p_product_id and store_id = p_store_id and is_active = true;

  if not found then
    raise exception 'Product not found or already inactive.';
  end if;

  return true;
end;
$$;
