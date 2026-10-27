-- 0011 — Hide cost/profit columns from cashiers.
--
-- Why: every signed-in user shares the single Postgres role `authenticated`, so
-- column-level GRANTs alone cannot separate cashier from manager — a grant to
-- authenticated is a grant to everyone. We therefore:
--   1. Re-grant SELECT on products / sales / sale_items with every column EXCEPT
--      the cost ones listed explicitly, so cashiers keep full read access to the
--      sale flow but can never select cost fields from the base tables; and
--   2. Expose the hidden columns through security_barrier views that filter each
--      row with has_store_role(store_id, array['owner','manager']) — only the
--      store owner or a manager sees rows; cashiers and other stores get none.
-- Views bypass table RLS, so the filter inside each view IS the security.
-- INSERT/UPDATE/DELETE grants from 0008 are untouched.

-- 1. Column-scoped SELECT: revoke the table-wide grant, re-grant per column
--    (hidden: products.cost; sales.cost_total, profit;
--             sale_items.unit_cost, line_cost).
revoke select on public.products from authenticated;
grant select (
  id, store_id, category_id, name, sku, price,
  stock_quantity, min_stock, color, size, is_active,
  created_at, updated_at
) on public.products to authenticated;

revoke select on public.sales from authenticated;
grant select (
  id, store_id, sale_number, customer_id, customer_name, customer_phone,
  sold_at, subtotal, discount, total, payment_method, status,
  idempotency_key, voided_at, voided_by, void_reason, created_by, created_at
) on public.sales to authenticated;

revoke select on public.sale_items from authenticated;
grant select (
  id, store_id, sale_id, product_id, product_name, sku,
  quantity, unit_price, catalog_price, line_total, created_at
) on public.sale_items to authenticated;

-- 2. Cost/profit views, owner/manager only.
create view public.products_costs
  with (security_barrier = true) as
  select p.id, p.store_id, p.cost
  from public.products p
  where public.has_store_role(p.store_id, array['owner','manager']);

create view public.sales_financials
  with (security_barrier = true) as
  select s.id, s.store_id, s.cost_total, s.profit
  from public.sales s
  where public.has_store_role(s.store_id, array['owner','manager']);

create view public.sale_item_costs
  with (security_barrier = true) as
  select si.id, si.store_id, si.sale_id, si.unit_cost, si.line_cost
  from public.sale_items si
  where public.has_store_role(si.store_id, array['owner','manager']);

-- 3. Lock the views down: nothing for anon/public; SELECT for authenticated
--    (the in-view WHERE clause still hides cashier/other-store rows).
revoke all on public.products_costs  from public, anon;
revoke all on public.sales_financials from public, anon;
revoke all on public.sale_item_costs from public, anon;
grant select on public.products_costs   to authenticated;
grant select on public.sales_financials to authenticated;
grant select on public.sale_item_costs  to authenticated;
