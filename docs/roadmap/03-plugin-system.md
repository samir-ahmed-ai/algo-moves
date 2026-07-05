# Plugin System & Generated Meta

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

Algo Moves models **every algorithm problem as a `ProblemPlugin`** (contract in `frontend/src/core/types.ts:123`). The shell (canvas, panels, player, inspector, code studio) is generic and never hardcodes a problem — it renders whatever a plugin exposes via `record` / `View` / `Inspector` / `quiz` / `codePieces` / `tabs` / `wires`.

**Plugin groups & lazy loading** (`frontend/src/plugins/index.ts`):
- Four groups: `curated` (18 hand-authored, statically linked in the entry bundle), `imported` (reference library), `prep` (interview-prep library), `go-course`.
- `GROUP_LOADERS` (`index.ts:70`) resolves `curated` synchronously and dynamic-`import()`s the other three so Rollup emits one chunk per group, loaded the first time a problem in that group opens.

**Generated meta index** (`frontend/scripts/build-plugin-meta.mts`, run via `vite-node`):
- Imports the built plugin arrays + course defs at build time and writes two checked-in files under `frontend/src/plugins/_generated/`: `pluginMeta.ts` (`PLUGIN_META`, id → meta + group; **426 entries**, 4789 LOC) and `courses.ts` (imported/prep/go course defs + `GO_BROWSE_CATEGORIES`).
- First-registration-wins dedupe mirrors the runtime registry (`build-plugin-meta.mts:47`).
- `--check` mode (`npm run check-plugin-meta`) fails the build if the checked-in files drift. Part of `check:all`.

**Registry** (`frontend/src/core/registry.ts`): `listPluginMeta` / `getPluginMeta` serve metadata synchronously from `PLUGIN_META`; `loadPlugin(id)` loads and memoizes the owning group chunk; `loadAllPlugins()` (tests/tooling) loads every group.

**Integrity tests**:
- `frontend/src/plugins/integrity.test.ts` — catalog↔registry resolution, generated-meta↔implementation sync (title/difficulty/summary/source/tags drift + orphan detection), wire-endpoint validity against `BUILTIN_PANELS`, curated learn-stack presence, `move.note` non-empty on every frame, simulator-resolves-by-manifest-id, glyph keys, quiz-label format, board-area View structure.
- `frontend/src/plugins/recorders.test.ts` — every plugin's `record()` yields a non-empty frame sequence with `move.type`/`note`/`caption`, unique ids, plus ~20 behavioural snapshots (binary search hit/miss, sorts end sorted, n-queens valid, etc.).

**Shared authoring factories** (`frontend/src/plugins/_shared/`): `createRecorder.ts` (standard emit/frames factory — **adopted by 360/362 simulator files**, verified by grep), `pluginKit.ts` (`wireTeachingStack`), `practice.tsx` (cases/quiz/simulate panels), `vizKit.tsx` (typography-safe view primitives), plus per-shape recorders (`sortRecorder`, `treeRecord`, `graphRecord`, `gridRecord`, `arrayPatterns/`).

**Scaffolding**: `npm run new-problem -- <id> "<Title>"` (`scripts/new-problem.mjs`, 173 LOC), `npm run scaffold-prep-sim -- <slug>`, `npm run import-prep`. Coverage gates: `check-simulators` (banned font sizes), `check-prep-sim-coverage` (271 prep manifest ids all have a `prepSimulators/problems/*.tsx`), `check-plugin-typography`.

**Maturity: Solid.** The contract, lazy-loading, generated-meta+drift-guard, and integrity suite are genuinely mature and enforced in CI. It falls short of world-class because validation is structural not semantic (a plugin can register, resolve, and emit non-empty frames while producing a shallow or wrong visualization — 42/271 prep sims emit ≤4 frames), there is no per-plugin lint at authoring time beyond typography/meta, and the four-group topology hardcodes group membership in three places (`index.ts` array + `GROUP_LOADERS` + `build-plugin-meta.mts` `GROUPS`) that must be kept in sync by hand.

## 2. Strengths to preserve

