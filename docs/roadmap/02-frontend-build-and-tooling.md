# Frontend Build & Tooling

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

The frontend lives in `frontend/` and builds with **Vite 5** (`frontend/vite.config.ts`) + **React 18** via `@vitejs/plugin-react`. Package manifest: `frontend/package.json`.

- **Vite config** (`frontend/vite.config.ts`): single `@` → `./src` alias; a sophisticated hand-written `manualChunks(id)` that splits `react`/`react-dom` and `@xyflow` into cached vendor chunks and buckets the ~400 problem simulators into named lazy chunks by first-letter (`alphaBucket`: `a-f`/`g-l`/`m-r`/`s-z`) for `plugins/imported/simulators`, `plugins/imported/prepSimulators`, plus per-topic `plugins-go-topic-*` chunks. `chunkSizeWarningLimit: 1900` (KB). Dev server batches rapid saves via `watch.awaitWriteFinish` (line 25-30) — a deliberate codemod-friendly HMR tweak.
- **TypeScript**: two configs. `frontend/tsconfig.json` is `strict: true` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch`, `moduleResolution: bundler`, `@/*` path alias. `frontend/tsconfig.node.json` covers only `vite.config.ts`. No project-references / composite build; `typecheck` runs `tsc --noEmit --incremental false` and `build` runs both tsc passes then `vite build` (`package.json` lines 20-22).
- **npm scripts** (`frontend/package.json` lines 18-44): ~25 scripts. Notable: `check:all` chains 8 guardrail checks (`check:boundaries`, `check-simulators`, `check-prep-sim-coverage`, `check-plugin-typography`, `check:tokens`, `check:quiz-labels`, `check-plugin-meta`, `check-content-sql`); `test` = `vitest run && check-orphans`. Generators: `new-problem`, `new-effect`, `import-prep`, `import-problems`, `scaffold-prep-sim`, `generate-themes`, `draft-quiz-from-frames`.
- **vite-node generators**: `build-plugin-meta`, `check-plugin-meta`, `export-content-sql`, `check-content-sql` run `.mts` scripts under `vite-node` (`scripts/build-plugin-meta.mts`, `scripts/export-content-sql.mts`). These load real `src/` TS (resolving `@/` aliases) to emit `src/plugins/_generated/pluginMeta.ts` + `courses.ts` and `db/content_seed.sql`.
- **Custom guardrail scripts** (`frontend/scripts/`): `check-boundaries.mjs` is a zero-dependency module-boundary firewall (parses every import under `src/`, enforces downward-only layering, `KNOWN_VIOLATIONS` is **empty** — zero tracked debt). Plus `check-tokens.mjs`, `lint-plugin-typography.mjs`, `check-simulators.mjs`, `check-prep-simulator-coverage.mjs`, `check-orphans.mjs`, `check-mobile-decks.mjs`.
- **CI** (`.github/workflows/ci.yml`): frontend job runs `npm ci && npm test && npm run typecheck && npm run check:all && npm run check-mobile-decks && npm run build` on Node 20; backend job runs `go vet && go test && go build`. `release.yml` is a manual `workflow_dispatch` GitHub-release tagger.
- **Root**: `Makefile` proxies `npm --prefix frontend` (`install`/`dev`/`build`/`typecheck`/`check`); `scripts/migrate-db.sh` is the only root script.

**Missing entirely** (verified — no matching files): **no ESLint** (no `.eslintrc*`, no `eslint.config.*`), **no Prettier** (no `.prettierrc*`, no `prettier.config.*`), **no `vitest.config.ts`** (config inherited implicitly from `vite.config.ts`), **no `vitest.setup.*`**, **no `.editorconfig`**, **no pre-commit/pre-push hook** (`.git/hooks` has only `*.sample` files; no husky/lint-staged in deps). **Dependency hygiene bug**: `vite-node` is invoked by 4 npm scripts but is **not declared** in `package.json` — it only resolves as a transitive dep of `vitest` (confirmed `dev: true` in `package-lock.json`). If vitest ever drops it or is deduped, `build-plugin-meta`/`export-content-sql` silently break.

**Maturity: Solid.** Strict TS, a genuinely production-grade chunking strategy, a custom boundary firewall at zero debt, and comprehensive CI parity checks — but no ESLint, no Prettier, no explicit vitest config, no pre-commit hook, and an undeclared `vite-node` dependency keep it below world-class.

## 2. Strengths to preserve

- **Chunking strategy is real engineering** — `manualChunks` (`vite.config.ts:41-66`) keeps the 400-problem catalog out of the initial payload via alpha-bucketed lazy chunks. Do not naively replace with a plugin that undoes this.
- **Strict TypeScript** — `strict` + `noUnused*` + `noFallthroughCasesInSwitch` already catch a large class of bugs ESLint would otherwise be relied on for.
- **`check-boundaries.mjs` firewall at zero debt** — the ratchet (`KNOWN_VIOLATIONS` empty, stale entries also fail) is the crown jewel; any ESLint work must not regress it.
- **CI parity via `check:all`** — one command reproduces the CI gate locally (`Makefile` `check` target mirrors `ci.yml` exactly).
- **vite-node generators resolve real `@/` source** — `build-plugin-meta.mts` / `export-content-sql.mts` avoid a parallel type system; generated files are guarded by `--check` variants in `check:all`.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence | Impact |
|---|---|---|---|
| P1 | No ESLint at all | No `eslint.config.*` / `.eslintrc*`; `package.json` devDeps have no eslint | 1-line defects (unused vars in JSX, floating promises, `no-restricted-imports`, hooks-deps, dead exports) land unblocked; only `tsc` + custom scripts catch anything |
| P1 | `vite-node` undeclared dependency | `package.json:36-39` call `vite-node`; it is absent from deps, present only transitively (`package-lock.json` `node_modules/vite-node`, `dev:true`) | `build-plugin-meta` / `export-content-sql` break on any vitest upgrade/dedupe that drops vite-node; `check-plugin-meta`/`check-content-sql` (in `check:all`) fail in CI without a code change |
| P1 | No pre-commit / pre-push hook | `.git/hooks` contains only `*.sample`; no husky/lint-staged in `package.json` | Boundary/token/type regressions only surface in CI, not before push; slow feedback loop |
| P2 | No Prettier / no `.editorconfig` | No `.prettierrc*`, no `.editorconfig` | Whitespace/import-order/line-length drift across 172K LOC; diffs noisy; generated-file BANNERs are the only formatting discipline |
| P2 | No explicit `vitest.config.ts` / setup file | No `vitest.config.*`, no `vitest.setup.*`; 91 test files run on inferred defaults | No coverage thresholds, no shared jsdom/setup shim, no reporters; test-env changes require ad-hoc debugging |
| P2 | Boundary firewall is a bespoke script, not lint-integrated | `scripts/check-boundaries.mjs` reimplements what `eslint-plugin-boundaries` / `import/no-restricted-paths` do | Rules live outside the editor; contributors get no inline feedback; duplicated maintenance if ESLint is later added |
| P2 | No bundle-composition analysis | `vite.config.ts` sets `chunkSizeWarningLimit` but no `rollup-plugin-visualizer`; no size budget in CI | Largest chunks (Excalidraw/Mermaid) unquantified; bundle regressions invisible until users feel them |
| P2 | Two disjoint tsconfigs, no incremental project build | `tsconfig.json` + `tsconfig.node.json`; `typecheck` forces `--incremental false` | Full type-check on every run; no `--build` project graph; slower CI typecheck than necessary |
| P2 | `check:all` is a serial `&&` chain | `package.json:41` | One slow check blocks the rest; no parallelism; ~8 sequential Node/vite-node cold starts |

## 4. The world-class bar

For a Vite + TS SPA of this size, "world-class build & tooling" means:

1. **One fast feedback loop before code lands.** ESLint (flat config, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `jsx-a11y`) + Prettier + the boundary rules, all runnable in seconds and wired into a **pre-commit hook** via **husky + lint-staged** (only staged files) and re-verified in CI. Emulate the Vite/Vitest monorepos themselves and the `eslint.config.js` flat-config convention.
2. **Layering enforced by the linter, not just a script.** Port `check-boundaries.mjs`'s FORBIDDEN matrix into `eslint-plugin-boundaries` or `import/no-restricted-paths` so violations show inline in-editor. Keep the standalone script as the CI ratchet until parity is proven, then retire one.
3. **Explicit, budgeted bundles.** `rollup-plugin-visualizer` output on every `build`, a `size-limit` / bundle-budget check in CI that fails on regression beyond a threshold, and a documented rationale for the `manualChunks` buckets.
4. **First-class test config.** A real `vitest.config.ts` with `environment: 'jsdom'` (or happy-dom), `setupFiles`, `globals`, and coverage thresholds (`lines`/`branches`) enforced in CI (v8 provider).
5. **Zero dependency drift.** Every binary a script invokes is a declared devDep; `npm ci` in CI guarantees the lockfile is honored; ideally a `depcheck`/`knip` pass flags unused and undeclared deps.
6. **Incremental, cacheable typecheck** via TS project references (`tsconfig.json` `references` → `tsconfig.node.json`) and `tsc --build`, so CI reuses `.tsbuildinfo`.

## 5. Roadmap (ordered milestones)

### M1 — Close the dependency-hygiene hole (highest ROI, lowest risk)
Goal: builds cannot silently break on a transitive-dep change.
- [ ] Declare `vite-node` as an explicit devDependency at the version already resolved — files: `frontend/package.json` — acceptance: `npm ls vite-node` shows it as a direct dep; `npm run check-plugin-meta` still passes — effort: S
- [ ] Add a `depcheck`/`knip` audit script and run it once, fixing any other undeclared/unused deps — files: `frontend/package.json` — acceptance: `npx knip` reports no undeclared binaries used by scripts — effort: S

### M2 — Introduce ESLint (flat config) without regressing the boundary firewall
Goal: catch 1-line defects and hooks-deps issues in-editor and CI.
- [ ] Add `eslint.config.js` (flat) with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `jsx-a11y`; declare the devDeps — files: `frontend/eslint.config.js`, `frontend/package.json` — acceptance: `npx eslint src --max-warnings=0` runs (may need per-rule disables to reach zero) — effort: M
- [ ] Encode the layering matrix from `check-boundaries.mjs` as `import/no-restricted-paths` (or `eslint-plugin-boundaries`) zones — files: `frontend/eslint.config.js` — acceptance: introducing a `plugins → shell` import fails `eslint`; existing tree passes — effort: M
- [ ] Add `lint` + `lint:fix` scripts and wire `lint` into `check:all` and `ci.yml` — files: `frontend/package.json`, `.github/workflows/ci.yml` — acceptance: `npm run check:all` includes lint; CI green — effort: S

### M3 — Prettier + editorconfig + pre-commit hook
Goal: consistent formatting and a fast local gate.
- [ ] Add `.prettierrc`, `.prettierignore` (exclude `src/plugins/_generated`, `db/content_seed.sql`), `.editorconfig`; declare `prettier` — files: repo root + `frontend/` — acceptance: `npx prettier --check src` passes after one format pass — effort: S
- [ ] Add husky + lint-staged; pre-commit runs `eslint --fix` + `prettier --write` on staged files and `check:boundaries` — files: `frontend/package.json`, `.husky/pre-commit` — acceptance: committing a boundary violation is blocked locally — effort: M

### M4 — Explicit test config + coverage
Goal: reproducible test environment and a coverage floor.
- [ ] Add `vitest.config.ts` with `environment`, `globals`, `setupFiles`, `coverage` (v8, thresholds) — files: `frontend/vitest.config.ts`, `frontend/test/setup.ts` — acceptance: `vitest run` still green (baseline 3585 tests); `vitest run --coverage` emits a report — effort: M
- [ ] Wire a `test:coverage` script into CI with modest thresholds — files: `frontend/package.json`, `.github/workflows/ci.yml` — acceptance: CI fails if coverage drops below floor — effort: S

### M5 — Bundle observability & budgets
Goal: bundle regressions are visible and gated.
- [ ] Add `rollup-plugin-visualizer` (build-only, writes `dist/stats.html`) and a `build:analyze` script — files: `frontend/vite.config.ts`, `frontend/package.json` — acceptance: `npm run build:analyze` produces a treemap — effort: S
- [ ] Add a `size-limit` config with per-chunk budgets and a CI check — files: `frontend/.size-limit.json`, `.github/workflows/ci.yml` — acceptance: an artificial +1MB import fails the CI size gate — effort: M

## 6. Execution-ready backlog

> Each task is atomic. A cheaper agent should do ONE, run its Verify command, and stop. All paths are relative to the repo root `/Users/ahmedgmail/Documents/workspace-1/personal/algo-moves`. Run frontend commands from `frontend/`.

### Task 1 — Declare `vite-node` as a devDependency
- **Goal**: Stop `build-plugin-meta`/`export-content-sql` from depending on a transitive-only binary.
- **Files**: `frontend/package.json`.
- **Approach**: Run `cd frontend && cat node_modules/vite-node/package.json | grep version` to get the exact installed version (currently `2.1.8`). Add `"vite-node": "^2.1.8"` to `devDependencies`. Run `npm install` to update the lockfile so it becomes a direct dep.
- **Acceptance test**: `npm ls vite-node` lists it as a top-level dependency (not "extraneous"/deduped-only).
- **Verify**: `cd frontend && npm ls vite-node && node_modules/.bin/vite-node scripts/build-plugin-meta.mts -- --check`

### Task 2 — Add `.editorconfig`
- **Goal**: Baseline whitespace consistency across editors before Prettier lands.
- **Files**: `.editorconfig` (repo root).
- **Approach**: Create `.editorconfig` with `root = true`, `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `insert_final_newline = true`, `trim_trailing_whitespace = true`. Exempt Markdown from trailing-whitespace trimming (`[*.md] trim_trailing_whitespace = false`).
- **Acceptance test**: File exists and parses (no tool needed).
- **Verify**: `test -f .editorconfig && echo OK`

### Task 3 — Add Prettier config + ignore, format once
- **Goal**: Deterministic formatting; exclude generated files.
- **Files**: `frontend/.prettierrc.json`, `frontend/.prettierignore`, `frontend/package.json`.
- **Approach**: Add `prettier` to devDeps (`npm install -D prettier`). Create `.prettierrc.json` (`{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }` — match existing style; inspect a few `src/` files first). `.prettierignore` must include `src/plugins/_generated/`, `dist/`, `../db/content_seed.sql`. Add scripts `"format": "prettier --write src scripts"` and `"format:check": "prettier --check src scripts"`. Do NOT run `--write` across the whole tree in this task if it would create a massive diff — instead run `format:check` and report the count.
- **Acceptance test**: `npm run format:check` runs and lists files needing formatting (a follow-up task applies it).
- **Verify**: `cd frontend && npm run format:check; echo "exit=$?"`

### Task 4 — Scaffold ESLint flat config (no boundary rules yet)
- **Goal**: Baseline lint of TS/React without breaking the build.
- **Files**: `frontend/eslint.config.js`, `frontend/package.json`.
- **Approach**: `npm install -D eslint typescript-eslint eslint-plugin-react-hooks eslint-plugin-import eslint-plugin-jsx-a11y`. Create `eslint.config.js` (flat) that: applies to `src/**/*.{ts,tsx}`, extends `typescript-eslint` recommended (non-type-checked first to keep it fast), enables `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps`, ignores `src/plugins/_generated/**` and test files where noise is high. Start rules lenient (`"warn"`) to avoid a wall of errors. Add script `"lint": "eslint src"`.
- **Acceptance test**: `npm run lint` completes (warnings allowed) with exit 0.
- **Verify**: `cd frontend && npm run lint; echo "exit=$?"`

### Task 5 — Port layering matrix into ESLint `import/no-restricted-paths`
- **Goal**: Enforce Shell→…→design direction in-editor, mirroring `check-boundaries.mjs`.
- **Files**: `frontend/eslint.config.js`.
- **Approach**: Read the `FORBIDDEN` map in `scripts/check-boundaries.mjs:33-42`. Translate each `src/<layer>` → forbidden target layers into `import/no-restricted-paths` `zones` (`target: 'src/lib', from: ['src/store','src/plugins','src/shell']`, etc.). Preserve the two `ACCEPTED` composition-root exemptions (`core/registry.ts → plugins`, `content/index.ts → plugins/_generated/courses`) via `except`. Keep `check-boundaries.mjs` in `check:all` as the CI ratchet — this task ADDS editor coverage, it does not remove the script.
- **Acceptance test**: Temporarily add `import '@/shell/x'` to a file in `src/lib/` → `eslint` errors on it; remove the line → clean.
- **Verify**: `cd frontend && npm run lint && npm run check:boundaries`

### Task 6 — Wire lint into `check:all` and CI
- **Goal**: Lint runs in the same gate as everything else.
- **Files**: `frontend/package.json`, `.github/workflows/ci.yml`.
- **Approach**: Append `&& npm run lint` to the `check:all` chain (`package.json:41`). CI already runs `check:all` (`ci.yml:24`) so no separate CI step is strictly needed — but add an explicit `- run: npm run lint` step before `check:all` for clearer failure attribution.
- **Acceptance test**: `npm run check:all` includes lint output; CI file has the step.
- **Verify**: `cd frontend && npm run check:all`

### Task 7 — Add husky + lint-staged pre-commit hook
- **Goal**: Block boundary/lint/format regressions before push.
- **Files**: `frontend/package.json`, `.husky/pre-commit` (repo root — note git root is repo root, not `frontend/`).
- **Approach**: `cd frontend && npm install -D husky lint-staged`. Because the git root is the repo root but the package is in `frontend/`, configure husky at repo root: `npx husky init` from repo root, then make `.husky/pre-commit` run `cd frontend && npx lint-staged`. Add a `lint-staged` block to `frontend/package.json`: `"*.{ts,tsx}": ["eslint --fix", "prettier --write"]`. Also run `npm --prefix frontend run check:boundaries` in the hook (boundaries are cross-file, not staged-file-scoped).
- **Acceptance test**: Staging a file with a boundary violation and committing fails.
- **Verify**: `git config core.hooksPath; test -f .husky/pre-commit && echo OK`

### Task 8 — Add explicit `vitest.config.ts`
- **Goal**: Pin the test environment; enable a setup file and coverage.
- **Files**: `frontend/vitest.config.ts`, `frontend/test/setup.ts`, `frontend/package.json`.
- **Approach**: Create `vitest.config.ts` that imports the existing `vite.config.ts` resolve/alias config (so `@/` still resolves) and adds a `test` block: `environment: 'jsdom'` (install `jsdom` as devDep if a test needs DOM — check whether current tests already touch `document`; many are pure-logic), `globals: true`, `setupFiles: ['./test/setup.ts']`, `coverage: { provider: 'v8', reporter: ['text','html'] }`. Create an empty `test/setup.ts` (add DOM shims only if tests need them). Ensure `vitest run` still resolves `@/` and passes all tests. Add `"test:coverage": "vitest run --coverage"`.
- **Acceptance test**: Full suite still green (baseline 3585 tests); `test:coverage` produces a report.
- **Verify**: `cd frontend && node_modules/.bin/vitest run`

### Task 9 — Add coverage thresholds + CI step
- **Goal**: Prevent silent coverage erosion.
- **Files**: `frontend/vitest.config.ts`, `.github/workflows/ci.yml`, `frontend/package.json`.
- **Approach**: Run `npm run test:coverage` once to read the current baseline. Set `coverage.thresholds` (`lines`/`functions`/`branches`/`statements`) a few points BELOW current numbers so it passes today but ratchets. Install `@vitest/coverage-v8` devDep. Add a `- run: npm run test:coverage` CI step. Exclude `src/plugins/_generated`, `scripts`, and `*.test.*` from coverage.
- **Acceptance test**: `test:coverage` passes at chosen thresholds; artificially lowering a threshold below actual would fail.
- **Verify**: `cd frontend && npm run test:coverage`

### Task 10 — Add bundle visualizer + `build:analyze`
- **Goal**: Make chunk composition inspectable.
- **Files**: `frontend/vite.config.ts`, `frontend/package.json`.
- **Approach**: `npm install -D rollup-plugin-visualizer`. Add it to `plugins` GATED on an env flag (`process.env.ANALYZE`) so normal `build` is unaffected. Add `"build:analyze": "ANALYZE=1 vite build"` writing `dist/stats.html` (`template: 'treemap'`). Keep the existing `manualChunks` untouched.
- **Acceptance test**: `npm run build:analyze` produces `dist/stats.html`; plain `npm run build` unchanged.
- **Verify**: `cd frontend && npm run build:analyze && test -f dist/stats.html && echo OK`

### Task 11 — Add `size-limit` budgets + CI gate
- **Goal**: Fail CI on unexpected bundle growth.
- **Files**: `frontend/.size-limit.json`, `frontend/package.json`, `.github/workflows/ci.yml`.
- **Approach**: `npm install -D size-limit @size-limit/file`. After a `vite build`, point `.size-limit.json` entries at the main entry chunk and the vendor `react`/`xyflow` chunks in `dist/assets` (globs, since hashes vary), each with a `limit` ~10-15% above current gzipped size. Add `"size": "size-limit"` and a CI step after `build`.
- **Acceptance test**: `npm run size` passes now; adding a large dep would fail.
- **Verify**: `cd frontend && npm run build && npm run size`

### Task 12 — Introduce TS project references for incremental typecheck (optional, measure first)
- **Goal**: Faster CI typecheck via cached `.tsbuildinfo`.
- **Files**: `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/package.json`.
- **Approach**: Add a root `tsconfig` with `references` to `tsconfig.json` (app, needs `composite: true`) and `tsconfig.node.json`. Change `build`/`typecheck` to `tsc --build`. ONLY pursue if a timing measurement shows the current full `tsc --noEmit` is a meaningful CI cost — otherwise skip and document why. This is the highest-risk task; do it last.
- **Acceptance test**: `tsc --build` produces the same error set as the two-pass `tsc --noEmit`.
- **Verify**: `cd frontend && node_modules/.bin/tsc --build --dry`

## 7. Definition of done & verification

Run all from `/Users/ahmedgmail/Documents/workspace-1/personal/algo-moves`.

```bash
# 1. Frontend typecheck — expect NO output, exit 0
cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/tsc --noEmit -p tsconfig.node.json

# 2. Lint (after M2) — expect "0 problems" or exit 0
cd frontend && npm run lint

# 3. Format check (after M3) — expect "All matched files use Prettier code style!"
cd frontend && npm run format:check

# 4. Full guardrail gate — expect each check to print its ✓ line, exit 0
cd frontend && npm run check:all
#   includes: check:boundaries (prints "✓ module boundaries clean (0 tracked, shrinking)")

# 5. Unit tests — expect "Test Files N passed", baseline ~3585 tests, exit 0
cd frontend && node_modules/.bin/vitest run

# 6. Coverage (after M4) — expect thresholds met, exit 0
cd frontend && npm run test:coverage

# 7. Prod build — expect "✓ built in Ns", no chunk-size error above 1900 KB
cd frontend && node_modules/.bin/vite build

# 8. Dependency hygiene — vite-node listed as a DIRECT dep, not extraneous
cd frontend && npm ls vite-node
```

Green = every command exits 0, `check:boundaries` reports **0 tracked** violations, vitest count has not dropped below the 3585 baseline, and `vite build` completes without emitting a chunk-size warning above the 1900 KB limit.

## 8. Reference pointers

**Key files in scope**
- `frontend/vite.config.ts` — build + `manualChunks` chunking (lines 41-66) + dev-server HMR batching (25-30).
- `frontend/package.json` — scripts (18-44), deps (45-81); `vite-node` used at 36-39 but undeclared.
- `frontend/tsconfig.json` / `frontend/tsconfig.node.json` — strict compiler config.
- `frontend/scripts/check-boundaries.mjs` — the layering firewall (FORBIDDEN matrix 33-42, ACCEPTED exemptions 50-55, empty KNOWN_VIOLATIONS 64).
- `frontend/scripts/build-plugin-meta.mts`, `frontend/scripts/export-content-sql.mts` — vite-node generators.
- `.github/workflows/ci.yml` — CI gate (frontend steps 21-26).
- `Makefile` — `check` target mirrors CI (26-31).

**Related roadmap docs** (`docs/roadmap/`)
- The plugin-architecture / module-boundary story overlaps this doc — see the frontend-architecture roadmap for the God-component decomposition backlog that ESLint boundary rules complement.
- The cross-cutting testing/observability roadmap for E2E (Playwright) and Lighthouse-CI, which extend M4/M5 here.

**Prior art to emulate**
- `typescript-eslint` flat-config guide (`typescript-eslint.io/getting-started`) — canonical `eslint.config.js` for TS + React.
- `eslint-plugin-boundaries` / `import/no-restricted-paths` — declarative layer enforcement to replace the bespoke firewall.
- `rollup-plugin-visualizer` + `size-limit` — the standard Vite bundle-budget pairing.
- husky + lint-staged — the de-facto staged-files pre-commit pattern for JS/TS repos.
