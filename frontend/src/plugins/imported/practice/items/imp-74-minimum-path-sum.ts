import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'pattern',
      prompt: 'Which DP pattern does `minPathSumInMatrix` use?',
      choices: [
        {
          label: 'In-place grid DP: overwrite — cell with the cumulative minimum path',
          correct: true,
        },
        {
          label: "Dijkstra's algorithm with a min-heap — to find the cheapest path",
        },
        {
          label: 'Top-down memoized recursion — bottom-right cell',
        },
        {
          label: 'BFS with a deque — process cells in non-decreasing cost',
        },
      ],
      explain:
        'The code modifies `grid` in place, accumulating costs leftward along the first row and downward along the first column, then filling the rest with `grid[r][c] += min(grid[r-1][c], grid[r][c-1])`. No extra array is needed.',
    },
    {
      id: 'boundary-init',
      prompt:
        "Before the main nested loop, the code separately initializes the first column and first row. Why can't these be handled inside the main loop?",
      choices: [
        {
          label: 'Cells in the first row — have no left neighbor and cells in',
          correct: true,
        },
        {
          label: 'Go does not allow modifying — a slice element inside a range loop',
        },
        {
          label: 'The first row and column — always contain the minimum values and',
        },
        {
          label: 'Initializing them separately avoids — off-by-one error in the row/column',
        },
      ],
      explain:
        "The first column can only be reached from above (no left neighbor), and the first row can only be reached from the left (no top neighbor). The recurrence `min(grid[r-1][c], grid[r][c-1])` would use uninitialized (zero) values if these boundaries weren't pre-filled with their running prefix sums.",
    },
    {
      id: 'recurrence',
      prompt:
        'For interior cell (r, c), the update is `grid[r][c] += min(grid[r-1][c], grid[r][c-1])`. What invariant holds for `grid[r-1][c]` and `grid[r][c-1]` at this point?',
      choices: [
        {
          label: 'They already hold the minimum — path cost from (0,0) to those',
          correct: true,
        },
        {
          label: 'They hold the original matrix — values unchanged',
        },
        {
          label: 'They hold the maximum path — cost to those neighbors, which the',
        },
        {
          label: 'They hold the sum — all cells on the shortest path to',
        },
      ],
      explain:
        'Because the loops process cells in row-major order (top-to-bottom, left-to-right), both the top neighbor (r-1,c) and left neighbor (r,c-1) have already been updated to reflect their minimum path cost from (0,0) when (r,c) is processed.',
    },
    {
      id: 'space-complexity',
      prompt: "The problem's space annotation says `O(1) in-place`. What enables this?",
      choices: [
        {
          label: 'The code overwrites the input — `grid` directly rather than',
          correct: true,
        },
        {
          label: "Go's garbage collector reclaims — grid after each row is processed",
        },
        {
          label: 'The algorithm only needs to store — not',
        },
        {
          label: 'A rolling-array optimization — dp table to a single row',
        },
      ],
      explain:
        'By reusing `grid` as the dp table, no auxiliary array is allocated. This is O(1) auxiliary space (beyond the input itself). A separate dp array would cost O(m·n).',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `minPathSumInMatrix`?',
      choices: [
        {
          label: 'O(m·n) — The first-column and first-row passes',
          correct: true,
        },
        {
          label: 'O((m+n)·log(m·n)) — The first-column and first-row',
        },
        {
          label: 'O(m·n·min(m,n)) — The first-column and first-row',
        },
        {
          label: 'O(m²·n²) — The first-column and first-row',
        },
      ],
      explain:
        'The first-column and first-row passes each visit O(m) and O(n) cells respectively. The main nested loop visits each of the remaining (m-1)·(n-1) cells once. Total work is proportional to m·n.',
    },
    {
      id: 'edge-single-cell',
      prompt: 'If `grid` is a 1×1 matrix containing the value 7, what does the function return?',
      choices: [
        {
          label: '7 — With m=1 and n=1, both boundary loops',
          correct: true,
        },
        {
          label: '0 — With m=1 and n=1, both boundary',
        },
        {
          label: 'Panic (index out of range) — With m=1 and n=1, both boundary',
        },
        {
          label: '14, because the path visits — the cell once going right and once',
        },
      ],
      explain:
        'With m=1 and n=1, both boundary loops and the main nested loop have zero iterations. The function returns `grid[0][0]`, which is 7. There is exactly one cell and one path (staying in place).',
    },
  ],
};
