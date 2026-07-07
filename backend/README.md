# Algo Moves Game Server

The backend is a lean Go service for realtime arcade rooms and optional durable
arcade data. It pairs players into rooms, relays game-owned JSON, and exposes
REST APIs for profiles, leaderboards, match history, content, canvases, interview
sessions, and prep plans when Postgres is configured.

## Operating model

- **Realtime first.** Rooms live in memory for the life of a match and are
  reclaimed after the last connection leaves.
- **Durable when configured.** `DATABASE_URL` enables `/api/*` persistence through
  embedded migrations, generated queries, and Postgres-backed stores.
- **Game-agnostic relay.** The server never interprets a game move. Clients send
  JSON over `relay`; only the host can publish shared `state` for reconnects,
  spectators, and late joiners.
- **Stdlib WebSocket.** RFC 6455 upgrade and framing are implemented on the Go
  standard library. Postgres persistence is the only major runtime dependency.
- **Separate from canvas CRDT.** Realtime canvas collaboration belongs to the
  Hocuspocus service. This server owns arcade rooms and backend REST domains.

## Local development

```bash
# from backend
go run ./cmd/gameserver             # listens on :8080
PORT=9000 go run ./cmd/gameserver   # listens on :9000
go run ./cmd/gameserver -addr :8080 # explicit address

# or via the top-level Makefile (repo root)
make backend-dev
```

Point the frontend at this service with `VITE_API_SERVER_URL`; see
`frontend/.env.example`. `VITE_GAMES_SERVER_URL` is still accepted as a legacy
alias.

For LAN play, the default works without extra config: the frontend connects to
`ws://<your-host>:8080`, so open the frontend on the laptop IP from both phones.

## HTTP surface

| Method | Path                              | Purpose |
| ------ | --------------------------------- | ------- |
| GET    | `/ws?room=CODE&name=NAME&pid=PID` | Upgrade to a game-room WebSocket |
| GET    | `/new`                            | Mint a fresh room code: `{"code":"ABCD"}` |
| GET    | `/healthz`                        | Liveness: `{"status":"ok","rooms":N,"arcade":?}` |
| GET    | `/`                               | Plain-text service banner |
| *      | `/api/*`                          | Durable arcade and app APIs when `DATABASE_URL` is set |

`pid` is optional but recommended: a stable, client-minted id (e.g. persisted in
`localStorage`) that identifies the *player*, not the connection. Reconnecting
with the same `pid` reclaims that player's original slot/role in the room -
important for a host, whose role controls who may publish shared `state` - even
across a dropped socket. If the previous connection for that `pid` is still
technically open but has gone stale (e.g. a phone that lost network without a
clean close), the reconnect actively replaces it rather than waiting on the
60s keepalive timeout or being wrongly rejected with `room-full`. Joining
without a `pid` (or with one that matches nothing) falls back to plain
lowest-free-slot assignment, same as before.

## Realtime protocol

Client → server (text frames, JSON):

```jsonc
{ "t": "relay", "d": { /* any game move */ } }  // forwarded to the other player
{ "t": "state", "d": { /* shared config  */ } }  // host sets room state, echoed to peer
```

Server → client:

```jsonc
{ "t": "welcome",    "self": Peer, "peers": [Peer], "state": any }
{ "t": "peer-join",  "peer": Peer }
{ "t": "peer-leave", "peer": Peer }
{ "t": "relay",      "from": "c1", "d": any }
{ "t": "state",      "d": any }
{ "t": "error",      "msg": "room-full" }
```

`Peer = { id, name, role }` where `role` is `"host"` (first in, slot 0) or
`"guest"` (slot 1). A third connection to a full room gets `{"t":"error","msg":"room-full"}`
and is closed.

## Room contract

These rules are enforced in `internal/hub/room.go` and matter to every arcade game:

- **Seat 0 is always the host.** The first player to claim slot 0 gets `role: "host"`.
  Seat 1 keeps the historical `"guest"` name; seats 2–7 are `"player"`.
- **Only the host may publish shared `state`.** Guests and spectators relay moves over
  `relay`, but `setState` from a non-host is ignored. Games mirror authoritative
  snapshots from the host into room state for spectators and late joiners.
- **Capacity is 2–8 player seats.** Rooms default to 2 seats; the creating client may
  request up to 8. Extra joiners become spectators (up to 64), not rejected outright.
- **Roles are seat-fixed, not promoted.** When the host disconnects, their seat frees
  but stays slot 0. A reconnect with the same `pid` reclaims host. No automatic
  promotion of a guest to host.
- **Pid reclaim beats lowest-free-seat.** Reconnecting with a stable `pid` always
  returns to the same seat/role, evicting a stale connection still parked there.
- **Empty rooms are deleted.** When the last connection leaves, the room is marked
  `dead` and removed from the hub map so the code can be reused. A join that races
  with that teardown retries against a fresh room (see `JoinWith`).

## Architecture

```
cmd/gameserver      entrypoint (flags, http.Server)
internal/ws         RFC 6455 handshake + framing (stdlib only)
internal/hub        rooms, presence, relay, shared state
internal/server     HTTP routes (testable handler)
internal/arcade     composition root: route table wiring /api/* to domain packages
internal/platform   auth, profiles, sessions, migrations, shared Postgres store
  arcadedb/         sqlc-generated queries
  migrations/       embedded SQL schema (001–013)
  seeds/            achievement + content seed SQL
internal/games      games catalog, stats, matches, leaderboards, social
internal/interview  interview sessions + guest tokens
internal/content    learning catalog reads (/api/content/*)
internal/canvas     saved canvas CRUD
internal/prep       prep plan CRUD
```

