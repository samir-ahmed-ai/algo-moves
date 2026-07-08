# Postgres — persistence layer

PostgreSQL stores durable data for the arcade, learning catalog, interview sessions,
canvas snapshots, prep plans, HTTP sessions (SCS), and Yjs CRDT documents (Hocuspocus).

The realtime relay (moves, presence, spectators) runs in the Go server under
`backend/`. Without `DATABASE_URL`, the backend still runs for zero-config LAN play —
profiles, leaderboards, interview tokens, and content API are unavailable.

## Migrations (001–016)

Canonical copies for review and manual runs live in [`db/migrations/`](migrations/).
The backend embeds identical files in `backend/db/migrations/` (synced via `./scripts/migrate-db.sh`).
Sync with `./scripts/migrate-db.sh` or `make db-migrate`.

| # | File | Purpose |
|---|------|---------|
| 001 | `001_arcade_schema.sql` | Profiles, matches, stats, achievements, rooms, friends, daily challenges |
| 002 | `002_arcade_functions.sql` | Security-definer RPCs (submit_match_result, leaderboards, daily challenge) |
| 003 | `003_canvas_schema.sql` | Saved canvas JSON snapshots (`canvases`) |
| 004 | `004_content_schema.sql` | Learning catalog (courses, topics, problems, solutions, quizzes) |
| 005 | `005_interview_schema.sql` | Interview sessions |
| 006 | `006_openrtb_group.sql` | OpenRTB course group constraint |
| 007 | `007_personal_room.sql` | Personal room codes on profiles |
| 008 | `008_user_auth.sql` | Email/password auth on profiles |
| 009 | `009_prep_plans_schema.sql` | Prep plans |
| 010 | `010_games_catalog.sql` | Games catalog (mirrors frontend registry) |
| 011 | `011_scs_sessions.sql` | HTTP session store for alexedwards/scs |
| 012 | `012_yjs_documents.sql` | Yjs binary state for Hocuspocus collab |
| 013 | `013_schema_migrations.sql` | Migration audit table (`schema_migrations`) |
| 014 | `014_resumes_schema.sql` | Resume upload, mapping, variants |
| 015 | `015_profile_openai_key.sql` | Encrypted per-user OpenAI API keys |
| 016 | `016_profile_settings.sql` | JSON settings blob on profiles |

Applied versions are recorded in `public.schema_migrations`. DDL remains idempotent;
re-deploy skips already-recorded files.

## Migration ownership

`db/migrations/` is the reviewable source tree. `backend/db/migrations/` and
`backend/db/seeds/` are the embedded runtime copies used by the Go service. Keep them
byte-for-byte aligned when adding or changing migrations; never patch only one side.

`010_games_catalog.sql` is also the source for `frontend/src/shell/games/_generated/gameIds.ts`
via `frontend/scripts/generate-game-ids.mjs`.

## Railway setup

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. Open the **backend** service → **Variables** → add a reference to the Postgres
   service's `DATABASE_URL`.
3. Set on the backend:
   - `RUN_MIGRATIONS=true` — schema migrations + achievement seed
   - `RUN_CONTENT_SEED=true` — reload learning catalog (`/api/content/*`)
4. Set `DATABASE_URL` on the **hocuspocus** service (same Postgres) for Yjs persistence.
5. Redeploy. `GET /healthz` should return `"arcade": true`.

## Local development

```bash
docker run -d --name algo-moves-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

export DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
make db-migrate          # applies all migrations + achievement seed
make backend-dev
```

## Manual migrations

```bash
./scripts/migrate-db.sh   # preferred — applies all migrations in order
# or individually:
psql "$DATABASE_URL" -f db/migrations/001_arcade_schema.sql
# ... through 013_schema_migrations.sql
psql "$DATABASE_URL" -f db/seed.sql
```

## Canvas persistence (dual path)

| Store | Owner | Format | Use |
|-------|-------|--------|-----|
| `canvases` | Go `/api/canvases` | JSON snapshot | Saved named canvases, REST load/save |
| `yjs_documents` | Hocuspocus service | Yjs CRDT binary | Live collab sync by room code |

Both can reference the same logical room; they are not automatically unified.

## Learning content

Migration `004_content_schema.sql` adds catalog tables. Content is authored in
TypeScript and exported via `frontend/scripts/export-content-sql.mts`:

```bash
npm --prefix frontend run export-content-sql
npm --prefix frontend run check-content-sql
make content-seed
```

Reads: `GET /api/content/catalog`, `GET /api/content/problems/{id}`.
Games catalog: `GET /api/games`, `GET /api/games/{id}`.

Generated seed files:

| File | Owner |
|------|-------|
| `db/content_seed.sql` | Reviewable SQL seed artifact |
| `backend/db/seeds/content_seed.sql` | Embedded runtime copy |

Do not hand-edit either file. Update frontend catalog/plugin data or the exporter,
then rerun `npm --prefix frontend run export-content-sql`.

## Design notes

- **No forged scores.** Match results go through `submit_match_result(...)` only.
- **Guest profiles.** `POST /api/auth/guest` creates a profile; mutating calls use
  SCS session cookies (or legacy bearer during transition).
- **Leaderboards** from `leaderboard_game` / `leaderboard_global` / `leaderboard_recent`.
