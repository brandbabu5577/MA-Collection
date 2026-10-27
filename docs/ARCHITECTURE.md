# Architecture Notes

## Runtime shape

The main page (`index.html`) is located at the project root by design; the `frontend/` directory contains code-only assets and no HTML preview:

- `frontend/css/styles.css`: global design tokens, layout, components, and responsive breakpoints.
- `frontend/js/app.js`: single IIFE containing state, UI rendering, event delegation, local form handlers, checkout calculations, PDF and sharing helpers.

The app currently uses plain HTML/CSS/JavaScript without a bundler or third-party client dependencies. `server.js` serves static files from the project root and binds to `127.0.0.1` by default.

## Storage

`localStorage` key: `maCollectionState`. Arrays for products, customers, suppliers, employees, sales, expenses, purchase orders, categories, and Khata ledger are persisted locally in the active browser.

## Next engineering step

Introduce a backend/API layer (for example Supabase with authenticated users and RLS) before moving real business data into the app. Checkout must be a server-side transaction that validates inventory, prices, discounts, customer balances, and payment records atomically.
