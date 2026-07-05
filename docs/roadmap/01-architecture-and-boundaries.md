# Architecture & Module Boundaries

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

Algo-moves' frontend is a React + TypeScript SPA under `frontend/src/`, organized into strictly-ordered layers. The intended dependency direction is documented at the top of `frontend/scripts/check-boundaries.mjs:6-16` and enforced by that script:

```
design  ->  (nothing app-level)
lib     ->  design
core    ->  lib, design
content ->  lib, core, design
components / effects ->  lib, core, design (+ components for effects)
store   ->  lib, core, content, design
plugins ->  lib, core, components, effects, store, content, design
hooks / shell  ->  anything below
```

The actual top-level directories are `frontend/src/{design, lib, core, content, components, effects, store, plugins, hooks, shell, data, styles}` (verified via `ls frontend/src`).

**Aliasing.** A single alias `@/* -> src/*` is defined in both `frontend/tsconfig.json` (`compilerOptions.paths`) and `frontend/vite.config.ts` (`resolve.alias`). There is no per-layer alias; imports use `@/design`, `@/lib`, `@/core`, etc.

**The boundaries checker** (`frontend/scripts/check-boundaries.mjs`, 142 LOC, zero deps) walks every non-test `.ts/.tsx` under `src/`, parses import/export specifiers, resolves `@/` and relative paths, and flags any edge that points the wrong way per the `FORBIDDEN` map (`check-boundaries.mjs:33-42`). It has:
- an `ACCEPTED` set of 4 by-design composition-root exemptions (`check-boundaries.mjs:50-55`: `core/registry.ts` → `plugins`, `content/index.ts` → generated courses),
- an empty `KNOWN_VIOLATIONS` ratchet (`check-boundaries.mjs:64`) — debt is at **zero** and the ratchet can only shrink.

It is wired into `npm run check:all` (`frontend/package.json`, `check:boundaries` script) which runs in CI (`.github/workflows/ci.yml`).

**What's done.** Per `docs/architecture-review.md:238-292` the 8-tranche remediation drove module-boundary debt **29 → 0**. Landed: the boundary firewall (Tranche 0); shared leaves `@/lib/navigation`, `lib/utils` extractions, `@/design/typography`, `@/components/formControls`, `@/lib/canvas/layoutPrefs` (Tranche 1); design-token leaf inversion so `@/design/{nodeScale,canvasMetrics,vizText,sidebarMetrics}` own canonical tokens (Tranche 4a/4b); a pure `buildCanvasFrame` extracted from CanvasStage with 6 characterization tests (Tranche 4c, `shell/canvas/canvasFrame.ts` + `canvasFrame.test.ts`); VizFitBox relocation to `@/components/vizFit` (Tranche 4d). The Workspace God-component decomposition has also landed since the review was written: `shell/workspace/` now holds `ModeRouter.tsx`, `useWorkspaceKeyboard.ts`, `useWorkspaceRuntime.ts`, `useWorkspaceSession.ts`, `CommandPalette.tsx`, `PresentationModeHint.tsx` — each with a colocated test.

**What's NOT done (verified, not assumed).**
- **No ESLint anywhere.** `ls frontend/.eslintrc* frontend/eslint.config*` and the repo root both return no matches. The custom `check-boundaries.mjs` is the *only* layering enforcer; it catches cross-*layer* edges but is blind to intra-layer (e.g. within-`shell`) coupling and to per-line lint issues.
- **Theme B (`@/design/components`) is only half-done.** `Chip`, `Meter`, `Pill` still live *only* in `shell/canvas/ui/nodeui.tsx` (verified: `grep -rln 'export.*Chip' design components shell/canvas/ui/nodeui.tsx` → only nodeui). Six shell files import them upward from canvas: `shell/home/LandingPage.tsx`, `shell/browse/{ProblemGrid,TrackGrid,CategoryGrid}.tsx`, `shell/mobile/{MobileBrowse,MobileVizShell}.tsx`. Because `home`, `browse`, `mobile`, and `canvas` are all under `shell`, the boundary checker sees them as intra-layer and **does not flag them** — the coupling is real but invisible.
- **God-components remain** (verified `wc -l`): `shell/canvas/CanvasStage.tsx` 1041, `shell/canvas/ui/nodeui.tsx` 894, `shell/canvas/components/AssembleModes.tsx` 866, `shell/home/LandingPage.tsx` 806, `shell/canvas/collab/CanvasCollabProvider.tsx` 687, `shell/canvas/layout/layout.ts` 558, `shell/study/CodeStudio.tsx` 612 (its `CodeStudioProvider` context value has ~107 fields — verified by counting keys in the value object).