- **Clean, minimal contract** — `ProblemPlugin` (`core/types.ts:123`) is small and shell-agnostic; `definePlugin` is a pure identity helper for inference. Do not add shell/UI coupling to it.
- **Split metadata vs implementation** — catalog/sidebar/search read `PLUGIN_META` synchronously; heavy impls load per-group on demand. This is the load-time win; keep the generated index thin.
- **Drift guard is real** — `integrity.test.ts` (generated-meta↔impl) + `check-plugin-meta --check` together make it impossible to ship a stale `_generated/` index without a red build. Preserve both (test AND check).
- **First-registration-wins dedupe is consistent** across `build-plugin-meta.mts:47`, `registry.ts` `loadGroup`/`loadAllPlugins`, and `metaById`. Any new aggregation path must keep this ordering.
- **`createRecorder` is genuinely adopted** (360/362 sims) — the emit/frames/getState/setState factory is the canonical recording primitive. New simulators must use it, not hand-roll frame arrays.
- **`wireTeachingStack`** unifies Cases/Quiz/Simulate tabs and Code Studio phases from one data source (`practice.ts`), so quiz edits stay in sync across surfaces.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence | Impact |
|----------|-------|----------|--------|
| P1 | Group topology duplicated in 3 places with no guard | `plugins/index.ts:40` (`PLUGIN_GROUPS`) + `index.ts:70` (`GROUP_LOADERS`) + `build-plugin-meta.mts:25` (`GROUPS`) | Adding/renaming a group silently desyncs meta generation from runtime loading; only caught if a test happens to touch the missing group. |
| P1 | No semantic simulator-quality validation | `check-prep-sim-coverage.mjs` checks *existence* only; `integrity.test.ts:121` checks `move.note` non-empty; 42/271 prep sims emit ≤4 frames (grep) | A registered plugin can visualize the wrong thing or a near-empty board and pass all gates. Blocks parity with the 18 curated plugins. |
| P1 | Content→plugin binding not validated at build | `content/courses.ts:177` uses `prereqs`; `content/types.ts:26` declares them; no `checkCatalogIntegrity`; `buildCatalog` (`content/catalog.ts:51`) skips missing plugins silently | An item referencing a nonexistent `pluginId`, or a `prereqs` cycle, ships without error (only the runtime integrity *test* catches curated cases, not prep/imported at build). |
| P1 | No per-plugin authoring lint beyond typography/meta | `scripts/` has `check-simulators` (font sizes), `check-plugin-typography`, `check-plugin-meta`; nothing lints contract shape (duplicate input ids, empty `inputs`, wire targets, `codePieces` coverage) at author time | Authors discover contract mistakes only when the full vitest suite runs, not in a fast pre-commit; the integrity suite must load *all* group chunks to check anything. |
| P2 | Generated `pluginMeta.ts` is 4789 LOC of inline JSON in a `.ts` file | `_generated/pluginMeta.ts` | Bloats the entry bundle's typechecked surface and git diffs; a thinner JSON re-export would tree-shake and diff better. |
| P2 | `new-problem.mjs` scaffolds curated only; no scaffold parity for imported/go-course | `scripts/new-problem.mjs`, `scripts/scaffold-prep-simulator.mjs` (prep only) | Authoring an imported/go-course problem is undocumented hand-work; ergonomics diverge by group. |
| P2 | Duplicate-id handling is a silent DEV-only `console.warn` | `registry.ts:14`, `build-plugin-meta.mts:47` (`continue`) | A genuine id collision across groups is swallowed in prod builds; the losing plugin vanishes with no CI signal. |
| P2 | `BUILTIN_PANELS` allow-list is duplicated in the test, not sourced from shell | `integrity.test.ts:22` | Adding a real built-in panel requires editing the test's hardcoded set; drift between shell panels and the wire-validation allow-list is possible. |
| P2 | No plugin-load smoke test / error boundary contract | `registry.ts` `loadPlugin` returns `undefined` on miss; no test asserts every meta id actually `loadPlugin`s to a defined impl | `loadAllPlugins` dedupes, but a group chunk that throws on import is only surfaced when a test imports it; no explicit "every meta id loads" assertion. |

