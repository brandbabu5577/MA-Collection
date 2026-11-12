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
| `20261016000010_role_based_rls.sql` | role-specific row policies |
| `20261016000011_cost_privacy.sql` | restrict cost/profit fields and expose scoped views |
| `20261016000012_checkout.sql` | atomic, idempotent sale checkout and stock deduction |
| `20261024060215_store_logo_storage.sql` | store logo bucket and owner-only object policies |
| `20261025000013_product_crud_rpc.sql` | validated product save/archive RPCs |
| `20261026000014_business_write_rpcs.sql` | stock adjustments, Khata payments, expense save, PO create/receive/cancel, supplier settlement and owner balance adjustment RPCs |
| `20261027000015_atomic_supplier_creation.sql` | retry-safe atomic supplier creation with optional opening payable and ledger row |
| `20261028000016_archive_product_search_path.sql` | pins the archive-product SECURITY DEFINER function to an empty search path |

There are **17 migration files** in the repository: migrations 0001–0016 plus the separately timestamped store-logo migration. Apply every listed file in lexical order; do not omit the storage migration.

The configured `invite-employee` and `remove-employee` Edge Functions require an authenticated user JWT and independently verify that the caller is the owner of the supplied store. The invitation function creates a manager/cashier membership and linked directory row; removal revokes only that store membership. Their Auth/Functions behavior is not covered by the PostgreSQL-only runner.

The database starts empty. There is no seed data.

## Apply — option A: Supabase SQL Editor (no tools needed)

1. supabase.com → **New project** (any name, e.g. `ma-shop-management`; pick a strong DB password and save it).
2. Wait until the project is ready, then open **SQL Editor → New query**.
3. Open `20261015000001_helpers.sql`, copy all of it, paste, click **Run**. Expect "Success. No rows returned".
4. Repeat for all remaining files in lexical order, **one file at a time**. Migration 0013 references Supabase Storage, so use Supabase or a local Supabase stack.
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

Needs the PostgreSQL 16 command-line/server binaries (`psql.exe`, `initdb.exe`, `pg_ctl.exe`) on PATH. On Windows the wrapper starts its own random, loopback-only, trust-authenticated disposable PostgreSQL cluster in the OS temp directory, runs all checks, then stops and removes only that generated cluster:

```powershell
npm run db:check:win
```

On Bash:

```bash
bash supabase/tests/local/run-local-checks.sh
```
The underlying runner creates a throw-away database, fakes the minimum Supabase roles, Auth identity and Storage objects (`00_local_stubs.sql`, test-only), applies every SQL migration file in lexical order, then runs schema, store isolation, owner/manager/cashier permission, checkout and business RPC checks. The lower-level `run-local-checks.ps1` can also use standard `PGHOST`, `PGPORT` and `PGUSER` settings. A successful run verifies PostgreSQL SQL behavior against those local stubs, **not** GoTrue login/session behavior or Supabase's actual API/Storage services. No migration has been applied to a hosted project.

Latest verification in this workspace: see the dated isolated-run log in `.backups/` for exact migration order, SQL assertions and the final runner marker. These results are local PostgreSQL and test-only Auth/Storage stubs; they do not establish actual Supabase Auth, PostgREST or browser end-to-end behavior.

## Key design decisions

- **Money** is `bigint` whole PKR everywhere (the frontend only accepts whole numbers). No floats/numeric. If paisa are ever needed, change to minor units in one migration.
- **Tenancy:** every business table has `store_id`; child tables use composite foreign keys `(store_id, id)`, so a row can never point at another store's parent.
- **Clients cannot write** sales, ledgers, payments, stock movements, purchase orders or membership directly. Cached totals are changed only through role-checked `SECURITY DEFINER` functions.
- **Append-only** audit tables: `stock_movements`, `khata_entries`, `supplier_entries`.
- **Idempotency:** unique store-scoped keys on sales, payments, purchase orders and supplier creation; transaction retries compare the validated request payload.
- **Roles:** `owner` (one per store), `manager`, `cashier`. Stores are created by `create_store()`; direct INSERT into `stores`/`store_members` is denied.
- **Soft delete** for products (`is_active`); a product that was ever sold cannot be hard-deleted.

## Known limitations (Phase 1)

- Supabase CLI is available through the project npm dependency; Docker Desktop, WSL and hardware virtualization are unavailable in this Windows environment, so local Supabase containers and real GoTrue sessions are not verified.
- Receiving a PO increases the supplier payable balance. This is an assumption, to be confirmed.
- Supplier creation with an opening balance uses `create_supplier_with_opening_balance`; the row and optional opening ledger entry are committed together. Full remote API behavior remains subject to actual Supabase testing.
- Frontend operations are wired to the database client and RPCs in code, but browser end-to-end testing against local Supabase remains blocked until Docker/WSL and virtualization are available.
