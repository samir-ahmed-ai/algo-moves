import type { LessonDef } from './types';

export const dynamicProgrammingLessons: LessonDef[] = [
  {
    id: 'dp-overlapping-subproblems',
    title: 'Spotting overlapping subproblems',
    summary: 'The signal that a problem wants dynamic programming.',
    estimatedMinutes: 6,
    tags: ['dynamic-programming', 'recursion', 'memoization'],
    blocks: [
      {
        kind: 'prose',
        text: 'Dynamic programming applies when a problem has two properties: **optimal substructure** (the answer is built from answers to smaller instances) and **overlapping subproblems** (those smaller instances repeat).',
      },
      { kind: 'heading', level: 2, text: 'Find the repetition' },
      {
        kind: 'prose',
        text: 'Write the brute-force recursion first. If the same arguments get computed again and again, you have overlap — and caching turns exponential work into polynomial.',
      },
      {
        kind: 'code',
        lang: 'go',
        caption: 'Naive Fibonacci recomputes fib(n-2) exponentially often',
        code: 'func fib(n int) int {\n\tif n < 2 {\n\t\treturn n\n\t}\n\treturn fib(n-1) + fib(n-2) // fib(n-2) is recomputed by both branches\n}',
      },
      { kind: 'heading', level: 2, text: 'Two ways to cache' },
      {
        kind: 'list',
        items: [
          '**Top-down (memoization)** — keep the recursion, store each result in a map/array the first time.',
          '**Bottom-up (tabulation)** — iterate the subproblems smallest-first, filling a table.',
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'The DP question',
        text: 'What is the smallest piece of state that fully describes a subproblem? That state is your table index.',
      },
      {
        kind: 'keyPoints',
        points: [
          'DP needs optimal substructure + overlapping subproblems.',
          'Start from brute-force recursion; overlap = repeated arguments.',
          'Memoize (top-down) or tabulate (bottom-up) — same recurrence.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'climbing-stairs',
        note: 'The simplest overlapping-subproblem problem — try it before reading on.',
      },
    ],
  },
  {
    id: 'dp-1d-tables',
    title: 'Filling a 1-D table',
    summary: 'When one index of state is enough.',
    estimatedMinutes: 6,
    tags: ['dynamic-programming', 'tabulation'],
    blocks: [
      {
        kind: 'prose',
        text: 'Many DP problems need only a single dimension of state: a position, a remaining budget, a step count. The recurrence expresses `dp[i]` in terms of earlier entries.',
      },
      {
        kind: 'steps',
        steps: [
          { title: 'Define', caption: 'State the meaning of dp[i] in one sentence.' },
          { title: 'Base', caption: 'Fill the smallest cases directly.' },
          { title: 'Recur', caption: 'Write dp[i] from dp[i-1], dp[i-2], … .' },
          { title: 'Answer', caption: 'Identify which cell holds the final result.' },
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        caption: 'Climbing stairs: dp[i] = dp[i-1] + dp[i-2]',
        code: 'func climbStairs(n int) int {\n\tif n < 3 {\n\t\treturn n\n\t}\n\ta, b := 1, 2 // dp[i-2], dp[i-1]\n\tfor i := 3; i <= n; i++ {\n\t\ta, b = b, a+b\n\t}\n\treturn b\n}',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Rolling the array',
        text: 'If dp[i] depends only on the last k entries, keep k variables instead of the whole array — O(1) space.',
      },
      {
        kind: 'keyPoints',
        points: [
          'One index of state ⇒ a 1-D table.',
          'Order the loop so dependencies are already filled.',
          'Collapse to a few variables when the window is bounded.',
        ],
      },
    ],
  },
  {
    id: 'dp-2d-reconstruction',
    title: 'Reconstructing the answer from a 2-D table',
    summary: 'Two indices of state, and how to recover the actual solution.',
    estimatedMinutes: 7,
    tags: ['dynamic-programming', 'tabulation'],
    blocks: [
      {
        kind: 'prose',
        text: 'When a subproblem is described by **two** moving parts — two string positions, an index and a capacity — you fill a 2-D grid. Each cell depends on a small set of neighbors (usually up, left, and up-left).',
      },
      {
        kind: 'code',
        lang: 'go',
        caption: 'Edit distance recurrence',
        code: 'if a[i-1] == b[j-1] {\n\tdp[i][j] = dp[i-1][j-1] // characters match\n} else {\n\tdp[i][j] = 1 + min3(\n\t\tdp[i-1][j],   // delete\n\t\tdp[i][j-1],   // insert\n\t\tdp[i-1][j-1], // replace\n\t)\n}',
      },
      { kind: 'heading', level: 2, text: 'Recovering the choices' },
      {
        kind: 'prose',
        text: 'The table gives the optimal **value**. To recover the optimal **decisions**, walk backward from the answer cell, at each step moving to the neighbor the recurrence chose.',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Watch the offsets',
        text: 'A 2-D DP over strings of length m and n uses an (m+1)×(n+1) grid; row 0 / column 0 are the empty-prefix base cases. Off-by-one here is the most common bug.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Two moving parts ⇒ a 2-D table.',
          'Each cell reads a fixed set of neighbors.',
          'Backtrack through the table to reconstruct the solution itself.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'edit-distance',
        note: 'A classic 2-D DP — trace the grid as you solve it.',
      },
    ],
  },
];
