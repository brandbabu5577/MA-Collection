-- 0010 — Role-based RLS. Replaces the broad is_store_member() SELECT policies
-- from 0008 with policies that respect the store role (owner / manager / cashier).
-- Grants are NOT changed here: INSERT/UPDATE/DELETE column privileges stay as
-- 0008 granted them, so a missing policy still blocks the operation.
--
-- Matrix (writes below mirror the existing 0008 grants/policies only):
--   table                       select                 insert/update/delete
--   --------------------------- ---------------------- --------------------
--   khata_entries               owner, manager         (definer-only, Phase 4)
--   customer_payments           owner, manager         (definer-only, Phase 4)
--   stock_movements             owner, manager         (definer-only, Phase 4)
--   suppliers                   owner, manager         owner, manager (kept)
--   supplier_payments           owner, manager         (definer-only, Phase 4)
--   supplier_entries            owner, manager         (definer-only, Phase 4)
--   purchase_orders             owner, manager         (definer-only, Phase 4)
--   purchase_order_items        owner, manager         (definer-only, Phase 4)
--   expenses                    owner, manager         owner, manager (kept)
--   employees                   owner                  owner (tightened)
--   store_members               own row; owner sees all rows of his store; no writes
--   store_settings              any store member       owner only (tightened)
--   cashiers see none of the ledger/supplier/stock/employee tables above.
--   products, categories, customers, sales, sale_items, sale_payments,
--   stores, profiles keep their 0008 policies unchanged.
--
-- Cross-store isolation: every policy below still evaluates the row's own
-- store_id against has_store_role()/is_store_member(), so a user can never
-- reach rows of a store they do not belong to.
-- Uses the existing helper public.has_store_role(uuid, text[]) from 0002
-- (SECURITY DEFINER, STABLE, search_path = '', EXECUTE granted to
-- authenticated in 0008).

-- 1. Ledger, stock and supplier money trails: read for owner/manager only.
drop policy if exists khata_entries_select on public.khata_entries;
create policy khata_entries_select on public.khata_entries for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists customer_payments_select on public.customer_payments;
create policy customer_payments_select on public.customer_payments for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists supplier_payments_select on public.supplier_payments;
create policy supplier_payments_select on public.supplier_payments for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists supplier_entries_select on public.supplier_entries;
create policy supplier_entries_select on public.supplier_entries for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists purchase_orders_select on public.purchase_orders;
create policy purchase_orders_select on public.purchase_orders for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists purchase_order_items_select on public.purchase_order_items;
create policy purchase_order_items_select on public.purchase_order_items for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

-- 2. Expenses: owner/manager read; write policies recreated identically so the
--    matrix is explicit in one place (grants from 0008 are unchanged).
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.has_store_role(store_id, array['owner','manager']) and created_by = auth.uid());

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
  using (public.has_store_role(store_id, array['owner','manager']))
  with check (public.has_store_role(store_id, array['owner','manager']));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated
  using (public.has_store_role(store_id, array['owner','manager']));

-- 3. Employees: owner only. Managers and cashiers get nothing (tightened from
--    the owner/manager policies of 0008).
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees for select to authenticated
  using (public.has_store_role(store_id, array['owner']));

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees for insert to authenticated
  with check (public.has_store_role(store_id, array['owner']));

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees for update to authenticated
  using (public.has_store_role(store_id, array['owner']))
  with check (public.has_store_role(store_id, array['owner']));

drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees for delete to authenticated
  using (public.has_store_role(store_id, array['owner']));

-- 4. store_members: a user reads their own membership row; the store owner
--    additionally reads every row of his own store. No client writes ever —
--    membership changes go through SECURITY DEFINER functions only.
drop policy if exists store_members_select on public.store_members;
create policy store_members_select on public.store_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_store_role(store_id, array['owner'])
  );

-- 5. store_settings: every member of the store may read the toggles (the UI
--    needs them at the till); only the owner may write (tightened from
--    owner/manager update in 0008). The column grant stays unchanged.
drop policy if exists store_settings_select on public.store_settings;
create policy store_settings_select on public.store_settings for select to authenticated
  using (public.is_store_member(store_id));

drop policy if exists store_settings_update on public.store_settings;
create policy store_settings_update on public.store_settings for update to authenticated
  using (public.has_store_role(store_id, array['owner']))
  with check (public.has_store_role(store_id, array['owner']));
