# Database Schema — mapping to the current frontend

Frontend (`localStorage` arrays) → PostgreSQL (see `supabase/README.md`).

| Frontend | Table | Notes |
|---|---|---|
| (single store) | `stores`, `store_members`, `store_settings` | Settings toggles/defaults map to `store_settings`. "Allow negative inventory" is not stored: negative stock is impossible. |
| `products` | `products` | `category` name → `category_id`; `stock` → `stock_quantity`; `minStock` → `min_stock`. |
| `categories` | `categories` | `count` is derived, not stored. |
| (none) | `stock_movements` | New: stock adjustments are history rows. |
| `customers` | `customers` | `balance` → `khata_balance`, `orders` → `order_count`; `joined` → `created_at`. |
| `khataLedger` | `khata_entries` + `customer_payments` | Signed `amount_change`, running `balance_after`. |
| `sales` | `sales`, `sale_items`, `sale_payments` | Customer/supplier links by id, not name. Status values lowercase: `completed`, `pending`, `voided`. Payment `Credit` → `credit`. Item rows snapshot name, SKU, charged price, catalog price, cost. |
| `suppliers` | `suppliers`, `supplier_entries`, `supplier_payments` | `balance` → `payable_balance`; an opening balance becomes a ledger entry. |
| `purchaseOrders` | `purchase_orders`, `purchase_order_items` | Frontend stores only an item count and total; DB needs real lines to add stock on receipt. |
| `expenses` | `expenses` | Category list identical to the form. |
| `employees` | `employees` | Status lowercase: `active`, `inactive`. Logins live in `store_members`. |

Required frontend changes (Phase 3, not done): replace name links with ids, map the lowercase status values, give PO form line items.
