# 05 — Problems & Prep Simulators

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

Algo-moves teaches ~400 algorithm problems as scrubbable "move transcripts". This doc owns the **interview-prep problem library** and its **step-by-step simulators**, plus the authoring/coverage/quiz tooling around them.

**How the prep library is built (verified):**
- `frontend/scripts/import-prep.mjs` reads `frontend/algo/prep/_index.json` + each `solution.go` and emits `frontend/src/plugins/imported/prepManifest.ts` (`export const PREP_DATA`). It imports the **16 non-"big4" topics** (arrays, strings, trees, math, design, matrices, linked-lists, stacks-queues, streams-io, hash-maps, intervals, sorting, prefix-sum, tries, database, sliding-window — see `TOPIC_META`), skipping graphs/backtracking/binary-search/dynamic-programming which come from the progress import. Cross-manifest de-dup is by normalized title (`normTitle`, punctuation-stripped). Result: **271 prep problems** (`grep -c '"id":'` style / manifest length).
- `frontend/src/plugins/imported/prepFactory.tsx` (`makePrepPlugin`) turns each manifest record into a `ProblemPlugin`. If `resolvePrepSimulator(p.id)` returns a hand-built simulator it uses that View/record/Inspector; otherwise it falls back to the animated `prepScene.tsx` (`recordScene`/`SceneView`).
- `frontend/src/plugins/imported/prepSimulators/index.ts` auto-registers every `prepSimulators/problems/*.tsx` that exports `{ manifestId, simulator }` via `import.meta.glob`. The simulator contract is `ProblemSimulator` re-exported from `../simulators/types` (`prepSimulators/types.ts`).

