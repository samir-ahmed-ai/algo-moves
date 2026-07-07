# Architecture

Three layers in the frontend SPA, plus an optional Go backend for realtime games.

```mermaid
flowchart TB
  subgraph shell [Shell — frontend/src/shell]
    Workspace["workspace/ — mode router"]
    Study["study/ — Learn Studio, Play, Code Studio"]
    Canvas["canvas/ — React Flow workspace"]
    Collab["collab/ — transport orchestration"]
    Interview["interview/ — facilitation UI + layout"]
    Panels["panels/ — shared panel kernel"]
    Realtime["realtime/ — WebSocket room transport"]
    GamesArcade["games/ — arcade plugins"]
  end
  subgraph plugins [Plugins — frontend/src/plugins]
    vizKit["plugins/_shared/vizKit"]
    native["18 native plugins"]
    imported["91 progress + 271 prep simulators"]
  end
  subgraph backend [Backend — backend/]
    GameServer["gameserver — WebSocket room relay"]
  end
  Workspace --> Study
  Workspace --> Canvas
  Study --> Panels
  Canvas --> Panels
  Canvas --> Collab
  Collab --> Interview
  Collab --> Realtime
  GamesArcade --> Realtime
  Realtime --> GameServer
  plugins --> Panels
  plugins --> Study
```

## Layer dependency graph

Enforced by `frontend/scripts/check-boundaries.mjs` and ESLint `import/no-restricted-paths` / `eslint-plugin-boundaries`. Dependency direction flows **downward only** (design at the bottom, shell at the top).

```mermaid
flowchart BT
  shell["shell / hooks"]
  plugins["plugins"]
  store["store"]
  effects["effects"]
  components["components"]
  content["content"]
  core["core"]
  platform["platform"]
  lib["lib"]
  design["design"]

  shell --> plugins
  shell --> store
  shell --> effects
  shell --> components
  shell --> content
  shell --> core
  shell --> platform
  shell --> lib
  shell --> design

  plugins --> store
  plugins --> effects
  plugins --> components
  plugins --> content
  plugins --> core
  plugins --> platform
  plugins --> lib
  plugins --> design

  store --> content
  store --> core
  store --> platform
  store --> lib
  store --> design

  effects --> components
  effects --> core
  effects --> platform
  effects --> lib
  effects --> design

  components --> core
  components --> platform
  components --> lib
  components --> design

  content --> core
  content --> platform
  content --> lib
  content --> design

  core --> platform
  core --> lib
  core --> design

  platform --> lib
  platform --> design

  lib --> design
```

**FORBIDDEN upward imports** (each source layer must not import the listed targets):

| Source | Must not import |
|--------|-----------------|
| `design` | lib, core, content, components, effects, platform, store, plugins, hooks, shell |
| `lib` | platform, store, plugins, shell |
| `platform` | store, plugins, shell |
| `core` | platform, store, plugins, shell |
| `content` | platform, store, plugins, shell |
| `components` | platform, store, plugins, shell |
| `effects` | platform, store, plugins, shell |
| `store` | plugins, shell |
| `plugins` | shell |

Composition roots (`core/registry.ts`, `content/index.ts`, `content/taxonomy.ts`) may import plugins by design. See [`docs/roadmap/01-architecture-and-boundaries.md`](roadmap/01-architecture-and-boundaries.md).

## Product domains

| Domain | Path | Purpose |
|--------|------|---------|
| **Study** | `shell/study/` | Solo learning: Learn Studio, Play mode, Code Studio quiz/recall |
| **Canvas** | `shell/canvas/` | Freeform React Flow workspace, layout, panel chrome |
| **Collab** | `shell/collab/` | Canvas collaboration transport: relay/Yjs orchestration, protocol, sync hooks |
| **Interview** | `shell/interview/` | Interview facilitation: HUD, widgets, board layout, guest gate, persistence |
| **Panels** | `shell/panels/` | Shared panel bodies used by both Study and Canvas |
| **Realtime** | `shell/realtime/` | WebSocket room transport (games + canvas collab) |
| **Session** | `lib/session/` | Session kinds: solo, collab, interview |

### Session model

Three session kinds live in `lib/session/types.ts` and ride the room envelope (`shell/realtime/roomState.ts`).

**Shell folders**

| Folder | Role in sessions |
|--------|------------------|
| `shell/realtime/` | WebSocket room relay, peer roster, chat/reactions (`useRoomComms`) |
| `shell/collab/` | `CanvasCollabProvider` — binds transport to canvas doc, sub-docs, presence, comments |
| `shell/interview/` | Interview-only UX + REST persistence hooks (`useInterviewBoardPersistence`, widgets, `interviewLayout`) |
| `platform/api/interviewApi.ts` | Durable interview REST (`/api/interviews`) |

| Kind | Default context | Roles | Durable backend |
|------|-----------------|-------|-----------------|
| **solo** | Learn / Play / Mobile | — | — |
| **collab** | Freeform canvas | host / guest / spectator | optional canvas REST |
| **interview** | Host + candidate on a shared problem | host / guest | interview REST (`/api/interviews`) |

**Envelope fields**

- `session` — {@link SessionMeta}: kind, optional `activeProblemId`, interview settings, `sessionId` / `guestToken` when Postgres backs the room
- `canvas` — host-authoritative {@link CanvasDoc} (nodes, edges, comments)
- `subDocs` — whiteboard / collab-code panel interiors

