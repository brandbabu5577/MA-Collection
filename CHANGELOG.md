# Changelog

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
