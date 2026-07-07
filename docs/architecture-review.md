# Architecture Review & Remediation Plan

> Generated from an exhaustive multi-agent audit (10 subsystem + cross-cutting auditors → adversarial
> verification → synthesis). **88 findings vetted, 78 confirmed, 10 refuted as false positives.**
> Every confirmed finding was independently re-checked against the cited `file:line` before inclusion.
> Goals driving the review: **world-class · reuse (no duplication) · loosely coupled · separation of concerns enforced.**

## How to read this document now

This file preserves the original audit and remediation history. It is not the current architecture source of truth.

Use these docs for current operating rules:

- [`architecture.md`](architecture.md) — current layer contracts, generated-file ownership, and quality guardrails.
- [`visual-qa-checklist.md`](visual-qa-checklist.md) — current visual release checklist.
- [`quiz-and-code-studio.md`](quiz-and-code-studio.md) — current quiz and Code Studio authoring/persistence rules.

Treat older findings below as **historical baseline evidence** unless the progress log still marks them incomplete. New work should update the guardrail or generator that prevents the same class of issue from returning.

## Verdict

**Historical baseline grade: B / B+.** This was already a healthy, well-factored codebase — the intended
Shell → Canvas → Plugins layering (see [architecture.md](architecture.md)) mostly holds, recent commits
show active hook-extraction refactoring, generated data is properly separated from source, and the Go
backend is idiomatic and well-tested. The verifiers *refuted 10 findings* precisely because many
"smells" turned out to be deliberate, justified patterns (DI in CodeStudio, distinct FIT_PADDING values,
structurally-different type guards).

At the time of the audit, **what separated it from world-class** was not big rewrites — it was four systemic gaps:

1. **No enforced module boundaries.** There is *no ESLint config at all*, so the layering is a
   convention, not a guarantee. A handful of upward imports have already leaked (`lib → store`,
   `plugins → shell`, `store → shell`, `shell → canvas internals`). Without a lint firewall these
   regress on every PR.
2. **No shared "design/components" leaf.** `shell/canvas/nodeui.tsx` (1151 LOC, 66 importers) has become
   the *de-facto* shared UI library — so `shell/home`, `shell/browse`, and `CategoryBoard` import
   **upward** from the canvas layer to get `Chip`/`Meter`/`difficultyTone`. The primitives are fine; they
   live in the wrong layer.
3. **Reuse gaps for small utilities.** Fisher-Yates shuffle, Web-Audio bootstrap, clipboard-copy,
   editable-target checks, search-filter predicates, and grid-background patterns are each reimplemented
   in 2–8 places instead of living once in `lib/utils`.
4. **A few God-modules pending decomposition.** `CanvasStage.tsx` (961), `nodeui.tsx` (1151),
   `layout.ts` (557), and several 600+ LOC game components mix rendering + business logic + IO.

Fixing these is mostly **mechanical extraction and re-homing**, not redesign — high leverage, low risk if
sequenced behind guardrails.

## Findings by dimension

| Dimension | Count | Character |
|---|---:|---|
| Coupling | 24 | Layering/direction violations; canvas-as-shared-layer; store→shell reach-through |
| Duplication | 24 | Reinvented utils (shuffle/audio/clipboard/search); per-game & per-plugin boilerplate |
| Consistency | 14 | Divergent patterns across sibling games / store slices / plugin factories |
| Separation of concerns | 13 | God-components & monolithic contexts mixing render + logic + IO |
| Dead code | 2 | Unused `makeInspector`; one missing backend test path |
| Other | 1 | Minor store persister edge case (no action) |

Severity: **2 high · 41 med · 35 low.** Full evidence for every finding is in the audit output; this doc
groups them into themes and a sequenced plan.

---

## Themes

### Theme A — Enforce module boundaries (the #1 "loosely coupled" lever) · HIGH
The layering is real but unguarded. Confirmed leaks:

