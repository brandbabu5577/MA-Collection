-- 0008 — Row Level Security and privileges. Deny by default.
--
-- Model:
--   * anon gets nothing.
--   * authenticated gets only the table/column privileges granted below, and
--     RLS then limits every row to stores the user is a member of.
--   * Tables that carry money, stock or audit trails (sales, ledgers, stock
--     movements, payments, purchase orders) are READ-ONLY for clients. They are
--     written only by SECURITY DEFINER functions added in later phases, so a
--     client cannot bypass checkout rules by writing tables directly.
--   * Cached totals (products.stock_quantity, customers.khata_balance,
--     customers.order_count, suppliers.payable_balance) are excluded from the
--     column privileges below, so clients cannot edit them directly.
--
-- NOTE: policies are written and structurally checked locally, but they are
-- not "verified" until tested against a real Supabase project (Phase 5).

-- 1. Remove every default privilege and enable RLS everywhere.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

alter table public.stores               enable row level security;
alter table public.profiles             enable row level security;
alter table public.store_members        enable row level security;
alter table public.store_settings       enable row level security;
alter table public.store_counters       enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.stock_movements      enable row level security;
alter table public.customers            enable row level security;
alter table public.customer_payments    enable row level security;
alter table public.khata_entries        enable row level security;
alter table public.sales                enable row level security;
alter table public.sale_items           enable row level security;
alter table public.sale_payments        enable row level security;
alter table public.suppliers            enable row level security;
alter table public.supplier_payments    enable row level security;
alter table public.supplier_entries     enable row level security;
alter table public.purchase_orders      enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.expenses             enable row level security;
alter table public.employees            enable row level security;
-- store_counters: RLS on, no policy, no grant => unreachable by clients.

-- 2. Helper functions are callable by signed-in users (RLS needs them).
grant execute on function public.is_store_member(uuid)       to authenticated;
grant execute on function public.has_store_role(uuid, text[]) to authenticated;
-- next_store_number / set_updated_at / prevent_mutation / check_po_total stay private.

-- 3. Read access: members of the store can read its rows.
grant select on
  public.stores, public.profiles, public.store_members, public.store_settings,
  public.categories, public.products, public.stock_movements,
  public.customers, public.customer_payments, public.khata_entries,
  public.sales, public.sale_items, public.sale_payments,
  public.suppliers, public.supplier_payments, public.supplier_entries,
  public.purchase_orders, public.purchase_order_items,
  public.expenses, public.employees
to authenticated;

create policy stores_select on public.stores for select to authenticated
  using (public.is_store_member(id));
create policy store_members_select on public.store_members for select to authenticated
  using (public.is_store_member(store_id));
create policy store_settings_select on public.store_settings for select to authenticated
  using (public.is_store_member(store_id));
create policy categories_select on public.categories for select to authenticated
  using (public.is_store_member(store_id));
create policy products_select on public.products for select to authenticated
  using (public.is_store_member(store_id));
create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.is_store_member(store_id));
create policy customers_select on public.customers for select to authenticated
  using (public.is_store_member(store_id));
create policy customer_payments_select on public.customer_payments for select to authenticated
  using (public.is_store_member(store_id));
create policy khata_entries_select on public.khata_entries for select to authenticated
  using (public.is_store_member(store_id));
create policy sales_select on public.sales for select to authenticated
  using (public.is_store_member(store_id));
create policy sale_items_select on public.sale_items for select to authenticated
  using (public.is_store_member(store_id));
create policy sale_payments_select on public.sale_payments for select to authenticated
  using (public.is_store_member(store_id));
create policy suppliers_select on public.suppliers for select to authenticated
  using (public.is_store_member(store_id));
create policy supplier_payments_select on public.supplier_payments for select to authenticated
  using (public.is_store_member(store_id));
create policy supplier_entries_select on public.supplier_entries for select to authenticated
  using (public.is_store_member(store_id));
