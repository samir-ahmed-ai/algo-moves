# Quiz and Code Studio

Shared teaching standards for the **mobile deck**, **Learn-mode panels**, and
**Code Studio** sequence: quiz → reassemble → recall.

---

## Quiz choice format

Every multiple-choice label uses **headline — detail**:

```
O(n!) — branching narrows each deeper row
Save curr.next — tail link is lost otherwise
```

| Part | Rules |
|------|--------|
| **Headline** | The answer itself — Big-O, formula, keyword, or short phrase (≤ ~40 chars) |
| **Separator** | Em dash `—` (not hyphen-minus) |
| **Detail** | One short hint (≤ 60 chars, total label ≤ 72) |

Author labels in `frontend/src/plugins/**/practice.ts` for native plugins or
`frontend/src/plugins/imported/practice/items/*.ts` for the imported progress
library. Prep simulators without hand-authored quiz content get labels from
[`defaultPrepQuiz()`](../frontend/src/plugins/imported/prepQuiz.ts).

### Rendering

[`QuizChoiceLabel`](../frontend/src/components/shared/QuizChoiceLabel.tsx) parses
labels via
[`parseQuizChoiceLabel()`](../frontend/src/lib/quiz/quizChoiceFormat.ts) and styles:

- **Big-O** headlines → mono + accent
- **Code** headlines (indices, formulas) → mono pill
- **Concept** headlines → semibold ink
- **Detail** → muted, truncated second line

### Shuffle & scoring

Choice order is shuffled **by default** on every quiz surface
(`QUIZ_SHUFFLE_BY_DEFAULT = true` in
[`quizConstants.ts`](../frontend/src/lib/quiz/quizConstants.ts)).

[`shuffleQuizQuestion()`](../frontend/src/lib/quiz/shuffleQuizQuestion.ts) reorders
choices with a seeded PRNG.
[`quizQuestionSeed()`](../frontend/src/lib/quiz/shuffleQuizQuestion.ts) derives a
stable per-question seed from:

- a random **run seed** (`newQuizRunSeed()`) — new each session / retry
- the **question index** within the run
- the **attempt** counter after a wrong answer (mobile deck)

Mobile also refreshes the run seed when advancing to the next problem so Q1 order does not repeat across a category deck.

**Restart-on-wrong:** one incorrect pick resets the full run — question 1, score 0, reshuffled choices. Timing constants live in [`quizConstants.ts`](../src/lib/quizConstants.ts):

| Constant | Value | Use |
|----------|-------|-----|
| `QUIZ_SHUFFLE_BY_DEFAULT` | `true` | Shuffle MCQ options on display (opt out via `QuizConfig.shuffle`) |
| `QUIZ_CORRECT_MS` | 850 ms | Mobile auto-advance after correct |
| `QUIZ_WRONG_MS` | 1900 ms | Wrong feedback before auto-restart (mobile, Code Studio, canvas quiz panel) |

Surfaces:

| Surface | File | Restart-on-wrong |
|---------|------|------------------|
| Mobile deck | `frontend/src/shell/mobile/MobileCards.tsx` + `MobileDeck.tsx` | Auto (`QUIZ_WRONG_MS`) |
| Code Studio quiz phase | `frontend/src/shell/study/CodeStudioQuiz.tsx` | Auto |
| Canvas quiz panel | `frontend/src/plugins/_shared/practice.tsx` → `makeQuizPanel` | Auto |
| Complexity panel | `frontend/src/shell/panels/practice/ComplexityPanelBody.tsx` | Manual shuffle (single-round UX) |

Practice tab quiz and Code Studio quiz share one data source (`plugin.quiz` / `practice.quiz`) — edit once, both stay in sync.

### Quality guardrails

[`quizLabelIssues()`](../frontend/src/lib/quiz/quizChoiceFormat.ts) (rules in
[`quizLabelRules.ts`](../frontend/src/lib/quiz/quizLabelRules.ts)) enforces format in
[`integrity.test.ts`](../frontend/src/plugins/integrity.test.ts) for all
registered plugins and `defaultPrepQuiz()` output.

Rejected patterns:

- Missing em-dash detail clause
- Label longer than 72 characters
- Truncated headline (`…` before the dash)
- Comma-split headlines (`, —` or headline ending on a stop word)
- Mid-word ellipsis cuts
- Generic filler details (`plausible distractor`, `wrong approach here`, etc.)

Shared Big-O hints live in
[`complexityHints.ts`](../frontend/src/lib/quiz/complexityHints.ts) and are used
by the complexity panel and prep fallback quizzes.

CI:

```bash
npm run check:quiz-labels   # quizChoiceFormat + integrity label tests
npm run check:all           # includes check:quiz-labels
```

To repair bulk-imported labels:

