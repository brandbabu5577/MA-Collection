# Backend implementation and verification status

This document reflects the current repository checkpoint. It distinguishes local PostgreSQL verification from Supabase service verification.

## Implemented in source

- Seventeen ordered SQL migrations define store tenancy, catalog/inventory, customers/Khata, sales, suppliers/purchasing, expenses/employees, role-aware RLS, checkout, storage policy, and business write RPCs.
- Frontend authentication uses Supabase Auth for signup, login, session restoration, store selection and logout. Business reads and writes are connected to scoped PostgREST queries and transactional RPCs.
- Owner, manager and cashier rules are represented in RLS policies, SQL functions and frontend guards. Store IDs are included in business queries and RPCs; database tests exercise cross-store rejection.
- Purchase order creation supports multiple items, receiving updates inventory/payables transactionally, cancellation is restricted to eligible orders, and supplier creation/opening balances, adjustments and payments use atomic or ledger-backed operations.
- The owner-only employee add form invokes the secured `invite-employee` Edge Function. Linked employee removal invokes `remove-employee`, which revokes access only for the selected store. Directory edits remain separate store-scoped employee updates. Auth invite delivery and revocation are not verified without local Supabase.

## Verified locally

- The isolated Windows PostgreSQL runner applies all 17 migration files in lexical order using test-only Auth/Storage stubs and runs the schema, business RPC, role and store-isolation assertions. The latest saved run reports 193 assertions passing and zero SQL errors.
- The Node source/syntax check suite is run with `npm test`; see the current session results for its count.

These checks do not execute Supabase GoTrue, PostgREST, Storage, browser authentication or browser-to-database flows.

## Blocked verification

- Local Supabase startup requires Docker/WSL. This machine reports firmware virtualization disabled; WSL and Virtual Machine Platform are unavailable, and enabling Windows features requires an elevated administrator session. No live Supabase project has been modified.
- Real Supabase Auth sessions, PostgREST/RLS requests, Storage access, employee invitation delivery, role checks against Supabase, cross-store API attempts and browser end-to-end tests remain unverified.
- Do not apply migrations to a hosted project or use the configured remote reference for tests without explicit authorization.

## Remaining implementation integration

- Verify invite email delivery, duplicate-user behavior and rollback against local Supabase Auth/Functions; automated UI tests currently mock the Functions client and do not send email.
- Verify owner-only employee removal, per-store membership revocation and retry cleanup against local Supabase Functions.
- Run the blocked Supabase service and browser checks after Docker/WSL prerequisites are available.
- Reconcile any behavior differences discovered in actual Supabase services and rerun the full local and service test suites.
