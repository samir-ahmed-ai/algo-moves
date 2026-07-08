# Backend Architecture

> **Algo Moves Game Server** — lean Go service for realtime arcade rooms, optional durable arcade data, and REST APIs for profiles, leaderboards, content, canvases, interview sessions, and prep plans.

**Contents:** [System Overview](#system-overview) · [Go Workspace](#go-workspace) · [Module Dependency Graph](#module-dependency-graph) · [HTTP Surface](#http-surface) · [WebSocket Protocol](#websocket-protocol) · [Room Lifecycle](#room-lifecycle) · [Domain Packages](#domain-packages) · [Database Schema](#database-schema) · [Deployment](#deployment) · [Environment Reference](#environment-reference)

---

## System Overview

The backend sits between the browser and Postgres. It owns arcade rooms (ephemeral, in-memory) and durable REST domains (profiles, games, interviews, canvases, content, prep, resumes). The Hocuspocus service owns collaborative canvas CRDT sync separately.

```mermaid
graph TB
    Browser["🌐 Browser\nReact SPA"]

    subgraph backend ["backend/ — Go Workspace (Go 1.25)"]
        CMD["cmd/gameserver\nEntrypoint\nHTTP server · flags"]
        Transport["internal/transport/http\nCORS · Rate limits\nSession cookies · Routes"]
        App["internal/app\nComposition root\nOpen() · Register()"]

        subgraph domains ["REST Domain Packages"]
            Auth["internal/auth\nGuest + email auth\nSCS sessions"]
            Profile["internal/profile\nProfiles · settings\nOpenAI key (AES)"]
            Games["internal/games\nStats · matches\nLeaderboards\nFriends · daily"]
            Interview["internal/interview\nWhiteboard sessions\nGuest tokens"]
            Content["internal/content\nCatalog mirror\nRead-only"]
            Canvas["internal/canvas\nSaved canvases\nJSON CRUD"]
            Prep["internal/prep\nPrep plans CRUD"]
            Resume["internal/resume\nUpload · PDF extract\nOpenAI customize"]
        end

        subgraph realtime ["realtime/ — module algomoves.dev/realtime"]
            Hub["hub/\nRoom engine\nRelay · presence\nShared state"]
            WS["ws/\nRFC 6455 framing\nHandshake"]
        end

        subgraph shared ["shared/ — module algomoves.dev/shared"]
            Crypto["crypto/\nAES encryption"]
            HTTPUtil["httputil/\nJSON HTTP helpers"]
            Cfg["config/\nEnv helpers"]
        end

        DB["internal/database\nPostgres pool\nMigrations\nsqlc queries"]
    end

    Postgres[("PostgreSQL\nRailway Postgres")]
    Hocuspocus["Hocuspocus\nYjs CRDT\n(separate service)"]

    Browser -->|"wss:// WebSocket\n/ws?room=CODE"| WS
    Browser -->|"HTTPS REST\n/api/*"| Transport
    WS --> Hub
    Transport --> App
    App --> domains
    App --> Hub
    domains --> DB
    DB -->|"pgx/v5"| Postgres
    Hocuspocus -->|"pg"| Postgres

    style backend fill:#00ADD8,color:#fff,stroke:#007BA3
    style realtime fill:#29BEB0,color:#fff
    style shared fill:#5DC9E1,color:#000
    style Postgres fill:#336791,color:#fff
```

---

## Go Workspace

The backend is a **Go workspace** (`go.work`) with three modules. Each module has its own `go.mod` and the workspace resolves local dependencies without needing published packages.

```
backend/
├── go.work                       workspace: use (. ./realtime ./shared)
├── go.mod                        module algomoves/gameserver — Go 1.25
├── cmd/gameserver/               entrypoint
├── internal/                     API service (not importable cross-module)
├── realtime/
│   └── go.mod                    module algomoves.dev/realtime
└── shared/
    └── go.mod                    module algomoves.dev/shared (stdlib only)
```

The `replace` directives in the main `go.mod` also cover single-module builds (e.g. inside the Docker image without the workspace):

```go
replace algomoves.dev/realtime => ./realtime
replace algomoves.dev/shared   => ./shared
```

---

## Module Dependency Graph

```mermaid
flowchart TB
    GameServer["algomoves/gameserver\ncmd/ · internal/"]
    Realtime["algomoves.dev/realtime\nhub/ · ws/"]
    Shared["algomoves.dev/shared\nconfig/ · crypto/ · httputil/"]

    GameServer -->|"imports"| Realtime
    GameServer -->|"imports"| Shared
    Realtime -->|"imports"| Shared

    subgraph external ["External Dependencies"]
        PGX["github.com/jackc/pgx/v5\nPostgres driver"]
        SCS["github.com/alexedwards/scs/v2\nHTTP session store"]
        XCrypto["golang.org/x/crypto\nArgon2 password hashing"]
        XTime["golang.org/x/time\nRate limiting"]
        CoderWS["github.com/coder/websocket\nWebSocket (realtime module)"]
        PDF["github.com/ledongthuc/pdf\nResume PDF extraction"]
    end

    GameServer --> PGX & SCS & XCrypto & XTime & PDF
    Realtime --> CoderWS & XTime

    style GameServer fill:#00ADD8,color:#fff
    style Realtime fill:#29BEB0,color:#fff
    style Shared fill:#5DC9E1,color:#000
```

`realtime` and `shared` live **outside** `internal/` so they are importable across module boundaries (Go's `internal/` rule blocks cross-module imports).

---

## HTTP Surface

```mermaid
flowchart LR
    Client["Browser"]

    subgraph routes ["HTTP Routes"]
        WS_Route["GET /ws\n?room=CODE\n&name=NAME\n&pid=PID\n→ WebSocket upgrade"]
        New["GET /new\n→ {code: 'ABCD'}"]
        Health["GET /healthz\n→ {status,rooms,arcade}"]
        Root["GET /\nService banner"]
        API["* /api/*\nREST (requires DATABASE_URL)"]
    end

    subgraph api_domains ["/api/* domains"]
        AuthRoutes["/api/auth/*\nGuest · email · session"]
        ProfileRoutes["/api/profiles/*\nProfile · settings · integrations"]
        GameRoutes["/api/stats/* /api/matches/*\n/api/leaderboard/* /api/achievements/*\n/api/rooms/* /api/friends\n/api/daily-challenge/* /api/games/*"]
        InterviewRoutes["/api/interviews/*\nSessions · guest tokens"]
        ContentRoutes["/api/content/catalog\n/api/content/problems/*"]
        CanvasRoutes["/api/canvases/*"]
        PrepRoutes["/api/prep-plans/*"]
        ResumeRoutes["/api/resumes/*\nUpload · map · variants"]
    end

    Client --> WS_Route & New & Health & Root & API
    API --> AuthRoutes & ProfileRoutes & GameRoutes
    API --> InterviewRoutes & ContentRoutes & CanvasRoutes
    API --> PrepRoutes & ResumeRoutes

    style WS_Route fill:#10B981,color:#fff
    style API fill:#6366F1,color:#fff
```

**Rate limits (per client IP):**

| Endpoint | Limit |
|----------|-------|
| WebSocket upgrades (`/ws`) | 60 / minute |
| New room (`/new`) | 20 / minute |
| REST API (`/api/*`) | 120 / minute |
| Token endpoints | 30 / minute |

---

## WebSocket Protocol

All game and canvas relay traffic goes through a single WebSocket connection per client. Messages are JSON text frames.

### Client → Server

```mermaid
flowchart LR
    Client["Client"]
    Server["Game Server"]

    Client -->|"relay\n{t:'relay', d:{...move}}"| Server
    Client -->|"state (host only)\n{t:'state', d:{...snapshot}}"| Server

    note1["relay: forwarded to all\nother players in the room"]
    note2["state: host sets shared room\nstate — echoed to all peers\n(non-host ignored)"]

    Server -.-> note1
    Server -.-> note2
```

### Server → Client

```mermaid
flowchart LR
    Server["Game Server"]
    Client["Client"]

    Server -->|"welcome\n{t:'welcome', self, peers, state}"| Client
    Server -->|"peer-join\n{t:'peer-join', peer}"| Client
    Server -->|"peer-leave\n{t:'peer-leave', peer}"| Client
    Server -->|"relay\n{t:'relay', from, d}"| Client
    Server -->|"state\n{t:'state', d}"| Client
    Server -->|"error\n{t:'error', msg:'room-full'}"| Client
```

**Message reference:**

| Message | Direction | Payload |
|---------|-----------|---------|
| `relay` | C→S→C | `{ t: "relay", d: any }` — forwarded to all other peers |
| `state` | C→S | `{ t: "state", d: any }` — host-only; sets shared room state |
| `welcome` | S→C | `{ t: "welcome", self: Peer, peers: Peer[], state: any }` |
| `peer-join` | S→C | `{ t: "peer-join", peer: Peer }` |
| `peer-leave` | S→C | `{ t: "peer-leave", peer: Peer }` |
| `state` | S→C | `{ t: "state", d: any }` — echoed from host's `setState` |
| `error` | S→C | `{ t: "error", msg: "room-full" }` |

`Peer = { id: string, name: string, role: "host" | "guest" | "player" }`

---

## Room Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Empty : GET /new → {code}

    Empty --> Active : first client connects\n(→ welcome, role=host, seat 0)

    Active --> Active : peer joins (seat 1–7)\n(→ peer-join broadcast)
    Active --> Active : host publishes state\n(→ state broadcast)
    Active --> Active : peer relays move\n(→ relay broadcast)
    Active --> Active : peer disconnects\n(seat freed, peer-leave broadcast)
    Active --> Active : same pid reconnects\n(reclaims seat/role, evicts stale conn)

    Active --> Dead : last connection leaves\n(room marked dead, code freed)
    Dead --> [*]

    note right of Active
        Capacity: 2–8 player seats
        Extra joiners → spectators (up to 64)
        Seat 0 = host (role:"host")
        Seat 1 = guest (role:"guest")
        Seats 2–7 = player (role:"player")
    end note
```

**Room contract rules** (enforced in `realtime/hub/room.go`):

1. **Seat 0 is always the host.** First to claim slot 0 gets `role: "host"`.
2. **Only the host may publish `state`.** Non-host `setState` calls are silently ignored.
3. **Capacity is 2–8 player seats.** Extra joiners become spectators (up to 64).
4. **Roles are seat-fixed, not promoted.** Host disconnect frees their seat but doesn't promote guests.
5. **`pid` reclaim beats lowest-free-seat.** Reconnecting with a stable `pid` always reclaims the same seat/role, evicting stale connections.
6. **Empty rooms are deleted.** Last connection leaving marks the room `dead` and frees the code.

---

## Domain Packages

```mermaid
flowchart TB
    App["internal/app\nComposition root\nOpen() · Register()\nRoute table"]

    App --> Auth["internal/auth\n/api/auth/*\nGuest/email auth\nSCS sessions\nArgon2 passwords"]
    App --> Profile["internal/profile\n/api/profiles/*\nProfile CRUD\nSettings JSON blob\nOpenAI key (AES-256)"]
    App --> Games["internal/games\n/api/stats/* /api/matches/*\n/api/leaderboard/*\n/api/achievements/*\n/api/rooms/* /api/friends\n/api/daily-challenge/*\n/api/games/*"]
    App --> Interview["internal/interview\n/api/interviews/*\nDurable whiteboard sessions\nGuest token JWT"]
    App --> Content["internal/content\n/api/content/catalog\n/api/content/problems/*\nRead-only catalog mirror"]
    App --> Canvas["internal/canvas\n/api/canvases/*\nNamed saved canvas\nJSON snapshots"]
    App --> Prep["internal/prep\n/api/prep-plans/*\nOrdered prep plan CRUD"]
    App --> Resume["internal/resume\n/api/resumes/*\nUpload · PDF extract\nOpenAI customization"]
    App --> Database["internal/database\nPostgres pool\nEmbedded migrations\nsqlc-generated queries"]

    style App fill:#EF4444,color:#fff
    style Auth fill:#8B5CF6,color:#fff
    style Profile fill:#EC4899,color:#fff
    style Games fill:#F59E0B,color:#fff
    style Interview fill:#10B981,color:#fff
    style Content fill:#6366F1,color:#fff
    style Canvas fill:#3B82F6,color:#fff
    style Prep fill:#14B8A6,color:#fff
    style Resume fill:#F97316,color:#fff
    style Database fill:#336791,color:#fff
```

**Package responsibilities:**

| Package | Responsibility | Key routes |
|---------|----------------|------------|
| `app` | Thin facade: `Open`, `Register`, route table delegating to packages | (mounts all `/api/*`) |
| `auth` | Guest/email auth, SCS session cookies, Argon2 password hashing | `/api/auth/*` |
| `profile` | Profiles, JSON settings blob, AES-256 encrypted OpenAI keys | `/api/profiles/*` |
| `games` | Arcade stats, match history, leaderboards, achievements, friends, daily challenge, games catalog | `/api/stats/*`, `/api/matches/*`, `/api/leaderboard/*`, `/api/achievements/*`, `/api/rooms/*`, `/api/friends`, `/api/daily-challenge/*`, `/api/games/*` |
| `interview` | Durable interview whiteboard sessions, guest invite tokens | `/api/interviews/*` |
| `content` | Read-only learning catalog mirror (populated from `content_seed.sql`) | `/api/content/catalog`, `/api/content/problems/*` |
| `canvas` | Named saved canvas CRUD (JSON snapshots) | `/api/canvases/*` |
| `prep` | Owner-held ordered prep plans | `/api/prep-plans/*` |
| `resume` | Resume upload, PDF text extraction, OpenAI-powered customization | `/api/resumes/*` |
| `database` | Postgres pool, embedded migration runner, sqlc-generated query layer | (internal) |

---

## Database Schema

16 migrations applied in order; versions recorded in `public.schema_migrations` (idempotent re-runs).

```mermaid
erDiagram
    profiles {
        uuid id PK
        text name
        text email
        text password_hash
        text personal_room_code
        text openai_key_encrypted
        jsonb settings
        timestamp created_at
    }
    scs_sessions {
        text token PK
        bytea data
        timestamp expiry
    }
    matches {
        uuid id PK
        uuid player1_id FK
        uuid player2_id FK
        text game_id
        jsonb result
        timestamp played_at
    }
    game_stats {
        uuid id PK
        uuid profile_id FK
        text game_id
        int wins
        int losses
    }
    achievements {
        uuid id PK
        uuid profile_id FK
        text achievement_key
        timestamp earned_at
    }
    rooms {
        uuid id PK
        uuid host_id FK
        text code
        text game_id
        timestamp created_at
    }
    friends {
        uuid profile_id FK
        uuid friend_id FK
    }
    daily_challenges {
        date challenge_date PK
        text game_id
        jsonb config
    }
    canvases {
        uuid id PK
        uuid owner_id FK
        text name
        jsonb doc
        timestamp updated_at
    }
    yjs_documents {
        text room_code PK
        bytea state
        timestamp updated_at
    }
    interview_sessions {
        uuid id PK
        uuid host_id FK
        text guest_token
        jsonb doc
        timestamp created_at
    }
    content_courses {
        text id PK
        text title
        int sort_order
    }
    content_problems {
        text id PK
        text course_id FK
        text title
        text difficulty
        jsonb meta
    }
    prep_plans {
        uuid id PK
        uuid owner_id FK
        text title
        jsonb items
        timestamp updated_at
    }
    resumes {
        uuid id PK
        uuid owner_id FK
        text filename
        text extracted_text
        jsonb variants
        timestamp created_at
    }
    games_catalog {
        text id PK
        text title
        text description
        int min_players
        int max_players
    }
    schema_migrations {
        text filename PK
        timestamp applied_at
    }

    profiles ||--o{ matches : "plays"
    profiles ||--o{ game_stats : "accumulates"
    profiles ||--o{ achievements : "earns"
    profiles ||--o{ rooms : "hosts"
    profiles ||--o{ friends : "has"
    profiles ||--o{ canvases : "owns"
    profiles ||--o{ interview_sessions : "hosts"
    profiles ||--o{ prep_plans : "owns"
    profiles ||--o{ resumes : "uploads"
    profiles ||--|| scs_sessions : "authenticated via"
    content_courses ||--o{ content_problems : "contains"
```

**Migration sequence:**

| # | File | Domain |
|---|------|--------|
| 001 | `arcade_schema.sql` | Profiles, matches, stats, achievements, rooms, friends, daily challenges |
| 002 | `arcade_functions.sql` | Security-definer RPCs (submit_match_result, leaderboards) |
| 003 | `canvas_schema.sql` | Saved canvas JSON snapshots |
| 004 | `content_schema.sql` | Learning catalog (courses, topics, problems, solutions, quizzes) |
| 005 | `interview_schema.sql` | Interview sessions |
| 006 | `openrtb_group.sql` | OpenRTB course group constraint |
| 007 | `personal_room.sql` | Personal room codes on profiles |
| 008 | `user_auth.sql` | Email/password auth on profiles |
| 009 | `prep_plans_schema.sql` | Prep plans |
| 010 | `games_catalog.sql` | Games catalog (source for `_generated/gameIds.ts`) |
| 011 | `scs_sessions.sql` | HTTP session store for `alexedwards/scs` |
| 012 | `yjs_documents.sql` | Yjs binary state for Hocuspocus collab |
| 013 | `schema_migrations.sql` | Migration audit table |
| 014 | `resumes_schema.sql` | Resume upload, mapping, variants |
| 015 | `profile_openai_key.sql` | Encrypted per-user OpenAI API keys |
| 016 | `profile_settings.sql` | JSON settings blob on profiles |

> **Canonical location:** `db/migrations/` is the reviewable source tree. `backend/db/migrations/` is the embedded runtime copy — keep them byte-for-byte aligned. Sync with `./scripts/migrate-db.sh` or `make db-migrate`.

---

## Canvas Persistence (Dual Path)

Two independent stores can reference the same logical canvas room:

```mermaid
flowchart LR
    Client["Browser"]

    subgraph rest ["REST path — named saved canvases"]
        CanvasAPI["Go /api/canvases/*"]
        CanvasTable[("canvases table\nJSON snapshot")]
    end

    subgraph crdt ["CRDT path — live collab"]
        HP["Hocuspocus service\nYjs provider"]
        YjsTable[("yjs_documents table\nYjs binary CRDT")]
    end

    Client -->|"save/load named canvas"| CanvasAPI
    Client -->|"real-time collab edits"| HP
    CanvasAPI --> CanvasTable
    HP --> YjsTable

    note["Both paths use the same PostgreSQL instance\nbut are NOT automatically unified"]
```

---

## Content Seed Pipeline

The learning catalog is authored in TypeScript and exported to SQL:

```mermaid
flowchart LR
    FrontendCatalog["frontend/src/content/courses.ts\nPlugin catalog data (TypeScript)"]
    ExportScript["npm run export-content-sql\nfrontend/scripts/export-content-sql.mts"]
    SQLFile["db/content_seed.sql\n⚠️ Generated — do not edit"]
    BackendCopy["backend/db/seeds/content_seed.sql\n⚠️ Generated — do not edit"]
    Backend["Go backend\nRUN_CONTENT_SEED=true\n→ loads on startup"]

    FrontendCatalog --> ExportScript
    ExportScript --> SQLFile
    ExportScript --> BackendCopy
    BackendCopy --> Backend

    API["/api/content/catalog\n/api/content/problems/*"]
    Backend --> API
```

---

## Deployment

### Railway (Production)

```mermaid
flowchart TB
    GitHub["GitHub repo\nbranch: main"]

    subgraph railway ["Railway Project"]
        FE["frontend service\nRoot dir: frontend\nVite build"]
        BE["backend service\nRoot dir: backend\nDockerfile"]
        HP["hocuspocus service\nRoot dir: services/hocuspocus\nNode.js"]
        PG[("Postgres\nRailway managed")]
    end

    GitHub -->|"push to main\n→ auto-deploy"| FE
    GitHub -->|"push to main\n→ auto-deploy"| BE
    GitHub -->|"push to main\n→ auto-deploy"| HP
    BE -->|"DATABASE_URL"| PG
    HP -->|"DATABASE_URL"| PG
    FE -->|"VITE_API_SERVER_URL"| BE
    FE -->|"VITE_HOCUSPOCUS_URL"| HP
    BE -->|"ALLOWED_ORIGINS"| FE
    HP -->|"HOCUSPOCUS_ALLOWED_ORIGINS"| FE
```

**Required Railway variables:**

| Service | Variable | Value |
|---------|----------|-------|
| `backend` | `ALLOWED_ORIGINS` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `backend` | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `backend` | `RUN_MIGRATIONS` | `true` |
| `backend` | `RUN_CONTENT_SEED` | `true` |
| `hocuspocus` | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `hocuspocus` | `HOCUSPOCUS_ALLOWED_ORIGINS` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `frontend` | `VITE_API_SERVER_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` |
| `frontend` | `VITE_HOCUSPOCUS_URL` | `wss://${{hocuspocus.RAILWAY_PUBLIC_DOMAIN}}` |

### Docker (Self-Hosted)

```bash
# Build
docker build -t algomoves-gameserver backend/

# Run — realtime only (no DB)
docker run --rm -p 8080:8080 \
  -e ALLOWED_ORIGINS=https://your-frontend-origin \
  algomoves-gameserver

# Run — with Postgres
docker run --rm -p 8080:8080 \
  -e ALLOWED_ORIGINS=https://your-frontend-origin \
  -e DATABASE_URL=postgres://... \
  -e RUN_MIGRATIONS=true \
  -e RUN_CONTENT_SEED=true \
  algomoves-gameserver
```

### Local Development

```bash
# Realtime only (zero config)
make backend-dev          # → :8080

# With Postgres
docker run -d --name algo-moves-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16

export DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
make db-migrate           # applies all 16 migrations + achievement seed
make backend-dev          # → :8080 with arcade enabled

# Full stack (frontend + backend + hocuspocus)
make dev-all
```

---

## Environment Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Listen port (Railway sets automatically) |
| `ALLOWED_ORIGINS` | `""` (allow all) | Comma-separated browser origins for WebSocket + CORS. When set, enables `SameSite=None; Secure` session cookies for cross-origin API calls. |
| `COOKIE_CROSS_SITE` | — | Force cross-site cookie flags even when `ALLOWED_ORIGINS` is unset. |
| `DATABASE_URL` | — | Postgres connection string. Unset = realtime-only mode (no `/api/*`). |
| `RUN_MIGRATIONS` | — | Apply embedded migrations + achievement seed on startup (`true`/`1`). |
| `RUN_CONTENT_SEED` | — | Reload learning catalog from `content_seed.sql` on startup (`true`/`1`). Requires content schema (run migrations first). |
| `MAX_ROOMS` | `5000` | Cap on concurrent in-memory rooms. Reconnects to existing rooms are never blocked by this cap. |

**Rate limits (per client IP, not configurable via env):**

| Endpoint | Limit |
|----------|-------|
| `/ws` WebSocket upgrades | 60 / minute |
| `/new` room creation | 20 / minute |
| `/api/*` REST | 120 / minute |
| Token endpoints | 30 / minute |

---

## Testing

Each Go workspace module has independent tests. Run them all:

```bash
# From backend/
for m in . realtime shared; do
  (cd "$m" && go test ./...)
done
```

Coverage includes:
- **`gameserver` tests** — auth, profile, games, interview, content, canvas, prep domain handlers
- **`realtime` tests** — WebSocket framing (`ws/`), room hub unit tests, **real two-client socket relay test**
- **`shared` tests** — crypto, httputil helpers

Build the server binary:

```bash
go build ./cmd/gameserver   # from backend/
```

---

## Folder Reference

```
backend/
├── go.work                       workspace: use (. ./realtime ./shared)
├── go.mod                        module algomoves/gameserver — Go 1.25
├── Dockerfile                    multi-stage build
├── railway.toml                  Railway deploy config
│
├── cmd/gameserver/
│   └── main.go                   flags · http.Server · graceful shutdown
│
├── internal/
│   ├── app/
│   │   └── service.go            composition root: Open, Register, route table
│   ├── auth/                     guest/email auth · SCS sessions · Argon2
│   ├── profile/                  profiles · settings · OpenAI key (AES-256)
│   ├── games/                    stats · matches · leaderboards · friends · daily
│   ├── interview/                whiteboard sessions · guest tokens
│   ├── content/                  read-only catalog mirror
│   ├── canvas/                   saved canvas CRUD
│   ├── prep/                     prep plan CRUD
│   ├── resume/                   upload · PDF extract · OpenAI customize
│   ├── database/
│   │   ├── pool.go               pgx connection pool
│   │   ├── migrations.go         embedded migration runner
│   │   └── postgres/             sqlc-generated queries (13 query files)
│   ├── transport/http/
│   │   ├── server.go             HTTP routes (testable handler)
│   │   ├── cors.go               CORS middleware
│   │   └── ratelimit.go          per-IP rate limiting
│   └── config/
│       └── config.go             env-based config (Port, MaxRooms, etc.)
│
├── realtime/                     module algomoves.dev/realtime
│   ├── go.mod
│   ├── hub/
│   │   └── room.go               room engine: relay · presence · shared state
│   └── ws/
│       └── framing.go            RFC 6455 handshake + framing
│
├── shared/                       module algomoves.dev/shared (stdlib only)
│   ├── go.mod
│   ├── config/                   env helpers
│   ├── crypto/                   AES-256 encryption
│   └── httputil/                 shared JSON HTTP response helpers
│
└── db/
    ├── migrations/               ⚠️ Embedded runtime copy (synced from repo-root db/)
    ├── seeds/
    │   └── content_seed.sql      ⚠️ Generated from frontend catalog
    └── queries/                  sqlc source (13 .sql query files)
```

---

## Related Documentation

| Doc | Description |
|-----|-------------|
| [Frontend Architecture](ARCHITECTURE-FRONTEND.md) | React SPA layers, plugin system, state management |
| [Architecture Overview](architecture.md) | Combined system overview with session model |
| [Database / Migrations](../db/README.md) | Migration sequence, Railway Postgres setup, canvas persistence |
| [Root README](../README.md) | Quick start, monorepo layout, deploying to Railway |
