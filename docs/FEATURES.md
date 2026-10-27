# Feature Inventory (Source Review)

## Frontend code present

- Dashboard and navigation pages for sales, products, inventory, categories, customers/Khata, suppliers, employees, purchase orders, expenses, reports and settings.
- Product catalog forms and basic product/category management.
- Current Bill/cart with quantity controls and sale-specific unit-price editing.
- Cash/Card/Credit (displayed as Khata/Udhaar in the checkout selector) method selection.
- Customer selection, custom walk-in name entry, and optional Pakistani mobile number input/normalization on checkout.
- Whole-number validation helpers for totals, quantities, discount, stock and credit balance operations.
- Sale receipt display and client-generated PDF; device file share when supported, with download/WhatsApp fallback.
- Customer Khata balance display and local ledger entries for credit sales and payments.
- CSV export actions and local-browser persistence via `localStorage`.
- Responsive layout and light/dark appearance control.

## Not production-complete

- No connected database/API, server-side checkout transaction, user sign-in, roles, or Row Level Security.
- No real payment gateway/card processing.
- No verified browser end-to-end test suite; `npm test` is a syntax/source smoke check only.
- Local browser storage should not be treated as secure multi-user or backup storage.
