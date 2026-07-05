# Content Authoring Workflow

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

Algo-moves authors learning content in TypeScript (the source of truth) and mirrors it into Postgres via a deterministic seed. New content is created by a small family of Node scaffolding scripts under `frontend/scripts/`, validated by `check-*` scripts wired into `npm run check:all`, and exported to SQL by `export-content-sql.mts`. The pipeline works end-to-end but the scaffold templates emit near-boilerplate, validation is structural (existence, not quality), and the seed→apply loop is manual.

**Scaffolding scripts (verified):**
- `frontend/scripts/new-problem.mjs` — scaffolds a curated `ProblemPlugin` into `src/plugins/<id>/{index.tsx,practice.ts,cases.ts}` from a kebab-id + title, validates the id (`/^[a-z][a-z0-9-]*$/`), refuses to overwrite, supports `--dry-run`, and prints two manual registration steps (add to `src/plugins/index.ts`, add an item to `src/content/courses.ts`). It does **not** perform those two edits itself (`new-problem.mjs:168-173`).
- `frontend/scripts/new-effect.mjs` — scaffolds an `EffectPlugin` into `src/effects/custom/<id>.ts`. The template calls `defineEffect` with `meta/defaultData/transformFrames/traceSnippet` (`new-effect.mjs:33-38`). Note: the survey flagged this as stale referencing a dropped `EffectPlugin.Panel`; the current file does **not** emit a `Panel` field, so that specific claim is already fixed — but it still prints a manual `src/effects/registry.ts` registration step (`new-effect.mjs:57`).
- `frontend/scripts/scaffold-prep-simulator.mjs` — reads `src/plugins/imported/prepManifest.ts` (`PREP_DATA` array), finds the entry by id/slug, and writes a stub `prepSimulators/problems/<slug>.tsx` with a two-frame `INIT`/`DONE` `record()` and an `op=`/`done=` inspector (`scaffold-prep-simulator.mjs:48-116`). This stub is the root of the P0 "271 prep stubs" problem in `05-content-catalog`.
- `frontend/scripts/draft-quiz-from-frames.mjs` — prints a **starter JSON** of 3 draft quiz questions from manifest meta (title/pattern/time/space). Explicitly "not wired to production" (`draft-quiz-from-frames.mjs:2`); placeholders like "Fill from INIT/DONE captions" require human editing (`draft-quiz-from-frames.mjs:57`).
- `frontend/scripts/import-prep.mjs`, `import-problems.mjs` — bulk importers (not in primary scope; referenced by `05-content-catalog`).

**Validation scripts (verified, wired into `check:all` in `frontend/package.json`):**
- `check-simulators.mjs` — bans hardcoded font sizes (`text-[10..15px]`) in simulator `.tsx` (`check-simulators.mjs:12`).
- `check-prep-simulator-coverage.mjs` — fails if any `PREP_DATA` id lacks a `manifestId`-matching simulator file (`check-prep-simulator-coverage.mjs:28`). Coverage only — no quality check.
- `check-orphans.mjs` — walks the import graph from `src/main.tsx` and flags unreachable modules + plugin folders not registered in `plugins/index.ts` (`check-orphans.mjs`). Run by `npm test`, **not** `check:all`.
- `check-plugin-meta` / `build-plugin-meta.mts` — regenerates `src/plugins/_generated/{pluginMeta.ts,courses.ts}` and `--check` guards drift.
- `check-content-sql` / `export-content-sql.mts` — regenerates `db/content_seed.sql` (truncate+reload transaction) and `--check` guards drift.
- `check:quiz-labels` — runs `src/lib/quizChoiceFormat.test.ts` + `src/plugins/integrity.test.ts`.

**Existing integrity coverage (`frontend/src/plugins/integrity.test.ts`, verified):** validates every catalog `pluginId` resolves in the registry (`integrity.test.ts:50,56`), every plugin has a generated meta entry and no meta is orphaned (`:69,86`), wires endpoints exist, quiz/practice tabs present, simulators resolve, `board-area` usage, and quiz label quality. It does **not** validate the `prereqs` DAG (`ItemDef.prereqs` at `content/types.ts:27`), detect stub/low-value `record()` output, or verify a scaffolded file compiles + registers.

