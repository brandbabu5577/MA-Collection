select set_config('session.admin_role', current_user, false);
-- MATRIX 02 — cashier1 checks for the Phase 1 security matrix (local plain
-- PostgreSQL only). Denied means SQLSTATE 42501 OR zero rows returned /
-- affected. Every case first proves, as admin, that a target row exists, so no
-- check can pass on an empty table. Runs after 00_local_stubs.sql,
-- phase1_checks.sql (tests.as_user / tests.as_admin) and matrix_01_setup.sql.

-- One matrix case: the admin seed must count > 0, then the probe runs as
-- cashier1. SELECT probes are counted into n, mutations use row_count. Prints
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
  perform tests.as_user('10000000-0000-0000-0000-000000000003');
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

-- 25 cases as cashier1: 14 denied reads, 7 denied writes, 4 allowed actions.
do $$
declare
  s1    text;
  t     text;
  q     text;
  qs    text;
  qp    text;
  u_owner2 constant text := '10000000-0000-0000-0000-000000000004';
  fails int := 0;
begin
  perform tests.as_admin();
  s1 := (select id::text from public.stores where name = 'Matrix Store 1');

  -- CASHIER DENIED — cost and profit columns.
  q := format('select count(*) from (select cost from public.products where store_id = %L) z', s1);
  if not tests.m_case('cashier cannot read products.cost', q, q, 'denied') then fails := fails + 1; end if;
  q := format('select count(*) from (select cost_total, profit from public.sales where store_id = %L) z', s1);
  if not tests.m_case('cashier cannot read sales.cost_total and profit', q, q, 'denied') then fails := fails + 1; end if;
  q := format('select count(*) from (select unit_cost from public.sale_items where store_id = %L) z', s1);
  if not tests.m_case('cashier cannot read sale_items.unit_cost', q, q, 'denied') then fails := fails + 1; end if;

  -- CASHIER DENIED — purchasing, expense, payroll and ledger tables.
  foreach t in array array['suppliers','supplier_payments','supplier_entries','purchase_orders',
                           'purchase_order_items','expenses','employees','khata_entries',
                           'customer_payments','stock_movements'] loop
    q := format('select count(*) from public.%I where store_id = %L', t, s1);
    if not tests.m_case('cashier cannot read ' || t, q, q, 'denied') then fails := fails + 1; end if;
  end loop;

  -- CASHIER DENIED — only the cashier's own store_members row may be visible.
  q := format('select count(*) from public.store_members where store_id = %L and user_id <> %L',
              s1, '10000000-0000-0000-0000-000000000003');
  if not tests.m_case('cashier cannot see other store_members rows', q, q, 'denied') then fails := fails + 1; end if;

  -- CASHIER DENIED — store settings and membership writes.
  qs := format('select count(*) from public.store_settings where store_id = %L', s1);
  qp := format('update public.store_settings set show_sku = show_sku where store_id = %L', s1);
  if not tests.m_case('cashier cannot update store_settings', qs, qp, 'denied') then fails := fails + 1; end if;
  qs := format('select count(*) from public.store_members where store_id = %L', s1);
  qp := format('insert into public.store_members (store_id, user_id, role) values (%L, %L, ''cashier'')', s1, u_owner2);
  if not tests.m_case('cashier cannot insert store_members', qs, qp, 'denied') then fails := fails + 1; end if;
  qp := format('update public.store_members set role = role where store_id = %L', s1);
  if not tests.m_case('cashier cannot update store_members', qs, qp, 'denied') then fails := fails + 1; end if;

  -- CASHIER DENIED — employee directory writes.
  qs := format('select count(*) from public.employees where store_id = %L', s1);
  qp := format('insert into public.employees (store_id, name) values (%L, ''Matrix Probe'')', s1);
  if not tests.m_case('cashier cannot insert employees', qs, qp, 'denied') then fails := fails + 1; end if;
  qp := format('update public.employees set name = name where store_id = %L', s1);
  if not tests.m_case('cashier cannot update employees', qs, qp, 'denied') then fails := fails + 1; end if;

  -- CASHIER ALLOWED — till work: products, customers, settings, new walk-in.
  q := format('select count(*) from (select name, price, stock_quantity from public.products where store_id = %L) z', s1);
  if not tests.m_case('cashier can read products name, price, stock_quantity', q, q, 'allowed') then fails := fails + 1; end if;
  q := format('select count(*) from (select name, khata_balance from public.customers where store_id = %L) z', s1);
  if not tests.m_case('cashier can read customers incl. khata_balance', q, q, 'allowed') then fails := fails + 1; end if;
  q := format('select count(*) from public.store_settings where store_id = %L', s1);
  if not tests.m_case('cashier can read store_settings', q, q, 'allowed') then fails := fails + 1; end if;
  qs := format('select count(*) from public.customers where store_id = %L', s1);
  qp := format('insert into public.customers (store_id, name) values (%L, ''Matrix Till Customer'')', s1);
  if not tests.m_case('cashier can insert a customer', qs, qp, 'allowed') then fails := fails + 1; end if;

  -- Destructive probes last: if a delete were ever allowed, nothing after it matters.
  qs := format('select count(*) from public.store_members where store_id = %L', s1);
  qp := format('delete from public.store_members where store_id = %L', s1);
  if not tests.m_case('cashier cannot delete store_members', qs, qp, 'denied') then fails := fails + 1; end if;
  qs := format('select count(*) from public.employees where store_id = %L', s1);
  qp := format('delete from public.employees where store_id = %L', s1);
  if not tests.m_case('cashier cannot delete employees', qs, qp, 'denied') then fails := fails + 1; end if;

  if fails > 0 then
    raise exception 'CASHIER MATRIX FAILED: % check(s) failed', fails;
  end if;
  raise notice 'CASHIER MATRIX OK';
end $$;
