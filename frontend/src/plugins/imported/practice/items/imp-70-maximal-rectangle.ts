import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'pattern',
      prompt: 'Which two-layer strategy does `maxRectangleSumInMatrix` use?',
      choices: [
        {
          label: 'Build a running histogram — then find the largest rectangle in',
          correct: true,
        },
        {
          label: "2-D DP where each cell — stores the width of consecutive '1's",
        },
        {
          label: "BFS flood-fill to find connected — '1' regions, then compute bounding",
        },
        {
          label: 'Sort columns by height — use binary search to find the widest',
        },
      ],
      explain:
        "`heights[c]` accumulates consecutive '1's in column `c` down to the current row, turning each row into a histogram. `btMaxRectHistogram` then runs a monotonic stack over that histogram.",
    },
    {
      id: 'histogram-update',
      prompt:
        "In the row loop, `heights[c]` is incremented when `matrix[r][c] == '1'` and reset to 0 otherwise. Why reset to 0 on '0'?",
      choices: [
        {
          label: "A '0' breaks the vertical — run of '1's, so no rectangle can",
          correct: true,
        },
        {
          label: 'It prevents integer overflow — very tall matrices',
        },
        {
          label: "It marks cells already visited — so they aren't double-counted",
        },
        {
          label: 'It ensures the histogram — always sorted in non-decreasing order',
        },
      ],
      explain:
        "The histogram bar at column c represents the unbroken streak of '1's ending at the current row. A '0' terminates that streak, so the bar height must restart at 0 for the next row.",
    },
    {
      id: 'sentinel-zero',
      prompt:
        '`btMaxRectHistogram` appends a 0 to `heights` before iterating. What role does this sentinel play?',
      choices: [
        {
          label: 'It forces the stack — flush all remaining bars at the end',
          correct: true,
        },
        {
          label: 'It handles the edge case — where the input histogram is empty',
        },
        {
          label: 'It prevents the width calculation — from going negative',
        },
        {
          label: 'It seeds the monotonic stack — so the first push is always valid',
        },
      ],
      explain:
        'Without the trailing 0, bars that are never shorter than a later bar would stay on the stack and never be popped/measured. The sentinel height 0 is lower than any real bar, guaranteeing every bar is eventually processed.',
    },
    {
      id: 'width-formula',
      prompt:
        'Inside `btMaxRectHistogram`, when a bar is popped, the width is computed as `i - stack[top] - 1` (or just `i` if the stack is empty). What does `stack[top]` represent here?',
      choices: [
        {
          label: 'The index of the nearest — bar to the left that is shorter than',
          correct: true,
        },
        {
          label: 'The index of the tallest — bar seen so far in the histogram',
        },
        {
          label: 'The left boundary — entire matrix column range',
        },
        {
          label: 'The number of bars currently — on the stack',
        },
      ],
      explain:
        'The monotonic stack keeps bars in non-decreasing height order. When a shorter bar at `i` triggers a pop, the new stack top is the first bar to the left that is also shorter — so the popped bar can extend as far left as `stack[top]+1` and as far right as `i-1`.',
    },
    {
      id: 'complexity',
      prompt:
        'What are the time and space complexities of `maxRectangleSumInMatrix` for an m×n matrix?',
      choices: [
        {
          label: 'O(m·n) time, O(n) space — Each cell is visited once for the',
          correct: true,
        },
        {
          label: 'O(m·n) time, O(m·n) space — Each cell is visited once for',
        },
        {
          label: 'O(m·n·log n) time, O(n) space — Each cell is visited once for',
        },
        {
          label: 'O(m²·n) time, O(n) space — Each cell is visited once for',
        },
      ],
      explain:
        'Each cell is visited once for the height update (O(m·n) total). Each histogram call is O(n) via the monotonic stack (each index pushed/popped at most once), called m times → O(m·n). The `heights` array and stack are both O(n).',
    },
    {
      id: 'monotonic-invariant',
      prompt:
        'The stack in `btMaxRectHistogram` is described as monotonic. What ordering invariant does it maintain?',
      choices: [
        {
          label: 'Heights of bars — stack increase from bottom to top',
          correct: true,
        },
        {
          label: 'Indices on the stack decrease — from bottom to top',
        },
        {
          label: 'Heights of bars — stack decrease from bottom to top',
        },
        {
          label: 'The stack alternates between local — minima and maxima',
        },
      ],
      explain:
        "Before pushing index `i`, the code pops every bar whose height exceeds `heights[i]`. This keeps the stack in non-decreasing height order, which guarantees each popped bar's right boundary is exactly `i`.",
    },
  ],
};
