#!/usr/bin/env bash
# Applies every migration, in order, to a throw-away local PostgreSQL database and
# runs structural + isolation checks. This is NOT a test against real Supabase.
# Usage: bash supabase/tests/local/run-local-checks.sh   (needs psql + a reachable Postgres superuser)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../migrations"
DB="ma_phase1_check_$$"
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)
"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null
trap '"${PSQL[@]}" -d postgres -c "drop database if exists '"$DB"'" >/dev/null' EXIT
"${PSQL[@]}" -d "$DB" -f "$HERE/00_local_stubs.sql"
for f in $(ls "$MIG"/*.sql | sort); do
  echo "APPLY  $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
echo "--- running phase1_checks.sql"
"${PSQL[@]}" -d "$DB" -f "$HERE/phase1_checks.sql"
echo "--- running matrix_01_setup.sql"
"${PSQL[@]}" -d "$DB" -f "$HERE/matrix_01_setup.sql"
echo "--- running matrix_02_cashier.sql"
"${PSQL[@]}" -d "$DB" -f "$HERE/matrix_02_cashier.sql"
echo "--- running matrix_03_manager.sql"
"${PSQL[@]}" -d "$DB" -f "$HERE/matrix_03_manager.sql"