**Maturity: Solid.** Layering is real, documented, and machine-enforced with zero tracked debt — a genuinely strong foundation most SPAs never reach. It falls short of world-class because enforcement is a bespoke script (no ESLint/import-boundaries, no intra-layer rules), a promised shared UI leaf (`@/design/components`) is unfinished so `shell` sub-domains still reach into `canvas`, and several 600–1000-LOC God-components block further layering clarity.

## 2. Strengths to preserve

- **Machine-enforced layering with a shrink-only ratchet.** `check-boundaries.mjs` makes "loosely coupled" a build guarantee, not a convention. The `KNOWN_VIOLATIONS` ratchet (empty) can only shrink — new violations fail CI. Do not weaken this; any new architecture rule should be *additive*.
- **Single, consistent alias.** `@/* -> src/*` in both tsconfig and vite. No alias sprawl. Keep it.
- **Composition roots are explicit.** The only legitimate upward pulls (registry → plugins, catalog → generated courses) are named in `ACCEPTED` (`check-boundaries.mjs:50-55`), not hidden.
- **Design-token leaf is canonical and at the bottom.** `@/design/{tokens,nodeScale,canvasMetrics,vizText,sidebarMetrics,typography}` own the tokens; higher layers re-export down. This inversion (Tranche 4a/4b) is exactly right.
- **Characterization-test-first refactoring.** `shell/canvas/canvasFrame.test.ts` locked CanvasStage behavior before extraction. Reuse this pattern for every God-component split.
- **CI parity.** `.github/workflows/ci.yml` runs `npm test`, `npm run typecheck`, `npm run check:all`, `check-mobile-decks`, and `build` — plus Go vet/test/build. The guardrails actually gate merges.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence (path or file:line) | Impact |
|---|---|---|---|
| P1 | No ESLint / import-boundary lint. Bespoke script is the only enforcer; blind to intra-`shell` coupling and per-line issues (unused imports, circular refs, dead exports). | No `eslint.config.*` in `frontend/` or repo root; only `frontend/scripts/check-boundaries.mjs` | Layering can regress *within* a layer with zero signal; 1-line violations undetected until next unrelated failure. `docs/architecture-review.md:70-73` names this the #1 lever. |
| P1 | `@/design/components` leaf never created; `Chip`/`Meter`/`Pill` live in `shell/canvas/ui/nodeui.tsx` and are imported upward by 6 shell files. | `shell/home/LandingPage.tsx`, `shell/browse/{ProblemGrid,TrackGrid,CategoryGrid}.tsx`, `shell/mobile/{MobileBrowse,MobileVizShell}.tsx` all `import from '@/shell/canvas/ui/nodeui'` | `shell/home`, `shell/browse`, `shell/mobile` depend on `shell/canvas` internals — a real coupling the boundary checker cannot see (all under `shell`). Blocks reuse and canvas refactoring. `docs/architecture-review.md:75-88`. |
| P1 | `CanvasStage.tsx` (1041 LOC) still holds ~13 interdependent effects; only `buildCanvasFrame` was extracted. | `wc -l shell/canvas/CanvasStage.tsx` → 1041; `shell/canvas/canvasFrame.ts` extracted the pure part only | Largest single-file complexity in the app; residual lifecycle effects block a clean `useCanvasLifecycle` hook and downstream layering. `docs/architecture-review.md:90-93,286`. |
| P1 | `nodeui.tsx` (894 LOC) is a God-module mixing 40+ primitives + tone maps + tokens, sitting one layer too low (`shell/canvas/ui`). | `wc -l shell/canvas/ui/nodeui.tsx` → 894 | Every shared primitive lives in the wrong layer; splitting it behind a barrel dissolves the P1 above. `docs/architecture-review.md:76-88`. |
| P1 | `CodeStudioProvider` exposes a ~107-field context value (single monolithic context). | `shell/study/CodeStudio.tsx:108` (`export function CodeStudioProvider`); value object has ~107 keys | Over-broad re-renders; consumers can't subscribe to a slice. Logic is already in hooks — only the context *surface* is monolithic. `docs/architecture-review.md:96-99`. |
| P2 | `layout.ts` (558 LOC) mixes presets + wiring + algorithms + edge styles. | `wc -l shell/canvas/layout/layout.ts` → 558 | Hard to reason about; a low-risk mechanical split behind a barrel is deferred (`#78`). `docs/architecture-review.md:94-95,282`. |
| P2 | `AssembleModes.tsx` (866) and `LandingPage.tsx` (806) mix logic + IO + render with no decomposition. | `wc -l shell/canvas/components/AssembleModes.tsx shell/home/LandingPage.tsx` | Untestable-in-isolation UI; LandingPage mixes hero + dense catalog grid. `docs/architecture-review.md:100-102`. |
| P2 | No dependency-cycle detection. `tsc` won't fail on a runtime import cycle; the boundary script checks direction, not cycles. | `check-boundaries.mjs` (direction only, no cycle graph) | A same-layer cycle (e.g. two `shell` files) ships silently and can break lazy-chunking or cause TDZ bugs. |
| P2 | Persistence/IO scattered in shell components instead of store slices. | `docs/architecture-review.md:142-144` (`EdgeCasesPanelBody`, `vimProgress`, `mobileSession`, `AssembleModes` read/write storage) | Store is meant to own persistence (`FORBIDDEN` places `store` below `shell`); IO in components breaks that model and duplicates logic. |
| P2 | No documented, testable statement of the layer contract beyond a script comment. `docs/architecture.md` describes product domains, not the enforced layer graph. | `docs/architecture.md:1-83` (domains, not the `FORBIDDEN` graph) | New contributors/agents learn the rules only by reading the script or failing CI. |

