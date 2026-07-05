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
cp "$ROOT/db/migrations/"*.sql "$ROOT/backend/internal/arcade/migrations/"
mkdir -p "$ROOT/backend/internal/arcade/seeds"
if [[ -f "$ROOT/db/content_seed.sql" ]]; then
  cp "$ROOT/db/content_seed.sql" "$ROOT/backend/internal/arcade/seeds/content_seed.sql"
fi

echo "==> Seeding achievements..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/seed.sql"

# Learning content is large, so it is NOT auto-applied on every deploy. Opt in
# with SEED_CONTENT=1 (or run `make content-seed`). Regenerate the file first
# with `npm --prefix frontend run export-content-sql` when catalog content changes.
if [[ "${SEED_CONTENT:-}" == "1" || "${SEED_CONTENT:-}" == "true" ]]; then
  if [[ -f "$ROOT/db/content_seed.sql" ]]; then
    echo "==> Seeding learning content (courses/problems/solutions/quizzes)..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/content_seed.sql"
  else
    echo "!!  SEED_CONTENT set but db/content_seed.sql missing — run export-content-sql first." >&2
  fi
fi

echo "==> Done. Set DATABASE_URL, RUN_MIGRATIONS, and RUN_CONTENT_SEED on the Railway backend service."