**Actual coverage & quality (verified, contradicts the survey digest's "100% stubs" claim):**
- `frontend/src/plugins/imported/prepSimulators/problems/` contains **271 `.tsx` files** — one per manifest id. `npm run check-prep-sim-coverage` (`frontend/scripts/check-prep-simulator-coverage.mjs`) is green: every `prepManifest` id has a matching simulator.
- These are **real** simulators, not the `scaffold-prep-simulator.mjs` `op=init` stub. Total ~52,800 LOC across 271 files (~195 LOC avg). Only **3** files match the stub `op = <span` pattern. Many reuse shared record helpers (e.g. `find-median-in-stream.tsx` → `_shared/dualHeapMedianRecord` + `_shared/dualHeapBoard`), so a short file is still a full visualization.
- Every prep plugin's `record()` is exercised by `integrity.test.ts` ("move.note is present on every frame") because `loadAllPlugins()` includes prep plugins.

**Quiz path (verified):** No prep simulator ships a hand-authored quiz (0 files have `practice:`). All 271 rely on `defaultPrepQuiz(p)` in `frontend/src/plugins/imported/prepQuiz.ts`, which synthesizes up to 2 MCQs from manifest metadata (approach `pattern` + Big-O `time`), pulling distractors from topic/course peers + `COMPLEXITY_POOL`. `integrity.test.ts` (`describe('defaultPrepQuiz labels')`) checks label *formatting* via `quizLabelIssues`, but **nothing checks quiz correctness invariants** (exactly one correct answer, distractors ≠ correct, ≥2 choices).

**Authoring scripts:** `new-problem.mjs` (native folder plugin scaffold), `scaffold-prep-simulator.mjs` (prep sim stub), `import-prep.mjs` (bulk import), `import-problems.mjs`, `check-prep-simulator-coverage.mjs`, `check-simulators.mjs` (bans hardcoded font sizes only), `draft-quiz-from-frames.mjs` (starter-JSON only, "human review required", not wired).

**Maturity: Solid.** Coverage is 100% and the simulators are genuinely built out with shared record/board helpers and structural tests. It falls short of world-class because quiz *correctness* is untested (a latent empty-`pattern` bug can emit a malformed MCQ), there is no per-problem quality gate (min frames, bounded input size, verdict truthfulness), and all 271 quizzes are metadata-derived rather than tied to the algorithm the learner just watched.

## 2. Strengths to preserve

- **Deterministic, re-runnable import.** `import-prep.mjs` is idempotent and sources truth from `algo/prep/_index.json` + `solution.go`. Never hand-edit `prepManifest.ts` (it carries an AUTO-GENERATED banner).
- **Complete, enforced coverage.** `check-prep-simulator-coverage.mjs` in `check:all` guarantees no manifest id ships without a simulator. Keep this ratchet green.
- **Shared record/board helpers cut per-problem LOC.** `_shared/dualHeapMedianRecord`, `_shared/dualHeapBoard`, `_shared/vizKit` (`VizStage`, `RailStack`, `InspectorRow`, `board-area`) give consistent visuals. Prefer reusing these over bespoke DOM.
- **Structural test net.** `integrity.test.ts` enforces `move.note` on every frame, `board-area`/`VizStage` in every View, and label formatting — a strong base to extend.
- **Graceful factory fallback.** `makePrepPlugin` degrades to the animated Scene when no simulator resolves, and `withNotes` appends `NOTES.md`/`Approaches` — content never 404s.
- **Metadata-driven default quiz.** `defaultPrepQuiz` produces stable (seeded) MCQs from `pattern`/`time` with course-aware distractors — a reasonable floor for 271 problems.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence (path or file:line) | Impact |
|---|---|---|---|
| P0 | No quiz-correctness invariant test. Nothing asserts each generated/authored quiz has **exactly one** `correct: true`, ≥2 choices, and distractors ≠ correct. Only label *format* is checked. | `frontend/src/plugins/integrity.test.ts:245-273`; `frontend/src/plugins/imported/prepQuiz.ts:39-45` | A malformed quiz (0 or 2 correct answers, or a distractor equal to the answer) ships silently → learner sees an unsolvable/trivially-solvable question. |
| P0 | Latent empty-`pattern` bug in `defaultPrepQuiz`. If a manifest `pattern` is `""`, the correct choice becomes `" — fits this problem"` (empty headline) and `pickDistractors('', pool, ...)` can surface a peer's empty pattern → collision. Currently 0/271 patterns are empty, so it's dormant, not fixed. | `frontend/src/plugins/imported/prepQuiz.ts:29-45,61-66`; verified `grep -c '"pattern": ""' prepManifest.ts` = 0 | Any future prep import with a missing Pattern header emits a broken MCQ with no test to catch it. |
| P1 | No per-simulator quality gate. Coverage check only asserts a file *exists*. No check for min frame count (≥3 meaningful moves), a real terminal `DONE`/verdict, or bounded input size (≤~12 elements so boards stay readable). | `frontend/scripts/check-prep-simulator-coverage.mjs` (existence only); `frontend/scripts/check-simulators.mjs:12` (font sizes only) | A future "shortcut" simulator (2-frame INIT→DONE) passes all gates while teaching nothing. |
| P1 | Quiz is metadata-derived, not algorithm-derived. All 271 quizzes test "which pattern / what Big-O" from `prepManifest`, never the actual moves the learner watched (e.g. "which element does the two-pointer scan compare next?"). | `frontend/src/plugins/imported/prepQuiz.ts:68-86`; 0 files with `practice:` in `prepSimulators/problems/` | Quizzes feel bolted-on and generic; low pedagogical value vs. curated native plugins that quiz on the trace. |
| P1 | `draft-quiz-from-frames.mjs` is orphaned. It emits starter JSON "not wired to production" and requires manual paste; there is no path to promote drafts into a per-problem `practice` bundle. | `frontend/scripts/draft-quiz-from-frames.mjs:1-12` | Authors have no supported workflow to upgrade a metadata quiz to a trace quiz; the tool rots. |
| P1 | `verdict` truthfulness is unverified. Each simulator supplies a `verdict(frames)`, but no test asserts the verdict matches the algorithm's true result on its sample inputs. | `prepFactory.tsx:74-104`; sample `find-median-in-stream.tsx:74-79` | A wrong verdict (e.g. `ok:true` on a failing trace) mislabels the outcome learners see. |
| P2 | Coverage/scaffold scripts parse `prepManifest.ts` with a regex + `JSON.parse` on a slice. A future non-JSON literal in the manifest would break both silently or with an opaque error. | `check-prep-simulator-coverage.mjs:12-17`; `scaffold-prep-simulator.mjs:23-28`; `import-prep.mjs:118-134` | Brittle tooling; a manifest shape change breaks the coverage gate without a clear message. |
| P2 | Scaffold stub encourages `op=init` boilerplate. `scaffold-prep-simulator.mjs` emits a 2-frame INIT→DONE with `op = <span>` — the exact anti-pattern flagged as "3 stub files" today. | `frontend/scripts/scaffold-prep-simulator.mjs:62-115` | New simulators start from a shape the quality bar should reject; no lint discourages leaving it. |
| P2 | Input readability unbounded. Simulator sample `inputs` are hand-set with no cap; dense boards (large matrices/streams) hurt the FLIP/board renderer and readability. | `find-median-in-stream.tsx:67-70` (fine at 4-5); no gate anywhere | Some sims may ship 20+ element inputs that render as unreadable boards. |

## 4. The world-class bar

For an interview-prep simulator library, "world-class" means **every problem is a correct, watchable, quizzable micro-lesson**, verified by machine, not by hope. Concretely:

1. **Correctness is a test, not a convention.** Every quiz (authored or generated) has exactly one correct answer, ≥3 distinct choices, and no distractor equal to the answer — asserted for all 271 in CI. Every simulator's `verdict` is checked against a reference oracle on its sample inputs. This is the bar Anki/LeetCode editorial quizzes are held to; make it mechanical.
2. **Simulators teach, measured mechanically.** A quality gate rejects sims with <3 meaningful frames, no terminal `DONE`, or oversized inputs. Emulate **VisuAlgo** and **Sorting.at**: small inputs (≤~12 elements), one meaningful move per frame, a legible board.
3. **Quizzes are keyed to the trace, not the tags.** The best question for "Two Sum (sorted)" is "which pair does the two-pointer compare next?", derived from the frames the learner just scrubbed — like **Brilliant.org**'s inline checkpoints. Metadata quizzes are the *floor*, not the ceiling.
4. **One authoring pipeline, no orphans.** `draft-quiz-from-frames.mjs` → reviewed `practice` bundle → picked up by `prepFactory` is a documented, tested path. New problems flow scaffold → fill record/View → author quiz → coverage+quality+correctness all green in `check:all`.
5. **Zero silent degradation.** Missing pattern, empty verdict, colliding distractor, unreadable board — each fails a named check with a fix hint, not a shrug.

## 5. Roadmap (ordered milestones)

### M1 — Lock quiz correctness (close both P0s)
Goal: no malformed quiz can ship, for authored or generated quizzes.
- [ ] Add a `quizCorrectnessIssues(question)` helper next to `quizLabelIssues` that flags: not exactly one `correct:true`, <2 choices, duplicate choice labels, distractor equal to correct — files: `frontend/src/lib/quiz/quizChoiceFormat.ts` (or a new `quizCorrectness.ts` in `frontend/src/lib/quiz/`), export via `frontend/src/lib/quiz/index.ts` — acceptance: unit test covers all four failure shapes — effort: S
- [ ] Assert correctness over every `plugin.quiz` and every `defaultPrepQuiz(p)` for all `PREP_DATA` — files: `frontend/src/plugins/integrity.test.ts` — acceptance: new `describe` blocks green; deliberately breaking one quiz turns it red — effort: S
- [ ] Fix the empty-`pattern` path in `defaultPrepQuiz`: skip the pattern question when `p.pattern` is empty, and drop distractors whose trimmed label equals the correct label — files: `frontend/src/plugins/imported/prepQuiz.ts` — acceptance: unit test with a synthetic empty-pattern `PrepProblem` yields a valid or zero-question quiz, never a malformed one — effort: S

### M2 — Simulator quality gate
Goal: coverage means *quality*, not just presence.
- [ ] Extend the coverage check (or add `check-prep-simulator-quality.mjs`) to load each simulator, run `record()` on every sample input, and fail if <3 frames, no terminal `DONE`, or any input array/matrix has >12 primitive cells — files: `frontend/scripts/check-prep-simulator-coverage.mjs` or new sibling; wire into `check:all` in `frontend/package.json` — acceptance: script green on current 271; injecting a 2-frame sim fails it — effort: M
- [ ] Add a `verdict`-oracle test: for each prep sim with a `verdict`, assert the last-frame verdict `.ok` matches an independent recompute where feasible, or at minimum that a `DONE`/terminal frame exists and `verdict` returns a defined result — files: `frontend/src/plugins/integrity.test.ts` — acceptance: all prep sims produce a defined verdict on all sample inputs — effort: M

### M3 — Trace-keyed quiz upgrade path
Goal: replace generic quizzes with move-derived ones, starting with the highest-traffic topics.
- [ ] Wire `draft-quiz-from-frames.mjs` output into a real `practice` bundle shape and document promotion — files: `frontend/scripts/draft-quiz-from-frames.mjs`, `frontend/src/plugins/imported/prepSimulators/README` (create if absent) — acceptance: running the script for a prep id prints paste-ready `practice: { quiz, ... }` matching `ProblemSimulator.practice` — effort: M
- [ ] Author trace-keyed `practice` quizzes for the top ~15 arrays/strings/two-pointer prep sims — files: `frontend/src/plugins/imported/prepSimulators/problems/*.tsx` — acceptance: those ids now use `sim.practice.quiz` (not `defaultPrepQuiz`); correctness + label tests green — effort: L

### M4 — Author-experience hardening
Goal: new problems start correct and stay correct.
- [ ] Upgrade `scaffold-prep-simulator.mjs` template to emit a ≥3-frame skeleton with a real board hint and a `TODO` verdict, and make the manifest parsing resilient (shared parse helper) — files: `frontend/scripts/scaffold-prep-simulator.mjs`, optional `frontend/scripts/_prepManifest.mjs` shared reader — acceptance: scaffolded stub passes the M2 quality gate's frame-count rule out of the box — effort: M

## 6. Execution-ready backlog

Pick ONE at a time, top to bottom. Each is self-contained.

### T1 — Add quiz-correctness helper
- **Goal:** A pure function flags malformed quizzes.
- **Files:** create `frontend/src/lib/quiz/quizCorrectness.ts`; export from `frontend/src/lib/quiz/index.ts`.
- **Approach:** `export function quizCorrectnessIssues(q: QuizQuestion): string[]`. Import `QuizQuestion` from `@/core/types` (same import `prepQuiz.ts` uses). Flag: choices.length < 2; count of `c.correct === true` !== 1; any two choices with identical trimmed `label`; any non-correct choice whose trimmed label equals the correct choice's trimmed label. Return an array of reason strings (empty = clean).
- **Acceptance test:** new `frontend/src/lib/quiz/quizCorrectness.test.ts` covers: valid quiz → `[]`; zero-correct → issue; two-correct → issue; duplicate labels → issue; distractor==correct → issue.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/lib/quiz/quizCorrectness.test.ts`

### T2 — Enforce correctness across all quizzes
- **Goal:** No plugin or generated prep quiz can be malformed.
- **Files:** `frontend/src/plugins/integrity.test.ts`.
- **Approach:** Add `describe('quiz correctness')` mirroring the existing `describe('defaultPrepQuiz labels')` block (integrity.test.ts:260-273) but calling `quizCorrectnessIssues`. Loop over `plugins` (`plugin.quiz`) AND over `PREP_DATA` via `defaultPrepQuiz(p)`. Collect `bad[]`, assert `[]`.
- **Acceptance test:** suite green now; temporarily add a second `correct:true` to one native plugin quiz → the new test fails naming that id.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### T3 — Fix latent empty-pattern quiz bug
- **Goal:** `defaultPrepQuiz` never emits an empty-headline correct choice or a colliding distractor.
- **Files:** `frontend/src/plugins/imported/prepQuiz.ts`.
- **Approach:** In `defaultPrepQuiz`, only push the pattern question when `p.pattern.trim()` is non-empty (mirror the existing `if (p.time)` guard at line 77). In `pickDistractors`, after filtering `v !== correct`, also filter `v.trim() !== correct.trim()` and drop empties (already partly done via `uniqueNonEmpty`). Keep `seededOrder` deterministic.
- **Acceptance test:** add `frontend/src/plugins/imported/prepQuiz.test.ts`: a synthetic `PrepProblem` with `pattern:''` yields a quiz with 0 pattern questions and passes `quizCorrectnessIssues` for any remaining questions.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/imported/prepQuiz.test.ts src/plugins/integrity.test.ts`

### T4 — Simulator frame-quality gate (script)
- **Goal:** Coverage check also rejects trivial simulators.
- **Files:** `frontend/scripts/check-prep-simulator-coverage.mjs` (extend) — but it's a plain `.mjs` and can't import `.tsx`. Instead add the gate as a vitest block in `frontend/src/plugins/integrity.test.ts` where `record()` already runs.
- **Approach:** New `describe('prep simulator quality')`: for each prep plugin (`plugin.meta.id.startsWith('prep-')`), for each input, run `plugin.record(input.value)` and assert `frames.length >= 3` and the last frame `move.type` is a terminal marker (`DONE`/`done`/tone `good`) OR `verdict(frames)` is defined. Keep the array-size cap as a separate soft check (T8).
- **Acceptance test:** green on current 271; a hand-edited 2-frame sim fails naming its id.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### T5 — Verdict-defined test
- **Goal:** Every prep sim returns a defined verdict on every sample input.
- **Files:** `frontend/src/plugins/integrity.test.ts`.
- **Approach:** For each `prep-*` plugin, for each input, assert `plugin.verdict?.(plugin.record(input.value))` is an object with a boolean `.ok` and string `.label`. (The factory supplies a default verdict when a sim omits one — `prepFactory.tsx:80`.)
- **Acceptance test:** green on all 271.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### T6 — Promote draft-quiz output to a real bundle
- **Goal:** `draft-quiz-from-frames.mjs` emits paste-ready `practice` config.
- **Files:** `frontend/scripts/draft-quiz-from-frames.mjs`.
- **Approach:** Change the output block to print a TS snippet: `export const practice = { quiz: [...], simulateQuestion: '...' } satisfies ProblemSimulator['practice']` matching the `ProblemSimulator` contract (`prepSimulators/types.ts` → `../simulators/types`). Ensure each generated choice has exactly one `correct` (reuse the correctness rules from T1 conceptually). Keep "human review required" banner.
- **Acceptance test:** `node scripts/draft-quiz-from-frames.mjs prep-arrays-two-sum` prints a snippet that, when pasted into a sim's `practice`, passes T1's `quizCorrectnessIssues`.
- **Verify:** `cd frontend && node scripts/draft-quiz-from-frames.mjs prep-arrays-two-sum`

### T7 — Author 3 trace-keyed quizzes (pilot)
- **Goal:** Prove the trace-quiz path end-to-end on 3 sims before scaling.
- **Files:** `frontend/src/plugins/imported/prepSimulators/problems/two-sum.tsx` and two other array/two-pointer sims (pick from `prepSimulators/problems/`).
- **Approach:** Add a `practice: { quiz: QuizQuestion[], simulateQuestion, codePieces? }` to `simulator`. `prepFactory.tsx:81-89,99` already prefers `sim.practice.quiz` and wires `wireTeachingStack`. Write ≥2 questions per problem keyed to the trace (a "which move next" and a complexity check), each satisfying T1 correctness + label rules.
- **Acceptance test:** those 3 ids no longer fall back to `defaultPrepQuiz`; correctness + label + coverage tests green.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### T8 — Bounded-input soft check
- **Goal:** Flag simulators whose sample inputs render as unreadable boards.
- **Files:** `frontend/src/plugins/integrity.test.ts`.
- **Approach:** For `prep-*` plugins, inspect each `input.value`; count primitive cells in the largest array/matrix field (walk one level of the object). Warn/collect ids where count > 12; assert the list is empty (or, if too many exist today, snapshot the current offenders into an allowlist constant with a `TODO` and shrink over time).
- **Acceptance test:** produces a concrete offender list; passes once inputs are trimmed or allowlisted.
- **Verify:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts`

### T9 — Harden scaffold template
- **Goal:** New prep sims start above the quality bar.
- **Files:** `frontend/scripts/scaffold-prep-simulator.mjs`.
- **Approach:** Replace the 2-frame INIT→DONE template (lines 62-115) with a skeleton that loops over a small sample input to emit ≥1 `STEP` frame per element plus INIT and DONE, uses a `board-area`/`VizStage` View, and leaves a `// TODO` verdict. Keep exports `manifestId`/`title`/`simulator`.
- **Acceptance test:** `npm run scaffold-prep-sim -- <some-uncovered-slug> --force` (or a throwaway) produces a file whose `record()` emits ≥3 frames.
- **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json` (scaffolded file typechecks)

### T10 — Shared resilient manifest reader
- **Goal:** One robust parser for `prepManifest.ts` used by all scripts.
- **Files:** create `frontend/scripts/_prepManifest.mjs`; refactor `check-prep-simulator-coverage.mjs`, `scaffold-prep-simulator.mjs`, `import-prep.mjs`'s reader.
- **Approach:** Export `readPrepData(root)` that does the `PREP_DATA = ([...]);` regex + `JSON.parse` with a clear thrown error if the shape changed. Replace the three inline copies.
- **Acceptance test:** all three scripts still work; coverage check green.
- **Verify:** `cd frontend && npm run check-prep-sim-coverage`

## 7. Definition of done & verification

Run from repo root unless noted. Green = the shown result.

- **Coverage gate:** `cd frontend && npm run check-prep-sim-coverage` → `check-prep-simulator-coverage: ok (271 prep problems, 271 simulators)`
- **All guardrails:** `cd frontend && npm run check:all` → each `check:*` prints `ok` / no diff; exit 0. Note `check:quiz-labels` runs `src/lib/quiz/quizChoiceFormat.test.ts` + `src/plugins/integrity.test.ts` (per `package.json`).
- **Integrity + quiz tests:** `cd frontend && node_modules/.bin/vitest run src/plugins/integrity.test.ts src/lib/quiz/` → all green (new correctness/quality blocks included).
- **Full unit suite (baseline ~3585 tests):** `cd frontend && node_modules/.bin/vitest run` → all pass, count ≥ baseline.
- **Typecheck:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json` → no output, exit 0.
- **Prod build:** `cd frontend && node_modules/.bin/vite build` → completes, no new chunk-size errors.

A task is done when its Verify command is green AND `npm run check:all` + the full vitest run stay green (no regression below the ~3585 baseline).

## 8. Reference pointers

**Key files (verify before editing):**
- Import & manifest: `frontend/scripts/import-prep.mjs`, `frontend/src/plugins/imported/prepManifest.ts` (AUTO-GENERATED), source `frontend/algo/prep/_index.json`.
- Factory & registry: `frontend/src/plugins/imported/prepFactory.tsx`, `frontend/src/plugins/imported/prepSimulators/index.ts`, `frontend/src/plugins/imported/prepSimulators/types.ts`.
- Quiz: `frontend/src/plugins/imported/prepQuiz.ts`, `frontend/src/lib/quiz/quizChoiceFormat.ts` (+ `.test.ts`), `frontend/src/lib/quiz/index.ts` (`COMPLEXITY_POOL`, `quizLabelIssues`).
- Simulator examples: `frontend/src/plugins/imported/prepSimulators/problems/find-median-in-stream.tsx`, `.../two-sum.tsx`; shared helpers `frontend/src/plugins/_shared/vizKit.tsx`, `_shared/dualHeapMedianRecord.ts`, `_shared/dualHeapBoard.tsx`, `_shared/pluginKit` (`wireTeachingStack`).
- Tests & gates: `frontend/src/plugins/integrity.test.ts`, `frontend/scripts/check-prep-simulator-coverage.mjs`, `frontend/scripts/check-simulators.mjs`.
- Authoring: `frontend/scripts/new-problem.mjs`, `frontend/scripts/scaffold-prep-simulator.mjs`, `frontend/scripts/draft-quiz-from-frames.mjs`. Contract doc: `frontend/src/plugins/README.md`.

**Related roadmap docs:** the content-catalog authoring/SQL-sync doc and the visualization/animation-engine doc in `docs/roadmap/` (frame player / FLIP that these simulators render through). Cross-check any quiz-storage change against the content export pipeline (`frontend/scripts/export-content-sql.mts`, guarded by `check-content-sql`).

**External prior art to emulate:** VisuAlgo (small-input step visualizations), Brilliant.org (inline trace-keyed checkpoints), LeetCode editorial complexity framing (the `time`/`space` question shape already mirrors this).