### Domain package map

| Package | Responsibility | Key routes |
| ------- | -------------- | ---------- |
| `platform` | Postgres pool, profiles, guest/email auth, SCS sessions, migrations | `/api/auth/*`, `/api/profiles/*` |
| `games` | Arcade stats, match history, leaderboards, achievements, rooms, friends, daily challenge, games catalog | `/api/stats/*`, `/api/matches/*`, `/api/leaderboard/*`, `/api/achievements/*`, `/api/rooms/*`, `/api/friends`, `/api/daily-challenge/*`, `/api/games/*` |
| `interview` | Durable interview whiteboard sessions | `/api/interviews/*` |
| `content` | Read-only learning catalog mirror | `/api/content/catalog`, `/api/content/problems/*` |
| `canvas` | Named saved canvas documents | `/api/canvases/*` |
| `prep` | Owner-held ordered prep plans | `/api/prep-plans/*` |
| `arcade` | Thin facade: `Open`, `Register`, route table delegating to packages above | (mounts all `/api/*`) |

Domain packages depend on `platform` only — not on each other. `arcade` is the single composition root consumed by `cmd/gameserver` and `internal/server`.

## Persistence and generated seeds

Without `DATABASE_URL`, the server runs in realtime-only mode and `/api/*`
durable features are unavailable. With `DATABASE_URL`, the server opens Postgres,
registers REST routes, and can apply embedded migrations on startup.

`internal/arcade/seeds/content_seed.sql` mirrors `../db/content_seed.sql` and is generated from the frontend catalog by:

```bash
cd ../frontend
npm run export-content-sql
```

Do not hand-edit either seed file. Update catalog/plugin data or the exporter, regenerate, then deploy with `RUN_CONTENT_SEED=true`.

See [`../db/README.md`](../db/README.md) for Railway Postgres setup.

## Optional arcade API

```bash
export DATABASE_URL="postgres://..."
export RUN_MIGRATIONS=true
go run ./cmd/gameserver
curl -s localhost:8080/healthz   # includes "arcade": true
```

The frontend calls these APIs on the same origin as `VITE_API_SERVER_URL`.

## Test command

```bash
go test ./...   # unit tests for framing + hub, plus a real two-client socket relay
```

## Production deploy

Build and run the Docker image anywhere that exposes HTTP/WebSocket on `$PORT`:

```bash
docker build -t algomoves-gameserver backend/
docker run --rm -p 8080:8080 -e ALLOWED_ORIGINS=https://your-pages-origin algomoves-gameserver
```

Production checklist:

- Set `ALLOWED_ORIGINS` to the exact frontend origin.
- Set `DATABASE_URL` when durable arcade/profile/content features are required.
- Enable `RUN_MIGRATIONS=true` for managed deploys unless migrations are handled separately.
- Enable `RUN_CONTENT_SEED=true` when refreshing the learning catalog.
- Keep frontend `VITE_API_SERVER_URL` pointed at the public backend URL.

### Railway

The repo includes [`railway.toml`](railway.toml) and [`Dockerfile`](Dockerfile). In Railway, create a **backend** service with **root directory** `backend`, connect your GitHub repo, and set branch **`main`** with deploy-on-push enabled. Set variables in the dashboard (not in git):

| Variable | Purpose |
| -------- | ------- |
| `ALLOWED_ORIGINS` | Comma-separated browser origins, e.g. `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}`. Also switches session cookies to `SameSite=None; Secure` for cross-origin credentialed API calls. |
| `DATABASE_URL` | Postgres connection string (reference Railway Postgres plugin) |
| `RUN_MIGRATIONS` | `true` to apply schema + achievement seed on startup |
| `RUN_CONTENT_SEED` | `true` to reload the learning catalog (`/api/content/*`) on startup |
| `PORT` | Set automatically by Railway |

The **frontend** service uses root directory `frontend`, the same GitHub repo/branch, and `VITE_API_SERVER_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}`.

Pushes to `main` deploy both services automatically via Railway's GitHub integration. For a manual fallback:

```bash
railway up . --service backend --detach
```

### Environment

| Variable | Purpose |
| -------- | ------- |
| `PORT` | Listen port (default `:8080`) |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed for WebSocket upgrade and CORS. Empty = allow all (LAN dev). When set, session cookies use `SameSite=None; Secure` so the frontend can call the API from a different origin. |
| `COOKIE_CROSS_SITE` | Optional override (`true`/`1`) to force cross-site cookie flags when `ALLOWED_ORIGINS` is unset. |
| `DATABASE_URL` | Postgres URL for arcade persistence. Unset = realtime-only (no `/api`). |
| `RUN_MIGRATIONS` | Apply embedded SQL migrations + achievement seed on startup (`true`/`1`). Set `false` to skip. |
| `RUN_CONTENT_SEED` | Reload learning catalog from embedded `content_seed.sql` on startup (`true`/`1`). Requires content schema (run migrations first on fresh DB). Set `false` to skip. |
| `MAX_ROOMS` | Cap on concurrent rooms; new-room `/ws` joins are rejected past this (default `5000`). Reconnects to existing rooms are never blocked by this cap. |

Rate limits (per client IP): 60 WebSocket upgrades/minute, 20 `/new` calls/minute.
