# Postgres — Games Arcade persistence

The realtime relay (moves, presence, spectators) runs in the Go server under
`backend/`. **PostgreSQL** stores durable data: player profiles, match history,
per-game MMR/stats, leaderboards, achievements, persistent rooms, friends and
daily challenges.

The arcade **degrades gracefully**: without `DATABASE_URL` on the backend it
still runs for zero-config LAN play — you just don't get profiles/leaderboards/history.

## Railway setup

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. Open the **backend** service → **Variables** → add a reference to the Postgres
   service's `DATABASE_URL` (Railway offers `${{Postgres.DATABASE_URL}}` or similar
   when you use **Add Reference**).
3. Set `RUN_MIGRATIONS=true` on the backend so schema + achievement seed apply on
   deploy (or run migrations manually — see below).
4. Redeploy the backend. `GET /healthz` should return `"arcade": true`.

No frontend env vars are needed for persistence — the browser calls the backend
at `/api/*` on the same host as `VITE_GAMES_SERVER_URL`.

## Local development

```bash
# Start Postgres (Docker example)
docker run -d --name algo-moves-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Backend with persistence
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
export RUN_MIGRATIONS=true
make backend-dev
```

## Manual migrations

Migrations are embedded in the backend image (`backend/internal/arcade/migrations/`).
Canonical copies for review and manual runs live in `db/migrations/` — keep them in
sync when editing schema.

```bash
psql "$DATABASE_URL" -f db/migrations/001_arcade_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_arcade_functions.sql
psql "$DATABASE_URL" -f db/migrations/003_canvas_schema.sql
psql "$DATABASE_URL" -f db/migrations/004_content_schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

## Learning content

Migration `004_content_schema.sql` adds the **learning catalog** tables —
`courses`, `topics`, `items`, `problems`, `solutions` (one row per
problem × language), `tags` + `problem_tags`, `quiz_questions` + `quiz_choices`,
and `story_regions` (narrative worlds layered over a course, e.g. Graphs →
*The Archipelago of Reach*). The schema runs on deploy like the others.

The catalog is still authored in the frontend TypeScript (`src/plugins/**`,
`src/content/**`). `frontend/scripts/export-content-sql.mts` mirrors it into a
deterministic seed and `check:all` fails if the seed drifts:

```bash
npm --prefix frontend run export-content-sql   # writes db/content_seed.sql
npm --prefix frontend run check-content-sql     # CI drift guard (in check:all)
```

The seed is a single transaction that **truncates and reloads** the content
tables, so re-running always converges to the current catalog. It is large, so
it is **not** applied automatically on deploy — apply it explicitly:

```bash
make content-seed                       # regenerate + apply to $DATABASE_URL
# or: SEED_CONTENT=1 ./scripts/migrate-db.sh
# or: psql "$DATABASE_URL" -f db/content_seed.sql
```

Reads are public (no auth), mirroring the leaderboard endpoints:
`GET /api/content/catalog` (course/topic/item tree) and
`GET /api/content/problems/{id}` (a problem with its tags, per-language
solutions and quiz).

## Design notes

- **No forged scores.** Clients never write directly to `matches`, `match_participants`
  or `game_stats`. All rating/XP changes go through the `submit_match_result(...)`
  function, which computes placement-based Elo, updates streaks, awards XP and
  unlocks achievements atomically.
- **Guest profiles.** `POST /api/auth/guest` creates a profile and session token;
  the browser stores the token and sends it as `Authorization: Bearer …` on
  mutating calls.
- **Leaderboards** come from `leaderboard_game` / `leaderboard_global` /
  `leaderboard_recent` (day/week windows).