## 4. The world-class bar

For *this* aspect — a layered SPA with a plugin system — world-class means:

1. **Layering is law, enforced by standard tooling.** ESLint flat config with `eslint-plugin-import`'s `import/no-restricted-paths` (or `eslint-plugin-boundaries`) encoding the exact `FORBIDDEN` graph from `check-boundaries.mjs:33-42`, run in the same `check:all` gate and (ideally) a pre-commit hook. The bespoke script stays as a belt-and-suspenders check but ESLint gives per-line, editor-time feedback and catches intra-layer issues the script can't. Reference: the Nx / Turborepo `enforce-module-boundaries` pattern, and `eslint-plugin-boundaries`' element-type rules.
2. **Sub-domain isolation, not just layer isolation.** `shell/home`, `shell/browse`, `shell/mobile`, `shell/canvas`, `shell/study`, `shell/games` should not reach into each other's internals. World-class projects treat these as *features* with public barrels (`index.ts`) and forbid deep imports across features (the "package-by-feature + public API" pattern; see `eslint-plugin-boundaries` `element-types` + `no-private`).
3. **No God-components.** Every module under ~300 LOC with render / logic / IO separated, each split guarded by characterization tests before the cut (the pattern `canvasFrame.test.ts` already demonstrates). Contexts are narrow and sliced (like Zustand/Jotai selectors or split React contexts), never a 100-field value.
4. **Cycle-free by construction.** A `madge --circular src/` (or ESLint `import/no-cycle`) check in CI, at zero.
5. **The contract is documented once and generated.** A single source-of-truth layer graph (already in the script) rendered into `docs/architecture.md` so humans and agents read the same rules the machine enforces.

## 5. Roadmap (ordered milestones)

