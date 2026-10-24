#!/usr/bin/env bash
# Builds the local database used by browser tests: the Supabase stand-in,
# every migration, the demo listings and the e2e fixtures.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${E2E_DB_NAME:-staynest_e2e}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X -t)
"${PSQL[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f supabase/tests/harness/supabase_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f" > /dev/null; done
"${PSQL[@]}" -d "$DB" -f supabase/seed/demo_listings.sql > /dev/null
"${PSQL[@]}" -d "$DB" -f e2e/support/fixtures.sql > /dev/null
# A PostgREST left running from an earlier run may have reconnected while the
# migrations above were half applied; have it reload the finished schema.
"${PSQL[@]}" -d "$DB" -c "notify pgrst, 'reload schema'"
echo "e2e database $DB ready"