```bash
npm run repair-quiz-labels
```

Draft starter quizzes from recorder captions (human review required):

```bash
npm run draft-quiz-from-frames imp-44-word-search
```

Generated prep quizzes come from
`frontend/scripts/generate-prep-practice-quiz.mjs`. The generator should only
produce paste-ready labels that pass the same headline/detail rules as
hand-authored quizzes.

---

## Code Studio — reassemble & highlighting

Code Studio runs three gated phases: **quiz → reassemble → recall**. Reassemble
shows shuffled [`CodePiece`](../frontend/src/lib/code/codePieces.ts) blocks the
learner orders into a working solution.

### Resume and persistence contract

Code Studio progress is scoped by problem id and language index:

| State | Store boundary | Contract |
|-------|----------------|----------|
| Phase | `frontend/src/store/user-prefs/codeStudioPhase.ts` | Saved phase must be one of `quiz`, `reassemble`, or `recall`, and must still exist for the current problem. |
| Quiz progress | `frontend/src/store/user-prefs/codeStudioPhase.ts` | Index, score, and answered choice are non-negative integers; invalid persisted data falls back safely. |
| Reassemble progress | `frontend/src/store/user-prefs/codeStudioPhase.ts` | Placed/tray ids are trimmed, unique strings; mistakes are non-negative integers. |
| Editor prefs | `frontend/src/store/user-prefs/editorPrefs.ts` | Boolean prefs only accept real booleans; split/font values are finite and clamped. |

If a problem loses quiz or reassemble content, resume should clamp to the first available phase rather than opening a dead tab.

### Syntax highlighting (read-only pieces)

[`HighlightedCode`](../frontend/src/components/code/HighlightedCode.tsx) wraps
[`highlightSnippet()`](../frontend/src/lib/editor/highlightSnippet.tsx):

- Keywords, strings, numbers per language (Go, JS/TS, Python)
- **Entry function** lines (`hl-line-entry`) vs nested helpers (`hl-line-func`)
- Signature name emphasis (`hl-sig-name`, `hl-sig-kw`)

Styles live in `frontend/src/styles/theme.css` under `.code-studio-reassemble`.

### Tray layout

[`balanceTrayColumns()`](../frontend/src/lib/code/trayLayout.ts) packs code pieces
into balanced masonry columns by estimated row height (long lines wrap at ~32
cols). Used by [`ReassemblePane`](../frontend/src/components/puzzle/ReassemblePane.tsx).

### CodeMirror editor

[`languageExtension()`](../frontend/src/lib/editor/languageExtension.ts) picks the
CodeMirror language mode;
[`editorTheme.ts`](../frontend/src/lib/editor/editorTheme.ts) aligns editor chrome with
design tokens. Recall phase uses the full editor; reassemble uses highlighted
read-only snippets.

### Haptic feedback

[`haptic.ts`](../frontend/src/lib/haptic.ts) fires light taps on correct/wrong
piece placement in reassemble where supported.

### Solution blueprint overlay

During reassemble, the **ScanEye** toolbar button (or **`B`**) opens the solution blueprint:

- **Desktop** — full-page overlay via [`CodeBlueprintOverlay`](../frontend/src/components/puzzle/CodeBlueprintOverlay.tsx)
- **Mobile deck** — compact in-card panel via [`ReassemblePane`](../frontend/src/components/puzzle/ReassemblePane.tsx) (shares space with the block tray; code wraps to fit the screen)

Both use [`CodePieceOverview`](../frontend/src/components/puzzle/CodePieceOverview.tsx)
with role tints from
[`codePieceRoles.ts`](../frontend/src/lib/code/codePieceRoles.ts). Close with **X**,
**`Esc`**, or **`B`**.

---

## Adding quiz content to a plugin

```ts
// practice.ts
export const quiz: QuizQuestion[] = [
  {
    id: 'invariant',
    prompt: 'What holds after each pass?',
    choices: [
      { label: 'Prefix sorted — values[0..i] ordered', correct: true },
      { label: 'Whole array sorted — not yet' },
    ],
    explain: 'Insertion sort only guarantees the prefix …',
  },
];
```

Wire via `wireTeachingStack({ practice: { quiz, … } })` — see
[`frontend/src/plugins/README.md`](../frontend/src/plugins/README.md).

## Authoring standards

- Keep prompts concrete: ask what the recorder is doing now, what invariant is preserved, or why a complexity bound holds.
- Keep answers visually scannable: one headline, one detail, no sentence-length choices.
- Avoid generic distractors unless the detail names the specific wrong assumption.
- Generated quiz drafts are starting points, not final curriculum; review against the simulator frames before merge.
- If a generator changes quiz text, rerun the paired generator/check commands before shipping.
