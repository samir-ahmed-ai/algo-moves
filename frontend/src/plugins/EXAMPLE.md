# End-to-end plugin walkthrough

Two complete paths: a **native** curated plugin and an **imported** library entry.

## Native example — binary search

### 1. Scaffold (optional)

```bash
npm run new-problem -- binary-search "Binary search"
```

For this repo the folder already exists at `src/plugins/binary-search/`.

### 2. Cases (`cases.ts`)

Define `WorkedCase<Input>[]` with real inputs your `record()` accepts:

```ts
export const goodCases: WorkedCase<BinInput>[] = [
  {
    id: 'mid-hit',
    title: 'Target is the first mid',
    input: { values: [1, 3, 5, 7, 9], target: 5 },
    inputLabel: 'values = [1,3,5,7,9], target = 5',
    returns: 'found at i=2',
    tone: 'ok',
    question: 'Why one comparison?',
    answer: 'mid lands on 5 immediately — best case O(1).',
  },
];
```

### 3. Practice (`practice.ts`)

Add `quiz` and optional `codePieces` (or rely on auto-split from Go source):

```ts
export const quiz: QuizQuestion[] = [/* … */];
export const codePieces = splitCodeIntoPieces(goSnippet) ?? [];
```

### 4. Plugin (`index.tsx`)

Implement `record`, `View`, `Inspector`, then wire the learn stack:

```ts
const teaching = wireTeachingStack({
  record, View, inputs, verdict,
  practice: {
    quiz, codePieces,
    cases: { good: goodCases, bad: badCases, intro: '…' },
    simulateQuestion: 'Which half does binary search keep next?',
  },
});

export const binarySearchPlugin = definePlugin({
  meta: { id: 'binary-search', title: 'Binary search', /* … */ },
  inputs, record, View, Inspector, verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  extraCode: [{ text: pySolution, lang: 'python', file: 'solution.py' }],
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [
    { key: 'values', label: 'Sorted array', type: 'numberArray', min: 0, max: 99 },
    { key: 'target', label: 'Target', type: 'number', min: 0, max: 99 },
  ],
});
```

Wide graph layouts: pass `simulateSide: true` to `wireTeachingStack`.

### 5. Register

Append to `src/plugins/index.ts` and add a course item in `src/content/courses.ts`:

```ts
{ id: 'binary-search-item', kind: 'problem', pluginId: 'binary-search' }
```

### 6. Integrity

`npm test` runs `integrity.test.ts` — curated `pluginId`s must resolve, have glyphs, and expose quiz/cases tabs.

---

## Imported example — word search

Imported problems come from `scripts/import-problems.mjs` → `imported/manifest.ts`.

### 1. Simulator (`imported/simulators/problems/word-search.tsx`)

Export `manifestId`, `simulator` with `record`, `View`, `inputs`, optional `verdict`.

The glob loader in `imported/simulators/index.ts` picks it up automatically.

### 2. Practice bundle

Add cases to `imported/practice/extraCases.ts` (or `migrated.ts` / `practice/items/<id>.ts`):

```ts
'imp-44-word-search': {
  cases: {
    intro: 'DFS from each cell…',
    good: [{ id: 'abcced', title: '…', input: { board, word }, /* … */ }],
  },
},
```

`resolvePracticeBundle()` merges split items → migrated → extra cases.

### 3. Factory

`makeImportedPlugin()` in `imported/factory.tsx` attaches simulators + practice via `wireTeachingStack`. Graph simulators get `simulateSide: true`.

### 4. Course

Point `pluginId` at the imported id (e.g. `imp-44-word-search`) in `courses.ts`.

### 5. Verify

```bash
npm test
npm run check-orphans
```

Draft quiz stubs (human review):

```bash
node scripts/draft-quiz-from-frames.mjs imp-44-word-search
```

---

## Checklist

| Step | Native | Imported |
|------|--------|----------|
| Visual + recorder | `index.tsx` | `simulators/problems/*.tsx` |
| Cases / quiz | `cases.ts`, `practice.ts` | `extraCases.ts` or `practice/items/` |
| Learn tabs | `wireTeachingStack` | factory auto-wires |
| Registry | `curatedPlugins` in `plugins/index.ts` + `npm run build-plugin-meta` | manifest + factory + `npm run build-plugin-meta` |
| Course link | `courses.ts` | `courses.ts` (`imp-*` id) |
| Tests | `recorders.test.ts` behavioural checks | `integrity.test.ts` simulator + cases |

See also [`README.md`](./README.md) and `npm run new-problem --`.
