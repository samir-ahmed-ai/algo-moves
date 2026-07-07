#!/usr/bin/env bash
# Deploy algo-moves to Railway (focused-appreciation project).
# Prereqs: railway CLI logged in, project linked (railway link).
#
# Usage:
#   ./scripts/railway-deploy.sh          # set env vars + deploy all services
#   ./scripts/railway-deploy.sh --vars   # env vars only
#   ./scripts/railway-deploy.sh --deploy # deploy only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VARS_ONLY=false
DEPLOY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --vars) VARS_ONLY=true ;;
    --deploy) DEPLOY_ONLY=true ;;
  esac
done

echo "==> Railway project: $(railway status 2>/dev/null | awk '/^Project:/{print $2}' || echo 'unknown')"

if ! railway service list 2>/dev/null | grep -q 'hocuspocus'; then
  echo "==> Creating hocuspocus service..."
  railway add --service hocuspocus --json >/dev/null 2>&1 || true
fi

if [[ "$DEPLOY_ONLY" != true ]]; then
  echo "==> Setting backend variables..."
  railway variables set \
    'ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}' \
    'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
    RUN_MIGRATIONS=true \
    RUN_CONTENT_SEED=true \
    --service backend

  echo "==> Setting frontend variables..."
  railway variables set \
    'VITE_GAMES_SERVER_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}' \
    'VITE_HOCUSPOCUS_URL=wss://${{hocuspocus.RAILWAY_PUBLIC_DOMAIN}}' \
    --service frontend

  echo "==> Setting hocuspocus variables..."
  railway variables set \
    'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
    'HOCUSPOCUS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}' \
    --service hocuspocus

  echo "==> Ensuring public domains..."
  railway domain --service hocuspocus 2>/dev/null || true
  railway domain --service backend 2>/dev/null || true
  railway domain --service frontend 2>/dev/null || true
fi

if [[ "$VARS_ONLY" == true ]]; then
  echo "==> Variables updated (--vars)."
  exit 0
fi

# Upload the full monorepo; backend and frontend Root Directory are set in the
# Railway dashboard (backend, frontend). Do NOT use --path-as-root for those —
# that uploads only the subfolder as the snapshot root, but Railway still
# chdirs into the configured Root Directory and fails with:
#   lstat snapshot-target-unpack/frontend: no such file or directory
echo "==> Deploying backend..."
railway up "$ROOT" --service backend --detach -m "deploy backend"

echo "==> Deploying hocuspocus..."
# hocuspocus has no Root Directory in Railway (null); upload the service folder
# as the snapshot root so railway.toml + Dockerfile are found at /.
railway up "$ROOT/services/hocuspocus" --path-as-root --service hocuspocus --detach -m "deploy hocuspocus"

echo "==> Deploying frontend..."
railway up "$ROOT" --service frontend --detach -m "deploy frontend"

echo "==> Deployments started. Check status:"
echo "    railway service list"
echo "    railway logs --service frontend"
echo ""
railway service list 2>/dev/null || true
