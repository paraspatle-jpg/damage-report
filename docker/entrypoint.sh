#!/bin/sh
set -e

echo "→ Syncing Prisma schema to database…"
npx prisma db push --skip-generate --accept-data-loss=false

echo "→ Starting InvestOS…"
exec "$@"