**Seed loop (verified):** TS catalog → `npm run export-content-sql` → `db/content_seed.sql` → `make content-seed` (which runs the export then, per `Makefile:52-53`, is meant to apply it) → `psql "$DATABASE_URL" -f db/content_seed.sql`. There is no deploy-time auto-apply of the content seed.

**Maturity: Functional.** The pipeline is complete and guarded against drift, but authoring is code-only, scaffolds emit stubs rather than working content, validation checks existence not quality, registration is manual (two error-prone hand edits), and there is no preview/test harness for a single new item.

## 2. Strengths to preserve

- **TypeScript is the single source of truth; SQL is a derived artifact.** `export-content-sql.mts` is deterministic and drift-guarded (`check-content-sql`). Never hand-edit `db/content_seed.sql`. Preserve this generated-downstream pattern for anything new.
- **Drift guards are first-class.** `build-plugin-meta.mts` and `export-content-sql.mts` both support `--check` and are wired into `check:all`. Any new generated artifact MUST follow the same `--check` convention.
- **Consistent id discipline.** All scaffolders validate `/^[a-z][a-z0-9-]*$/` and refuse to overwrite existing files. Keep this.
- **Clean plugin contract.** `definePlugin` + `wireTeachingStack` (`src/plugins/_shared/pluginKit.ts`) standardize record/View/Inspector/quiz/tabs so a scaffold only needs to fill the algorithm-specific parts.
- **Existing integrity suite is the right home** for new validation — extend `integrity.test.ts` rather than adding parallel scripts where possible.
- **`--dry-run` on `new-problem`/`new-effect`.** Preserve and extend to every scaffolder so agents can preview before writing.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence | Impact |
|---|---|---|---|
| P0 | Scaffolds emit stubs, not working content — `new-problem` template's `record()` just visits indices; `scaffold-prep-simulator` emits a 2-frame `INIT`/`DONE` with `op=init`. Coverage checks pass on stubs. | `new-problem.mjs:46-57`, `scaffold-prep-simulator.mjs:62-77`, `check-prep-simulator-coverage.mjs` | 271 prep problems are boilerplate (see `05-content-catalog` P0); "coverage: ok" is misleading — no signal that content is actually taught. |
| P1 | Registration is two manual hand-edits — scaffolders print but don't apply the `plugins/index.ts` + `content/courses.ts` steps. | `new-problem.mjs:168-173`, `new-effect.mjs:57` | A scaffolded plugin compiles but is invisible until a human edits two files; agents forget the second step → orphan folder (only caught by `check-orphans`, which is not in `check:all`). |
| P1 | No content-quality validation — no check that `record()` emits ≥N meaningful frames, that captions aren't placeholder text ("Describe what…", "Fill from…"), or that inputs are small enough to render. | `new-problem.mjs:51`, `draft-quiz-from-frames.mjs:57`, `integrity.test.ts` (absent) | Placeholder captions and 2-frame stubs ship silently; the catalog looks complete but teaches nothing. |
| P1 | Prereq DAG unvalidated — `ItemDef.prereqs` exists and is exported to SQL (`arr(it.prereqs)`) but nothing validates prereq ids exist or that the graph is acyclic. | `content/types.ts:27`, `export-content-sql.mts:141,192`, `integrity.test.ts` (no cycle test) | A typo'd or cyclic prereq corrupts learning-path ordering and the seeded `items.prereqs` column with no error. |
| P1 | `check-orphans` not in `check:all` — orphan plugin folders (scaffolded but unregistered) only fail under `npm test`. | `frontend/package.json` `check:all` line omits `check-orphans` | An agent that scaffolds and forgets to register produces a dead folder that passes `check:all` and CI's fast gate. |
| P1 | Seed apply is manual, not deploy-time — `make content-seed` regenerates + applies locally, but production deploy has no `RUN_CONTENT_SEED` equivalent (migrations have `RUN_MIGRATIONS`). | `Makefile:52-53`, `export-content-sql.mts:8-13` | Frontend catalog can ship while Postgres content lags; `/api/content` serves stale data until someone remembers to seed. |
| P2 | No single-item preview/test harness — to verify a new problem an author must run the whole dev server and click to it. No `npm run preview-problem <id>` that records frames + prints a summary. | (greenfield) | Slow feedback loop; agents can't self-verify a scaffold without a full build. |
| P2 | Quiz authoring is fragmented and un-draftable-in-place — `draft-quiz-from-frames` prints JSON to stdout only; author must copy/paste/edit into `practice.ts`. | `draft-quiz-from-frames.mjs:88` | High-friction quiz authoring; drafts diverge from the plugin they describe. |
| P2 | Scaffold templates duplicate the plugin contract inline — each `new-problem` run re-emits the full `definePlugin`/`wireTeachingStack` shape as a string literal. | `new-problem.mjs:30-109` | Contract changes require editing template strings in the scaffolder, easy to forget → generated code drifts from the real API. |