- **`lib/utils/audio.ts` imports `store`** (#01, HIGH) — a pure-domain leaf reaching into persistence.
- **`plugins/_shared/practice.tsx` imports `shell`** (#02, HIGH) — a plugin reaching up into
  `shell/canvas/CanvasContext`. *One-line fix*: import `useCanvasStatic` from `@/lib/canvas` (the barrel
  already re-exports it; sibling imports on lines 23/26 already use it).
- **`store` imports UI constants/types from `shell`** (#14, #17) — `SIDEBAR_W`, `BgVariant`, `EdgeOpts`,
  `LayoutPreset`, `defaultEdgeOpts` pulled from `shell/canvas/layout.ts`.
- **`shell/UnifiedLeftSidebar` reaches into canvas internals** (#12, #60) — `nodeIcon`, `panelAccent`,
  `nodeCategory`, `CATEGORY_ORDER` should come from `@/core/panelRegistry`, not through `canvas/layout`.
- **`lib/canvas` re-exports shell components** (#08) via `canvasTeachingUi` (`VizFitBox`, `MiniTabs`).
- **`lib/canvas/canvasActions.ts` imports a type from shell** (#59) — `LayoutVisualizeOptions`.
- **Hash-routing utilities live in `shell`** (#15, #73) — `mobileHash`, `vimHash`, `gamesHash` are pure and
  belong in `lib/navigation`.

**Fix:** add an ESLint flat config with `import/no-restricted-paths` (or `eslint-plugin-boundaries`)
encoding: `plugins ↛ shell`, `lib ↛ {store,shell,plugins}`, `store ↛ {shell,canvas UI}`,
`core/components ↛ {shell,store}`. Then clear the ~8 violations (most are 1-line import re-points; a few
need a small pure constant/type moved to a leaf). This *is* the "enforce" the request asks for.

### Theme B — Promote a shared `@/design/components` UI leaf · HIGH leverage
`nodeui.tsx` is doing three jobs at once and lives one layer too low:

- **1151-line God-module** exporting 40+ primitives + design tokens + tone maps (#37, #42, #77).
- **Consumed upward** by `shell/browse/*`, `shell/home/LandingPage`, `CategoryBoard` (#13) — forcing
  shell→canvas imports.
- **`difficultyTone` duplicated** as `diffTone` in `LearnStudio` (#19); **typography scales**
  `chromeText`/`nodeText` split across files (#71, #51).

**Fix:** create `@/design/components` (or `@/components`) holding the genuinely-shared primitives
(`Chip`, `Meter`, `Pill`, `Label`, `EmptyState`, `difficultyTone`) + a `design/typography.ts`
(`chromeText`, `nodeText`). Split `nodeui.tsx` into token/util/component files behind a **re-export barrel**
so the 66 importers don't churn. This single move dissolves 7 findings and removes the largest source of
upward coupling.

### Theme C — Decompose God-components (separation of concerns) · MED
- **`CanvasStage.tsx` (961 LOC)** — ~13 interdependent effects + `buildFor`/`reset` bundling node-build +
  dagre layout (#34, #40, #41). Extract pure `buildCanvasFrame(plugin,mode,opts)` into `layout.ts` and a
  `useCanvasLifecycle` hook. **Write characterization tests first** (history/persistence/refit).
- **`layout.ts` (557 LOC)** — split into `layoutPresets` / `layoutWiring` / `layoutAlgorithms` /
  `edgeStyles` behind a barrel (#78).
- **Monolithic contexts** — `CodeStudioProvider` (44-field value, #33) and `WorkspaceCtx` (#39): the
  underlying logic is *already* extracted into hooks; only the context *surface* is wide. Split into
  focused contexts (Phase / Draft / UI-toggles; Appearance / Chrome / Navigation) to fix over-broad
  re-renders.
- **`Workspace.tsx`** — extract `useWorkspaceKeyboard` + a `<ModeRouter/>` (#38).
- **`ReassemblePane.tsx`** — extract `useReassembleLogic` + `useTrayPointerDrag`; move `shuffle`/`orderTray`
  to `lib` (#36).

### Theme D — Games engine: kill per-game boilerplate · MED (isolated, low risk)
Five game components share copy-pasted scaffolding. Build a small `games/engine` hook library:

- `useReportOnce` / fold into `useMatchReporter` — one-shot result guard (#23).
- `useCountdown(seconds, {onExpire, resetKey, enabled})` — interval loops (#25).
- `useRematch(reset, {...})` — reset+rematch broadcast (#67).
- `usePublishState(value, enabled)` — encapsulate the publish-in-effect closure to kill the circular
  re-run pitfall (#09).
- `GameCommonStrings` composed type — shared locale keys (`you`, `partner`, `playAgain`, …) (#24).
- **Standardize spectator/late-joiner sync** on host-publishes-authoritative (#03); retire NumberDuel's
  snapshot-relay divergence. Add an optional runtime validator at the channel boundary (#48).
- Extract per-game `useXGame()` view-model hooks so components only render (#35).

### Theme E — Plugin infrastructure: one recorder, one factory · MED
- `createRecorder<S>()` frame builder to absorb repeated `emit()` envelopes across 6 plugins (#30) and the
  three sort recorders (#04, #68).
- `withInspectorNotes(...)` helper shared by `imported`/`prep`/`go-course` factories (#31).
- `verdictLastFrameTone(...)` in `verdictKit` for the two inlined verdict sites (#50).
- Adopt the unused `makeInspector` in matching plain inspectors, or delete it (#65).
- `PluginGroupAdapter` so `build-plugin-meta` iterates groups generically instead of hardcoding (#11).
- Extract `practice.tsx`'s quiz state machine (695 LOC) into a `lib/quiz` reducer; keep factories as thin
  views (#43).

### Theme F — Extract cross-cutting utilities into `lib/utils` · MED (pure dedup)
| Reinvented | Sites | Canonical home |
|---|---|---|
| Fisher-Yates shuffle | ReassemblePane, AssembleModes (#26, #75) | `lib/utils/shuffle.ts` |
| Web-Audio bootstrap/synth | `lib/utils/audio.ts`, `hooks/useSoundCues.ts` (#27, #74) | `lib/utils/webAudio.ts` (`getAudioContext`, `playTone`) |
| Copy-to-clipboard + feedback | 8 sites (#32); timeout constant outlier (#53) | `useCopyFeedback()` + `CopyButton` |
| Editable-target key check | 3 sites (#28) | reuse existing `isEditableTarget` in `lib/utils/keyboard` |
| Search/filter predicate | Sidebar + CatalogTree (#69) | `lib/utils/searchPredicate.ts` |
| Grid background pattern | 4 sites incl. in-file dup (#70, #72) | `design/tokens.ts` `GRID_PATTERN` |
| Ordered-list drag/reorder | AssembleModes internal (#29) | `useOrderBoard` hook |

### Theme G — Store consistency · MED/LOW
- Unify persistence style: migrate the two singleton slices (`canvasPrefs`, `layoutStore`) to
  `createSyncStore`; leave per-key `codeStudioPhase` imperative (its key shape doesn't fit the singleton
  API) (#52).
- Move persistence *out of shell components* into store slices/hooks — `EdgeCasesPanelBody`, `vimProgress`,
  `mobileSession`, `AssembleModes` currently read/write storage directly (#61, #63).
- Split `WorkspaceCtx` (also Theme C, #39).

### Theme H — Backend (Go) + Postgres arcade polish · LOW (already healthy)
- Centralize message-type strings in a `const` block in `message.go` (#44).
- Unexport `SanitizeName` → `sanitizeName` for parity with `sanitizePid` (#45).
- Replace the hardcoded game list in `get_or_create_daily_challenge` with a seeded `games` catalog table +
  FK, decoupling the daily-challenge function from frontend game IDs (#06).
- Document the seat-0 host-authority invariant and the capacity (2–8) invariant shared between schema and
  `hub/room.go`; add the `JoinWith` retry-race test (#55, #56, #64).

---

## Prioritized action ranking

Ranked by **(impact × reach) ÷ (effort × risk)**. Quick wins are safe mechanical edits.

| # | Action | Theme | Effort | Risk | Kills findings |
|---:|---|---|:--:|:--:|---|
| 1 | Add ESLint + import-boundary firewall; clear the ~8 layering leaks | A | M | low | 01,02,08,10,12,14,15,16,17,18,54,59,60,62,73 |
| 2 | Create `@/design/components` + `design/typography`; split `nodeui.tsx` behind barrel | B | L | low | 13,19,37,42,51,71,77 |
| 3 | Extract cross-cutting utils to `lib/utils` (shuffle, webAudio, copy, search, grid) | F | M | low | 26,27,28,32,53,69,70,72,74,75 |
| 4 | Games engine hook library + string composition + spectator standardization | D | M | low | 03,09,23,24,25,35,48,49,58,67 |
| 5 | Plugin recorder/factory/verdict consolidation; practice quiz reducer | E | M | med | 04,11,30,31,43,50,65,68 |
| 6 | Decompose CanvasStage / layout.ts / contexts (behind characterization tests) | C | L | med | 33,34,36,38,39,40,41,78 |
| 7 | Store consistency: unify persistence, move IO out of shell components | G | M | low | 46,52,61,63,76 |
| 8 | Backend/Postgres polish | H | S | low | 06,44,45,55,56,64,66 |

### Quick wins (safe, < 30 min each — do first)
- `plugins/_shared/practice.tsx:25` → `import { useCanvasStatic } from '@/lib/canvas'` (#02/#62 — kills a HIGH leak in one line)
- `store/navigation/browseNavigation.ts` — merge the duplicate import (#73)
- `shell/canvas/align.ts:2` → import `layoutEstimate` from `./nodeTokens` (#57)
- `shell/games/lobby/ShareRoom.tsx:18` → use `COPY_FEEDBACK_MS` (#53)
- `shell/CategoryBoard.tsx` — hoist one `GRID_PATTERN`, delete the in-file duplicate (#72)
- `shell/canvas/LearnStudio.tsx` — delete `diffTone`, use `difficultyTone` (#19)
- `shell/canvas/canvasTokens.ts` — import `NODE_W` from `nodeTokens`, drop `DEFAULT_NODE_W` (#22)
- `backend/internal/server/server.go` — `SanitizeName` → `sanitizeName` (#45)
- `backend/internal/hub/message.go` — message-type `const` block (#44)

---

## Execution roadmap (tranches — each independently shippable & verifiable)

**Tranche 0 — Guardrails & quick wins.** Add ESLint flat config + import-boundary rules; wire
`npm run check:all` + lint into CI; write characterization tests for `CanvasStage` history/persistence and
`CodeStudioProvider` before anything touches them. Land all quick wins above. *Deliverable: regressions
become impossible; trivial leaks gone.*

**Tranche 1 — Shared leaves (the reuse foundation).** `@/design/components` + typography; `nodeui` split;
`lib/utils` extractions; `lib/navigation` for hash utils; move store→shell constants/types to leaves.
Clears the bulk of Themes A, B, F. *This tranche delivers most of "no duplication / loosely coupled."*

**Tranche 2 — Games engine.** Hook library + `GameCommonStrings` + spectator standardization (Theme D).
Isolated subsystem; low blast radius.

**Tranche 3 — Plugin infrastructure.** `createRecorder`, `withInspectorNotes`, `verdictKit`, practice
reducer, `PluginGroupAdapter` (Theme E). Re-run `build-plugin-meta` + `check:all` after.

**Tranche 4 — Canvas separation of concerns.** `buildCanvasFrame` + `useCanvasLifecycle`; split `layout.ts`
and the wide contexts (Theme C). Guarded by Tranche-0 tests.

**Tranche 5 — Store + backend polish.** Unify store persistence, move IO out of shell (Theme G); backend
`const`s, unexport, games catalog table, invariant tests (Theme H).

## Guardrails while refactoring (from the completeness critic)
- **Never hand-edit generated files** (`_generated/*`, `imported/manifest.ts`, `prepManifest.ts`,
  `migrated.ts`, `themes/index.css`) — change the generator in `frontend/scripts/` and re-run. Any typography
  or token consolidation MUST route through `design/tokens.ts` + `generate-themes.mjs` or it re-diverges.
- **Update scaffolds alongside code** — `new-problem.mjs`, `new-effect.mjs`, `scaffold-prep-simulator.mjs`
  emit into trees being refactored; drift silently otherwise.
- **Keep barrels during splits** — split God-modules behind re-export barrels first, migrate importers
  second, delete the barrel last. Keeps each commit green.
- **Run `npm run check:all` + `vitest` + `go test ./...` per tranche.**

## Appendix — effects/ & design-token pipeline (gap audit)

Two subsystems the completeness critic flagged as uncovered were audited separately (6 confirmed, 3 refuted
— the "effects coupled to nodeui" and "three rival registries" framings were refuted as intentional).

- **`mapSourceToAlgo` duplicated between `generate-themes.mjs` and `mapTokens.ts`** (MED, coupling/dup) —
  the runtime `mapTokens.ts` copy is *dead* (only its `AlgoTokens` type is used) and has **already drifted**
  (`team0-bg` differs). Delete the unused runtime mapper (keep the types), or have both import one shared
  module; add a snapshot test. → folds into **Tranche 5 / token cleanup**.
- **`new-effect.mjs` emits a dead `Panel: () => null`** (LOW, deadcode) — `EffectPlugin` dropped `Panel` in
  WS8; the scaffold is stale. One-line template fix → **Tranche 0 quick win**.
- **`GenericEffectControls` hardcodes per-effect `if` branches** (LOW, soc) — should render generically from
  `defaultData` shape; bespoke controls stay in the `EFFECT_CONTROLS` registry → **Tranche 3**.
- **`GridToggleButton` duplicated** in `BeatMachineBuilder`/`PolyrhythmBuilder` (LOW, dup) → **Tranche 3**.
- **Typography fallback unit mismatch** (px in `vizText` vs rem in `nodeText`) (LOW, cosmetic — never
  executes since `--node-fs*` is always defined) → **Tranche 1** typography consolidation.

**Total: 84 confirmed findings across 12 subsystems.**

---

## Execution progress log

Branch: `refactor/architecture-remediation`. Every commit verified with
`tsc` + `vitest` (3447 tests) + `check:all` + `go build/test`.

**Module-boundary debt: 29 → 6** (tracked by `scripts/check-boundaries.mjs`, wired into `check:all`).

- ✅ **Tranche 0 — guardrails + quick wins.** Added the import-boundary firewall
  (`check-boundaries.mjs`, ratchet allowlist). Landed 9 quick wins: practice.tsx
  HIGH leak (#02), align.ts (#57), browseNavigation dup (#73), ShareRoom const
  (#53), diffTone reuse (#19), cycle-safe NODE_W (#22), dead scaffold field,
  backend message-type consts (#44) + `sanitizeName` unexport (#45).
- ✅ **Tranche 1 — shared leaves.** `@/lib/navigation` (hash utils, #15),
  `lib/utils` extractions (shuffle #26/#75, webAudio #27/#74, searchPredicate
  #69, isEditableTarget reuse #28), audio store-decoupling (#01), split-pane
  consts → lib, `@/design/typography` + `@/components/formControls` extracted
  from the 1151-LOC nodeui (#37/#42/#77, clears design/components/effects
  upward imports), and `@/lib/canvas/layoutPrefs` (#14/#17/#59).
- 🟡 **Tranche 2 — games engine (partial).** `net/usePublishState` fixes the
  host-sync footgun in TicTacToe + MindMeld (#09). Deferred: GameCommonStrings
  (#24 — locale-key naming diverges across games, high translation-typo risk),
  useReportOnce (#23 — reset-guard placement differs per game), per-game
  useXGame view-models (#35), spectator standardization (#03).
- 🟡 **Tranche 3 — plugin infra (partial).** Deleted the unused `makeInspector`
  abstraction (#65). Deferred: `createRecorder`/factory consolidation (#30/#31),
  `verdictLastFrameTone` (#50), effect-controls cleanups.
- ✅ **Tranche 4a/4b — canvas token/coupling relocation.** Inverted the design
  token leaf: `@/design/nodeScale`, `@/design/canvasMetrics`, `@/design/vizText`
  now own the canonical tokens (canvasTokens/nodeTokens/vizTokens re-export
  down). Moved `AlignKind` + `CanvasToolsProps` and `SIDEBAR_*`/`BOTTOM_RAIL_H`
  to leaves (`@/lib/canvas/layoutPrefs`, `@/design/sidebarMetrics`).
- ✅ **Tranche 4c — pure `buildCanvasFrame` (#34).** Extracted CanvasStage's
  node/edge assembly into `canvasFrame.ts` (no refs, no React state) with 6
  characterization tests (`canvasFrame.test.ts`) locking the removal/layout/
  restore behavior. `buildFor` is now a thin ref-supplying wrapper.
- ✅ **Tranche 4d — VizFitBox relocation (#08).** `vizFitMeasure` →
  `@/lib/canvas`; VizFitBox + MiniTabs → `@/components/vizFit`; deleted the
  `canvasTeachingUi` firewall; practice imports them straight from the leaf.
  nodeui 1151 → 895 LOC.

### 🎉 Module-boundary debt: 29 → **0**. The Shell → Canvas → Plugins layering is fully enforced.

### ✅ Completed in Phase 10 follow-up (formerly "remaining polish")

The items below were tracked as incremental debt in the original audit; they are now shipped. See the progress log above and the codebase paths cited here.

- **Tranche 4 SoC** — `layout.ts` split into presets/wiring/algorithms/edge-styles (`frontend/src/shell/canvas/layout/`); `CodeStudioProvider` and `WorkspaceCtx` split into slice contexts; `useCanvasLifecycle` extracted with characterization tests.
- **Tranche 5 store + backend** — `createSyncStore` unification (`store/canvas-layout/`, `store/practice/`); IO moved out of shell components; games catalog table + FK; hub invariant docs and tests.
- **Tranche 2/3 games + plugins** — games engine hooks (`shell/games/engine/`); `GameCommonStrings`; plugin factory helpers (`withInspectorNotes`, `verdictLastFrameTone`, `quizReducer`).

### ✅ Phase 10 — docs, CI & world-class finish (Todos 91–100)

- **ESLint flat config shipped** — `eslint.config.js` + `check:lint` in `check:all`
  (Theme A guardrail; the review doc's "no ESLint" gap is closed).
- **Module-boundary debt remains 0** — `check-boundaries.mjs` ratchet green.
- **Shell typography + sim quality** in `check:all` (`check-shell-typography`,
  `check-prep-sim-quality`).
- **`check:lighthouse-budget`** — static HTML/PWA/transport a11y budget guard.
- **Presentation mode** — canvas fullscreen hook, Learn bar hidden, minimap off.
- **GIF snapshot export** — `@/lib/export` single-frame MVP on transport bar.
- **Taxonomy unlock graph** — category edges + `buildProblemUnlockGraph` helpers.
- **Reference workflow preset** — pattern / glossary / cheat sheet canvas panels.
- **Visual QA checklist** — `docs/visual-qa-checklist.md`.
- **CHANGELOG** — density-default migration notes (`CHANGELOG.md`).
- **README** — six arcade games (Would You Rather included).
