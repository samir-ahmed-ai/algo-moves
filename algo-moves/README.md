# Algo Moves — Developer Guide

**Step through algorithms like a chess transcript.**

Plugin-driven visual learning environment for coding interview prep. Each problem replays as a sequence of **moves** — state snapshots with captions — that you can scrub, play, and study. The shell (canvas, player, move log, Code Studio, mobile deck) knows nothing about any specific algorithm; every problem is a self-contained **plugin**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**Contents:** [Why](#why-algo-moves) · [Problem library](#problem-library) · [Attribution](#references--attribution) · [Stack](#technology-stack) · [Quick start](#quick-start) · [Scripts](#npm-scripts) · [Architecture](#plugin-architecture) · [New plugin](#add-a-new-problem-plugin) · [Folder map](#folder-map) · [Docs](#documentation)

---

## Documentation

| Guide | Description |
|-------|-------------|
| [**Plugin authoring**](src/plugins/README.md) | `ProblemPlugin` contract, vizKit, teaching stack |
| [**Worked example**](src/plugins/EXAMPLE.md) | Native + imported plugin end-to-end |
| [**Quiz & Code Studio**](docs/quiz-and-code-studio.md) | Choice labels, shuffle/restart, syntax highlighting, reassemble |
| [**Design tokens**](src/design/README.md) | Typography and layout token hierarchy |
| [**Future ideas**](TODO.md) | Trimmed roadmap — not yet built |

## Why Algo Moves?

**Philosophy:** Algo Moves treats study like reinforcement learning — try, get feedback, repeat until correct. A wrong quiz answer restarts the full run (reshuffled choices); mastery unlocks at a 3-streak. See the [project README](../README.md#learn-the-way-ai-learns) for the full story and visuals.

Most visualizers show you the *answer*. Algo Moves shows you the **process** — every pointer move, every push/pop, every relaxation — as a first-class move transcript you can replay, share, and drill.

| Mode | What you get |
|------|--------------|
| **Visualize** | Canvas with step player, move log, inspector, and shareable replay URLs |
| **Learn** | Cases, quiz, simulate-next-move, and **Code Studio** (quiz → reassemble → blind recall) |
| **Mobile deck** | Full-screen swipe deck for drilling a topic on the go (`#mobile`) |
| **Home** | Course catalog with progress meters, difficulty breakdown, and resume-last |

---

## Problem library

~**400 problems** across three layers:

| Layer | Count | Location | Simulators |
|-------|-------|----------|------------|
| **Prep library** | 271 | `src/plugins/imported/prepManifest.ts` | 271/271 bespoke step-sims in `prepSimulators/problems/` |
| **Progress library** | 91 | `src/plugins/imported/manifest.ts` | Hand-built sims in `simulators/problems/` |
| **Curated plugins** | 18 | Hand-authored (`binary-search`, six sorts, `n-queens`, `tree-traversals`, …) | Native `record()` + `View` in `src/plugins/<id>/` |

Prep imports without a simulator yet fall back to the animated **Scene** view (`prepScene.tsx`).

---

## References & attribution

Problems draw from industry interview platforms and original teaching exercises. **Solutions, simulators, quizzes, and visualizations in this repo are original implementations** — they are study aids, not copies of platform editorials.

### External problem sources

| Platform | Examples in this repo | In-app link |
|----------|----------------------|-------------|
| [**LeetCode**](https://leetcode.com/) | Two Sum, LRU Cache, Word Search, Alien Dictionary, Clone Graph, … (~100 in the progress library) | **Open on LeetCode ↗** on imported problem cards |
| [**HackerRank**](https://www.hackerrank.com/) | BFS Shortest Reach, Floyd: City of Blinding Lights, Merging Communities, Subset Component, Array Manipulation | Tagged `(HackerRank)` in titles |
| **Educational** | Unweighted shortest path, graph traversal, topological sort, reachability — pattern-first scaffolding | Marked `Educational` in manifests |

Each plugin's `meta.source` records the canonical reference. When a LeetCode URL exists, the imported factory surfaces it directly:

```124:126:src/plugins/imported/factory.tsx
      {p.leetcode && (
        <a href={p.leetcode} target="_blank" rel="noreferrer" className={cn('nodrag mt-auto inline-flex items-center gap-1 self-start text-accent hover:underline', vizText.base)}>
          Open on LeetCode ↗
```

> **Trademarks:** LeetCode is a trademark of LeetCode, LLC. HackerRank is a trademark of HackerRank, Inc. This project is not affiliated with, endorsed by, or sponsored by either platform. Full notice: [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).

---

## Technology stack

Built as a modern React SPA with a strict plugin contract and a token-driven design system.

| Category | Libraries |
|----------|-----------|
| **Core** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS 3, PostCSS — design tokens in `src/design/tokens.ts` and `src/styles/theme.css` |
| **Components** | Radix UI (accordion, tabs, tooltip, …), Lucide icons, `clsx` + `tailwind-merge` |
| **Code editing** | CodeMirror 6 (+ `@replit/codemirror-vim`), autocomplete, One Dark theme |
| **Graph canvas** | `@xyflow/react`, `@dagrejs/dagre` for layout |
| **Utilities** | `html-to-image` (export), `lz-string` (compact share URLs) |
| **Testing & CI scripts** | Vitest; `check:all` runs simulator coverage, typography lint, token guards, and quiz label quality |
| **Reference solutions** | Go (`solution.go` embedded in generated manifests) |

---

## Quick start

```bash
cd algo-moves
npm install
npm run dev          # http://localhost:4321
npm run typecheck    # tsc --noEmit
npm run build        # production bundle
npm test             # vitest + orphan check
npm run check:all    # simulators, prep coverage, typography, tokens, quiz labels
```

### Import & scaffold scripts

```bash
npm run import-prep                              # regenerate prepManifest.ts
npm run scaffold-prep-sim -- lru-cache           # stub a new prep simulator
npm run check-prep-sim-coverage                  # fail if any prep id lacks a simulator
npm run new-problem -- two-sum "Two Sum"         # scaffold a native plugin
```

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Vite dev server (`http://localhost:4321`) |
| `build` | Typecheck + production bundle |
| `preview` | Preview production build |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest + orphan plugin check |
| `check:all` | Simulators, prep coverage, typography, tokens, quiz labels |
| `check:quiz-labels` | Quiz choice format + integrity label tests |
| `repair-quiz-labels` | Bulk-repair imported practice quiz labels |
| `draft-quiz-from-frames -- <id>` | Draft quiz from recorder captions |
| `import-prep` | Regenerate `prepManifest.ts` |
| `scaffold-prep-sim -- <slug>` | Stub a new prep simulator |
| `check-prep-sim-coverage` | Fail if any prep id lacks a simulator |
| `new-problem -- <slug> "<title>"` | Scaffold a native plugin |
| `new-effect -- <slug>` | Scaffold a canvas effect plugin |
| `check-simulators` | Progress-library simulator integrity |
| `check-plugin-typography` | Lint plugin UI for hardcoded font sizes |
| `check:tokens` | Design-token guard |
| `generate-themes` | Regenerate theme CSS from token source |
| `repair-quiz-labels` | Fix imported quiz choice labels (`headline — detail` format) |
| `migrate-viz-kit` | Batch-migrate plugin views to vizKit |

---

## Plugin architecture

The engine never inspects algorithm state — it only steps an array of `Frame`s and asks the plugin's `View` to draw the current one.

```
                 ┌──────────────────────────────────────────┐
   core/         │ types.ts   ProblemPlugin contract          │
   (engine,      │ registry.ts  discovers plugins by id       │
    contracts)   │ usePlayer.ts  prev / next / play over frames│
                 └──────────────────────────────────────────┘
                        ▲                         ▲
                        │ implements              │ renders
   plugins/<name>/ ─────┘                         │
     index.tsx    meta + inputs + record + View   │
     recorder.ts  algorithm → Frame[]             │
     graphs.ts    sample inputs                   │
     <Name>View   draws one frame ────────────────┘ via shared components/
```

A plugin satisfies `ProblemPlugin<Input, State>`:

| Field | Responsibility |
|-------|----------------|
| `meta` | id, title, difficulty, tags, **source**, summary |
| `inputs` | named sample inputs for the input dropdown |
| `record` | run the algorithm once, emitting one `Frame` per move |
| `View` | render a single frame's state (reuses `components/` and `_shared/vizKit`) |
| `verdict` | optional — derive pass/fail from the final frames |
| `code` / `quiz` / `tabs` | optional — Code Studio and Learn-mode panels via `wireTeachingStack` |

### A `Frame` is one move

```ts
interface Move  { type; note; caption; team?; tone? }   // generic, shell renders it
interface Frame { move: Move; state: S }                // state is plugin-specific
```

`record()` is the heart: your algorithm with `emit(...)` calls where state changes, instead of a bare `return`. See [`binary-search/index.tsx`](src/plugins/binary-search/index.tsx) — the search is line-for-line the reference solution, snapshotting `(lo, mid, hi)` on every move.

Two generated import paths produce the reference libraries:

- **`makeImportedPlugin`** (`imported/factory.tsx`) — progress library via `scripts/import-problems.mjs` → `manifest.ts`
- **`makePrepPlugin`** (`imported/prepFactory.tsx`) — prep library via `scripts/import-prep.mjs` → `prepManifest.ts`

Full authoring guide: [`src/plugins/README.md`](src/plugins/README.md) · worked example: [`src/plugins/EXAMPLE.md`](src/plugins/EXAMPLE.md).

---

## Add a new problem plugin

1. `mkdir src/plugins/<name>/`
2. Write `recorder.ts` — port the algorithm, `emit` a frame per move.
3. Write `<Name>View.tsx` — render `frame.state` using `components/` or `_shared/vizKit`.
4. Write `index.tsx` — `definePlugin({ meta, inputs, record, View, verdict })`.
5. Register in [`src/plugins/index.ts`](src/plugins/index.ts) and [`src/content/courses.ts`](src/content/courses.ts).

No shell changes — sidebar, player, move log, input picker, and verdict badge wire up automatically.

Or scaffold: `npm run new-problem -- <slug> "<Title>"`.

---

## Folder map

```
algo-moves/
├── ATTRIBUTIONS.md              LeetCode / HackerRank / OSS notices
├── index.html
├── package.json · tsconfig*.json · vite.config.ts
└── src/
    ├── main.tsx                 app entry
    ├── App.tsx                  shell router: home / workspace / mobile
    ├── core/                    plugin-agnostic engine
    │   ├── types.ts             ProblemPlugin / Frame / Move contracts
    │   ├── registry.ts          plugin lookup
    │   └── usePlayer.ts         step / play / pause / reset
    ├── shell/                   home, workspace canvas, mobile deck, docks
    ├── design/                  token system (see design/README.md)
    ├── components/              reusable UI (GraphBoard, QueueTape, MoveLog, …)
    ├── content/                 course catalog + merge with imported problems
    ├── plugins/
    │   ├── index.ts             plugin manifest
    │   ├── binary-search/       curated native plugin
    │   ├── _shared/             vizKit, pluginKit, practice factories
    │   └── imported/            generated reference libraries
    │       ├── factory.tsx      makeImportedPlugin → manifest.ts
    │       ├── prepFactory.tsx  makePrepPlugin → prepManifest.ts
    │       ├── prepScene.tsx    Scene fallback view
    │       └── {simulators,prepSimulators}/problems/
    └── styles/
        └── theme.css            tokens + light/dark mode
```

---

## License

Copyright (c) 2026 Ahmed Samir

Licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