### Milestone A — ESLint firewall parity (the #1 lever)
Goal: encode the existing layer graph as ESLint rules so enforcement is standard, per-line, and editor-visible.
- [ ] Add `frontend/eslint.config.js` (flat config) + install `eslint`, `typescript-eslint`, `eslint-plugin-import` — files: `frontend/package.json`, `frontend/eslint.config.js` — acceptance: `npx eslint src` runs clean on current tree — effort: M
- [ ] Encode `import/no-restricted-paths` zones mirroring `check-boundaries.mjs:33-42` `FORBIDDEN` — files: `frontend/eslint.config.js` — acceptance: a deliberate `plugins→shell` import fails lint; reverting passes — effort: M
- [ ] Wire `check:lint` into `check:all` and CI — files: `frontend/package.json`, `.github/workflows/ci.yml` — acceptance: CI runs lint; green on current tree — effort: S
- [ ] Add `import/no-cycle` and confirm zero cycles — files: `frontend/eslint.config.js` — acceptance: `npx eslint src` reports no `import/no-cycle` errors — effort: S

### Milestone B — Finish the shared UI leaf (`@/design/components`)
Goal: move genuinely-shared primitives out of `shell/canvas` so `shell/home|browse|mobile` stop reaching into canvas.
- [ ] Create `@/design/components` (or extend `@/components`) with `Chip`, `Meter`, `Pill` re-exported from a barrel — files: `frontend/src/design/components/index.ts` (new), `shell/canvas/ui/nodeui.tsx` — acceptance: `nodeui.tsx` re-exports from the leaf; no logic duplicated — effort: M
- [ ] Repoint the 6 upward importers to the leaf — files: `shell/home/LandingPage.tsx`, `shell/browse/{ProblemGrid,TrackGrid,CategoryGrid}.tsx`, `shell/mobile/{MobileBrowse,MobileVizShell}.tsx` — acceptance: none import `@/shell/canvas/ui/nodeui` for `Chip/Meter/Pill` — effort: M
- [ ] Add an ESLint zone forbidding cross-feature deep imports under `shell/*` — files: `frontend/eslint.config.js` — acceptance: a `shell/home` → `shell/canvas/ui/*` import fails lint — effort: M

### Milestone C — Enforce sub-domain (feature) boundaries in shell
Goal: make each `shell/<feature>` a package with a public barrel; forbid deep cross-feature imports.
- [ ] Ensure each `shell/<feature>` has an `index.ts` barrel exposing its public surface — files: `shell/{home,browse,mobile,study,games,vim}/index.ts` — acceptance: cross-feature imports resolve only through barrels — effort: L
- [ ] Add `eslint-plugin-boundaries` `element-types` config classifying `shell/*` features and forbidding private-path imports — files: `frontend/eslint.config.js`, `frontend/package.json` — acceptance: lint fails on a deep cross-feature import; passes through a barrel — effort: M

### Milestone D — Decompose remaining God-components (behind characterization tests)
Goal: bring `CanvasStage`, `nodeui`, `layout.ts`, `CodeStudioProvider` toward < 300 LOC with clear separation.
- [ ] Split `layout.ts` into `layoutPresets/layoutWiring/layoutAlgorithms/edgeStyles` behind a barrel — files: `shell/canvas/layout/*` — acceptance: `layout.ts` becomes a barrel; existing importers unchanged; tests green — effort: M
- [ ] Extract `useCanvasLifecycle` from `CanvasStage` residual effects — files: `shell/canvas/CanvasStage.tsx`, `shell/canvas/useCanvasLifecycle.ts` (new) — acceptance: CanvasStage drops below ~700 LOC; `canvasFrame.test.ts` + new lifecycle tests green — effort: L
- [ ] Slice `CodeStudioProvider` into focused contexts (Phase / Draft / UI-toggles) — files: `shell/study/CodeStudio.tsx` — acceptance: no single context value exceeds ~30 fields; consumers subscribe to a slice — effort: L

