select set_config('session.admin_role', current_user, false);
-- KHATA PAYMENT + STOCK ADJUSTMENT checks (local plain PostgreSQL only).
-- Runs after checkout_checks.sql and migration 0014.
do $$
declare
  u_owner uuid := '30000000-0000-0000-0000-0000000000a1';
  u_cash  uuid := '30000000-0000-0000-0000-0000000000a2';
  u_out   uuid := '30000000-0000-0000-0000-0000000000a3';
  s1 uuid; s2 uuid; p1 uuid; c1 uuid;
  pay1 uuid; bal bigint; pay2 uuid; bal2 bigint; st int; r text;
begin
  insert into auth.users (id, email) values (u_owner,'kp-owner@t'),(u_cash,'kp-cash@t'),(u_out,'kp-out@t') on conflict do nothing;
  perform tests.as_user(u_owner);  s1 := public.create_store('Khata Store');
  perform tests.as_user(u_out);    s2 := public.create_store('Other Store');
  perform tests.as_admin();
  insert into public.store_members (store_id, user_id, role) values (s1, u_cash, 'cashier');
  insert into public.products (store_id, name, sku, price, cost, stock_quantity)
    values (s1, 'KP Shirt', 'KP-1', 1000, 600, 10) returning id into p1;
  insert into public.customers (store_id, name, phone) values (s1, 'KP Customer', '03005556677') returning id into c1;

  -- Credit sale of 2000 gives the customer a Khata balance.
  perform tests.as_user(u_owner);
  perform public.create_sale(s1, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 2, 'unit_price', 1000)),
                             'credit', 'kp-sale-0001', 0, c1);
  perform tests.as_admin();
  perform tests.ok((select khata_balance from public.customers where id = c1) = 2000, 'credit sale sets Khata balance to 2000');

  -- Cashier records a 500 repayment.
  perform tests.as_user(u_cash);
  select * into pay1, bal from public.record_khata_payment(s1, c1, 500, 'kp-pay-0001', 'cash', 'first instalment');
  perform tests.as_admin();
  perform tests.ok(bal = 1500, 'repayment returns the new balance (2000 - 500)');
  perform tests.ok((select khata_balance from public.customers where id = c1) = 1500, 'repayment lowers the cached balance');
  perform tests.ok((select count(*) from public.customer_payments where id = pay1 and amount = 500) = 1, 'repayment writes one customer_payments row');
  perform tests.ok((select count(*) from public.khata_entries where payment_id = pay1 and amount_change = -500 and balance_after = 1500) = 1,
                   'repayment writes one append-only ledger row with the running balance');

  -- Duplicate submission returns the same payment and changes nothing.
  perform tests.as_user(u_cash);
  select * into pay2, bal2 from public.record_khata_payment(s1, c1, 500, 'kp-pay-0001');
  perform tests.as_admin();
  perform tests.ok(pay2 = pay1 and bal2 = 1500, 'duplicate repayment returns the original payment');
  perform tests.ok((select count(*) from public.customer_payments where customer_id = c1) = 1, 'duplicate repayment creates no second payment');

  -- Over-payment, zero and other-store callers are rejected.
  perform tests.as_user(u_cash);
  r := tests.try(format('select * from public.record_khata_payment(%L, %L, 5000, %L)', s1, c1, 'kp-pay-0002'));
  perform tests.ok(r = '22023', 'repayment above the outstanding balance is rejected');
  r := tests.try(format('select * from public.record_khata_payment(%L, %L, 0, %L)', s1, c1, 'kp-pay-0003'));
  perform tests.ok(r = '22023', 'zero repayment is rejected');
  perform tests.as_user(u_out);
  r := tests.try(format('select * from public.record_khata_payment(%L, %L, 100, %L)', s1, c1, 'kp-pay-0004'));
  perform tests.ok(r = '42501', 'another store''s user cannot record a repayment');
  perform tests.as_anon();
  r := tests.try(format('select * from public.record_khata_payment(%L, %L, 100, %L)', s1, c1, 'kp-pay-0005'));
  perform tests.ok(r <> 'OK', 'anonymous caller cannot record a repayment');
  perform tests.as_admin();
  perform tests.ok((select khata_balance from public.customers where id = c1) = 1500, 'rejected repayments leave the balance unchanged');

  -- Ledger stays append-only.
  r := tests.try(format('update public.khata_entries set amount_change = -1 where payment_id = %L', pay1));
  perform tests.ok(r <> 'OK', 'khata_entries cannot be edited, even by admin');

  -- Stock adjustment: stock is 8 after the credit sale.
  perform tests.ok((select stock_quantity from public.products where id = p1) = 8, 'stock is 8 after selling 2');
  perform tests.as_user(u_owner);
  st := public.adjust_stock(s1, p1, 'add', 5, 'new delivery');
  perform tests.as_admin();
  perform tests.ok(st = 13, 'add 5 -> 13');
  perform tests.as_user(u_owner);
  st := public.adjust_stock(s1, p1, 'remove', 3, 'damaged');
  perform tests.as_admin();
  perform tests.ok(st = 10, 'remove 3 -> 10');
  perform tests.as_user(u_owner);
  st := public.adjust_stock(s1, p1, 'set', 7, 'stock count');
  perform tests.as_admin();
  perform tests.ok(st = 7 and (select stock_quantity from public.products where id = p1) = 7, 'set -> 7');
  perform tests.ok((select count(*) from public.stock_movements where product_id = p1 and movement_type like 'adjustment_%') = 3,
                   'each adjustment writes one stock movement');
  perform tests.as_user(u_owner);
  r := tests.try(format('select public.adjust_stock(%L, %L, %L, 50)', s1, p1, 'remove'));
  perform tests.ok(r = '22023', 'cannot remove more than is in stock');
  perform tests.as_user(u_cash);
  r := tests.try(format('select public.adjust_stock(%L, %L, %L, 1)', s1, p1, 'add'));
  perform tests.ok(r = '42501', 'cashier cannot adjust stock');
  perform tests.as_user(u_out);
  r := tests.try(format('select public.adjust_stock(%L, %L, %L, 1)', s1, p1, 'add'));
  perform tests.ok(r = '42501', 'another store''s owner cannot adjust stock');
  perform tests.as_admin();
  perform tests.ok((select stock_quantity from public.products where id = p1) = 7, 'rejected adjustments leave stock unchanged');
end $$;
select 'ALL KHATA/STOCK CHECKS PASSED' as result;
