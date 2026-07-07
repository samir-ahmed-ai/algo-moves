import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which algorithm and data structure does `swimInWater` use to find the optimal path?',
      choices: [
        {
          label: 'Dijkstra-style min-heap, tracking — elevation seen along the path',
          correct: true,
        },
        {
          label: 'BFS with a standard queue — using the grid value as distance',
        },
        {
          label: 'DFS with memoization — caching the minimum bottleneck for',
        },
        {
          label: 'Binary search on the answer — combined with BFS reachability checks',
        },
      ],
      explain:
        'The code uses a `minHeap` ordered by grid elevation and the `container/heap` package — this is Dijkstra adapted to minimize the maximum elevation (bottleneck shortest path) rather than the sum of edges. BFS would not respect elevation priorities.',
    },
    {
      id: 'heap-key',
      prompt:
        'Each element pushed onto the heap is `[3]int{grid[nr][nc], nr, nc}`. What does the first field represent and why is it the heap key?',
      choices: [
        {
          label: 'The elevation of the cell; — the heap pops the lowest-elevation',
          correct: true,
        },
        {
          label: 'The Manhattan distance — always expanding the cell',
        },
        {
          label: 'The cumulative sum of elevations — along the path to that cell',
        },
        {
          label: 'A timestamp indicating — cell was discovered',
        },
      ],
      explain:
        "By always expanding the cell with the smallest elevation, we greedily explore the 'cheapest' frontier first. The answer is the maximum elevation on the path taken, which is minimized by this greedy choice — analogous to Dijkstra's min-distance property.",
    },
    {
      id: 'result-update',
      prompt: 'How does the code accumulate the answer `res`?',
      choices: [
        {
          label: '`res` is updated to `max(res — The code does if cur[0] > res { res =',
          correct: true,
        },
        {
          label: '`res` is set to `grid[n-1][n-1]` — when the destination is reached',
        },
        {
          label: '`res` accumulates the sum — all popped cell elevations',
        },
        {
          label: '`res` is the count of cells popped — The code does if cur[0] > res {',
        },
      ],
      explain:
        'The code does `if cur[0] > res { res = cur[0] }` on every pop. Because the heap is a min-heap, later pops have equal-or-higher elevation, so `res` is monotonically non-decreasing and equals the max elevation on the chosen path when the destination is first reached.',
    },
    {
      id: 'visited-early-mark',
      prompt:
        'Cells are marked `vis[nr][nc] = true` when pushed onto the heap, not when popped. Why?',
      choices: [
        {
          label: 'To prevent the same cell — from being pushed multiple times',
          correct: true,
        },
        {
          label: 'Because the heap may reorder — cells, so marking on pop could miss',
        },
        {
          label: 'To ensure the grid values — are read only once per cell for',
        },
        {
          label: 'Marking on push vs. pop — makes no difference here',
        },
      ],
      explain:
        'Multiple neighbors can discover the same unvisited cell before any of them is popped. Marking visited on push ensures only the first discovery enqueues the cell; marking on pop instead would allow duplicate entries and wasted heap operations.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `swimInWater` for an n×n grid?',
      choices: [
        {
          label: 'O(n² log n) — There are n² cells',
          correct: true,
        },
        {
          label: 'O(n²) — There are n² cells',
        },
        {
          label: 'O(n³) — There are n² cells',
        },
        {
          label: 'O(n² log n²) which simplifies — to O(n² log n) but is typically',
        },
      ],
      explain:
        'There are n² cells; each is pushed and popped from the heap at most once. Each heap operation is O(log n²) = O(2 log n) = O(log n). Total: O(n² log n).',
    },
    {
      id: 'early-exit',
      prompt:
        'The code checks `if cur[1] == n-1 && cur[2] == n-1 { return res }` immediately after updating `res`. Why is it correct to return at this point?',
      choices: [
        {
          label: 'The min-heap guarantees — destination is first popped via the',
          correct: true,
        },
        {
          label: 'The destination cell always — so no further',
        },
        {
          label: 'Returning early is an optimization; — the final answer would be the same',
        },
        {
          label: 'The BFS level is complete — at this point, so all optimal paths',
        },
      ],
      explain:
        "Like Dijkstra, the min-heap property ensures the first time we pop (n-1, n-1) it was reached via the path minimizing the maximum elevation. Any other path to the destination that hasn't been popped yet goes through a cell with equal or higher elevation.",
    },
  ],
};
