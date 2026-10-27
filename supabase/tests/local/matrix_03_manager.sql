select set_config('session.admin_role', current_user, false);
-- MATRIX 03 — manager1 checks for the Phase 1 security matrix (local plain
-- PostgreSQL only). Denied means SQLSTATE 42501 OR zero rows returned /
-- affected. Every case first proves, as admin, that a target row exists, so no
-- check can pass on an empty table. Runs after 00_local_stubs.sql,
-- phase1_checks.sql (tests.as_user / tests.as_admin), matrix_01_setup.sql and
-- matrix_02_cashier.sql.

-- One matrix case: the admin seed must count > 0, then the probe runs as
-- manager1. SELECT probes are counted into n, mutations use row_count. Prints
-- 'PASS: <name>' / 'FAIL: <name>' and returns the verdict, so a failing check
-- never stops the script.
create or replace function tests.m_case(p_label text, p_seed text, p_probe text, p_expect text)
returns boolean language plpgsql as $$
declare n bigint := null; st text := null;
begin
  perform tests.as_admin();
  begin
    execute p_seed into n;
  exception when others then
    raise notice 'FAIL: % (admin seed errored with %)', p_label, sqlstate;
    return false;
  end;
  if coalesce(n, 0) = 0 then
    raise notice 'FAIL: % (admin seed found no rows)', p_label;
    return false;
  end if;
  perform tests.as_user('10000000-0000-0000-0000-000000000002');
  begin
    if p_probe ~* '^\s*select' then
      execute p_probe into n;
    else
      execute p_probe;
      get diagnostics n = row_count;
    end if;
  exception when others then
    st := sqlstate;
    n := null;
  end;
  perform tests.as_admin();
  if p_expect = 'denied' then
    if st = '42501' or coalesce(n, 0) = 0 then
      raise notice 'PASS: %', p_label;
      return true;
    end if;
  elsif st is null and coalesce(n, 0) > 0 then
    raise notice 'PASS: %', p_label;
    return true;
  end if;
  raise notice 'FAIL: % (sqlstate %, rows %)', p_label, coalesce(st, 'none'), coalesce(n, -1);
  return false;
end $$;

-- 27 cases as manager1: 18 allowed (the 3 cost views, 1 product read, 11
-- table reads, 3 writes) and 9 denied (the employee directory, the settings
-- and membership writes, and the 2 DELETE probes, which run last).
do $$
declare
  s1    text;
  t     text;
  q     text;
  qs    text;
  qp    text;
  u_owner1  constant text := '10000000-0000-0000-0000-000000000001';
  u_manager constant text := '10000000-0000-0000-0000-000000000002';
  u_cashier constant text := '10000000-0000-0000-0000-000000000003';
  u_owner2  constant text := '10000000-0000-0000-0000-000000000004';
  fails int := 0;
