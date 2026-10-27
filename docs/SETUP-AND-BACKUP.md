# Supabase configuration, deployment and backups

## 1. Restoring the Supabase configuration (no secrets in Git)

`frontend/js/supabase-config.js` is committed with placeholders. The app needs two values:

| Value | Where to find it | Secret? |
|---|---|---|
| Project URL `https://<project-ref>.supabase.co` | Dashboard → Project Settings → API | No |
| Publishable / anon key (`sb_publishable_…`) | Dashboard → Project Settings → API Keys | No — it is shipped to every browser; RLS is the protection |

Never use the `service_role` / `sb_secret_…` key in the frontend. `scripts/write-supabase-config.cjs` refuses it.

**Local machine (Windows):**
```bash
# put the two values in frontend/js/supabase-config.js, then stop Git from tracking your local edit:
git update-index --skip-worktree frontend/js/supabase-config.js
```

**Hosting (Cloudflare Pages / Netlify / Vercel):** set environment variables `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`, and use the build command:
```bash
node scripts/write-supabase-config.cjs
```
Output directory: the repository root (`index.html`). No other build step is needed.

## 2. Applying the database migrations (needs owner approval)

Migrations live in `supabase/migrations/` and must be applied in file-name order. Check what is
already applied on the live project first (`supabase migration list` or
`select * from supabase_migrations.schema_migrations`). New in this branch:
`20261027000014_khata_payment_stock_adjust.sql` — adds two functions only; no table or row changes.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run   # review
npx supabase db push
```
Take a backup (section 4) before any push to the live project.

## 3. Local verification
```bash
npm test                                   # JS syntax + source checks
bash supabase/tests/local/run-local-checks.sh   # needs psql + local PostgreSQL superuser
python3 tests/e2e/ui_smoke.py              # needs `pip install playwright` + Chromium (CHROME_PATH)
```
The DB checks run against plain PostgreSQL with Supabase stubs; the UI smoke test uses a mocked
Supabase client. Neither replaces a test against the real project.

## 4. Backup strategy

| What | How | Where to keep it |
|---|---|---|
| Source code | Private GitHub repo `brandbabu5577/MA-Collection` | GitHub (private) |
| Schema + migration history | `supabase/migrations/` in Git, plus `npx supabase db dump -f schema.sql` | GitHub (private) |
| Business data (sales, Khata, customers…) | `npx supabase db dump --data-only -f data-YYYY-MM-DD.sql` weekly, and before every migration | Encrypted private storage (e.g. Google Drive folder you own). **Never in the Git repo** |
| Store logos (Storage bucket `store-logos`) | Download the bucket from Dashboard → Storage, or `supabase storage` CLI | Same private storage as data dumps |
| Credentials | Supabase dashboard + a password manager | Never in Git, chat, or backups |

Supabase Free plan has no downloadable automatic backups, so the manual data dump is the real
database backup. A GitHub copy of the code is **not** a database backup.
