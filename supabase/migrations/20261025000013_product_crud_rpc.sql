create or replace function public.save_product(
  p_store_id uuid,
  p_product_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_price bigint,
  p_cost bigint,
  p_stock_quantity integer,
  p_min_stock integer,
  p_color text,
  p_size text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_product_id uuid;
  v_old_stock integer := 0;
  v_is_new boolean;
begin
  if auth.uid() is null or
     not public.has_store_role(p_store_id, array['owner','manager']::text[]) then
    raise exception 'Owner or manager access required.' using errcode = '42501';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 160
     or p_sku is null or char_length(btrim(p_sku)) not between 1 and 60
     or p_category is null or char_length(btrim(p_category)) not between 1 and 80
     or p_price is null or p_price <= 0
     or p_cost is null or p_cost < 0
     or p_stock_quantity is null or p_stock_quantity < 0
     or p_min_stock is null or p_min_stock < 0
     or (p_color is not null and char_length(p_color) > 60)
     or (p_size is not null and char_length(p_size) > 60) then
    raise exception 'Invalid product details.';
  end if;

  select id into v_category_id
  from public.categories
  where store_id = p_store_id
    and lower(btrim(name)) = lower(btrim(p_category))
  limit 1;

  if v_category_id is null then
    begin
      insert into public.categories(store_id, name)
      values (p_store_id, btrim(p_category))
      returning id into v_category_id;
    exception when unique_violation then
      select id into v_category_id
      from public.categories
      where store_id = p_store_id
        and lower(btrim(name)) = lower(btrim(p_category));
    end;
  end if;

  v_is_new := p_product_id is null;

  if v_is_new then
    insert into public.products
      (store_id, category_id, name, sku, price, cost, min_stock, color, size)
    values
      (p_store_id, v_category_id, btrim(p_name), btrim(p_sku),
       p_price, p_cost, p_min_stock, nullif(btrim(p_color), ''),
       nullif(btrim(p_size), ''))
    returning id into v_product_id;
  else
    select stock_quantity into v_old_stock
    from public.products
    where id = p_product_id and store_id = p_store_id and is_active = true
    for update;

    if not found then
      raise exception 'Product not found or inactive.';
    end if;

    v_product_id := p_product_id;

    update public.products
    set category_id = v_category_id,
        name = btrim(p_name),
        sku = btrim(p_sku),
        price = p_price,
        cost = p_cost,
        min_stock = p_min_stock,
        color = nullif(btrim(p_color), ''),
        size = nullif(btrim(p_size), '')
    where id = v_product_id and store_id = p_store_id;
  end if;

  if p_stock_quantity <> v_old_stock then
    update public.products
    set stock_quantity = p_stock_quantity
    where id = v_product_id and store_id = p_store_id;

    insert into public.stock_movements
      (store_id, product_id, movement_type, quantity_change,
       quantity_after, reason, created_by)
    values (
      p_store_id, v_product_id,
      case
        when v_is_new then 'opening_stock'
        when p_stock_quantity > v_old_stock then 'adjustment_add'
        else 'adjustment_remove'
      end,
      p_stock_quantity - v_old_stock,
      p_stock_quantity,
      'Product form stock adjustment',
      auth.uid()
    );
  end if;

  return v_product_id;
end;
$$;

create or replace function public.archive_product(
  p_store_id uuid,
  p_product_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
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

revoke all on function public.save_product(uuid,uuid,text,text,text,bigint,bigint,integer,integer,text,text) from public, anon;
revoke all on function public.archive_product(uuid,uuid) from public, anon;

grant execute on function public.save_product(uuid,uuid,text,text,text,bigint,bigint,integer,integer,text,text) to authenticated;
grant execute on function public.archive_product(uuid,uuid) to authenticated;
