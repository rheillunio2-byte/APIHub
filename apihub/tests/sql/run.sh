#!/usr/bin/env bash
# Usage: PGHOST=... PGPORT=... PGUSER=postgres tests/sql/run.sh
# Applies the migrations to a scratch database with a Supabase stub and runs the RLS assertions.
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -v ON_ERROR_STOP=1 -q"
DB=apihub_rls_test
for phase in before after; do
  $P -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}" 2>/dev/null
  $P -d $DB -f tests/sql/supabase-stub.sql
  $P -d $DB -f supabase/migrations/0001_initial_schema.sql
  $P -d $DB -f tests/sql/supabase-defaults.sql
  if [ "$phase" = before ]; then
    echo "== 0001 only (documenting the original vulnerability)"; $P -d $DB -f tests/sql/exploit-0001.sql -t -A 2>&1 | grep "role after"
  else
    $P -d $DB -f supabase/migrations/0002_security_and_indexes.sql 2>/dev/null
    echo "== 0001 + 0002"; $P -d $DB -f tests/sql/rls.test.sql 2>&1 | grep -E "PASS|ERROR" | sed -E 's/^psql:[^ ]+ (NOTICE:  )?//'
  fi
done