create policy purchase_orders_select on public.purchase_orders for select to authenticated
  using (public.is_store_member(store_id));
create policy purchase_order_items_select on public.purchase_order_items for select to authenticated
  using (public.is_store_member(store_id));
create policy expenses_select on public.expenses for select to authenticated
  using (public.is_store_member(store_id));
create policy employees_select on public.employees for select to authenticated
  using (public.is_store_member(store_id));

-- 4. Profiles: each user reads/writes only their own row.
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant insert (id, full_name, phone, theme) on public.profiles to authenticated;
grant update (full_name, phone, theme)     on public.profiles to authenticated;

-- 5. Store profile and settings: owner edits the store; owner/manager edit settings.
--    (Stores are created through create_store() in 0009, not by direct INSERT.)
create policy stores_update_owner on public.stores for update to authenticated
  using (public.has_store_role(id, array['owner']))
  with check (public.has_store_role(id, array['owner']));
grant update (name, business_type, phone, address) on public.stores to authenticated;

create policy store_settings_update on public.store_settings for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
grant update (show_sku, warn_low_stock, ask_customer_each_sale, allow_discounts,
              show_receipt_after_checkout, default_min_stock, stock_unit,
              compact_tables, receipt_footer) on public.store_settings to authenticated;

-- 6. Catalog: owner/manager write. stock_quantity is deliberately not grantable.
create policy categories_insert on public.categories for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy categories_update on public.categories for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy categories_delete on public.categories for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, name, description) on public.categories to authenticated;
grant update (name, description)           on public.categories to authenticated;
grant delete on public.categories to authenticated;

create policy products_insert on public.products for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy products_update on public.products for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy products_delete on public.products for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, category_id, name, sku, price, cost, min_stock, color, size, is_active)
  on public.products to authenticated;
grant update (category_id, name, sku, price, cost, min_stock, color, size, is_active)
  on public.products to authenticated;
grant delete on public.products to authenticated;   -- FK blocks deleting a product that was ever sold/moved

-- 7. Customers: any member may add/edit (cashiers register customers at the till);
--    only owner/manager may delete. Khata balance/order count are not grantable.
create policy customers_insert on public.customers for insert to authenticated
  with check (public.is_store_member(store_id));
create policy customers_update on public.customers for update to authenticated
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));
create policy customers_delete on public.customers for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, name, phone, email, notes, is_active) on public.customers to authenticated;
grant update (name, phone, email, notes, is_active)           on public.customers to authenticated;
grant delete on public.customers to authenticated;

-- 8. Suppliers: owner/manager. payable_balance is not grantable.
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy suppliers_update on public.suppliers for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, name, contact_person, phone, email, category, notes, is_active)
  on public.suppliers to authenticated;
grant update (name, contact_person, phone, email, category, notes, is_active)
  on public.suppliers to authenticated;
grant delete on public.suppliers to authenticated;

-- 9. Expenses and employees: owner/manager.
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']) and created_by = auth.uid());
create policy expenses_update on public.expenses for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy expenses_delete on public.expenses for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, title, category, amount, expense_date, note, created_by) on public.expenses to authenticated;
grant update (title, category, amount, expense_date, note)                      on public.expenses to authenticated;
grant delete on public.expenses to authenticated;

create policy employees_insert on public.employees for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy employees_update on public.employees for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));
create policy employees_delete on public.employees for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));
grant insert (store_id, name, role_title, phone, status) on public.employees to authenticated;
grant update (name, role_title, phone, status)           on public.employees to authenticated;
grant delete on public.employees to authenticated;

-- 10. Intentionally NO client write policies/grants on: stock_movements,
--     customer_payments, khata_entries, sales, sale_items, sale_payments,
--     supplier_payments, supplier_entries, purchase_orders, purchase_order_items,
--     store_members. Those are written by SECURITY DEFINER functions (Phase 4).
