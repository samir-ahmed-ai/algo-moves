# Algo Moves — Game Server

A tiny, dependency-free realtime backend that pairs two players into a **room**
and relays messages between them. It powers the couch/long-distance two-player
games in the frontend (Number Duel, Rock-Paper-Scissors, Tic-Tac-Toe, Mind Meld,
Reaction Duel).

- **Stdlib WebSocket.** The WebSocket layer (RFC 6455) is implemented on the Go
  standard library; only Postgres persistence adds `pgx`.
- **In-memory rooms.** Realtime rooms live in memory for the life of a match and
  are reclaimed when everyone leaves. Optional **Postgres** (`DATABASE_URL`) adds
  durable profiles, leaderboards, and match history via `/api/*`.
- **Game-agnostic.** The server never decodes a game move. Each game speaks its
  own JSON over the `relay` channel; the server only forwards it to the peer and
  remembers the host's shared `state` so a late joiner catches up.

## Run it

```bash
# from backend/
go run ./cmd/gameserver          # listens on :8080
PORT=9000 go run ./cmd/gameserver
go run ./cmd/gameserver -addr :8080

# or via the top-level Makefile (repo root)
make backend-dev
```

Point the frontend at it with `VITE_GAMES_SERVER_URL` (see `frontend/.env.example`).
On a LAN the default already works: the frontend connects to `ws://<your-host>:8080`,
so open the site on your laptop's IP from both phones.

## Endpoints

| Method | Path                               | Purpose                                    |
| ------ | ----------------------------------- | ------------------------------------------ |
| GET    | `/ws?room=CODE&name=NAME&pid=PID`  | Upgrade to a game-room WebSocket           |
| GET    | `/new`                              | Mint a fresh room code → `{"code":"ABCD"}` |
| GET    | `/healthz`                          | Liveness → `{"status":"ok","rooms":N,"arcade":?}` |
| GET    | `/`                                 | Plain-text banner                          |
| *      | `/api/*`                            | Arcade persistence (when `DATABASE_URL` set) |

`pid` is optional but recommended: a stable, client-minted id (e.g. persisted in
`localStorage`) that identifies the *player*, not the connection. Reconnecting
with the same `pid` reclaims that player's original slot/role in the room —
important for a host, whose role controls who may publish shared `state` — even
across a dropped socket. If the previous connection for that `pid` is still
technically open but has gone stale (e.g. a phone that lost network without a
clean close), the reconnect actively replaces it rather than waiting on the
60s keepalive timeout or being wrongly rejected with `room-full`. Joining
without a `pid` (or with one that matches nothing) falls back to plain
lowest-free-slot assignment, same as before.

## Protocol

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

## Layout

```
cmd/gameserver      entrypoint (flags, http.Server)
internal/ws         RFC 6455 handshake + framing (stdlib only)
internal/hub        rooms, presence, relay, shared state
internal/server     HTTP routes (testable handler)
internal/arcade     Postgres store + `/api/*` REST handlers
```

See [`../db/README.md`](../db/README.md) for Railway Postgres setup.

## Arcade API (optional)

When `DATABASE_URL` is set, the server exposes REST endpoints for guest auth,
profiles, stats, leaderboards, rooms, and daily challenges. The frontend calls
these on the same origin as `VITE_GAMES_SERVER_URL`. Set `RUN_MIGRATIONS=true`
on deploy to apply embedded SQL migrations automatically.

```bash
export DATABASE_URL="postgres://..."
export RUN_MIGRATIONS=true
go run ./cmd/gameserver
curl -s localhost:8080/healthz   # includes "arcade": true
```

## Test

```bash
go test ./...   # unit tests for framing + hub, plus a real two-client socket relay
```

## Deploy (production)

Build and run the Docker image anywhere that exposes HTTP/WebSocket on `$PORT`:

```bash
docker build -t algomoves-gameserver backend/
docker run --rm -p 8080:8080 -e ALLOWED_ORIGINS=https://your-pages-origin algomoves-gameserver
```

### Railway

The repo includes [`railway.toml`](railway.toml) and [`Dockerfile`](Dockerfile). Create a Railway **backend** service with root directory `/backend`, generate a public domain, then set variables in the Railway dashboard (not in git):

| Variable | Purpose |
| -------- | ------- |
| `ALLOWED_ORIGINS` | Comma-separated browser origins, e.g. `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `DATABASE_URL` | Postgres connection string (reference Railway Postgres plugin) |
| `RUN_MIGRATIONS` | `true` to apply schema + seed on startup |
| `PORT` | Set automatically by Railway |

The **frontend** Railway service (root `/frontend`) needs `VITE_GAMES_SERVER_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` so the build reaches this server.

Deploy from the repo root:

```bash
export RAILWAY_TOKEN="<project-token>"
export RAILWAY_PROJECT_ID="<project-id>"
railway up backend --path-as-root --service backend --detach
```

Or enable [`.github/workflows/deploy-railway.yml`](../.github/workflows/deploy-railway.yml) with GitHub secrets `RAILWAY_TOKEN` and `RAILWAY_BACKEND_SERVICE_ID`.

### Environment

| Variable | Purpose |
| -------- | ------- |
| `PORT` | Listen port (default `:8080`) |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed for WebSocket upgrade and CORS. Empty = allow all (LAN dev). |
| `DATABASE_URL` | Postgres URL for arcade persistence. Unset = realtime-only (no `/api`). |
| `RUN_MIGRATIONS` | Apply embedded SQL migrations + achievement seed on startup (`true`/`1`). |
| `MAX_ROOMS` | Cap on concurrent rooms; new-room `/ws` joins are rejected past this (default `5000`). Reconnects to existing rooms are never blocked by this cap. |

Rate limits (per client IP): 60 WebSocket upgrades/minute, 20 `/new` calls/minute.