### Milestone E — Cycle & contract hygiene
Goal: make the layer contract self-documenting and cycle-free forever.
- [ ] Render the `FORBIDDEN` graph into `docs/architecture.md` as the canonical layer diagram — files: `docs/architecture.md` — acceptance: doc graph matches `check-boundaries.mjs:33-42` — effort: S
- [ ] Add `madge --circular` (or keep `import/no-cycle`) to CI as a hard gate — files: `.github/workflows/ci.yml`, `frontend/package.json` — acceptance: CI fails on any new cycle — effort: S

## 6. Execution-ready backlog

Pick ONE at a time. Every task must leave `cd frontend && npm run check:all && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run` green.

1. **Add ESLint flat config skeleton.**
   - Goal: introduce ESLint with typescript-eslint, no rules failing yet.
   - Files: `frontend/package.json` (devDeps + `check:lint` script `eslint src`), `frontend/eslint.config.js` (new).
   - Approach: install `eslint typescript-eslint eslint-plugin-import`. Flat config: `tseslint.config(...)` with `files: ['src/**/*.{ts,tsx}']`, `ignores` for `**/*.generated.*`, `**/_generated/**`, `scripts/**`. Start with recommended rules but set anything noisy to `warn`.
   - Acceptance test: `cd frontend && npx eslint src` exits 0.
   - Verify: `cd frontend && npx eslint src && echo LINT_OK`

2. **Encode layer boundaries in ESLint.**
   - Goal: mirror `check-boundaries.mjs:33-42` as `import/no-restricted-paths` zones.
   - Files: `frontend/eslint.config.js`.
   - Approach: add `import/no-restricted-paths` with `zones` for each `FORBIDDEN` edge, e.g. `{ target: './src/lib', from: ['./src/store','./src/plugins','./src/shell'] }`, one per line of the `FORBIDDEN` map. Mirror the `ACCEPTED` exemptions (`check-boundaries.mjs:50-55`) via `except`.
   - Acceptance test: temporarily add `import '@/shell/Workspace'` to a `lib/` file → `eslint` fails; remove it → passes.
   - Verify: `cd frontend && npx eslint src && echo BOUNDARIES_OK`

3. **Wire lint into check:all and CI.**
   - Goal: make lint a merge gate.
   - Files: `frontend/package.json` (`check:all` appends `&& npm run check:lint`), `.github/workflows/ci.yml` (add `- run: npm run check:lint` in the `frontend` job before `build`).
   - Approach: append, don't reorder existing steps.
   - Acceptance test: `npm run check:all` runs lint as its last step and passes.
   - Verify: `cd frontend && npm run check:all`

4. **Add cycle detection.**
   - Goal: fail on import cycles.
   - Files: `frontend/eslint.config.js`.
   - Approach: enable `import/no-cycle` (`{ maxDepth: Infinity }`) for `src/**`. If pre-existing cycles surface, fix them one file at a time (usually by moving a shared type/const to a lower leaf); do NOT disable the rule to make it pass.
   - Acceptance test: `npx eslint src` reports zero `import/no-cycle`.
   - Verify: `cd frontend && npx eslint src && echo NOCYCLE_OK`

