#!/bin/sh
set -eu

echo "Running Prisma migrations…"
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database…"
  node prisma/seed.mjs || npx prisma db seed || true
fi

echo "Starting NestJS…"
exec node dist/main.js
