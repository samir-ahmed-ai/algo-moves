import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithm and data structure does `swimInWater` use to find the optimal path?",
      "choices": [
        {
          "label": "Dijkstra-style min-heap, tracking the maximum elevation seen along the path",
          "correct": true
        },
        {
          "label": "BFS with a standard queue, using the grid value as distance"
        },
        {
          "label": "DFS with memoization, caching the minimum bottleneck for each cell"
        },
        {
          "label": "Binary search on the answer combined with BFS reachability checks"
        }
      ],
      "explain": "The code uses a `minHeap` ordered by grid elevation and the `container/heap` package — this is Dijkstra adapted to minimize the maximum elevation (bottleneck shortest path) rather than the sum of edges. BFS would not respect elevation priorities."
    },
    {
      "id": "heap-key",
      "prompt": "Each element pushed onto the heap is `[3]int{grid[nr][nc], nr, nc}`. What does the first field represent and why is it the heap key?",
      "choices": [
        {
          "label": "The elevation of the cell; the heap pops the lowest-elevation unvisited cell next to minimize the bottleneck on the path",
          "correct": true
        },
        {
          "label": "The Manhattan distance from (0,0); the heap pops the closest cell first"
        },
        {
          "label": "The cumulative sum of elevations along the path to that cell"
        },
        {
          "label": "A timestamp indicating when the cell was discovered"
        }
      ],
      "explain": "By always expanding the cell with the smallest elevation, we greedily explore the 'cheapest' frontier first. The answer is the maximum elevation on the path taken, which is minimized by this greedy choice — analogous to Dijkstra's min-distance property."
    },
    {
      "id": "result-update",
      "prompt": "How does the code accumulate the answer `res`?",
      "choices": [
        {
          "label": "`res` is updated to `max(res, cur[0])` each time a cell is popped, tracking the highest elevation seen on the path so far",
          "correct": true
        },
        {
          "label": "`res` is set to `grid[n-1][n-1]` when the destination is reached"
        },
        {
          "label": "`res` accumulates the sum of all popped cell elevations"
        },
        {
          "label": "`res` is the count of cells popped before reaching (n-1, n-1)"
        }
      ],
      "explain": "The code does `if cur[0] > res { res = cur[0] }` on every pop. Because the heap is a min-heap, later pops have equal-or-higher elevation, so `res` is monotonically non-decreasing and equals the max elevation on the chosen path when the destination is first reached."
    },
    {
      "id": "visited-early-mark",
      "prompt": "Cells are marked `vis[nr][nc] = true` when pushed onto the heap, not when popped. Why?",
      "choices": [
        {
          "label": "To prevent the same cell from being pushed multiple times before it is popped, which would cause redundant processing",
          "correct": true
        },
        {
          "label": "Because the heap may reorder cells, so marking on pop could miss some cells"
        },
        {
          "label": "To ensure the grid values are read only once per cell for correctness"
        },
        {
          "label": "Marking on push vs. pop makes no difference here"
        }
      ],
      "explain": "Multiple neighbors can discover the same unvisited cell before any of them is popped. Marking visited on push ensures only the first discovery enqueues the cell; marking on pop instead would allow duplicate entries and wasted heap operations."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `swimInWater` for an n×n grid?",
      "choices": [
        {
          "label": "O(n² log n)",
          "correct": true
        },
        {
          "label": "O(n²)"
        },
        {
          "label": "O(n³)"
        },
        {
          "label": "O(n² log n²) which simplifies to O(n² log n) but is typically written O(n⁴) in textbooks"
        }
      ],
      "explain": "There are n² cells; each is pushed and popped from the heap at most once. Each heap operation is O(log n²) = O(2 log n) = O(log n). Total: O(n² log n)."
    },
    {
      "id": "early-exit",
      "prompt": "The code checks `if cur[1] == n-1 && cur[2] == n-1 { return res }` immediately after updating `res`. Why is it correct to return at this point?",
      "choices": [
        {
          "label": "The min-heap guarantees that the destination is first popped via the path with the minimum bottleneck elevation, so `res` at that moment is optimal",
          "correct": true
        },
        {
          "label": "The destination cell always has the highest elevation, so no further cells need to be explored"
        },
        {
          "label": "Returning early is an optimization; the final answer would be the same without this check"
        },
        {
          "label": "The BFS level is complete at this point, so all optimal paths have been found"
        }
      ],
      "explain": "Like Dijkstra, the min-heap property ensures the first time we pop (n-1, n-1) it was reached via the path minimizing the maximum elevation. Any other path to the destination that hasn't been popped yet goes through a cell with equal or higher elevation."
    }
  ]
};