begin
  perform tests.as_admin();
  s1 := (select id::text from public.stores where name = 'Matrix Store 1');
  -- The cost views filter on has_store_role(auth.uid()), so the admin seed for
  -- them needs a store-member identity; the probe still runs as manager1.
  perform set_config('request.jwt.claim.sub', u_owner1, false);

  -- MANAGER ALLOWED — the hidden cost and profit views (0011).
  q := format('select count(*) from public.products_costs where store_id = %L', s1);
  if not tests.m_case('manager can read products_costs', q, q, 'allowed') then fails := fails + 1; end if;
  q := format('select count(*) from public.sales_financials where store_id = %L', s1);
  if not tests.m_case('manager can read sales_financials', q, q, 'allowed') then fails := fails + 1; end if;
  q := format('select count(*) from public.sale_item_costs where store_id = %L', s1);
  if not tests.m_case('manager can read sale_item_costs', q, q, 'allowed') then fails := fails + 1; end if;

  -- MANAGER ALLOWED — till reads plus the money trails cashiers cannot see.
  q := format('select count(*) from (select name, price, stock_quantity from public.products where store_id = %L) z', s1);
  if not tests.m_case('manager can read products name, price, stock_quantity', q, q, 'allowed') then fails := fails + 1; end if;
  foreach t in array array['suppliers','supplier_payments','supplier_entries','purchase_orders',
                           'purchase_order_items','expenses','khata_entries','customer_payments',
                           'stock_movements','customers','store_settings'] loop
    q := format('select count(*) from public.%I where store_id = %L', t, s1);
    if not tests.m_case('manager can read ' || t, q, q, 'allowed') then fails := fails + 1; end if;
  end loop;

  -- MANAGER ALLOWED — the writes a manager is trusted with (0008 / 0010).
  qs := format('select count(*) from public.expenses where store_id = %L', s1);
  qp := format('insert into public.expenses (store_id, title, amount) values (%L, ''Matrix Manager Expense'', 25)', s1);
  if not tests.m_case('manager can insert an expense', qs, qp, 'allowed') then fails := fails + 1; end if;
  qs := format('select count(*) from public.suppliers where store_id = %L', s1);
  qp := format('insert into public.suppliers (store_id, name) values (%L, ''Matrix Manager Supplier'')', s1);
  if not tests.m_case('manager can insert a supplier', qs, qp, 'allowed') then fails := fails + 1; end if;
  qs := format('select count(*) from public.products where store_id = %L', s1);
  qp := format('update public.products set price = price + 0 where store_id = %L', s1);
  if not tests.m_case('manager can update a product price', qs, qp, 'allowed') then fails := fails + 1; end if;

  -- MANAGER DENIED — the employee directory stays owner-only (0010).
  q := format('select count(*) from public.employees where store_id = %L', s1);
  if not tests.m_case('manager cannot read employees', q, q, 'denied') then fails := fails + 1; end if;
  qs := format('select count(*) from public.employees where store_id = %L', s1);
  qp := format('insert into public.employees (store_id, name) values (%L, ''Matrix Probe'')', s1);
  if not tests.m_case('manager cannot insert employees', qs, qp, 'denied') then fails := fails + 1; end if;
  qp := format('update public.employees set name = name where store_id = %L', s1);
  if not tests.m_case('manager cannot update employees', qs, qp, 'denied') then fails := fails + 1; end if;

  -- MANAGER DENIED — settings are owner-writable, memberships are never
  -- writable from the client (definer functions only, Phase 4).
  qs := format('select count(*) from public.store_settings where store_id = %L', s1);
  qp := format('update public.store_settings set show_sku = show_sku where store_id = %L', s1);
  if not tests.m_case('manager cannot update store_settings', qs, qp, 'denied') then fails := fails + 1; end if;
  qs := format('select count(*) from public.store_members where store_id = %L', s1);
  qp := format('insert into public.store_members (store_id, user_id, role) values (%L, %L, ''cashier'')', s1, u_owner2);
  if not tests.m_case('manager cannot insert store_members (owner2 as cashier)', qs, qp, 'denied') then fails := fails + 1; end if;
  qp := format('update public.store_members set role = ''owner'' where store_id = %L and user_id = %L', s1, u_cashier);
  if not tests.m_case('manager cannot promote cashier1 to owner', qs, qp, 'denied') then fails := fails + 1; end if;
  qp := format('update public.store_members set role = ''owner'' where store_id = %L and user_id = %L', s1, u_manager);
  if not tests.m_case('manager cannot promote manager1 himself to owner', qs, qp, 'denied') then fails := fails + 1; end if;

  -- Destructive probes last: if a delete were ever allowed, nothing after it matters.
  qs := format('select count(*) from public.store_members where store_id = %L', s1);
  qp := format('delete from public.store_members where store_id = %L', s1);
  if not tests.m_case('manager cannot delete store_members', qs, qp, 'denied') then fails := fails + 1; end if;
  qs := format('select count(*) from public.employees where store_id = %L', s1);
  qp := format('delete from public.employees where store_id = %L', s1);
  if not tests.m_case('manager cannot delete employees', qs, qp, 'denied') then fails := fails + 1; end if;

  if fails > 0 then
    raise exception 'MANAGER MATRIX FAILED: % check(s) failed', fails;
  end if;
  raise notice 'MANAGER MATRIX OK';
end $$;
