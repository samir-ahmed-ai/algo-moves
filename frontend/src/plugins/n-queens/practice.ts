import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '@/lib/code';

export const quiz: QuizQuestion[] = [
  {
    id: 'category',
    prompt: 'Which technique does N-Queens showcase?',
    choices: [
      { label: 'Backtracking — try a choice, recurse, undo on failure', correct: true },
      { label: 'Dynamic programming — table over states' },
      { label: 'Greedy first column — not optimal' },
      { label: 'BFS with queue — wrong technique' },
    ],
    explain:
      'It builds a partial solution row by row and abandons (undoes) any placement that cannot be completed — the defining shape of backtracking.',
  },
  {
    id: 'one-per-row',
    prompt: 'Why does the search place exactly one queen per row?',
    choices: [
      { label: 'One queen per row — kills row conflicts', correct: true },
      { label: 'Square board — unrelated constraint' },
      { label: 'Sort columns — not the reason' },
      { label: 'Row indexing — not the insight' },
    ],
    explain:
      'Fixing one queen per row means we never even consider same-row conflicts, shrinking the search from choosing n cells anywhere to choosing one column per row.',
  },
  {
    id: 'safe',
    prompt: 'What must a candidate square be checked against before a queen is placed?',
    choices: [
      { label: 'Column or diagonal — equal row and column distance', correct: true },
      { label: 'Column only misses diagonals — both diags must be clear too' },
      { label: 'Adjacent cells — too local' },
      { label: 'Square color — irrelevant' },
    ],
    explain:
      'Same-row is impossible by construction. A diagonal attack means the row-distance equals the column-distance between two queens.',
  },
  {
    id: 'backtrack',
    prompt: 'When does the algorithm backtrack?',
    choices: [
      { label: 'No safe column — undo previous row', correct: true },
      { label: 'After every placement — too often' },
      { label: 'Once at end — too late' },
      { label: 'Same color square — wrong rule' },
    ],
    explain:
      'If no safe column exists for a row, the search reports failure; the previous row then removes its queen and tries its next column.',
  },
  {
    id: 'prune',
    prompt: 'How does backtracking beat brute force here?',
    choices: [
      { label: 'It prunes: the moment — a partial board conflicts, the whole sub', correct: true },
      { label: 'Memoise states — not used here' },
      { label: 'Faster sorting — unrelated' },
      { label: 'All n^n boards — brute force' },
    ],
    explain:
      'Brute force would test all column assignments. Backtracking rejects a bad prefix early, so entire branches of placements are never explored.',
  },
  {
    id: 'complexity',
    prompt: 'What is the worst-case time complexity?',
    choices: [
      { label: 'O(n!) — branching narrows each deeper row', correct: true },
      { label: 'O(n²) — far too optimistic' },
      { label: 'O(2^n) — subset not placement shape' },
      { label: 'O(n log n) — sorting cost' },
    ],
    explain:
      'Row 0 has n choices, row 1 at most n-1 compatible columns, and so on — bounded by n! placements, far below the naïve n^n.',
  },
];

/** Ordered decomposition of the Go solution for the Code Studio reassemble drill. */
export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func solveNQueens(n int) ([]int, bool) {', role: 'signature — return the column per row, plus whether a solution exists' },
  { id: 'init', code: '\tqueens := make([]int, n)\n\tfor i := range queens {\n\t\tqueens[i] = -1\n\t}', role: 'board: queens[row] = column, -1 means empty' },
  { id: 'safe-sig', code: '\tsafe := func(row, col int) bool {', role: 'helper: is (row, col) attacked by an earlier queen?' },
  { id: 'safe-loop', code: '\t\tfor r := 0; r < row; r++ {\n\t\t\tc := queens[r]', role: 'scan every queen placed in a row above' },
  { id: 'safe-check', code: '\t\t\tif c == col || abs(c-col) == abs(r-row) {\n\t\t\t\treturn false\n\t\t\t}', role: 'same column or same diagonal → unsafe' },
  { id: 'safe-ok', code: '\t\t}\n\t\treturn true\n\t}', role: 'no conflict found → safe' },
  { id: 'place-sig', code: '\tvar place func(row int) bool\n\tplace = func(row int) bool {', role: 'recursive placer for one row at a time' },
  { id: 'base', code: '\t\tif row == n {\n\t\t\treturn true\n\t\t}', role: 'base case: all rows filled → complete solution' },
  { id: 'col-loop', code: '\t\tfor col := 0; col < n; col++ {\n\t\t\tif safe(row, col) {', role: 'try each column; only proceed where it is safe' },
  { id: 'choose', code: '\t\t\t\tqueens[row] = col\n\t\t\t\tif place(row + 1) {\n\t\t\t\t\treturn true\n\t\t\t\t}', role: 'place the queen and recurse; bubble up on success' },
  { id: 'undo', code: '\t\t\t\tqueens[row] = -1 // backtrack\n\t\t\t}\n\t\t}', role: 'undo the placement and try the next column' },
  { id: 'fail', code: '\t\treturn false\n\t}', role: 'no column worked in this row → fail back up' },
  { id: 'run', code: '\tif place(0) {\n\t\treturn queens, true\n\t}\n\treturn nil, false\n}', role: 'kick off at row 0 and report the outcome' },
];