## 4. The world-class bar

A world-class authoring DX for this project means **a contributor (human or agent) can add a fully-taught, validated problem in one command and see it rendered before committing** — with the machine catching every "looks done but teaches nothing" failure.

Concretely, emulate:
- **Nx / Angular schematics + Plop.js**: scaffolders that *apply* registration edits (mutate the barrel + catalog), not just print instructions. One command → registered, compiling, catalog-visible.
- **Storybook / component-preview harnesses**: a per-item preview that records frames headlessly and renders a gallery so authors verify visuals without the full app.
- **Astro Content Collections / Contentlayer**: schema-validated content with typed frontmatter and build-time errors on missing/invalid fields — the analog here is a `checkCatalogIntegrity` that fails the build on bad `pluginId`, cyclic `prereqs`, or placeholder captions.
- **Prisma migrate deploy**: idempotent, deploy-time content application gated by an env var (`RUN_CONTENT_SEED`) mirroring the existing `RUN_MIGRATIONS`.

The bar: scaffold emits *working, non-placeholder* starter content; registration is automatic; a quality gate rejects stubs and cyclic prereqs; a preview command renders the item; the seed applies on deploy. "Coverage: ok" must mean "actually teaches", not "file exists".

## 5. Roadmap (ordered milestones)

### M1 — Close the "stub passes as done" gap
Goal: no placeholder content can pass `check:all`.
- [ ] Add placeholder-caption detection to integrity suite — files: `frontend/src/plugins/integrity.test.ts` — acceptance: a plugin whose captions contain scaffold sentinels ("Describe what", "Fill from", "Summarise the result", "step through the algorithm") fails the test — effort: S
- [ ] Add minimum-frame-quality check per input — files: `frontend/src/plugins/integrity.test.ts` — acceptance: every `record()` for every sample input emits ≥3 frames and ≥1 non-INIT/DONE frame — effort: M
- [ ] Fold `check-orphans` into `check:all` — files: `frontend/package.json` — acceptance: `npm run check:all` fails when a plugin folder is unregistered — effort: S

### M2 — Make scaffolders apply registration
Goal: one command produces a registered, compiling plugin.
- [ ] Teach `new-problem.mjs` to edit `src/plugins/index.ts` + `src/content/courses.ts` (with `--no-register` escape hatch) — files: `frontend/scripts/new-problem.mjs` — acceptance: after scaffold, `npm run check-orphans` and `tsc --noEmit` pass with no manual edits — effort: M
- [ ] Teach `new-effect.mjs` to edit `src/effects/registry.ts` — files: `frontend/scripts/new-effect.mjs` — acceptance: scaffolded effect appears in the registry without manual edits — effort: S

### M3 — Validate catalog integrity as data
Goal: bad references and cyclic prereqs are build errors.
- [ ] Add `checkCatalogIntegrity` (prereq ids exist + DAG acyclic + no dead courses/topics) — files: new `frontend/src/content/checkCatalogIntegrity.ts` + `frontend/src/plugins/integrity.test.ts` — acceptance: a cyclic or dangling `prereqs` entry fails the test — effort: M

### M4 — Single-item preview + in-place quiz drafting
Goal: fast, local, per-item feedback.
- [ ] Add `npm run preview-problem <id>` (headless record + frame summary) — files: new `frontend/scripts/preview-problem.mts` + `frontend/package.json` — acceptance: prints per-input frame count, move types, and flags placeholder captions — effort: M
- [ ] Make `draft-quiz-from-frames` write to `--out <file>` and read real recorder captions — files: `frontend/scripts/draft-quiz-from-frames.mjs` — acceptance: `--out src/plugins/<id>/practice.ts` writes a valid `quiz` export — effort: M