**Interview runtime** (`session.interviewRuntime`, host-published)

- `timer` — shared countdown (`durationMs`, `running`, `endsAt`)
- `locked` — guests become view-only (board + sub-docs)
- `hostFollow` — guests mirror the host viewport (pan/zoom)
- `hostFrameFollow` — classroom mode: guests mirror the host scrubber on the active viz panel (`playback.nodeId` + `index`)
- `playback` — latest host frame position while frame follow is on

**Wire traffic**

- Ephemeral presence (cursor, selection, viewport, drag) — relay frames tagged `__canvas`
- Document edits — non-hosts send {@link EditOp}s; host folds and republishes the envelope
- Quiz answers during interviews — {@link quizProtocol} relay to host log

**Degradation**

When the arcade backend has no Postgres, interview sessions still work over the WebSocket relay (`shell/collab/CanvasCollabProvider` shows a solo-fallback banner; guest invite tokens are unavailable).

## Postgres persistence

| Store | Service | Format | Purpose |
|-------|---------|--------|---------|
| `canvases` | Go `/api/canvases` | JSON snapshot | Named saved canvases |
| `yjs_documents` | Hocuspocus | Yjs CRDT binary | Live collab by room code |
| `interview_sessions` | Go `/api/interviews` | JSON + tokens | Durable interview rooms |
| `games` | Go `/api/games` | Catalog rows | Arcade game metadata |
| Content tables | Go `/api/content/*` | Relational | Learning catalog mirror |

See [`db/README.md`](../db/README.md) for migrations 001–013.

## Shell (`frontend/src/shell/`)

App chrome: navigation, catalog, transport, density presets. Typography uses `--fs` / `--fs-sm` via `chromeUi.tsx`.

Routes in `App.tsx`: home, workspace, mobile deck (`#mobile`), Vim Dojo (`#vim`), and the **Games arcade** (`#games`).

### Games arcade (`frontend/src/shell/games/`)

Multiplayer games over WebSocket. Transport lives in `shell/realtime/`; game plugins stay under `games/<id>/`.

### Study store facade (`store/study/`)

Thin re-exports over progress, Code Studio phase persistence, and resume helpers — prep for future server sync.

## Backend (`backend/`)

Stdlib-only Go service: pairs players into a room, relays JSON, stores host shared state. See [`backend/README.md`](../backend/README.md).

Deploy both apps on Railway with GitHub connected per service (`backend/` and `frontend/` root directories, branch `main`). The frontend build injects `VITE_API_SERVER_URL` from Railway service variables so browsers reach the backend API and game server.

## Canvas (`frontend/src/shell/canvas/`)

React Flow workspace. `PanelNode.tsx` routes to bodies in `shell/panels/`. Layout presets include **TraceFocus** (formerly "Study").

## Plugins (`frontend/src/plugins/`)

Each algorithm exposes `record`, `View`, `Inspector` via `definePlugin` or imported simulators. Shared viz primitives in `_shared/vizKit.tsx`; teaching panels in `_shared/practice.tsx`.

Prep library (271 problems) and progress library (91 problems) are generated into `imported/prepManifest.ts` and `imported/manifest.ts`.

## Generated files

Generated artifacts are downstream outputs. Do not hand-edit them; change the generator, then regenerate.

| Generated artifact | Generator |
|--------------------|-----------|
| `frontend/src/plugins/imported/manifest.ts` | `frontend/scripts/import-problems.mjs` |
| `frontend/src/plugins/imported/prepManifest.ts` | `frontend/scripts/import-prep.mjs` |
| `frontend/src/plugins/_generated/pluginMeta.ts` | `frontend/scripts/build-plugin-meta.mts` |
| `frontend/src/plugins/_generated/courses.ts` | `frontend/scripts/build-plugin-meta.mts` |
| `frontend/src/content/_generated/problemBriefs.ts` | `frontend/scripts/build-problem-briefs.mts` |
| `frontend/src/styles/themes/index.css` | `frontend/scripts/generate-themes.mjs` |
| `frontend/src/styles/themes/sources/index.ts` | `frontend/scripts/generate-themes.mjs` |
| `frontend/src/shell/games/_generated/gameIds.ts` | `frontend/scripts/generate-game-ids.mjs` |
| `db/content_seed.sql` | `frontend/scripts/export-content-sql.mts` |
| `backend/internal/arcade/seeds/content_seed.sql` | `frontend/scripts/export-content-sql.mts` |

## Quality guardrails

| Guard | Contract |
|-------|----------|
| `frontend/scripts/check-boundaries.mjs` | Enforces downward imports between design, lib, core, content, components, effects, store, plugins, and shell. |
| `frontend/scripts/check-circular.mjs` | Fails when circular dependencies exceed the recorded ratchet. |
| `frontend/scripts/check-orphans.mjs` | Fails when source modules or native plugin folders are unreachable from the app entry/registry. |
| `frontend/scripts/check-tokens.mjs` | Keeps layout and typography literals in token files instead of random components. |
| `frontend/scripts/check-shell-typography.mjs` | Keeps shell typography on semantic chrome tokens. |
| `frontend/scripts/lint-plugin-typography.mjs` | Keeps plugin typography on vizKit/vizText tokens. |
| `frontend/scripts/lighthouse-budget.mjs` | Checks static SEO, PWA, a11y, and lazy-load budget invariants. |
| `frontend/scripts/check-prep-*.mjs` | Keeps prep simulators, quiz coverage, and recording quality complete. |
