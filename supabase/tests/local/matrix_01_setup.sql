-- MATRIX SETUP — fixture for the Phase 1 security matrix (local plain PostgreSQL only).
-- Seeds data only: no assertions here, security_matrix_checks.sql does those.
-- Depends on 00_local_stubs.sql and phase1_tests helpers from phase1_checks.sql
-- (tests.as_user / tests.as_admin), which must run first in the same database.
select set_config('session.admin_role', current_user, false);  -- as in phase1_checks.sql

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001','owner1@matrix'),
  ('10000000-0000-0000-0000-000000000002','manager1@matrix'),
  ('10000000-0000-0000-0000-000000000003','cashier1@matrix'),
  ('10000000-0000-0000-0000-000000000004','owner2@matrix');

do $$
declare
  u_owner1  uuid := '10000000-0000-0000-0000-000000000001';
  u_manager uuid := '10000000-0000-0000-0000-000000000002';
  u_cashier uuid := '10000000-0000-0000-0000-000000000003';
  u_owner2  uuid := '10000000-0000-0000-0000-000000000004';
  s1 uuid; s2 uuid;
  cat1 uuid; prod1 uuid; cust1 uuid; sale1 uuid; sup1 uuid; po1 uuid;
begin
  -- 1. One store per owner, created through the real onboarding RPC.
  perform tests.as_user(u_owner1);
  s1 := public.create_store('Matrix Store 1');
  perform tests.as_user(u_owner2);
  s2 := public.create_store('Matrix Store 2');

  -- 2. Admin adds a manager and a cashier to store 1 (store 2 gets no members).
  perform tests.as_admin();
  insert into public.store_members (store_id, user_id, role) values
    (s1, u_manager, 'manager'),
    (s1, u_cashier, 'cashier');

  -- 3. Exactly one seed row per business table, all in store 1; store 2 stays empty.
  insert into public.categories (store_id, name)
    values (s1, 'Matrix Category') returning id into cat1;
  insert into public.products (store_id, category_id, name, sku, price, cost)
    values (s1, cat1, 'Matrix Product', 'MX-1', 1000, 700) returning id into prod1;
  insert into public.customers (store_id, name, phone)
    values (s1, 'Matrix Customer', '03001234567') returning id into cust1;
  insert into public.sales (store_id, sale_number, customer_id, subtotal, total,
                           cost_total, profit, payment_method, idempotency_key)
    values (s1, public.next_store_number(s1, 'sale'), cust1, 1000, 1000,
            700, 300, 'cash', 'matrix-sale-0001') returning id into sale1;
  insert into public.sale_items (store_id, sale_id, product_id, product_name, quantity,
                                 unit_price, catalog_price, unit_cost, line_total, line_cost)
    values (s1, sale1, prod1, 'Matrix Product', 1, 1000, 1000, 700, 1000, 700);
  insert into public.customer_payments (store_id, customer_id, amount, idempotency_key)
    values (s1, cust1, 100, 'matrix-cp-0001');
  insert into public.khata_entries (store_id, customer_id, entry_type, amount_change, balance_after, sale_id)
    values (s1, cust1, 'credit_sale', 1000, 1000, sale1);
  insert into public.stock_movements (store_id, product_id, movement_type, quantity_change, quantity_after)
    values (s1, prod1, 'opening_stock', 10, 10);
  insert into public.suppliers (store_id, name)
    values (s1, 'Matrix Supplier') returning id into sup1;
  insert into public.supplier_payments (store_id, supplier_id, amount, idempotency_key)
    values (s1, sup1, 100, 'matrix-sp-0001');
  insert into public.supplier_entries (store_id, supplier_id, entry_type, amount_change, balance_after)
    values (s1, sup1, 'opening_balance', 500, 500);
  insert into public.purchase_orders (store_id, po_number, supplier_id, total, idempotency_key)
    values (s1, public.next_store_number(s1, 'purchase_order'), sup1, 700, 'matrix-po-fixture-001') returning id into po1;
  insert into public.purchase_order_items (store_id, purchase_order_id, description,
                                           quantity_ordered, unit_cost, line_total)
    values (s1, po1, 'Matrix Fabric', 1, 700, 700);
  insert into public.expenses (store_id, title, amount)
    values (s1, 'Matrix Rent', 500);
  insert into public.employees (store_id, name)
    values (s1, 'Matrix Employee');
end $$;

do $$ begin raise notice 'MATRIX SETUP OK'; end $$;
