# Backend Roadmap — Not Yet Implemented

These are future tasks, not features currently connected in this ZIP.

1. Create a Supabase project and store URL/anon key in environment-specific configuration; never commit service-role keys.
2. Define migrations for profiles/roles, products, categories, customers, suppliers, employees, sales, sale items, stock movements, Khata ledger, expenses and purchase orders.
3. Add authentication, per-store ownership keys and Row Level Security policies for every table.
4. Implement an atomic server-side checkout function/transaction that validates stock and values, inserts sale/items, updates stock and Khata ledger, and rolls back on failure.
5. Connect the frontend to the API with loading/error states and remove `localStorage` as the source of truth for shared production data.
6. Add backups, audit logs, automated integration tests and deployment secrets/configuration.
7. Perform security review and end-to-end tests before using live customer or payment information.