### M5 — Deploy-time seed application
Goal: catalog and Postgres never diverge in prod.
- [ ] Add `RUN_CONTENT_SEED` env-gated apply mirroring `RUN_MIGRATIONS` — files: `backend/internal/arcade/migrate.go` (embed `db/content_seed.sql`), `db/README.md` — acceptance: with `RUN_CONTENT_SEED=true`, backend applies the seed on startup idempotently — effort: L

## 6. Execution-ready backlog

> Pick ONE task. Run its Verify command. Baseline before you start: `cd frontend && node_modules/.bin/vitest run` = 3585 tests green; `npm run check:all` = all green.

### Task 1 — Fail integrity on placeholder captions
- **Goal:** Reject scaffold sentinel captions in any registered plugin.
- **Files:** `frontend/src/plugins/integrity.test.ts`
- **Approach:** Add a `describe('no placeholder content')` block. Load all plugins (the file already does `await loadAllPlugins()`). For each plugin, for each `input`, call `plugin.record(input.value)` and collect `frame.move.caption`. Define `SENTINELS = ['Describe what', 'Fill from', 'Summarise the result', 'step through the algorithm', 'One-line description']`. Assert no caption contains any sentinel. Fix any real violations you surface (they are genuine stubs) OR, if the count is large (prep stubs), scope this test to `curated` + `imported` groups first and file the prep backlog to `05-content-catalog`.
- **Acceptance test:** Temporarily add a caption "Fill from X" to a curated plugin → test fails; revert → test passes.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### Task 2 — Enforce minimum frame quality
- **Goal:** Every sample input must produce a non-trivial recording.
- **Files:** `frontend/src/plugins/integrity.test.ts`
- **Approach:** In a new `it` per plugin (mirror the existing `frames have move.note` block around `integrity.test.ts:124`), assert `frames.length >= 3` and that at least one frame has a `move.type` that is neither `INIT` nor `DONE`. Scope to `curated` + `imported` if prep stubs would fail en masse (document that scope in a comment referencing `05-content-catalog` P0).
- **Acceptance test:** A 2-frame INIT/DONE-only plugin fails; a real algorithm plugin passes.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### Task 3 — Add check-orphans to check:all
- **Goal:** Unregistered plugin folders fail the primary gate.
- **Files:** `frontend/package.json`
- **Approach:** Append `&& npm run check-orphans` to the `check:all` script value. Confirm `check-orphans` currently passes standalone first (`npm run check-orphans`); if it flags pre-existing orphans, either register/delete them or fix in a separate task before wiring.
- **Acceptance test:** `mkdir src/plugins/zz-orphan && echo "" > src/plugins/zz-orphan/index.tsx` → `npm run check:all` fails; remove folder → passes.
- **Verify:** `cd frontend && npm run check:all`

### Task 4 — Auto-register in new-problem.mjs
- **Goal:** `new-problem` produces a registered plugin, no manual edits.
- **Files:** `frontend/scripts/new-problem.mjs`
- **Approach:** After writing the three files, unless `--no-register` is passed: (a) read `src/plugins/index.ts`, insert `import { <var> } from './<id>';` after the last plugin import and add `<var>` to the curated plugins array — locate the array by a stable marker (grep the file first to find the exact array name/shape before editing); (b) read `src/content/courses.ts` and append the item `{ id, kind: 'problem', pluginId, status: 'todo' }` to a topic (default: print a warning + require `--course <courseId> --topic <topicId>` to place it, since topic choice is semantic). Keep string edits minimal and idempotent (skip if the import already exists). Preserve `--dry-run` (print the diffs instead of writing).
- **Acceptance test:** `npm run new-problem -- zz-demo "ZZ Demo" --course arrays --topic <realTopicId>` then `npm run check-orphans` and `tsc --noEmit` both pass; delete the scaffold after.
- **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && npm run check-orphans`

### Task 5 — Auto-register in new-effect.mjs
- **Goal:** `new-effect` wires `src/effects/registry.ts`.
- **Files:** `frontend/scripts/new-effect.mjs`, (read) `frontend/src/effects/registry.ts`
- **Approach:** Read `registry.ts` first to learn its exact array/import shape. After writing the effect file (unless `--no-register`), insert the import and add the effect var to the registry array idempotently. Keep the printed instruction as a fallback only when `--no-register`.
- **Acceptance test:** `npm run new-effect -- zz-fx "ZZ FX"` → effect appears in registry; `tsc --noEmit` passes; delete after.
- **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json`