## 4. The world-class bar

Excellence for a plugin system in a 400+ problem teaching app looks like:

- **One source of truth for topology.** Groups, their loaders, and meta generation derive from a single exported table (like how VS Code's contribution points and ESLint's flat-config plugin arrays are declared once). Renaming a group is a one-line edit that fails loudly everywhere if inconsistent.
- **Validation is a pyramid, fast→slow.** (1) A sub-second `check:plugins` lint (contract shape, duplicate ids, wire targets, empty inputs) in pre-commit; (2) the existing drift + integrity vitest layer; (3) a semantic "sim quality" gate (min frame count, board renders non-trivially, verdict well-formed). Emulate Rust's `cargo check` vs `cargo test` split and Prettier/ESLint's staged-lint model.
- **Authoring is a scaffold + preview loop.** `new-problem`/`scaffold-*` produce a runnable stub for every group, and a gallery route renders the board + quiz + code for instant visual QA (like Storybook stories per plugin). AI-assisted `record()`/`View` generation is a plus, not the contract.
- **Generated indexes are thin, boring JSON.** `pluginMeta` is a `.json` re-exported through a typed loader; diffs are trivial and it tree-shakes. Follow the "generated code is data, not logic" rule already stated in the file BANNER.
- **Registry is observable.** Duplicate ids, load failures, and missing content bindings are hard CI errors, not DEV `console.warn`s.
- **Contract stays minimal & typed.** New capabilities are optional fields with defaults; `definePlugin` gives full inference; no field ever reaches up into `shell/` or `canvas/` (enforced by `check-boundaries.mjs`).

## 5. Roadmap (ordered milestones)

### M1 — Single source of truth for group topology
Goal: groups, loaders, and meta generation derive from one table; drift is impossible.
- [ ] Introduce `PLUGIN_GROUP_TABLE` in `frontend/src/plugins/index.ts` mapping each `PluginGroup` → `{ loader }`, and derive `PLUGIN_GROUPS` + `GROUP_LOADERS` from it — files: `frontend/src/plugins/index.ts` — acceptance: `PLUGIN_GROUPS` and `GROUP_LOADERS` keys are generated from the table; `tsc` green — effort: S
- [ ] Make `build-plugin-meta.mts` import the same group list (not a hand-copied `GROUPS` array) — files: `frontend/scripts/build-plugin-meta.mts` — acceptance: no second literal group list exists; `npm run check-plugin-meta` green — effort: S

### M2 — Fast authoring lint (`check:plugins`)
Goal: a sub-second static gate catches contract mistakes before the full suite.
- [ ] Add `scripts/check-plugins.mjs` (static, no chunk load) that scans curated `index.tsx` files + `_generated/pluginMeta.ts` for: duplicate ids, empty `inputs`, duplicate input ids, wire endpoints not in a known-panel set — files: `frontend/scripts/check-plugins.mjs`, wire into `package.json` `check:all` — effort: M
- [ ] Export `BUILTIN_PANELS` from a shared module so both `integrity.test.ts` and the new lint consume one list — files: new `frontend/src/core/builtinPanels.ts`, `frontend/src/plugins/integrity.test.ts` — effort: S

### M3 — Content↔plugin binding + prereq validation
Goal: catalog integrity is a build gate, not just a runtime test for curated ids.
- [ ] Add `checkCatalogIntegrity(catalog, PLUGIN_META)` covering every group: each `kind:'problem'` item resolves a meta id; `prereqs` reference real item ids; prereq graph is a DAG (cycle detection) — files: new `frontend/src/content/checkCatalogIntegrity.ts` + test — acceptance: a deliberately broken `pluginId`/cyclic `prereqs` fails the test — effort: M
- [ ] Add an "every meta id loads to a defined impl" assertion — files: `frontend/src/plugins/recorders.test.ts` — acceptance: `loadPlugin(m.id)` defined for all `PLUGIN_META` — effort: S

