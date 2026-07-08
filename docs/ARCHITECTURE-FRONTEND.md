# Frontend Architecture

> **Algo Moves** — React 18 + TypeScript 5 + Vite 8 SPA with strict layer boundaries, a plugin-driven algorithm engine, and a token-driven design system.

**Contents:** [System Overview](#system-overview) · [Layer Dependency Graph](#layer-dependency-graph) · [Route Map](#route-map) · [Plugin System](#plugin-system) · [State Management](#state-management) · [Data Flow](#data-flow) · [Design System](#design-system) · [Generated Artifacts](#generated-artifacts) · [Quality Guardrails](#quality-guardrails)

---

## System Overview

The frontend is one of four deployed services. It talks to the Go game server for arcade rooms and REST APIs, and to Hocuspocus for collaborative canvas editing.

```mermaid
graph TB
    Browser["🌐 Browser\nReact 18 SPA\n:4321 (dev)"]

    subgraph services ["Deployed Services"]
        Frontend["Frontend\nReact + Vite\nRailway"]
        Backend["Go Game Server\n:8080\nRailway"]
        Hocuspocus["Hocuspocus\nYjs CRDT\nRailway"]
        Postgres[("PostgreSQL\nRailway")]
    end

    Browser -->|"HTTPS\nStatic SPA"| Frontend
    Browser -->|"WebSocket wss://\nArcade rooms"| Backend
    Browser -->|"WebSocket wss://\nCanvas collab"| Hocuspocus
    Backend -->|"pgx/v5"| Postgres
    Hocuspocus -->|"pg"| Postgres

    style Frontend fill:#646CFF,color:#fff
    style Backend fill:#00ADD8,color:#fff
    style Hocuspocus fill:#FF6B35,color:#fff
    style Postgres fill:#336791,color:#fff
```

**Environment variables injected at build time:**

| Variable | Purpose |
|----------|---------|
| `VITE_API_SERVER_URL` | Go backend base URL (`https://...railway.app`) |
| `VITE_HOCUSPOCUS_URL` | Hocuspocus WebSocket URL (`wss://...railway.app`) |

---

## Layer Dependency Graph

The SPA is organized into **10 strict layers**. Imports flow **downward only** — no circular deps, no upward imports. Enforced by `check-boundaries.mjs` and `eslint-plugin-boundaries`.

```mermaid
flowchart BT
    shell["🐚 shell\nRoutes · Chrome · Canvas · Games · Dojo"]
    plugins["🔌 plugins\n18 native · 91 progress · 271 prep"]
    store["🗄️ store\nZustand slices"]
    effects["✨ effects\nCanvas animation plugins"]
    components["🧩 components\nGraphBoard · CodeMirror · UI primitives"]
    content["📚 content\nCourse catalog · Problem briefs"]
    core["⚙️ core\nProblemPlugin contract · usePlayer · registry"]
    platform["🌐 platform\nTyped REST clients"]
    lib["🔧 lib\nSession · Quiz · Canvas · Utils"]
    design["🎨 design\nTokens · Typography · Node scale"]

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
    effects --> lib
    effects --> design

    components --> core
    components --> platform
    components --> lib
    components --> design

    content --> core
    content --> lib
    content --> design

    core --> lib
    core --> design

    platform --> lib
    platform --> design

    lib --> design

    style shell fill:#8B5CF6,color:#fff
    style plugins fill:#EC4899,color:#fff
    style store fill:#F59E0B,color:#fff
    style effects fill:#10B981,color:#fff
    style components fill:#3B82F6,color:#fff
    style content fill:#6366F1,color:#fff
    style core fill:#EF4444,color:#fff
    style platform fill:#14B8A6,color:#fff
    style lib fill:#F97316,color:#fff
    style design fill:#84CC16,color:#fff
```

**Forbidden upward imports** (enforced at lint time):

| Source | Must not import |
|--------|-----------------|
| `design` | lib, core, content, components, effects, platform, store, plugins, shell |
| `lib` | platform, store, plugins, shell |
| `platform` | store, plugins, shell |
| `core` | store, plugins, shell |
| `content` | store, plugins, shell |
| `components` | store, plugins, shell |
| `effects` | store, plugins, shell |
| `store` | plugins, shell |
| `plugins` | shell |

> Composition roots (`core/registry.ts`, `content/index.ts`) may import plugins by design and are explicitly whitelisted.

---

## Route Map

The app uses a **hash-based workspace store** — there is no Next.js router and no `pages/` folder. `App.tsx` reads `useWorkspace().route` to mount the correct shell.

```mermaid
flowchart TD
    Entry["main.tsx\nApp entry"]
    AppTsx["App.tsx\nRoute switch on\nuseWorkspace().route"]

    Entry --> AppTsx

    AppTsx --> Home["home\nshell/home/\nCourse catalog\nProgress meters"]
    AppTsx --> Workspace["canvas (default)\nshell/workspace/\nMode router"]
    AppTsx --> Mobile["#mobile\nshell/mobile/\nSwipe deck\nAnimate→Quiz→Rebuild"]
    AppTsx --> Vim["#vim\nshell/vim/\nVim Dojo\nKeyboard maze"]
    AppTsx --> Dojo["#dojo\nshell/dojo/\n12 algo patterns\nBlind practice"]
    AppTsx --> Games["#games\nshell/games/\nMultiplayer arcade\n6 games"]
    AppTsx --> Plans["#plans\nshell/plans/\nStudy prep plans"]
    AppTsx --> Resumes["#resumes\nshell/resumes/\nResume workspace\n+ OpenAI"]
    AppTsx --> Profile["#profile\nshell/profile/\nUser profile"]

    Workspace --> Study["study/\nLearn Studio\nPlay mode\nCode Studio"]
    Workspace --> Canvas["canvas/\nReact Flow workspace\nLayout presets"]
    Workspace --> Collab["collab/\nYjs/relay orchestration"]
    Workspace --> Interview["interview/\nFacilitation UI\nGuest tokens"]

    Games --> Lobby["lobby/\nCreate · Join · Share"]
    Games --> Room["room/\nRoster · Ready · Chat"]
    Room --> GamePlugins["games/<id>/\nmind-meld\nnumber-duel\nreaction-duel\nrps · tic-tac-toe\nwould-you-rather"]
```

---

## Plugin System

The engine is **algorithm-agnostic** — it steps an array of `Frame`s and asks the plugin's `View` to render the current one. The shell knows nothing about any specific algorithm.

### Plugin Contract

```mermaid
classDiagram
    class ProblemPlugin {
        +meta: PluginMeta
        +inputs: SampleInput[]
        +record(input): Frame[]
        +View: React.FC~PluginViewProps~
        +Inspector?: React.FC~InspectorProps~
        +verdict?(frames): Verdict
        +code?: CodeDef
        +quiz?: QuizItem[]
        +codePieces?: CodePiece[]
        +tabs?: TabDef[]
        +wires?: WireDef
        +editable?: EditableDef[]
    }

    class Frame {
        +move: Move
        +state: S
    }

    class Move {
        +type: string
        +note: string
        +caption: string
        +team?: string
        +tone?: string
    }

    class PluginMeta {
        +id: string
        +title: string
        +difficulty: Easy|Medium|Hard
        +tags: string[]
        +summary: string
        +source: string
    }

    ProblemPlugin --> Frame : record() produces
    Frame --> Move : contains
    ProblemPlugin --> PluginMeta : describes
```

### Plugin Hierarchy

```mermaid
flowchart TB
    subgraph engine ["⚙️ Engine — src/core/"]
        Types["types.ts\nProblemPlugin contract"]
        Registry["registry.ts\nSync meta index\nAsync lazy loading"]
        Player["usePlayer.ts\nprev/next/play/pause/reset"]
    end

    subgraph native ["🔨 18 Native Plugins"]
        BS["binary-search/"]
        Sorts["bubble-sort\nheap-sort\nmerge-sort\nquick-sort\nselection-sort\ninsertion-sort"]
        Other["tree-traversals\nn-queens\ntrie\nunion-find\nlinked-list-cycle\nreverse-linked-list\nlongest-substring\nmax-subarray-sum-k\ntwo-sum-sorted\ninterval-scheduling\nheap-operations"]
    end

    subgraph imported ["📦 Generated Libraries"]
        Progress["91 Progress problems\nimported/manifest.ts\nmakeImportedPlugin()"]
        Prep["271 Prep problems\nimported/prepManifest.ts\nmakePrepPlugin()"]
        Sims["imported/simulators/problems/\nHand-built simulators"]
        PrepSims["imported/prepSimulators/problems/\nBespoke step-simulators"]
    end

    subgraph shared ["🔧 Shared Factories — plugins/_shared/"]
        VizKit["vizKit.tsx\nVizHint · PathDisplay\nVizInspector · CharCell"]
        PluginKit["pluginKit.ts\nwireTeachingStack\ncodePiecesFromSource"]
        Recorders["createRecorder.ts\narrayPatterns/\ntreeRecord.ts\ngraphRecord.ts\ngridRecord.ts"]
    end

    engine --> native
    engine --> imported
    native --> shared
    imported --> shared
    Registry --> native
    Registry --> imported
```

### Plugin Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Shell
    participant Player as usePlayer
    participant Plugin
    participant View

    User->>Shell: select problem
    Shell->>Plugin: record(input)
    Plugin-->>Player: Frame[]
    User->>Shell: click ▶ / Next
    Shell->>Player: step()
    Player-->>Shell: currentFrame
    Shell->>View: render(currentFrame)
    View-->>User: visual state

    User->>Shell: answer quiz
    Shell->>Shell: check answer
    alt wrong answer
        Shell->>Player: reset() → frame 0
        Shell->>User: restart from Q1
    else 3-streak mastered
        Shell->>User: 🏆 mastered
    end
```

---

## State Management

Zustand slices are organized by domain. Each slice lives in `store/<domain>/`.

```mermaid
flowchart LR
    subgraph store ["🗄️ Zustand Store — src/store/"]
        Workspace["workspace\nroute · problem · mode"]
        Replay["replay\nframe index · playing"]
        Canvas["canvas\nnodes · edges · layout"]
        CanvasLayout["canvas-layout\npresets · TraceFocus"]
        Games["games\nroom · peers · game state"]
        Study["study\nprogress · Code Studio phase"]
        Practice["practice\nstreak · quiz state"]
        Mobile["mobile\ndeck index · swipe state"]
        Vim["vim\nmaze · position · moves"]
        Dojo["dojo\npattern · session"]
        Interview["interview\ntimer · locked · playback"]
        Nav["navigation\nbreadcrumb · history"]
        Persist["persistence\nlocal storage sync"]
        UserPrefs["user-prefs\ntheme · density"]
    end

    Shell["shell/"] -->|reads/writes| Workspace
    Shell -->|reads/writes| Replay
    Shell -->|reads/writes| Canvas
    Shell -->|reads/writes| Games
    Plugins["plugins/"] -->|reads| Replay
    Platform["platform/api/"] -->|populates| Study
```

---

## Data Flow

### Solo Learning Session

```mermaid
sequenceDiagram
    participant User
    participant Home as Home (shell/home/)
    participant Workspace as Workspace (shell/workspace/)
    participant Plugin as Plugin Record
    participant Panels as Panels (shell/panels/)

    User->>Home: pick problem
    Home->>Workspace: navigate(problemId, mode)
    Workspace->>Plugin: record(selectedInput)
    Plugin-->>Workspace: Frame[]
    Workspace->>Panels: mount(frames, plugin)
    Panels-->>User: Visualize | Learn | Practice tabs
```

### Multiplayer Games Session

```mermaid
sequenceDiagram
    participant HostUser as Host Browser
    participant GuestUser as Guest Browser
    participant Lobby as Lobby (shell/games/lobby/)
    participant Room as Room (shell/games/room/)
    participant Net as Realtime (shell/realtime/)
    participant Server as Go Game Server

    HostUser->>Lobby: create room
    Lobby->>Server: GET /new → {code}
    HostUser->>Net: connect ws?room=CODE&name=...&pid=...
    Net->>Server: WebSocket upgrade
    Server-->>Net: {t:"welcome", self, peers, state}

    GuestUser->>Net: connect ws?room=CODE&name=...&pid=...
    Server-->>HostUser: {t:"peer-join", peer}

    HostUser->>Net: {t:"state", d: gameSnapshot}
    Server-->>GuestUser: {t:"state", d: gameSnapshot}

    HostUser->>Net: {t:"relay", d: move}
    Server-->>GuestUser: {t:"relay", from, d: move}
```

### Collaborative Canvas Session

```mermaid
sequenceDiagram
    participant Host
    participant Guest
    participant Collab as Collab (shell/collab/)
    participant HP as Hocuspocus
    participant API as Go API

    Host->>API: POST /api/interviews → sessionId + guestToken
    Host->>Collab: open room (sessionId)
    Collab->>HP: WebSocket (Yjs provider)
    Guest->>Collab: join with guestToken
    Collab->>HP: sync Yjs doc

    Host->>Collab: edit canvas node
    Collab->>HP: Yjs update op
    HP-->>Guest: Yjs broadcast
    Guest-->>Guest: apply op → live update
```

---

## Design System

All visual values flow from a single source of truth: `src/design/tokens.ts`.

```mermaid
flowchart TB
    Tokens["design/tokens.ts\nSingle source of truth\ntype-safe constants"]

    Tokens --> Shell["--fs-* / --fs-sm-*\nShell chrome typography\nchromeUi.tsx"]
    Tokens --> Canvas["--node-fs-* / --viz-*\nCanvas node typography\nnodeScale.ts"]
    Tokens --> Plugins["vizText.base / vizText.sm\nPlugin view typography\nvizKit.tsx"]
    Tokens --> ThemeCSS["styles/theme.css\nCSS custom properties\nlight + dark vars"]
    Tokens --> Generated["styles/themes/index.css\nGenerated theme CSS\n⚠️ do not hand-edit"]

    ThemeCSS --> TailwindCSS["Tailwind CSS 3\nUtility classes"]
    TailwindCSS --> Components["React components"]

    Guards["Quality guards"]
    Guards --> G1["check:tokens\nNo magic px literals"]
    Guards --> G2["check-shell-typography\nShell uses --fs-* vars"]
    Guards --> G3["check-plugin-typography\nPlugins use vizText tokens"]
```

**Three typography layers — never mix:**

| Layer | Token source | Used by |
|-------|-------------|---------|
| Shell chrome | `--fs-*`, `--fs-sm-*` | `shell/`, `components/` |
| Canvas nodes | `--node-fs-*`, `--viz-*` | Plugin `View`s inside `.algo-canvas` |
| Viz primitives | `vizText.base`, `vizText.sm` | `_shared/vizKit.tsx` exports |

---

## Generated Artifacts

Several files are **generated outputs** — never hand-edit them. Change the upstream data or generator, then regenerate.

```mermaid
flowchart LR
    subgraph sources ["Source (edit these)"]
        TS_Catalog["content/courses.ts\nPlugin catalog data"]
        Native["plugins/<id>/index.tsx\nNative plugin source"]
        PrepData["scripts/prep-data/\nPrep problem JSON"]
        DB010["db/migrations/010_games_catalog.sql\nGames catalog"]
        TokensSrc["design/tokens.ts\nDesign tokens"]
    end

    subgraph generators ["Generators (npm run ...)"]
        ImportProblems["import-problems.mjs"]
        ImportPrep["import-prep.mjs"]
        BuildMeta["build-plugin-meta.mts"]
        BuildBriefs["build-problem-briefs.mts"]
        ExportSQL["export-content-sql.mts"]
        GenGameIds["generate-game-ids.mjs"]
        GenThemes["generate-themes.mjs"]
    end

    subgraph artifacts ["Generated (⚠️ do not edit)"]
        Manifest["plugins/imported/manifest.ts"]
        PrepManifest["plugins/imported/prepManifest.ts"]
        PluginMeta["plugins/_generated/pluginMeta.ts"]
        Courses["plugins/_generated/courses.ts"]
        Briefs["content/_generated/problemBriefs.ts"]
        ContentSQL["db/content_seed.sql\nbackend/db/seeds/content_seed.sql"]
        GameIds["shell/games/_generated/gameIds.ts"]
        ThemeCSS["styles/themes/index.css\nstyles/themes/sources/index.ts"]
    end

    PrepData --> ImportPrep --> PrepManifest
    TS_Catalog --> ImportProblems --> Manifest
    Native --> BuildMeta --> PluginMeta & Courses
    TS_Catalog --> BuildBriefs --> Briefs
    TS_Catalog --> ExportSQL --> ContentSQL
    DB010 --> GenGameIds --> GameIds
    TokensSrc --> GenThemes --> ThemeCSS

    style artifacts fill:#FEF3C7
    style generators fill:#DBEAFE
```

---

## Quality Guardrails

All guards run via `npm run check:all` (also enforced in CI):

```mermaid
flowchart LR
    CheckAll["npm run check:all"]

    CheckAll --> Boundaries["check-boundaries.mjs\nNo upward layer imports"]
    CheckAll --> Circular["check-circular.mjs\nCircular dep ratchet"]
    CheckAll --> Orphans["check-orphans.mjs\nNo unreachable modules"]
    CheckAll --> Tokens["check:tokens\nNo magic px literals"]
    CheckAll --> ShellTypo["check-shell-typography.mjs\nShell uses --fs-* vars"]
    CheckAll --> PluginTypo["lint-plugin-typography.mjs\nPlugins use vizText tokens"]
    CheckAll --> Lighthouse["lighthouse-budget.mjs\nSEO · PWA · a11y · lazy-load"]
    CheckAll --> PrepCoverage["check-prep-sim-coverage.mjs\n271/271 simulators present"]
    CheckAll --> QuizLabels["check:quiz-labels\nheadline — detail format"]
    CheckAll --> PluginMeta["check-plugin-meta\nGenerated meta is fresh"]
    CheckAll --> SimIntegrity["check-simulators.mjs\nProgress sim integrity"]

    Vitest["npm test"]
    Vitest --> RecorderTests["Plugin recorder unit tests"]
    Vitest --> IntegrityTests["integrity.test.ts"]
    Vitest --> DesignHybrid["design-hybrid.test.tsx"]
    Vitest --> OrphanCheck["check-orphans (imported)"]
```

---

## Folder Reference

```
frontend/src/
├── main.tsx                    App entry
├── App.tsx                     Route switch (useWorkspace().route)
│
├── core/                       Plugin-agnostic engine
│   ├── types.ts                ProblemPlugin / Frame / Move contracts
│   ├── registry.ts             Sync meta index + async per-group lazy loading
│   └── usePlayer.ts            step / play / pause / reset
│
├── design/                     🎨 Token system (see design/README.md)
│   ├── tokens.ts               Single source of truth
│   ├── typography.ts           Shell chrome font helpers
│   ├── nodeScale.ts            Canvas node scale helpers
│   └── canvasMetrics.ts        Canvas layout constants
│
├── lib/                        🔧 Pure utilities
│   ├── session/                Session kinds (solo / collab / interview)
│   ├── quiz/                   Quiz logic + scoring
│   ├── canvas/                 Canvas helpers
│   ├── code/                   Code utilities
│   └── utils/                  General helpers
│
├── platform/                   🌐 Backend REST clients
│   └── api/
│       ├── authApi.ts          /api/auth/*
│       ├── contentApi.ts       /api/content/*
│       ├── gamesApi.ts         /api/games/*
│       ├── interviewApi.ts     /api/interviews/*
│       ├── canvasApi.ts        /api/canvases/*
│       ├── prepApi.ts          /api/prep-plans/*
│       └── resumeApi.ts        /api/resumes/*
│
├── content/                    📚 Course catalog
│   ├── courses.ts              Canonical catalog (source for generated files)
│   ├── taxonomy.ts             Tags + difficulty taxonomy
│   ├── navigation/             Sidebar navigation tree
│   └── _generated/
│       └── problemBriefs.ts    ⚠️ Generated — do not edit
│
├── components/                 🧩 Reusable UI
│   ├── board/                  GraphBoard, grid visualizers
│   ├── code/                   CodeMirror wrappers
│   ├── puzzle/                 Code Studio assemble/recall
│   ├── chat/                   Chat UI primitives
│   ├── shared/                 QuizChoiceLabel, cross-cutting
│   └── ui/                     Low-level UI atoms
│
├── store/                      🗄️ Zustand slices (by domain)
│
├── effects/                    ✨ Canvas animation effect plugins
│
├── hooks/                      App-wide React hooks
│
├── plugins/                    🔌 Algorithm plugins
│   ├── index.ts                Plugin manifest / registry
│   ├── _shared/                Shared factories + viz primitives
│   ├── _generated/             ⚠️ Generated metadata
│   ├── binary-search/          ) 18 curated native plugins
│   ├── ...other natives/       )
│   └── imported/               Generated reference libraries
│       ├── factory.tsx         makeImportedPlugin
│       ├── prepFactory.tsx     makePrepPlugin
│       ├── manifest.ts         ⚠️ Generated — 91 progress problems
│       ├── prepManifest.ts     ⚠️ Generated — 271 prep problems
│       ├── simulators/         Hand-built progress simulators
│       └── prepSimulators/     Bespoke prep step-simulators
│
├── shell/                      🐚 All routes + app chrome
│   ├── home/                   Course catalog + landing
│   ├── workspace/              Algorithm workspace mode router
│   ├── study/                  Learn Studio · Play · Code Studio
│   ├── canvas/                 React Flow workspace
│   ├── collab/                 Yjs + relay collaboration transport
│   ├── interview/              Interview facilitation UI
│   ├── panels/                 Shared panel bodies (visualize/practice/code)
│   ├── realtime/               WebSocket room transport
│   ├── mobile/                 Swipe deck (animate → quiz → rebuild)
│   ├── vim/                    Vim Dojo keyboard maze puzzles
│   ├── dojo/                   Practice dojo (12 algo pattern modules)
│   ├── games/                  Multiplayer arcade
│   │   ├── arcade/             Route chrome + profile overlay
│   │   ├── lobby/              Create / join / share flow
│   │   ├── room/               Roster · chooser · ready · chat
│   │   ├── games/<id>/         Per-game UI + logic.ts
│   │   ├── ui/                 Arcade-only primitives
│   │   ├── net/                Room transport hooks
│   │   ├── engine/             Game engine abstractions
│   │   └── _generated/
│   │       └── gameIds.ts      ⚠️ Generated from DB migration 010
│   ├── browse/                 Content browsing
│   ├── plans/                  Study prep plans
│   ├── resumes/                Resume workspace + OpenAI customization
│   ├── profile/                User profile
│   ├── settings/               User settings sync
│   ├── auth/                   AuthProvider · login · signup
│   └── chrome/                 Navigation + app chrome
│
└── styles/
    ├── theme.css               CSS custom properties (light + dark)
    └── themes/
        └── index.css           ⚠️ Generated theme CSS
```

---

## Related Documentation

| Doc | Description |
|-----|-------------|
| [Backend Architecture](ARCHITECTURE-BACKEND.md) | Go service architecture, WebSocket protocol, domain packages |
| [Architecture Overview](architecture.md) | Combined system overview with session model |
| [Plugin Authoring](../frontend/src/plugins/README.md) | ProblemPlugin contract, vizKit, teaching stack |
| [Plugin Example](../frontend/src/plugins/EXAMPLE.md) | Native + imported plugin end-to-end walkthrough |
| [Design Tokens](../frontend/src/design/README.md) | Typography and layout token hierarchy |
| [Quiz & Code Studio](quiz-and-code-studio.md) | Quiz label format, shuffle/restart, Code Studio phases |
| [Visual QA Checklist](visual-qa-checklist.md) | Release checklist for density, themes, mobile |
| [Games Arcade](../frontend/src/shell/games/README.md) | Multiplayer arcade layout and game contract |
