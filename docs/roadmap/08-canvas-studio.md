# Canvas Studio (node-graph workspace)

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

**Scope:** the ReactFlow (`@xyflow/react`) node-graph canvas — `CanvasStage.tsx`, `nodes/`, `edges/`, `layout/`, `hooks/`, `ui/`, `frame/`, `widgets/`. Collaboration (`canvas/collab/`) is a **separate doc** and is out of scope here except where CanvasStage wires it. This doc plans robustness, performance, and UX polish for the solo/single-user canvas engine.

---

## 1. Snapshot — current state

The canvas is a pure-React-Flow node graph. The public entry is `CanvasStage` (`frontend/src/shell/canvas/CanvasStage.tsx`), which wraps an inner component in `CanvasCollabProvider` → `ReactFlowProvider`. Panels are custom `panel` / `effect` node types (`nodes/PanelNode.tsx`, `nodes/EffectNode.tsx`); edges are a single `removable` type with a delete button and user-selectable path style (`edges/RemovableEdge.tsx`).

**How it fits together (grounded):**
- **Frame assembly is pure and tested.** `frame/canvasFrame.ts` (`buildCanvasFrame`, `organizeCurrentCanvasFrame`) assembles nodes+edges for a mode given removals, saved layout, and layout options; `frame/canvasFrame.test.ts` characterizes it. This is the good pattern — the rest of `CanvasStage` should be pushed toward it.
- **Layout engine.** `layout/layout.ts` (558 LOC) mixes several concerns: mode→builtin/optional panel resolution (`modeNodeIds`, `defaultNodeIds`), shell wire tables (`SHELL_WIRES`), edge building/styling (`buildEdges`, `styleEdges`, `edgeConnectionLabel`), named presets + UI copy (`LAYOUT_PRESET_META`, `PRESET_KEEP`, `presetRemoved`), and three layout algorithms (`layoutVisualizeCanvas`, `layoutLearnCanvas`, `layoutGraph` via `@dagrejs/dagre`). Preference types/`LAYOUT_PRESETS` are correctly homed in the leaf `@/lib/canvas/layoutPrefs` and re-exported.
- **Hooks are already extracted** into `hooks/`: `useCanvasHistory` (undo/redo, #82), `useCanvasKeyboardShortcuts`, `useCanvasDnD`, `useCanvasNodeMutations`, `useCanvasLayoutPersistence`, `usePhaseTransition`; edge connect logic in `edges/useCanvasEdgeConnection.ts`. These are clean, small, and single-purpose.
- **Persistence.** Per-`(pluginId, mode)` layout (positions/widths + removed panels + removed edges) round-trips to `localStorage` via `useCanvasLayoutPersistence` + `@/store/canvas-layout` (`loadCanvasPrefs`/`saveCanvasPrefs` for edge/bg prefs). Project save/load uses `@/store/project-state` (`buildMinimalProjectState`, `sanitizeLoadedNodes`).
- **HUD / toolbar.** Floating chrome: `ui/CanvasToolbar.tsx` (standalone add/collab/tidy/snap/lock/undo/redo), `ui/CanvasTools.tsx` (`HudBtn`, align/distribute strip, `LaserPointer`, `ContextMenu`), `ui/CanvasFloatingHud.tsx`, `ui/UnifiedRightSidebar.tsx` (400 LOC), plus dialogs/popovers (`SettingsDialog`, `PresetPopover`, `SaveProjectDialog`, `ShareUrlPopover`).
- **Fit-view discipline.** Padding constants centralized (`FIT_PADDING*` in `layout.ts` and `FIT_VIEW_DURATION_MS` in `ui/canvasTokens.ts`); an initial-fit guard (`nodesInitialized` + `didInitialFit`) re-fits after custom nodes are measured.

**The debt:** `CanvasStage.tsx` is a **1041-LOC God-component with 18 `useEffect`s and 29 `useCallback`s** — it owns build/rebuild orchestration, all persistence effects, history wiring, DnD, add/preset/project/HUD registration into the workspace store, context menus, select-all, and the entire `<ReactFlow>` element with ~50 props. Layering, sizing, and the frame-assembly helpers are clean and tested; the top-level orchestration is not decomposed and has **no characterization test** guarding its many interacting effects. Accessibility is minimal (toolbar buttons have `aria-label`; the canvas surface itself has no keyboard node navigation or ARIA structure). No perf budget on rebuilds; `useWorkflowRunner` re-runs on every node/edge change (debounced 50 ms).

**Maturity: Solid.** The primitives (pure frame assembly, extracted hooks, centered layout math, tested layout/edge helpers) are strong; what holds it back from world-class is the un-decomposed 1041-LOC orchestrator with no test harness, thin a11y, and no measured perf budget.

---

## 2. Strengths to preserve

- **Pure, tested frame assembly.** `frame/canvasFrame.ts` + `frame/canvasFrame.test.ts` — the north-star pattern. Keep `buildCanvasFrame`/`organizeCurrentCanvasFrame` side-effect-free; new orchestration should call them, never inline layout.
- **Extracted single-purpose hooks** (`hooks/`, `edges/useCanvasEdgeConnection.ts`) — do not re-inline; extend the pattern.
- **Preference types live in the leaf** (`@/lib/canvas/layoutPrefs`) so `store`/`lib` share them without upward imports. Module boundaries are clean here (verified: `scripts/check-boundaries.mjs` passes in `check:all`).
- **Centralized fit-view constants** (`FIT_PADDING*`, `FIT_VIEW_DURATION_MS`) and the measurement-safe initial-fit guard (`useNodesInitialized`).
- **Single `removable` edge type** carrying `pathType`/`label`/`stroke` in `data` — cheap, uniform, user-editable.
- **Layout math is unit-tested** (`layout/layoutVisualize.test.ts`, `layoutMigration.test.ts`, `interviewLayout.test.ts`, `nodes/panelStyle.test.ts`, `nodes/panelCollapse.test.ts`).

---

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence (path or file:line) | Impact |
|---|---|---|---|
| P1 | `CanvasStage` God-component: 1041 LOC, 18 `useEffect`, 29 `useCallback`; orchestration (rebuild, persistence, history, add/preset/project/HUD registration, context menus) all inline with no characterization test | `frontend/src/shell/canvas/CanvasStage.tsx` (whole file) | Any change risks breaking one of ~18 interacting effects silently; blocks further refactor of layout/nodeui; hard for a cheaper agent to touch safely |
| P1 | `layout/layout.ts` mixes presets + wiring + 3 algorithms + edge styling in one 558-LOC file | `frontend/src/shell/canvas/layout/layout.ts:52-178` (presets/mode resolution), `:198-265` (wires/edges), `:354-506` (algorithms), `:541-558` (styleEdges) | Mechanical concerns tangled; every edit reloads the whole module; obscures which layout algorithm owns a bug |
| P1 | No a11y on the canvas surface: no keyboard node selection/move, no ARIA roles/labels on the `<ReactFlow>` region, no reduced-motion gate on fit-view animations | `CanvasStage.tsx:901-985` (no `role`/`aria-label`/`tabIndex` on the flow); `useCanvasKeyboardShortcuts.ts` (only z/c/undo/redo) | Keyboard-only and screen-reader users cannot operate the canvas; fit-view still animates for `prefers-reduced-motion` users |
| P1 | No perf budget on rebuild / no jank instrumentation; `useWorkflowRunner` recomputes trace on every node/edge change | `CanvasStage.tsx:263` (runner call), `frontend/src/hooks/useWorkflowRunner.ts:38-50` (memo chain over nodes/edges), `CanvasStage.tsx:265-276` (edge-enrich effect runs on every nodes/edges change) | On dense boards or rapid drags, repeated full-graph transforms can drop frames; no metric to catch regressions |
| P1 | No characterization/integration test for CanvasStage behavior (add panel, remove+persist, mode switch rebuild, preset apply, undo/redo) — only the pure `buildCanvasFrame` is tested | `frontend/src/shell/canvas/frame/canvasFrame.test.ts` exists; no `CanvasStage.test.tsx` | Refactors of the orchestrator have no safety net |
| P2 | Edge-enrich effect writes edge `data.label`/restyles inside a `useEffect` keyed on `[nodes, edges, edgeOpts]` — can loop-thrash if `styleEdges` output isn't referentially stable | `CanvasStage.tsx:265-276` | Extra renders; subtle churn under drag; guarded only by a `changed` flag, not by structural equality |
| P2 | Auto-restore of starter panels uses a 60 ms `setTimeout` race against collab/measurement | `CanvasStage.tsx:435-444` | Timing-dependent; brittle if measurement is slow; flaky empty-canvas flash |
| P2 | `MULTI_INSTANCE_PANELS` and `MODE_BUILTINS`/`MODE_OPTIONAL` hardcode panel ids in two files (stage + layout) | `CanvasStage.tsx:90`, `layout/layout.ts:52-63,115` | Adding a panel kind requires edits in multiple hardcoded sets; drift risk |
| P2 | History is a JSON-signature diff capped at 60 entries; large boards stringify all nodes on every settle | `hooks/useCanvasHistory.ts:37-49,64` | O(nodes) `JSON.stringify` per settle; fine now, unbounded cost on big graphs; no coalescing of rapid edits |
| P2 | Named layout presets are hardcoded (`LAYOUT_PRESET_META`, `PRESET_KEEP`); no user-defined/saved custom layouts | `layout/layout.ts:128-178` | Users can't save arrangements as reusable presets |
| P2 | `layout/index.ts` barrel `export *` from four modules — a split of `layout.ts` must preserve every currently-exported symbol or downstream breaks | `frontend/src/shell/canvas/layout/index.ts` | Refactor hazard; must gate splits on typecheck + the layout tests |

---

## 4. The world-class bar

A world-class node-graph studio for this app looks like **tldraw / Excalidraw-grade canvas UX** married to **React Flow best-practice architecture** and **Figma-grade keyboard/a11y**:

1. **No God-component.** `CanvasStage` is a thin composition root (< 300 LOC) that mounts providers and renders `<ReactFlow>`; every cohesive slice of orchestration lives in a named hook (`useCanvasRebuild`, `useCanvasPersistence`, `useCanvasCommands`) that is unit-tested in isolation. This mirrors how React Flow's own examples factor interaction hooks.
2. **Layout is a library, not a file.** `layout/` is split into `presets.ts`, `wiring.ts`, `algorithms.ts`, `edgeStyle.ts` behind the existing barrel; each layout algorithm (`visualize`/`learn`/dagre `graph`) is independently testable and documented with its coordinate conventions.
3. **Keyboard-first & accessible.** Tab into the canvas; arrow-key move selected nodes; `Delete` removes; `⌘A` select-all (exists); `?` opens a shortcut cheatsheet. The flow region has `role="application"` + an `aria-label`, node selection is announced via an `aria-live` region, and fit-view animations respect `prefers-reduced-motion` (instant when reduced). Excalidraw and tldraw are the bar for keyboard nudging + shortcut discoverability.
4. **Measured performance.** Rebuild and workflow-transform cost is instrumented (dev-only `performance.mark`), a documented node-count budget exists, and drag/rebuild stays at 60 fps on a 40-panel board. `onlyRenderVisibleElements` is already on — pair it with a perf test.
5. **Safety net.** A `CanvasStage.test.tsx` integration suite exercises add / remove+persist / mode-switch rebuild / preset / undo-redo against a jsdom-mounted stage, so the orchestrator can be refactored fearlessly.
6. **Saveable layouts.** Users save the current arrangement as a named custom preset (persisted alongside `canvasPrefs`), not just the five hardcoded ones.

---

## 5. Roadmap (ordered milestones)

### M1 — Safety net before refactor
Goal: lock current behavior so the God-component can be split without regressions.
- [ ] Add `CanvasStage.test.tsx` covering add-panel, remove+persist, mode-switch rebuild, preset apply, undo/redo — files: `frontend/src/shell/canvas/CanvasStage.test.tsx` — acceptance: 5+ behaviors asserted, all green — effort: M
- [ ] Add a pure regression test for the edge-enrich/`styleEdges` stability path — files: `frontend/src/shell/canvas/edges/edgeSanitization.test.ts` (extend) — acceptance: re-running enrich on already-labeled edges returns referentially-equal array — effort: S

### M2 — Split the layout library
Goal: `layout.ts` becomes a thin barrel over focused modules.
- [ ] Split `layout.ts` into `presets.ts` / `wiring.ts` / `algorithms.ts` / `edgeStyle.ts`, keep `layout.ts` re-exporting for compat — files: `frontend/src/shell/canvas/layout/*` — acceptance: `layout/index.ts` exports unchanged; `check:all` + layout tests green — effort: M
- [ ] Move `MODE_BUILTINS`/`MODE_OPTIONAL`/`MULTI_INSTANCE_PANELS` panel-id sets to a single source in `core/panelRegistry` and consume from both stage + layout — files: `frontend/src/core/panelRegistry`, `layout/wiring.ts`, `CanvasStage.tsx:90` — acceptance: no hardcoded id set duplicated across stage+layout — effort: S

### M3 — Decompose CanvasStage
Goal: orchestrator < 300 LOC; slices in tested hooks.
- [ ] Extract `useCanvasRebuild` (mode/plugin-switch snapshot+rebuild+fit, effect at `CanvasStage.tsx:343-368`) — files: `hooks/useCanvasRebuild.ts` — acceptance: M1 test still green — effort: M
- [ ] Extract `useCanvasPersistence` (the 3 persistence effects: `:315-340`, `:384-399`, edge-removal `:326-340`) — files: `hooks/useCanvasPersistence.ts` — acceptance: M1 test still green — effort: M
- [ ] Extract `useCanvasCommands` (add/preset/project/HUD registration into workspace store, `:597-711`) — files: `hooks/useCanvasCommands.ts` — acceptance: HUD/add/preset still function; M1 test green — effort: M

### M4 — Accessibility pass
Goal: keyboard-operable, screen-reader-legible, motion-safe canvas.
- [ ] Add `role`/`aria-label` to the flow region + `tabIndex` wrapper; add `?`-opens-shortcuts affordance — files: `CanvasStage.tsx:899-985` — acceptance: axe finds no critical role/label violation on the flow container — effort: S
- [ ] Arrow-key nudge for selected nodes (extend `useCanvasKeyboardShortcuts`) — files: `hooks/useCanvasKeyboardShortcuts.ts` — acceptance: arrow keys move selection by grid step; test asserts position delta — effort: M
- [ ] Gate fit-view animation on `prefers-reduced-motion` (duration 0 when reduced) — files: `CanvasStage.tsx:287-292` (`fitCanvas`), `ui/canvasTokens.ts` — acceptance: reduced-motion → `duration:0` — effort: S

### M5 — Performance budget & saveable layouts
Goal: measured perf + user-defined presets.
- [ ] Dev-only rebuild/transform instrumentation (`performance.mark`) behind a debug flag; document node-count budget — files: `frame/canvasFrame.ts`, `hooks/useWorkflowRunner.ts` — acceptance: marks emitted in dev, no-op in prod build — effort: S
- [ ] "Save current layout as preset" persisted with `canvasPrefs` — files: `@/store/canvas-layout`, `ui/PresetPopover.tsx`, `layout/presets.ts` — acceptance: saved preset survives reload and applies — effort: M

---

## 6. Execution-ready backlog

> Pick ONE at a time. Baseline before starting any task: `cd frontend && node_modules/.bin/vitest run` (**~3585 tests green**), `node_modules/.bin/tsc --noEmit -p tsconfig.json`, and `npm run check:all` all pass.

### Task 1 — Characterization test for CanvasStage add/remove/persist
- **Goal:** Lock current behavior of adding and removing a panel before any refactor.
- **Files:** create `frontend/src/shell/canvas/CanvasStage.test.tsx`.
- **Approach:** Mount `<CanvasStage standalone />` inside a test with the workspace store provider (mirror how existing canvas tests set up context — see `frame/canvasFrame.test.ts` and any `*.test.tsx` under `frontend/src` using `@testing-library/react`). Render, call the exposed add path (drive via the workspace `canvasAdd.onAddKind` set in the effect at `CanvasStage.tsx:597-607`, or simulate the toolbar `+` button in `ui/CanvasToolbar.tsx`), assert a node appears; remove it via context-menu/`removeNode`, assert it is gone and that `removedRef` persistence wrote to localStorage.
- **Acceptance test:** Test asserts (a) panel count increases after add, (b) panel count decreases after remove, (c) a `localStorage` key for the standalone canvas layout is written.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.test.tsx`

### Task 2 — Characterization test for mode-switch rebuild + undo/redo
- **Goal:** Lock rebuild-on-mode-switch and undo/redo before extracting those effects.
- **Files:** extend `frontend/src/shell/canvas/CanvasStage.test.tsx`.
- **Approach:** Mount a problem-backed `<CanvasStage plugin item />` (use `STUB_PLUGIN`/`STUB_ITEM` shapes from `CanvasStage.tsx:133-150` or a minimal fixture). Switch `mode` via the workspace store; assert nodes rebuild for the new mode (`modeNodeIds`). Move a node, call `undo` (from the HUD `tools.onUndo` registered at `:688-691`), assert position reverts; `redo`, assert it re-applies.
- **Acceptance test:** Mode switch changes the node set; undo reverts a move; redo re-applies it.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.test.tsx`

### Task 3 — Split `layout.ts` into focused modules behind the barrel
- **Goal:** Separate presets / wiring / algorithms / edge-styling.
- **Files:** `frontend/src/shell/canvas/layout/presets.ts`, `wiring.ts`, `algorithms.ts`, `edgeStyle.ts`; keep `layout.ts` re-exporting all current symbols; `layout/index.ts` unchanged.
- **Approach:** Move `LAYOUT_PRESET_META`/`PRESET_KEEP`/`presetRemoved` → `presets.ts`; `MODE_BUILTINS`/`MODE_OPTIONAL`/`modeNodeIds`/`buildNodes`/`SHELL_WIRES`/`buildEdges`/`edgesForKind`/`nextPracticePanel` → `wiring.ts`; `layoutVisualizeCanvas`/`layoutLearnCanvas`/`layoutGraph` + helpers → `algorithms.ts`; `styleEdges`/`edgeConnectionLabel`/`connectionLineType`/`ACCENTS`/`FIT_PADDING*` → `edgeStyle.ts`. Re-export everything from `layout.ts` so no import site changes.
- **Acceptance test:** No symbol removed from the public surface; every existing importer still compiles.
- **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run src/shell/canvas/layout && npm run check:boundaries`

### Task 4 — De-duplicate panel-id sets
- **Goal:** Single source for builtin/optional/multi-instance panel ids.
- **Files:** `frontend/src/core/panelRegistry` (add exports), `layout/wiring.ts` (consume), `CanvasStage.tsx:90` (import instead of local `MULTI_INSTANCE_PANELS`).
- **Approach:** Export a `MULTI_INSTANCE_PANELS` (currently `['whiteboard','collab-code']`) and mode builtin/optional resolvers from `panelRegistry`; delete the local copies. Verify `modeBuiltins`/`modeOptional` already used by `layout.ts:52-63` cover the need.
- **Acceptance test:** No `new Set([...])` of panel ids duplicated between `CanvasStage.tsx` and `layout/`.
- **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run src/shell/canvas`

### Task 5 — Extract `useCanvasRebuild`
- **Goal:** Move mode/plugin-switch rebuild out of the God-component.
- **Files:** `frontend/src/shell/canvas/hooks/useCanvasRebuild.ts`; edit `CanvasStage.tsx:343-368`.
- **Approach:** Move the mode/plugin snapshot-then-rebuild effect (and its `prevKeyRef`/`prevModeRef`/`builtKeyRef`/`mounted` refs) into a hook taking `{ plugin, mode, key, buildFor, setNodes, setEdges, fitCanvas, resetHistory, standalone }`. Keep semantics identical (initial mount is a no-op; leaving snapshots layout+removals; entering rebuilds+fits).
- **Acceptance test:** Tasks 1–2 remain green; `CanvasStage.tsx` LOC drops.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.test.tsx && node_modules/.bin/tsc --noEmit -p tsconfig.json`

### Task 6 — Extract `useCanvasPersistence`
- **Goal:** Consolidate the three persistence effects.
- **Files:** `frontend/src/shell/canvas/hooks/useCanvasPersistence.ts`; edit `CanvasStage.tsx:315-340,384-399`.
- **Approach:** Move (a) visualize edge-removal tracking `:326-340`, (b) layout+removed-panel persistence `:384-399` into one hook; guard on `builtKeyRef`/`collab.isCollaborating` exactly as today. Leave `sanitizeVisualizeEdges` effect where it is unless trivially co-located.
- **Acceptance test:** Task 1's localStorage-write assertion still passes; no double-write.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.test.tsx`

### Task 7 — Extract `useCanvasCommands` (store registration)
- **Goal:** Move add/preset/project/HUD registration effects out of the stage.
- **Files:** `frontend/src/shell/canvas/hooks/useCanvasCommands.ts`; edit `CanvasStage.tsx:597-711`.
- **Approach:** Move the four `setCanvasAdd`/`setCanvasProject`/`setCanvasHud` registration effects and their callback deps into a hook that returns nothing (pure side-effect registration) and takes the callbacks + values. Preserve cleanup (`return () => setCanvasX(null)`).
- **Acceptance test:** Toolbar `+`, preset popover, project save, and HUD undo/redo still function (assert via Task 1/2 harness driving `canvasAdd.onAddKind`).
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.test.tsx && node_modules/.bin/tsc --noEmit -p tsconfig.json`

### Task 8 — ARIA + focusable flow region
- **Goal:** Make the canvas surface legible to assistive tech.
- **Files:** `CanvasStage.tsx:899-985`.
- **Approach:** Add `role="application"` and `aria-label="Algorithm canvas"` to the wrapper `div` (line 899) or the `<ReactFlow>` element; ensure the wrapper is focusable (`tabIndex={0}`). Add a visually-hidden `aria-live="polite"` region that announces the selected panel title (derive from `nodes.filter(n=>n.selected)`).
- **Acceptance test:** The flow wrapper exposes `role` + `aria-label`; selecting a node updates the live region text.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas && node_modules/.bin/tsc --noEmit -p tsconfig.json`

### Task 9 — Arrow-key node nudging
- **Goal:** Keyboard move for selected nodes.
- **Files:** `frontend/src/shell/canvas/hooks/useCanvasKeyboardShortcuts.ts` (extend), pass `setNodes`.
- **Approach:** In the existing `onKey` handler, when not in an editable target and arrow keys are pressed with a non-empty selection, `e.preventDefault()` and shift each selected node's `position` by a grid step (16 px, matching `snapGrid={[16,16]}` at `CanvasStage.tsx:960`); `Shift` = 1 px fine nudge. Reuse `isEditableTarget` (already imported).
- **Acceptance test:** Unit test: given a selected node, an ArrowRight keydown moves it +16 x.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/hooks`

### Task 10 — Reduced-motion fit-view
- **Goal:** No fit animation for reduced-motion users.
- **Files:** `CanvasStage.tsx:287-292` (`fitCanvas`), optionally a helper in `ui/canvasTokens.ts`.
- **Approach:** Read `window.matchMedia('(prefers-reduced-motion: reduce)').matches`; when true, force `duration = 0` in `fitCanvas` and in the direct `fitView` calls that pass `FIT_VIEW_DURATION_MS` (`:580`, `:716`, `:825`). Add a small `prefersReducedMotion()` util so all call sites share it.
- **Acceptance test:** With matchMedia mocked to reduce, `fitView` is called with `duration:0`.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas`

### Task 11 — Stabilize the edge-enrich effect
- **Goal:** Stop redundant restyles/re-renders under drag.
- **Files:** `CanvasStage.tsx:265-276`.
- **Approach:** The effect maps edges to add a `data.label` and restyle; today it early-returns via a `changed` flag but still calls `styleEdges` which allocates new objects. Add a structural guard so that when no label was added, it returns the previous `eds` reference unchanged (do not call `styleEdges`). Only restyle the subset that changed.
- **Acceptance test:** Extend `edgeSanitization.test.ts` (or a new test) asserting: given edges that already carry labels, the enrich transform returns the same array reference.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas/edges`

### Task 12 — Rebuild/transform instrumentation (dev-only)
- **Goal:** Establish a perf baseline hook.
- **Files:** `frontend/src/shell/canvas/frame/canvasFrame.ts`, `frontend/src/hooks/useWorkflowRunner.ts`.
- **Approach:** Wrap `buildCanvasFrame` body and the `useWorkflowRunner` transform in `performance.mark`/`measure` guarded by `import.meta.env.DEV`. Emit a named measure (`canvas:rebuild`, `canvas:transform`). Document a node-count budget (e.g., "target ≤ 16 ms rebuild at 40 panels") in a comment.
- **Acceptance test:** Prod build strips the marks (no `performance.mark` in the `vite build` output for these paths); dev emits them.
- **Verify:** `cd frontend && node_modules/.bin/vite build && node_modules/.bin/vitest run src/shell/canvas/frame`

### Task 13 — Save current layout as a named preset
- **Goal:** User-defined presets beyond the five hardcoded ones.
- **Files:** `@/store/canvas-layout` (add `customPresets`), `frontend/src/shell/canvas/ui/PresetPopover.tsx`, `frontend/src/shell/canvas/layout/presets.ts`.
- **Approach:** Add a persisted `customPresets: Record<string, {removed:string[]; saved:SavedNodeLayout}>` to canvas prefs. In `PresetPopover`, add a "Save current as…" action that snapshots `removedRef`/layout and stores it; applying a custom preset repopulates `removedRef`/`layoutRef` and calls the existing `buildFor`+fit path (mirror `applyPreset` at `CanvasStage.tsx:490-511`).
- **Acceptance test:** Save a preset, reload (re-read prefs), apply it → node set + positions match the saved snapshot.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/shell/canvas && node_modules/.bin/tsc --noEmit -p tsconfig.json`

---

## 7. Definition of done & verification

Run all of these from a clean tree; each must be green before a task is considered done.

```bash
cd frontend
node_modules/.bin/tsc --noEmit -p tsconfig.json          # 0 errors
node_modules/.bin/tsc --noEmit -p tsconfig.node.json     # 0 errors
node_modules/.bin/vitest run                             # ~3585 tests, 0 failures (count grows as tasks add tests)
node_modules/.bin/vite build                             # build succeeds, no new chunk-size warnings
npm run check:all                                        # boundaries/tokens/plugin-meta/content-sql/simulators/quiz-labels all pass
```

**What green looks like:** `tsc` prints nothing and exits 0; `vitest` ends with `Test Files … passed` and no `failed`; `vite build` ends with `✓ built in …` and emits the usual chunks; `check:all` prints each check's OK line and exits 0. For a11y tasks, if `axe`/`jest-axe` is not already a dependency, assert roles/labels directly via `@testing-library` queries rather than adding a new dependency.

**Non-negotiables:** module boundaries stay clean (`npm run check:boundaries`); no import site changes when splitting `layout.ts` (barrel-compat); the pure `buildCanvasFrame`/`organizeCurrentCanvasFrame` stay side-effect-free.

---

## 8. Reference pointers

**Key files in scope:**
- `frontend/src/shell/canvas/CanvasStage.tsx` — the orchestrator (decompose target).
- `frontend/src/shell/canvas/frame/canvasFrame.ts` (+ `.test.ts`) — pure assembly (the good pattern).
- `frontend/src/shell/canvas/layout/layout.ts`, `layout/index.ts`, `layout/align.ts`, `layout/interviewLayout.ts`, `layout/layoutMigration.ts` — layout engine (split target).
- `frontend/src/shell/canvas/hooks/*` — extracted interaction hooks (extend here).
- `frontend/src/shell/canvas/edges/{RemovableEdge.tsx,useCanvasEdgeConnection.ts,edgeSanitization.ts,canvasHandles.ts}` — edge system.
- `frontend/src/shell/canvas/nodes/{PanelNode.tsx,EffectNode.tsx,nodeTokens.ts,panelStyle.ts,panelCollapse.ts,measuredCache.ts}` — node system.
- `frontend/src/shell/canvas/ui/{CanvasToolbar.tsx,CanvasTools.tsx,CanvasFloatingHud.tsx,UnifiedRightSidebar.tsx,canvasTokens.ts}` — floating HUD/toolbar.
- `frontend/src/hooks/useWorkflowRunner.ts` — frame-transform runner driven by the graph.
- `frontend/src/lib/canvas/layoutPrefs.ts` — preference types/`LAYOUT_PRESETS` (leaf home).
- `frontend/src/store/{canvas-layout,project-state,workspace}` — persistence + workspace store the canvas registers into.

**Related roadmap docs (see `docs/roadmap/`):** the collaborative-canvas doc (collab sync, spectators, subdoc merge) is the sibling to this one; the visualization/animation-engine doc owns the frame player (`usePlayer`, `FlipFrame`, `VizFitBox`) that `viz` panels render; the design-system doc owns moving shared primitives (`Chip`/`Meter`) out of `canvas/ui/nodeui` into `@/design`. Coordinate the `layout.ts` split (M2) and `nodeui` split with those docs to avoid churn.

**External prior art to emulate:**
- React Flow docs — interaction hooks, `onlyRenderVisibleElements`, custom node/edge patterns (already used): https://reactflow.dev/learn
- Excalidraw — keyboard nudging, shortcut cheatsheet, reduced-motion behavior: https://github.com/excalidraw/excalidraw
- tldraw — canvas a11y and command/undo architecture: https://github.com/tldraw/tldraw
