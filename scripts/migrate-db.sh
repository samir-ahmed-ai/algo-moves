#!/usr/bin/env bash
# Apply arcade schema to a Postgres database (local or Railway).
# Usage: DATABASE_URL=postgres://... ./scripts/migrate-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your Postgres connection string." >&2
  exit 1
fi

echo "==> Applying schema..."
psql "$DATABASE_URL" -f "$ROOT/db/migrations/001_arcade_schema.sql"
psql "$DATABASE_URL" -f "$ROOT/db/migrations/002_arcade_functions.sql"

echo "==> Syncing embedded backend copies..."
cp "$ROOT/db/migrations/"*.sql "$ROOT/backend/internal/arcade/migrations/"

echo "==> Seeding achievements..."
psql "$DATABASE_URL" -f "$ROOT/db/seed.sql"

echo "==> Done. Set DATABASE_URL and RUN_MIGRATIONS=true on the Railway backend service."
