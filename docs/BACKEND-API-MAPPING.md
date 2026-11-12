# MA Collection UI to Backend API Mapping

Current frontend is classic browser JavaScript using the shared Supabase JS client. Calls below must always derive `store_id` from the authenticated, RLS-resolved active membership (`window.MA_STORE`); never trust a store identifier supplied by a form. Reads use PostgREST with RLS. Mutations of cached balances, money ledgers and stock use RPCs only.

| UI action / form | Required backend operation | Current state |
|---|---|---|
| Signup, login, resend, logout, session restore | Supabase Auth; `store_members` read; `create_store` RPC | Connected in `auth.js`; multi-store selector present |
| Load products/categories | `products`, `categories`; `products_costs` view for owner/manager | Store-scoped read integration present; runtime requires local Supabase verification |
| Create/edit product, opening stock | `save_product` RPC | Connected |
| Archive product | `archive_product` RPC | Connected |
| Adjust inventory | `adjust_stock` / `set_stock_quantity` RPC | Frontend RPC integration present; tested in local SQL suite |
| Categories CRUD | category table RLS CRUD | Create/update/delete use store-scoped table operations; local database role matrix covers table access |
| Checkout / billing | `create_sale` RPC, idempotency key, DB-priced catalog lines | Frontend RPC integration present; checkout and rollback/idempotency SQL tests pass |
| Sales history / receipts / reports | `sales`, `sale_items`, `sale_payments`, `khata_entries`; `sales_financials` for owner/manager | Store-scoped DB reads and sale details connected; SQL/UI runtime against Supabase remains unverified |
| Customers CRUD | `customers` RLS CRUD | Store-scoped CRUD; cached balance/order fields are read-only; Khata payment uses RPC |
| Record Khata payment | `record_customer_payment` RPC | Frontend integration and local SQL balance/idempotency checks present |
| Suppliers CRUD | `suppliers` RLS CRUD for owner/manager; `create_supplier_with_opening_balance` RPC | Create plus opening payable and ledger row are atomic and retry-safe; edit remains store-scoped CRUD |
| Create purchase order | `create_purchase_order` RPC with item array and idempotency key | Frontend supports multiple lines; request payload validation, idempotency and multi-line SQL checks pass |
| Receive purchase order | `receive_purchase_order` RPC with PO item IDs and received quantities | Frontend sends remaining quantities; local SQL tests verify partial/full receipt, stock and payable ledger |
| Cancel purchase order | `cancel_purchase_order` RPC | Pending/unreceived-only UI flow, reason validation and database test present |
| Supplier settlement | `record_supplier_payment` RPC with idempotency key | Frontend integration and SQL settlement/idempotency tests present |
| Expense create/edit/delete | `save_expense` RPC; role-checked `expenses` delete policy | Frontend store-scoped CRUD integration present; local SQL role tests cover policy |
| Employee invitation and directory | `invite-employee` and `remove-employee` Edge Functions; `employees` RLS | Owner-only add form invites Manager/Cashier and records the linked employee; linked removal revokes only that store membership before deleting its directory row; unlinked directory records remain store-scoped. Runtime delivery still needs local Supabase verification |
| Store profile / settings | owner store update; `store_settings` RLS | Profile and preference persistence integrated; settings copy reflects store-scoped Supabase data; actual Supabase runtime remains unverified |
| Store logo | Supabase Storage bucket `store-logos`, owner-only RLS | Upload path exists; deployment/storage policy needs actual verification |
| CSV exports | Export the store-scoped records loaded from PostgREST into the client arrays | Implemented for currently loaded records; sales are capped at 500 and Khata ledger at 1,000 rows, so exports are not unbounded |

## Remaining database API gaps

- Local PostgreSQL 16 execution with test-only Auth/Storage stubs applies all 16 migrations and passes SQL suites. It does not verify GoTrue sessions, PostgREST, Supabase Storage, browser requests or hosted Supabase.
- Supplier creation and opening-balance behavior has local SQL coverage for success, idempotent retry, changed-payload rejection, invalid balance and duplicate-name rollback. It still requires an actual Supabase/PostgREST run when local Supabase is available.
- Browser-level integration checks are still pending because Docker/WSL and firmware virtualization are unavailable; the configured remote project must not be used for write testing.
- Employee invite requests are now wired to the secured Edge Function and locally tested with a mocked Supabase Functions client. Actual Auth invite/email delivery and membership creation remain blocked until local Supabase is available. No service-role key is present in browser configuration.
- Removing an invited employee now uses an owner-authorized Edge Function to revoke only their membership in the selected store. A retry can finish directory cleanup if access revocation succeeded but employee-row deletion failed.