### Task 6 — checkCatalogIntegrity: prereq DAG + dangling refs
- **Goal:** Cyclic or dangling `prereqs` become test failures.
- **Files:** new `frontend/src/content/checkCatalogIntegrity.ts`, `frontend/src/plugins/integrity.test.ts`
- **Approach:** Export `checkCatalogIntegrity(catalog)` returning `string[]` of issues: (1) every `item.prereqs` id resolves via `catalog.getItem`; (2) the prereq graph over items is acyclic (DFS with visited/instack sets); (3) no course/topic has zero items. In `integrity.test.ts`, build the same catalog it already builds (`buildCatalog([...mergeCourses(curatedCourses, importedCourses), ...prepCourses])` at `integrity.test.ts:48`) and assert `checkCatalogIntegrity(catalog)` returns `[]`.
- **Acceptance test:** Add a self-referential `prereqs: ['<sameId>']` to a catalog item in a scratch test → issues non-empty; a well-formed catalog → `[]`.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### Task 7 — preview-problem headless recorder
- **Goal:** One command summarizes a problem's recording.
- **Files:** new `frontend/scripts/preview-problem.mts`, `frontend/package.json`
- **Approach:** Use `vite-node` (like `export-content-sql.mts`). Import `loadAllPlugins`/`getPluginMeta` from `@/core` (verify exact export names by reading `src/core/registry.ts` first). Accept `<id>`; find the plugin; for each `input` print label, `frames.length`, distinct `move.type` values, and flag any caption containing a sentinel from Task 1. Add script `"preview-problem": "vite-node scripts/preview-problem.mts"`. This is a read-only diagnostic (no writes).
- **Acceptance test:** `npm run preview-problem -- two-sum` prints ≥1 input with a frame count and move types (pick a real curated id by grepping `src/plugins/index.ts`).
- **Verify:** `cd frontend && npm run preview-problem -- <realId>`

### Task 8 — draft-quiz --out writer
- **Goal:** Draft quizzes directly into a plugin's `practice.ts`.
- **Files:** `frontend/scripts/draft-quiz-from-frames.mjs`
- **Approach:** Add `--out <path>` parsing. When present, format the `draft` array as a valid `export const quiz: QuizQuestion[] = [...]` (matching the shape emitted by `new-problem.mjs:114-125`) and write it (refuse to overwrite without `--force`). Keep stdout JSON as the default when `--out` absent.
- **Acceptance test:** `node scripts/draft-quiz-from-frames.mjs imp-44-word-search --out /tmp/q.ts` writes a file with an `export const quiz` line; `tsc` on a temp import would accept the shape.
- **Verify:** `cd frontend && node scripts/draft-quiz-from-frames.mjs imp-44-word-search --out /tmp/draft-quiz.ts && grep -q 'export const quiz' /tmp/draft-quiz.ts && echo OK`

### Task 9 — RUN_CONTENT_SEED deploy apply
- **Goal:** Content seed applies on backend deploy, gated by env.
- **Files:** `backend/internal/arcade/migrate.go`, `db/README.md`; (read) `db/content_seed.sql`, existing `RUN_MIGRATIONS` handling
- **Approach:** Read `migrate.go` to see how `RUN_MIGRATIONS` embeds+applies migration SQL. Embed `db/content_seed.sql` (it is already a single idempotent truncate+reload transaction) and, when `RUN_CONTENT_SEED=true`, execute it after migrations. Because the seed truncates content tables, order it AFTER schema migrations and guard with a clear log line. Document `RUN_CONTENT_SEED` in `db/README.md`.
- **Acceptance test:** Local Postgres: with `RUN_CONTENT_SEED=true` the backend logs a content-seed apply and `select count(*) from public.problems` is non-zero after startup.
- **Verify:** `export PATH="$HOME/.homebrew/bin:$PATH"; cd backend && go build ./... && go vet ./... && gofmt -l internal/...`