### M4 — Registry observability (duplicate ids & load failures are errors)
Goal: silent DEV warnings become CI failures.
- [ ] Add a test asserting no duplicate ids exist across groups *before* dedupe (surface the collision the runtime silently drops) — files: `frontend/src/plugins/integrity.test.ts` — effort: S
- [ ] Have `build-plugin-meta.mts` fail (non-zero) on a duplicate id instead of `continue` — files: `frontend/scripts/build-plugin-meta.mts` — effort: S

### M5 — Semantic simulator-quality gate
Goal: registered ≠ good; enforce a minimum visualization quality.
- [ ] Extend `check-prep-sim-coverage.mjs` (or add `check-sim-quality.mjs`) to assert each sim's `record()` on its first input emits ≥ N frames (start N=4, allow-list exceptions) — files: `frontend/scripts/check-sim-quality.mjs` — acceptance: the 42 shallow prep sims are surfaced as an explicit tracked list — effort: M
- [ ] Document a "sim quality checklist" in `frontend/src/plugins/README.md` (≥N frames, small readable inputs ≤10 items, non-trivial board) — files: `frontend/src/plugins/README.md` — effort: S

### M6 — Thin generated index + scaffold parity (polish)
Goal: generated meta is boring data; every group has a scaffold.
- [ ] Emit `pluginMeta.json` + a thin typed `.ts` re-export from `build-plugin-meta.mts` — files: `frontend/scripts/build-plugin-meta.mts`, `frontend/src/plugins/_generated/` — acceptance: bundle typecheck unaffected; drift guard still green — effort: M

## 6. Execution-ready backlog

Pick ONE at a time. Every task keeps `cd frontend && node_modules/.bin/vitest run` green (baseline: 3585 tests) unless it adds tests.

1. **Export a shared built-in panel list.**
   - Goal: single source for the wire-validation allow-list.
   - Files: create `frontend/src/core/builtinPanels.ts` exporting `BUILTIN_PANELS` (the exact `Set` from `integrity.test.ts:22`); import it in `integrity.test.ts` replacing the inline set.
   - Approach: move the literal, `export const BUILTIN_PANELS = new Set([...])`. No behavior change.
   - Acceptance test: `integrity.test.ts` "plugin wires reference valid panel ids" still passes.
   - Verify: `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

2. **Derive `PLUGIN_GROUPS` + `GROUP_LOADERS` from one table.**
   - Goal: kill the parallel group lists in `index.ts`.
   - Files: `frontend/src/plugins/index.ts`.
   - Approach: define `const PLUGIN_GROUP_TABLE = { curated: {...}, imported: {...}, prep: {...}, 'go-course': {...} }` with loader fns; set `PLUGIN_GROUPS = Object.keys(PLUGIN_GROUP_TABLE)` and build `GROUP_LOADERS` from it. Keep `curated` synchronous.
   - Acceptance test: registry + recorders + integrity suites unchanged.
   - Verify: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run src/plugins`

3. **Make `build-plugin-meta.mts` consume the same group list.**
   - Goal: remove the hand-copied `GROUPS` array (`build-plugin-meta.mts:25`).
   - Files: `frontend/scripts/build-plugin-meta.mts`, possibly export a `GROUP_PLUGIN_ARRAYS` helper from `index.ts`/group barrels.
   - Approach: import the group→plugins mapping instead of re-listing `curatedPlugins`/`importedPlugins`/`prepPlugins`/`goCoursePlugins` inline; iterate it.
   - Acceptance test: regenerating produces byte-identical `_generated/` files.
   - Verify: `cd frontend && npm run build-plugin-meta && npm run check-plugin-meta` (both green, "up to date").

4. **Add "every meta id loads" assertion.**
   - Goal: prove no `PLUGIN_META` entry points at a non-loadable impl.
   - Files: `frontend/src/plugins/recorders.test.ts` (or `integrity.test.ts`).
   - Approach: `import { PLUGIN_META } from './_generated/pluginMeta'` + `loadPlugin` from `../core/registry`; `for (const m of PLUGIN_META) expect(await loadPlugin(m.id)).toBeDefined()`.
   - Acceptance test: new test passes on current tree.
   - Verify: `cd frontend && node_modules/.bin/vitest run src/plugins/recorders.test.ts`

