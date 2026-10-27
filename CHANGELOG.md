# Changelog

## Phase 2 — Supabase data layer (branch fix/audit-phase2)

- Checkout now calls the atomic `create_sale` RPC (server-side pricing, stock deduction, Khata, idempotency key reused on double-click).
- Customers, Khata ledger, sales history, expenses, suppliers and categories load from and save to Supabase.
- New migration 0014: `record_khata_payment` (append-only ledger, idempotent, cannot exceed balance) and `adjust_stock` (owner/manager, never below zero). 24 new local DB checks.
- Fixed: product costs were read from a non-existent `get_product_costs` RPC, so owners saw cost 0 and editing a product could overwrite the real cost with 0. Costs now come from the `products_costs` view.
- Fixed: placeholder Supabase config was not detected; mis-encoded characters (â€¦) in the login screen; entering a discount reset the customer and payment method on the bill.
- Business data is no longer written to browser localStorage once a store is connected.
- Customer / supplier "delete" is now a soft delete that keeps sales and Khata history; a customer with an outstanding balance cannot be removed.
- Line endings normalised to LF (`.gitattributes`); the shell test script had CRLF and could not run.
- Added `scripts/write-supabase-config.cjs`, `docs/SETUP-AND-BACKUP.md`, and a UI smoke test (`tests/e2e`).
- Purchase orders remain browser-only (no server receive function yet).

## Structured source package

- Extracted the current saved single-file source into `frontend/css/styles.css` and `frontend/js/app.js`.
- Added a root `index.html` that links to those source files.
- Kept `preview-standalone.html` outside `frontend/` as a standalone reference snapshot.
- Added local static server, syntax/source smoke check, and project documentation.
- No production backend, database, authentication or payment service was added.

## Phase 1 — database schema

- Added `supabase/migrations/` (9 ordered migrations: 21 tables, RLS on all, column-level grants, `create_store()`).
- Added `supabase/tests/local/` plain-PostgreSQL checks (`npm run db:check`).
- Added `supabase/README.md` and `docs/DATABASE-SCHEMA.md`.
- Frontend, server and existing tests unchanged. Not applied to any Supabase project.
