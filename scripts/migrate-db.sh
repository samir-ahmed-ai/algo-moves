#!/usr/bin/env bash
# Apply arcade schema to a Postgres database (local or Railway).
# Usage: DATABASE_URL=postgres://... ./scripts/migrate-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your Postgres connection string." >&2
  exit 1
fi

echo "==> Applying schema (all migrations in order)..."
for f in "$ROOT/db/migrations/"*.sql; do
  echo "    - $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "==> Syncing embedded backend copies..."
mkdir -p "$ROOT/backend/db/migrations" "$ROOT/backend/db/seeds"
cp "$ROOT/db/migrations/"*.sql "$ROOT/backend/db/migrations/"
if [[ -f "$ROOT/db/content_seed.sql" ]]; then
  cp "$ROOT/db/content_seed.sql" "$ROOT/backend/db/seeds/content_seed.sql"
fi

echo "==> Seeding achievements..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/seed.sql"

# Learning content: opt in locally with SEED_CONTENT=1. On Railway, set
# RUN_CONTENT_SEED=true on the backend to apply the embedded copy on deploy.
if [[ "${SEED_CONTENT:-}" == "1" || "${SEED_CONTENT:-}" == "true" ]]; then
  if [[ -f "$ROOT/db/content_seed.sql" ]]; then
    echo "==> Seeding learning content (courses/problems/solutions/quizzes)..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/content_seed.sql"
  else
    echo "!!  SEED_CONTENT set but db/content_seed.sql missing — run export-content-sql first." >&2
  fi
fi

echo "==> Done. Set DATABASE_URL, RUN_MIGRATIONS, and RUN_CONTENT_SEED on the Railway backend service."