5. **Fail meta generation on a real duplicate id.**
   - Goal: turn the silent `continue` (`build-plugin-meta.mts:47`) into an error.
   - Files: `frontend/scripts/build-plugin-meta.mts`.
   - Approach: collect duplicate ids into an array; after the loop, if any exist AND they differ in meta (title/difficulty/etc.), `console.error` + `process.exit(1)`. Keep first-wins for identical re-registration (curated↔migrated imported ids are intentional).
   - Acceptance test: current tree still generates cleanly (no *conflicting* dupes).
   - Verify: `cd frontend && npm run build-plugin-meta` (exit 0, count printed).

6. **Add a duplicate-id-before-dedupe test.**
   - Goal: surface any collision the runtime drops.
   - Files: `frontend/src/plugins/integrity.test.ts`.
   - Approach: `loadAllPlugins()` already dedupes; instead iterate each group's raw array (import `curatedPlugins`, `importedPlugins`, `prepPlugins`, `goCoursePlugins`), collect all ids WITH duplicates, assert the only repeats are a documented allow-list (curated↔imported migrations).
   - Acceptance test: passes on current tree.
   - Verify: `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

7. **Create `scripts/check-plugins.mjs` (static contract lint).**
   - Goal: sub-second gate for curated plugin folders + generated meta.
   - Files: create `frontend/scripts/check-plugins.mjs`; add `"check:plugins": "node scripts/check-plugins.mjs"` and append to `check:all` in `frontend/package.json`.
   - Approach: parse `_generated/pluginMeta.ts` JSON block (regex as in `check-prep-simulator-coverage.mjs:12`); assert unique ids, non-empty `title`, valid `difficulty`, `group` in the known set. No chunk loading.
   - Acceptance test: prints ok on current tree; a hand-injected dup id fails.
   - Verify: `cd frontend && npm run check:plugins`

8. **`checkCatalogIntegrity` for all groups.**
   - Goal: build-time content↔plugin binding + prereq DAG check.
   - Files: create `frontend/src/content/checkCatalogIntegrity.ts` + `checkCatalogIntegrity.test.ts`.
   - Approach: input the merged catalog (`buildCatalog(...)` as in `integrity.test.ts:48`) and `PLUGIN_META`; for each `kind:'problem'` item assert `getPluginMeta(item.pluginId)` truthy; build a prereq adjacency from `ItemDef.prereqs` (`content/types.ts:26`) over catalog item ids; DFS for cycles; assert every prereq id exists.
   - Acceptance test: a fixture with a bad `pluginId` and a fixture with a 2-cycle both throw.
   - Verify: `cd frontend && node_modules/.bin/vitest run src/content/checkCatalogIntegrity.test.ts`

9. **Add `check-sim-quality.mjs` (min frame count).**
   - Goal: flag shallow simulators (42/271 prep sims emit ≤4 frames today).
   - Files: create `frontend/scripts/check-sim-quality.mjs`; add to `check:all` as a WARN-only step first (do not break CI on day one).
   - Approach: static scan of `imported/prepSimulators/problems/*.tsx` + `imported/simulators/problems/*.tsx` counting `.emit(`/`emit(` calls per file; report files below threshold N=5. Emit a tracked list to stdout; exit 0 initially.
   - Acceptance test: prints the shallow-sim list; exits 0.
   - Verify: `cd frontend && node scripts/check-sim-quality.mjs`

10. **Document the sim-quality checklist.**
    - Goal: authors know the bar before writing.
    - Files: `frontend/src/plugins/README.md` (append a "Simulator quality" subsection under the prep-library section near line 78).
    - Approach: ≥5 emitted frames on the first input; inputs ≤10 items for readable boards; View must render structure (not `op=init`); verdict well-formed. Link to `check-sim-quality.mjs`.
    - Acceptance test: N/A (docs). `check-plugin-typography` still green.
    - Verify: `cd frontend && npm run check-plugin-typography`

11. **Thin generated meta: emit JSON + typed re-export.**
    - Goal: shrink the 4789-LOC inline-JSON `.ts`.
    - Files: `frontend/scripts/build-plugin-meta.mts`, `frontend/src/plugins/_generated/`.
    - Approach: write `pluginMeta.json` + a small `pluginMeta.ts` that `import data from './pluginMeta.json'` and `export const PLUGIN_META = data as PluginMetaEntry[]`. Ensure `resolveJsonModule` is on in tsconfig (check first). Update `--check` to diff both files.
    - Acceptance test: drift guard + integrity suite green.
    - Verify: `cd frontend && npm run build-plugin-meta && npm run check-plugin-meta && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

12. **Scaffold parity note for imported/go-course.**
    - Goal: document how to author non-curated problems (currently only `new-problem` + `scaffold-prep-sim` exist).
    - Files: `frontend/src/plugins/README.md`.
    - Approach: add a short "Authoring by group" table pointing at `imported/factory.tsx` (`makeImportedPlugin`), `imported/prepFactory.tsx` (`makePrepPlugin`), and `go-course/factory.tsx`; state which scaffold script (if any) applies per group.
    - Acceptance test: N/A (docs).
    - Verify: `cd frontend && npm run check:all`

## 7. Definition of done & verification

Run all from `frontend/` unless noted. Green = the described output.

- Typecheck: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/tsc --noEmit -p tsconfig.node.json` → no output, exit 0.
- Plugin + content tests: `cd frontend && node_modules/.bin/vitest run src/plugins src/content` → all suites pass; total run stays ≥ baseline 3585.
- Full unit suite: `cd frontend && node_modules/.bin/vitest run` → "Test Files … passed", exit 0.
- Guardrails: `cd frontend && npm run check:all` → each step prints `ok` / "up to date"; specifically `check-plugin-meta` prints `✓ plugin meta up to date (426 plugins)` and (after M2) `check:plugins` prints ok.
- Meta regeneration is a no-op: `cd frontend && npm run build-plugin-meta && git diff --exit-code src/plugins/_generated/` → exit 0 (no drift).
- Prod build: `cd frontend && node_modules/.bin/vite build` → completes; per-group chunks (`plugins-imported-*`, `plugins-prep-*`, `plugins-go-*`) still emitted separately.

Any new script added to `check:all` must exit 0 on a clean tree and non-zero on a deliberately broken fixture.

## 8. Reference pointers

Key files:
- Contract: `frontend/src/core/types.ts:123` (`ProblemPlugin`), `:155` (`definePlugin`).
- Groups & lazy loading: `frontend/src/plugins/index.ts` (`PLUGIN_GROUPS`, `GROUP_LOADERS`).
- Registry: `frontend/src/core/registry.ts` (`getPluginMeta`, `loadPlugin`, `loadAllPlugins`).
- Meta generator: `frontend/scripts/build-plugin-meta.mts`; generated output `frontend/src/plugins/_generated/{pluginMeta,courses}.ts`.
- Integrity: `frontend/src/plugins/integrity.test.ts`, `frontend/src/plugins/recorders.test.ts`.
- Shared factories: `frontend/src/plugins/_shared/{createRecorder,pluginKit,practice,vizKit}.tsx?`.
- Authoring guide: `frontend/src/plugins/README.md`, `frontend/src/plugins/EXAMPLE.md`.
- Coverage gates: `frontend/scripts/{check-simulators,check-prep-simulator-coverage,lint-plugin-typography}.mjs`.

Related roadmap docs (same folder): the content-catalog roadmap (`prereqs`, taxonomy, SQL mirror) and the build/tooling roadmap (ESLint flat-config, vitest.config) are the natural neighbors; catalog-integrity work (task 8) overlaps the content roadmap and should be coordinated.

External prior art:
- VS Code contribution points — single-declaration extension capabilities loaded lazily by activation event.
- ESLint flat config (`eslint.config.js`) — plugins as a declared array with a shared processor; a model for "topology declared once."
- Storybook — per-component preview stories; the pattern for a plugin gallery/QA route.