### Task 10 — Scaffold a smoke test that new-problem output compiles
- **Goal:** Guard the scaffolder templates against contract drift.
- **Files:** new `frontend/scripts/new-problem.test.ts` (or extend an existing script test if one exists — grep first)
- **Approach:** In a vitest test, run `new-problem.mjs --dry-run` for a fixed id and assert the emitted template contains the current contract markers (`definePlugin<`, `wireTeachingStack(`, `id: '<id>'`). This fails loudly if the underlying API is renamed without updating the template string.
- **Acceptance test:** Rename `wireTeachingStack` in the template → test fails.
- **Verify:** `cd frontend && node_modules/.bin/vitest run scripts/new-problem.test.ts`

### Task 11 — Document the authoring workflow in plugins README
- **Goal:** One canonical "how to add content" doc for humans + agents.
- **Files:** `frontend/src/plugins/README.md`
- **Approach:** Add a section: scaffold → fill `record`/`View` → draft quiz → `check:all` → `export-content-sql` → seed. Reference the exact commands and this roadmap file. Read the README first to match its style; do not duplicate content already there.
- **Acceptance test:** README contains the ordered command sequence and links to `docs/roadmap/06-content-authoring-workflow.md`.
- **Verify:** `grep -q '06-content-authoring-workflow' frontend/src/plugins/README.md && echo OK`

## 7. Definition of done & verification

Run all of these from the repo root; green output shown:

- Typecheck: `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/tsc --noEmit -p tsconfig.node.json` → no output, exit 0.
- Unit + integrity tests: `cd frontend && node_modules/.bin/vitest run` → `Test Files … passed`, ≥3585 tests (new tasks add tests; count only rises).
- Guardrails: `cd frontend && npm run check:all` → each `check-*` prints `ok`/`up to date`; after Task 3 the final line includes the orphan check passing.
- Orphans: `cd frontend && npm run check-orphans` → `✓ no orphan modules` and `✓ no orphan plugin folders`.
- Prod build: `cd frontend && node_modules/.bin/vite build` → completes without errors.
- Backend (Task 9): `export PATH="$HOME/.homebrew/bin:$PATH"; cd backend && go build ./... && go vet ./... && gofmt -l internal/...` → `gofmt -l` prints nothing.
- Backend content-seed smoke (Task 9): `createdb algomoves_itest; DATABASE_URL="postgres://localhost:5432/algomoves_itest?sslmode=disable" RUN_MIGRATIONS=true RUN_CONTENT_SEED=true go test ./...; dropdb algomoves_itest`.

A change is done when: `check:all` + `vitest run` + `tsc` are green, a newly-scaffolded problem is auto-registered and passes `check-orphans` with zero manual edits, and no placeholder caption survives the integrity suite.

## 8. Reference pointers

**Scaffolders:** `frontend/scripts/new-problem.mjs`, `new-effect.mjs`, `scaffold-prep-simulator.mjs`, `draft-quiz-from-frames.mjs`.
**Validators:** `frontend/scripts/check-simulators.mjs`, `check-prep-simulator-coverage.mjs`, `check-orphans.mjs`; `frontend/src/plugins/integrity.test.ts`.
**Generators (drift-guarded pattern to copy):** `frontend/scripts/build-plugin-meta.mts`, `export-content-sql.mts`.
**Contract:** `frontend/src/content/types.ts` (`ItemDef`/`CourseDef`, `prereqs`), `frontend/src/content/catalog.ts` (`buildCatalog`/`hydrateItem`), `frontend/src/plugins/_shared/pluginKit.ts` (`wireTeachingStack`), `frontend/src/plugins/index.ts` + `frontend/src/content/courses.ts` (registration targets).
**Seed apply:** `Makefile` (`content-seed` target), `db/content_seed.sql`, `db/migrations/004_content_schema.sql`, `backend/internal/arcade/migrate.go`.

**Related roadmap docs:** `05-content-catalog…` (prep-simulator quality P0, catalog validation — this doc owns the *authoring pipeline*, that doc owns *catalog data quality*); the architecture-remediation docs for the `check:all`/module-boundary conventions.

**External prior art:** Plop.js / Hygen (scaffolders that apply edits), Angular/Nx schematics (registration-aware generators), Astro Content Collections & Contentlayer (schema-validated content with build-time errors), Storybook (per-component preview harness).