5. **Create the `@/design/components` barrel.**
   - Goal: give shared primitives a home in the design leaf.
   - Files: `frontend/src/design/components/index.ts` (new).
   - Approach: MOVE the `Chip`, `Meter`, `Pill` implementations out of `shell/canvas/ui/nodeui.tsx` into `design/components/`. These primitives must import ONLY from `@/design/*` (they're low in the graph). Then have `nodeui.tsx` re-export them from the leaf so its 60+ existing importers don't churn.
   - Acceptance test: `grep -rln 'export.*\b\(Chip\|Meter\|Pill\)\b' src/design/components/index.ts` matches; `nodeui.tsx` no longer *defines* them.
   - Verify: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run`

6. **Repoint shell importers to the design leaf.**
   - Goal: stop `shell/home|browse|mobile` from importing canvas internals for primitives.
   - Files: `shell/home/LandingPage.tsx`, `shell/browse/ProblemGrid.tsx`, `shell/browse/TrackGrid.tsx`, `shell/browse/CategoryGrid.tsx`, `shell/mobile/MobileBrowse.tsx`, `shell/mobile/MobileVizShell.tsx`.
   - Approach: change `import { Chip, Meter, Pill } from '@/shell/canvas/ui/nodeui'` (or relative form) to `from '@/design/components'`. Leave other nodeui imports (canvas-specific) alone.
   - Acceptance test: `grep -rn "canvas/ui/nodeui" src/shell/home src/shell/browse src/shell/mobile` returns nothing for `Chip/Meter/Pill`.
   - Verify: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run`

7. **Add ESLint zone forbidding cross-feature deep imports in shell.**
   - Goal: `shell/<A>` cannot import `shell/<B>/**` internals.
   - Files: `frontend/eslint.config.js`.
   - Approach: use `import/no-restricted-paths` zones, one per feature, e.g. `{ target: './src/shell/home', from: './src/shell/canvas', except: ['./index.ts'] }` — OR adopt `eslint-plugin-boundaries` element-types (see task 12). Start narrow: forbid `home|browse|mobile` → `canvas` deep paths (allow the `canvas/index.ts` barrel).
   - Acceptance test: adding a deep `shell/home` → `shell/canvas/ui/foo` import fails lint.
   - Verify: `cd frontend && npx eslint src && echo FEATURE_OK`

8. **Split `layout.ts` behind a barrel.**
   - Goal: separate presets/wiring/algorithms/edge-styles (#78).
   - Files: `shell/canvas/layout/layout.ts` → new siblings `layoutPresets.ts`, `layoutWiring.ts`, `layoutAlgorithms.ts`, `edgeStyles.ts`; `layout.ts` becomes a re-export barrel.
   - Approach: cut by responsibility, keep every export name identical, re-export all from `layout.ts` so importers don't change. No behavior change.
   - Acceptance test: importers of `@/shell/canvas/layout/layout` still resolve; each new file < 250 LOC.
   - Verify: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run`

9. **Write characterization tests for CanvasStage lifecycle before touching it.**
   - Goal: lock current effect behavior (history/persistence/refit) before extraction.
   - Files: `shell/canvas/CanvasStage.lifecycle.test.tsx` (new).
   - Approach: model after `shell/canvas/canvasFrame.test.ts`. Render CanvasStage with a fake plugin, assert observable outcomes (persistence writes, refit on resize, history push). Do not refactor yet.
   - Acceptance test: new tests pass against current code.
   - Verify: `cd frontend && node_modules/.bin/vitest run src/shell/canvas/CanvasStage.lifecycle.test.tsx`

10. **Extract `useCanvasLifecycle` from CanvasStage.**
    - Goal: pull the residual effects into a hook (depends on task 9).
    - Files: `shell/canvas/useCanvasLifecycle.ts` (new), `shell/canvas/CanvasStage.tsx`.
    - Approach: move the effect bodies + their refs into the hook; CanvasStage calls `useCanvasLifecycle(...)`. Keep the same execution order.
    - Acceptance test: task-9 tests + `canvasFrame.test.ts` stay green; CanvasStage LOC drops below ~700.
    - Verify: `cd frontend && node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit -p tsconfig.json`

11. **Slice `CodeStudioProvider` context value.**
    - Goal: replace the ~107-field single context with focused contexts (#33).
    - Files: `shell/study/CodeStudio.tsx` and its consumers.
    - Approach: group fields into Phase / Draft / UI-toggles contexts; provide `usePhase()/useDraft()/useStudioUi()` hooks; keep a thin compat `useCodeStudio()` if too many call sites. Do this incrementally — one slice per commit.
    - Acceptance test: no single context value exceeds ~30 fields; all `useCodeStudio` consumers still typecheck.
    - Verify: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/vitest run`

12. **(Optional, stronger) Adopt `eslint-plugin-boundaries` element-types.**
    - Goal: replace hand-written zones with declarative element-type rules for both layers and shell features.
    - Files: `frontend/package.json`, `frontend/eslint.config.js`.
    - Approach: classify elements by path (`design`, `lib`, `core`, `content`, `components`, `effects`, `store`, `plugins`, `shell`, and `shell/*` features); set `allowed`/`disallowed` mirroring `FORBIDDEN`; enable `no-private` for feature barrels.
    - Acceptance test: layer + feature violations both fail lint; current tree passes.
    - Verify: `cd frontend && npx eslint src && npm run check:boundaries`

13. **Document the canonical layer graph in `docs/architecture.md`.**
    - Goal: one source of truth humans and agents read.
    - Files: `docs/architecture.md`.
    - Approach: add a "Layer dependency graph" section reproducing the `FORBIDDEN`/allowed edges from `check-boundaries.mjs:6-16,33-42`, and link this roadmap file.
    - Acceptance test: the doc graph matches the script (manual diff).
    - Verify: `cd frontend && npm run check:boundaries` (still the enforcement of record)

## 7. Definition of done & verification

Run from repo root unless noted. Green output for each:

- **Boundaries (bespoke):** `cd frontend && npm run check:boundaries` → `✓ module boundaries clean (0 tracked, shrinking)`.
- **Lint (new):** `cd frontend && npx eslint src` → exits 0, no errors (once Milestone A lands).
- **Typecheck:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/tsc --noEmit -p tsconfig.node.json` → no output, exit 0.
- **Unit tests:** `cd frontend && node_modules/.bin/vitest run` → all pass (baseline ~3585 tests green; `docs/architecture-review.md:241` cites 3447 at review time — expect ≥ that).
- **Full guardrail suite:** `cd frontend && npm run check:all` → each sub-check prints its ✓ (boundaries, tokens, plugin-meta, content-sql, simulators, quiz-labels), plus the new `check:lint`.
- **Prod build:** `cd frontend && node_modules/.bin/vite build` → completes, no chunk errors.
- **Backend unaffected:** `export PATH="$HOME/.homebrew/bin:$PATH"; cd backend && go build ./... && go vet ./...` → clean (this roadmap is frontend-only; run to prove no collateral).

A milestone is DONE when: its tasks' acceptance tests pass, `npm run check:all` is green, and — for any God-component split — the characterization tests written *before* the cut still pass unchanged.

## 8. Reference pointers

**Key files in scope**
- `frontend/scripts/check-boundaries.mjs` — the layer firewall; `FORBIDDEN` map (`:33-42`), `ACCEPTED` (`:50-55`), `KNOWN_VIOLATIONS` (`:64`).
- `frontend/tsconfig.json` / `frontend/vite.config.ts` — the single `@/*` alias.
- `frontend/package.json` — `check:all`, `check:boundaries`, test scripts.
- `.github/workflows/ci.yml` — the merge gate.
- `docs/architecture.md` — product-domain overview + layer intent.
- `docs/architecture-review.md` — the 8-tranche remediation; Theme A (`:54-73`, boundaries), Theme B (`:75-88`, design/components), Theme C (`:90-102`, God-components), execution progress log (`:238-292`).
- Layer roots: `frontend/src/{design,lib,core,content,components,effects,store,plugins,shell}`.
- Prior-art in-repo pattern to reuse: `shell/canvas/canvasFrame.ts` + `canvasFrame.test.ts` (characterization-test-first extraction); `shell/workspace/` (already-decomposed God-component: `ModeRouter`, `useWorkspaceKeyboard`, `useWorkspaceRuntime`).

**Related roadmap docs** (in `docs/roadmap/`)
- Design-system / tokens / typography roadmap — owns the `@/design` leaf that Milestone B feeds into.
- Cross-cutting testing/CI/tooling roadmap — owns the ESLint + pre-commit + coverage story that Milestone A begins.
- Canvas & collab roadmap — consumes the CanvasStage decomposition (Milestone D).

**External references / prior art**
- `eslint-plugin-import` — `import/no-restricted-paths`, `import/no-cycle` (the standard way to encode layer direction + cycle bans).
- `eslint-plugin-boundaries` — element-type + `no-private` rules for feature-package isolation (Milestone C/task 12).
- Nx `@nx/enforce-module-boundaries` — the canonical "tags + allowed constraints" model this roadmap mirrors.
- `madge --circular` — dependency-graph cycle detection as a CI gate.
