select set_config('session.admin_role', current_user, false);
-- CHECKOUT — atomic create_sale() checks (local plain PostgreSQL only). Runs
-- after phase1_checks.sql (tests.ok / tests.try / tests.as_user / tests.as_admin)
-- and after every migration, including 20261016000012_checkout.sql. Assertions
-- run as the admin role so protected columns (cost_total, profit, unit_cost)
-- are readable through the base tables.

do $$
declare
  u_owner uuid := '20000000-0000-0000-0000-0000000000a1';
  s1 uuid; p1 uuid; p2 uuid; c1 uuid;
  sale1 uuid; num1 bigint; tot1 bigint;
  sale2 uuid; num2 bigint; tot2 bigint;
  items jsonb;
  stock_before int; sales_before bigint; items_before bigint;
  moves_before bigint; pays_before bigint;
begin
  -- Fixture: a fresh owner + store, two products (10 and 4 in stock), one customer.
  insert into auth.users (id, email) values (u_owner, 'checkout@matrix') on conflict do nothing;
  perform tests.as_user(u_owner);
  s1 := public.create_store('Checkout Store');
  perform tests.as_admin();
  insert into public.products (store_id, name, sku, price, cost, stock_quantity)
    values (s1, 'Checkout Tee', 'CK-1', 1000, 700, 10) returning id into p1;
  insert into public.products (store_id, name, sku, price, cost, stock_quantity)
    values (s1, 'Checkout Scarf', 'CK-2', 500, 300, 4) returning id into p2;
  insert into public.customers (store_id, name, phone)
    values (s1, 'Checkout Customer', '03001112233') returning id into c1;

  -- 1. Cash sale: 2 x 1000 minus 100 discount. Totals are computed server-side.
  perform tests.as_user(u_owner);
  select * into sale1, num1, tot1 from public.create_sale(
    s1,
    jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 2, 'unit_price', 1000)),
    'cash', 'checkout-key-0001', 100);
  perform tests.as_admin();
  perform tests.ok(num1 = 1001, 'cash sale gets the first store sale number');
  perform tests.ok(tot1 = 1900, 'cash sale total = subtotal - discount');
  perform tests.ok((select subtotal from public.sales where id = sale1) = 2000
                   and (select cost_total from public.sales where id = sale1) = 1400
                   and (select profit from public.sales where id = sale1) = 500,
                   'cash sale snapshots subtotal, cost and profit');
  perform tests.ok((select status from public.sales where id = sale1) = 'completed',
                   'cash sale is completed');
  perform tests.ok((select stock_quantity from public.products where id = p1) = 8,
                   'cash sale deducts stock (10 -> 8)');
  perform tests.ok((select count(*) from public.sale_items where sale_id = sale1) = 1,
                   'cash sale writes one line item');
  perform tests.ok((select unit_cost from public.sale_items where sale_id = sale1) = 700,
                   'line item uses the catalog cost, not the client');
  perform tests.ok((select count(*) from public.stock_movements
                     where reference_id = sale1 and movement_type = 'sale') = 1,
                   'cash sale writes one stock movement');
  perform tests.ok((select method from public.sale_payments where sale_id = sale1) = 'cash'
                   and (select amount from public.sale_payments where sale_id = sale1) = 1900,
                   'cash payment is recorded with the charged amount');

  -- 2. Duplicate submission: the same idempotency key returns the same sale and
  --    changes nothing (no second sale, no second stock deduction).
  perform tests.as_user(u_owner);
  select * into sale2, num2, tot2 from public.create_sale(
    s1,
    jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 2, 'unit_price', 1000)),
    'cash', 'checkout-key-0001', 100);
  perform tests.as_admin();
  perform tests.ok(sale2 = sale1 and num2 = num1 and tot2 = tot1,
                   'duplicate submission returns the original sale');
  perform tests.ok((select count(*) from public.sales where idempotency_key = 'checkout-key-0001') = 1,
                   'duplicate submission creates no second sale');
  perform tests.ok((select stock_quantity from public.products where id = p1) = 8,
                   'duplicate submission does not deduct stock again');
  perform tests.ok(exists (select 1 from pg_locks
                            where locktype = 'advisory' and pid = pg_backend_pid()),
                   'create_sale serializes same-key callers with a transaction advisory lock');

  -- 3. Credit (Khata) sale: balance and order count move, ledger row is written.
  perform tests.as_user(u_owner);
  select * into sale2, num2, tot2 from public.create_sale(
    s1,
    jsonb_build_array(jsonb_build_object('product_id', p2, 'quantity', 1, 'unit_price', 500)),
    'credit', 'checkout-key-0002', 0, c1);
  perform tests.as_admin();
  perform tests.ok(num2 = 1002 and tot2 = 500, 'credit sale gets the next number and total');
  perform tests.ok((select payment_method from public.sales where id = sale2) = 'credit'
                   and (select status from public.sales where id = sale2) = 'pending',
                   'credit sale is a pending credit sale');
  perform tests.ok((select khata_balance from public.customers where id = c1) = 500,
                   'credit sale raises the Khata balance');
  perform tests.ok((select order_count from public.customers where id = c1) = 1,
                   'credit sale counts the customer order');
  perform tests.ok((select amount_change from public.khata_entries where sale_id = sale2) = 500
                   and (select entry_type from public.khata_entries where sale_id = sale2) = 'credit_sale',
                   'credit sale writes a Khata ledger entry');
  perform tests.ok((select method from public.sale_payments where sale_id = sale2) = 'khata',
                   'credit payment is recorded as khata');
  perform tests.ok((select stock_quantity from public.products where id = p2) = 3,
                   'credit sale deducts stock (4 -> 3)');

  -- 4. Online is a recorded method only (no gateway): accepted on the sale and
  --    on its payment row.
  perform tests.as_user(u_owner);
  select * into sale2, num2, tot2 from public.create_sale(
    s1,
    jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1, 'unit_price', 1000)),
    'online', 'checkout-key-0003', 0, c1, 'Checkout Customer', '03001112233', 'ONLINE-REF-1');
  perform tests.as_admin();
  perform tests.ok((select payment_method from public.sales where id = sale2) = 'online',
                   'online sale records the online method');
  perform tests.ok((select method from public.sale_payments where sale_id = sale2) = 'online'
                   and (select reference from public.sale_payments where sale_id = sale2) = 'ONLINE-REF-1',
                   'online payment is recorded with its reference');
  perform tests.ok((select khata_balance from public.customers where id = c1) = 500
                   and (select order_count from public.customers where id = c1) = 2,
                   'online sale does not touch Khata but counts the order');

  -- 5. Rollback on insufficient stock: nothing of the failed sale survives.
  perform tests.as_admin();
  select stock_quantity into stock_before from public.products where id = p2;
  select count(*) into sales_before from public.sales;
  select count(*) into items_before  from public.sale_items;
  select count(*) into moves_before  from public.stock_movements;
  select count(*) into pays_before   from public.sale_payments;
  items := jsonb_build_array(jsonb_build_object('product_id', p2, 'quantity', 99, 'unit_price', 500));
  perform tests.as_user(u_owner);
  perform tests.ok(tests.try(format('select * from public.create_sale(%L, %L::jsonb, %L, %L)',
                     s1, items::text, 'cash', 'checkout-key-0004')) = '23514',
                   'oversell is rejected with a stock error');
  perform tests.as_admin();
  perform tests.ok((select stock_quantity from public.products where id = p2) = stock_before,
                   'oversell leaves stock unchanged');
  perform tests.ok((select count(*) from public.sales) = sales_before
                   and (select count(*) from public.sale_items) = items_before
                   and (select count(*) from public.stock_movements) = moves_before
                   and (select count(*) from public.sale_payments) = pays_before,
                   'oversell rolls back the sale, items, movements and payments');

  -- 6. Rollback on an unknown product: the sale header never survives.
  perform tests.as_admin();
  sales_before := (select count(*) from public.sales);
  items := jsonb_build_array(jsonb_build_object('product_id', '30000000-0000-0000-0000-0000000000ff',
                                                'quantity', 1, 'unit_price', 10));
  perform tests.as_user(u_owner);
  perform tests.ok(tests.try(format('select * from public.create_sale(%L, %L::jsonb, %L, %L)',
                     s1, items::text, 'cash', 'checkout-key-0005')) = '23503',
                   'unknown product is rejected');
  perform tests.as_admin();
  perform tests.ok((select count(*) from public.sales) = sales_before,
                   'unknown product inserts no sale');

  -- 7. Input validation: idempotency key and credit-without-customer.
  items := jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1, 'unit_price', 1000));
  perform tests.as_user(u_owner);
  perform tests.ok(tests.try(format('select * from public.create_sale(%L, %L::jsonb, %L, %L)',
                     s1, items::text, 'cash', 'short')) = '22023',
                   'idempotency key shorter than 8 characters is rejected');
  perform tests.ok(tests.try(format('select * from public.create_sale(%L, %L::jsonb, %L, %L)',
                     s1, items::text, 'credit', 'checkout-key-0006')) = '22023',
                   'credit sale without a registered customer is rejected');
end $$;

select 'ALL CHECKOUT CHECKS PASSED' as result;
