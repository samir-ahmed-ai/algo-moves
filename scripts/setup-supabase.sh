#!/usr/bin/env bash
# Create a Supabase project for Algo Moves Games Arcade and apply schema.
# Requires: supabase CLI, SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="${SUPABASE_PROJECT_NAME:-algo-moves-arcade}"
DB_PASS="${SUPABASE_DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
REGION="${SUPABASE_REGION:-us-east-1}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN (Personal Access Token from Supabase dashboard)." >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "==> Fetching organization ID..."
ORG_ID="$(supabase orgs list --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")"
if [[ -z "$ORG_ID" ]]; then
  echo "No Supabase organization found." >&2
  exit 1
fi

echo "==> Creating project '$PROJECT_NAME' in $REGION..."
CREATE_JSON="$(supabase projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --db-password "$DB_PASS" \
  --region "$REGION" \
  --output json)"

PROJECT_REF="$(echo "$CREATE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
echo "    Project ref: $PROJECT_REF"
echo "    DB password saved in SUPABASE_DB_PASSWORD for this run."

echo "==> Waiting for project to become healthy..."
for i in $(seq 1 60); do
  STATUS="$(curl -sf -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/health" | python3 -c "
import json,sys
h=json.load(sys.stdin)
print('ok' if all(v=='ACTIVE' for v in h.values() if isinstance(v,str)) else 'wait')
" 2>/dev/null || echo wait)"
  if [[ "$STATUS" == "ok" ]]; then break; fi
  sleep 10
done

echo "==> Enabling Anonymous sign-ins..."
curl -sf -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"external_anonymous_users_enabled": true}' >/dev/null

echo "==> Linking and pushing migrations..."
cd "$ROOT"
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASS"
supabase db push

echo "==> Seeding achievements..."
DATABASE_URL="$(supabase db url --password "$DB_PASS")"
psql "$DATABASE_URL" -f "$ROOT/supabase/seed.sql"

echo "==> Fetching API keys..."
KEYS_JSON="$(curl -sf -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/api-keys?reveal=true")"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
ANON_KEY="$(echo "$KEYS_JSON" | python3 -c "
import json,sys
keys=json.load(sys.stdin)
for k in keys:
  if k.get('name')=='anon' or k.get('type') in ('anon','publishable'):
    print(k.get('api_key') or k.get('key',''))
    break
")"

echo ""
echo "=== Supabase ready ==="
echo "VITE_SUPABASE_URL=$SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "Set on Railway frontend service:"
echo "  railway variable set VITE_SUPABASE_URL=\"$SUPABASE_URL\" -s frontend"
echo "  railway variable set VITE_SUPABASE_ANON_KEY=\"$ANON_KEY\" -s frontend"
