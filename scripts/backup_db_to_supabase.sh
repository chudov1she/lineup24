#!/bin/sh
# Dump local Docker Postgres and restore into Supabase (disaster-recovery copy).
# Installed on VPS as cron; does not affect the live app path.
set -eu

SB_USER="${LINEUP_SUPABASE_DB_USER:-postgres.rsnuaoulihucmikbiomm}"
SB_HOST="${LINEUP_SUPABASE_DB_HOST:-aws-1-eu-west-1.pooler.supabase.com}"
SB_PASS="${LINEUP_SUPABASE_DB_PASS:?LINEUP_SUPABASE_DB_PASS required}"
DUMP="${DUMP_PATH:-/tmp/lineup_backup.dump}"
LOG="${LOG_PATH:-/var/log/lineup24-db-backup.log}"

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

echo "$(ts) backup start" >>"$LOG"

docker exec project-lineup-db pg_dump -U lineup -d lineup -Fc --schema=public -f /tmp/lineup.dump
docker cp project-lineup-db:/tmp/lineup.dump "$DUMP"

# Session pooler :5432 — suitable for restore. Warnings from pg_restore are OK.
set +e
docker run --rm \
  -e PGSSLMODE=require \
  -e PGPASSWORD="$SB_PASS" \
  -v "$DUMP:/tmp/lineup.dump:ro" \
  postgres:17-alpine \
  pg_restore \
    -h "$SB_HOST" \
    -p 5432 \
    -U "$SB_USER" \
    -d postgres \
    --clean --if-exists --no-owner --no-acl \
    /tmp/lineup.dump >>"$LOG" 2>&1
code=$?
set -e

echo "$(ts) backup finished exit=$code" >>"$LOG"
exit 0
