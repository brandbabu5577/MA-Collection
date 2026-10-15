# MA Collection — Database (Phase 1)

PostgreSQL schema for the shop-management app, as ordered SQL migrations.
**Status: written and checked on a local plain PostgreSQL 16 only. Nothing has been applied to a Supabase project, and RLS has not been verified on Supabase.**

Use a **new, separate Supabase project** for this app. Do not reuse the storefront project (`ma-collections`): the two apps would share one database and one Auth user list.

## Migrations (apply in this order)

| File | Contents |
|---|---|
| `20261015000001_helpers.sql` | `set_updated_at`, append-only trigger |
| `20261015000002_tenancy.sql` | stores, profiles, store_members, store_settings, number counters, membership helpers |
| `20261015000003_catalog_inventory.sql` | categories, products, stock_movements |
| `20261015000004_customers_khata.sql` | customers, customer_payments, khata_entries |
| `20261015000005_sales.sql` | sales, sale_items, sale_payments |
| `20261015000006_suppliers_purchasing.sql` | suppliers, supplier_payments, supplier_entries, purchase_orders, purchase_order_items |
| `20261015000007_expenses_employees.sql` | expenses, employees |
| `20261015000008_rls_and_grants.sql` | RLS on every table, policies, column-level grants |
| `20261015000009_bootstrap.sql` | profile-on-signup trigger, `create_store()` |

The database starts empty. There is no seed data.

## Apply — option A: Supabase SQL Editor (no tools needed)

1. supabase.com → **New project** (any name, e.g. `ma-shop-management`; pick a strong DB password and save it).
2. Wait until the project is ready, then open **SQL Editor → New query**.
3. Open `20261015000001_helpers.sql`, copy all of it, paste, click **Run**. Expect "Success. No rows returned".
4. Repeat for files `…02` to `…09`, **one file at a time, in order**. Stop and report if any run shows an error.
5. Verify: **Table Editor** lists 21 tables, each with the "RLS enabled" badge. Then run in the SQL Editor:
   ```sql
   select count(*) from pg_tables where schemaname='public';                                   -- expect 21
   select count(*) from pg_tables where schemaname='public' and not rowsecurity;               -- expect 0
   select 'products' t, count(*) from public.products union all select 'sales', count(*) from public.sales; -- expect 0, 0
   ```

## Apply — option B: Supabase CLI

```bash
npm install -g supabase            # or: npx supabase ...
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>   # Project Settings → General → Reference ID
supabase db push                                  # applies supabase/migrations in order
```
Migration file names use the `YYYYMMDDHHMMSS_name.sql` form the CLI requires.

## Local checks (what has actually been run)

Needs `psql` and a local PostgreSQL superuser:

```bash
bash supabase/tests/local/run-local-checks.sh
```
It creates a throw-away database, fakes the Supabase `anon`/`authenticated` roles and `auth.uid()` (`00_local_stubs.sql`, test-only), applies all 9 migrations, then runs `phase1_checks.sql`. These checks test structure, store isolation, protected columns and constraints. They are **not** a substitute for testing against a real Supabase project.

## Key design decisions

- **Money** is `bigint` whole PKR everywhere (the frontend only accepts whole numbers). No floats/numeric. If paisa are ever needed, change to minor units in one migration.
- **Tenancy:** every business table has `store_id`; child tables use composite foreign keys `(store_id, id)`, so a row can never point at another store's parent.
- **Clients cannot write** sales, ledgers, payments, stock movements, purchase orders or membership. They also cannot edit cached totals (`stock_quantity`, `khata_balance`, `order_count`, `payable_balance`): column privileges are withheld. These are written only by `SECURITY DEFINER` functions (Phase 4).
- **Append-only** audit tables: `stock_movements`, `khata_entries`, `supplier_entries`.
- **Idempotency:** unique `(store_id, idempotency_key)` on sales and payments.
- **Roles:** `owner` (one per store), `manager`, `cashier`. Stores are created by `create_store()`; direct INSERT into `stores`/`store_members` is denied.
- **Soft delete** for products (`is_active`); a product that was ever sold cannot be hard-deleted.

## Known limitations (Phase 1)

- Cashiers can read product `cost` (needed by RLS-simple design); hide it later with a view if required.
- A purchase order's lines are optional in the table, but the receive function (Phase 4) will require lines to add stock.
- Receiving a PO increases the supplier payable balance. This is an assumption, to be confirmed.
- The existing frontend is untouched and still uses `localStorage`.
