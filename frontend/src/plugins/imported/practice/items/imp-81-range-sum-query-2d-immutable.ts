import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Range Sum Query 2D - Immutable is best categorized as which pattern?',
      choices: [
        {
          label: '2D prefix sum with O(1) — query',
          correct: true,
        },
        {
          label: '2D sliding window — The code builds a 2D prefix',
        },
        {
          label: 'BFS on a grid — The code builds a 2D prefix',
        },
        {
          label: 'Segment tree over rows — The code builds a 2D prefix',
        },
      ],
      explain:
        "The code builds a 2D prefix table in O(m*n) and answers each rectangle query in O(1) via inclusion-exclusion — the defining trait of the 2D prefix-sum pattern. Sliding window doesn't give O(1) arbitrary-rectangle queries.",
    },
    {
      id: 'build-recurrence',
      prompt: 'What recurrence does `newRangeSumMatrix` use to fill `prefix[r+1][c+1]`?',
      choices: [
        {
          label: 'matrix + row + col − overlap — subtract doubly-counted top-left',
          correct: true,
        },
        {
          label: 'matrix + row + col — omits overlap correction',
        },
        {
          label: 'row + col without matrix — drops current cell value',
        },
        {
          label: 'diagonal sum — wrong 2D prefix recurrence',
        },
      ],
      explain:
        'Each cell accumulates the element plus the row-prefix and column-prefix, then subtracts the doubly-counted top-left rectangle `prefix[r][c]`. Omitting the subtraction would double-count the overlap.',
    },
    {
      id: 'query-formula',
      prompt:
        'Which inclusion-exclusion formula does `rangeSumQueryInMatrix` use to answer a query (row1,col1)→(row2,col2)?',
      choices: [
        {
          label: 'BR − TR − BL + TL — four-corner inclusion-exclusion',
          correct: true,
        },
        {
          label: 'BR − TL — misses two strip subtractions',
        },
        {
          label: '0-indexed corners — padded table uses +1 offsets',
        },
        {
          label: 'BR + TL corners — adds instead of subtracting strips',
        },
      ],
      explain:
        'The prefix array is 1-indexed (size m+1 × n+1), so the bottom-right corner maps to `prefix[row2+1][col2+1]`. The missing `+prefix[row1][col1]` in option D would subtract the top-left rectangle twice.',
    },
    {
      id: 'why-padded',
      prompt:
        'Why does `newRangeSumMatrix` allocate `prefix` of size (m+1) × (n+1) instead of m × n?',
      choices: [
        {
          label: 'Zero border row/col — sentinel base for r=0 or c=0',
          correct: true,
        },
        {
          label: 'Store original matrix — prefix table is separate',
        },
        {
          label: 'Handle out-of-bounds queries — not the build padding goal',
        },
        {
          label: 'Force 0-indexed query formula — padding is for build edges',
        },
      ],
      explain:
        'The extra row and column of zeros act as sentinels so `prefix[r][c+1]` and `prefix[r+1][c]` are always valid even when r=0 or c=0, eliminating boundary conditionals in the build loop.',
    },
    {
      id: 'complexity',
      prompt: 'What are the build and query complexities for this 2D prefix-sum solution?',
      choices: [
        {
          label: 'O(m·n) build, O(1) query — fixed four-cell lookup',
          correct: true,
        },
        {
          label: 'O(m·n) build, O(min(m,n)) query — must scan rectangle edge',
        },
        {
          label: 'O(m·n log(m·n)) build, O(log(m·n)) query — needs segment tree',
        },
        {
          label: 'O(m·n) build, O(m+n) query — walks both dimensions',
        },
      ],
      explain:
        'Building the prefix table visits every cell once — O(m*n). Each query is a fixed four-cell arithmetic expression on the prefix table — O(1) regardless of rectangle size.',
    },
  ],
};
