#!/usr/bin/env bash
# Applies all migrations to a throwaway PostgreSQL database (with a minimal
# Supabase stand-in) and runs the permission tests.
# Needs psql and a server: set PGHOST/PGPORT/PGUSER, or run in CI's postgres service.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB_NAME:-staynest_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X -t)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f supabase/tests/harness/supabase_stub.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f" > /dev/null
done
"${PSQL[@]}" -d "$DB" -f supabase/seed/demo_listings.sql > /dev/null
"${PSQL[@]}" -d "$DB" -f supabase/tests/policies.test.sql 2>&1 | sed -n 's/^.*NOTICE:  //p; /ERROR/p; /passed/p'
