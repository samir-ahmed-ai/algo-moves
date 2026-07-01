import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What technique expands this from a plain grid BFS to correctly handle obstacle eliminations?",
      "choices": [
        {
          "label": "The BFS state is (row col — remainingEliminations), so each",
          "correct": true
        },
        {
          "label": "Dijkstra with edge weight = — 1 for empty cells and k+1 for"
        },
        {
          "label": "DFS with memoization on (row — col) only"
        },
        {
          "label": "A greedy approach that always — eliminates obstacles on the"
        }
      ],
      "explain": "The `vis[nr][nc][nextRem]` array tracks whether state (r, c, rem) has been visited. Two paths reaching the same cell can have different remaining eliminations and must be explored independently — collapsing to (r,c) only would miss optimal solutions."
    },
    {
      "id": "next-rem-calc",
      "prompt": "How does the code compute `nextRem` when moving to cell (nr, nc)?",
      "choices": [
        {
          "label": "nextRem = rem - grid[nr][nc]; — grid value is 1 for obstacle (costs",
          "correct": true
        },
        {
          "label": "nextRem = rem - 1 — for every move regardless of cell type"
        },
        {
          "label": "nextRem = rem - grid[nr][nc]² — so hitting two obstacles costs 4"
        },
        {
          "label": "nextRem = rem — the cell is empty; the move is"
        }
      ],
      "explain": "grid[nr][nc] is 0 for empty and 1 for obstacle. Subtracting it from rem naturally decrements the budget only when an obstacle is encountered. If nextRem < 0 the move is skipped, enforcing the elimination limit."
    },
    {
      "id": "greedy-shortcut",
      "prompt": "The code returns `m+n-2` immediately when `k >= m+n-3`. What is the reasoning behind this shortcut?",
      "choices": [
        {
          "label": "If k is large enough — to eliminate every obstacle on the",
          "correct": true
        },
        {
          "label": "When k exceeds the grid — perimeter, the answer must equal the"
        },
        {
          "label": "k >= m+n-3 means the grid — so the direct"
        },
        {
          "label": "The BFS would overflow its queue — so an"
        }
      ],
      "explain": "The Manhattan path from (0,0) to (m-1,n-1) has m+n-2 steps and at most m+n-3 intermediate cells (potential obstacles). If k covers all of them, every obstacle can be eliminated, so the shortest possible path length is achieved directly."
    },
    {
      "id": "vis-dimensions",
      "prompt": "The `vis` array is declared as `[m][n][k+1]bool`. Why is the third dimension k+1 rather than k?",
      "choices": [
        {
          "label": "Remaining eliminations range from 0 — to k inclusive, requiring k+1",
          "correct": true
        },
        {
          "label": "The extra slot stores a sentinel — 0,k)"
        },
        {
          "label": "k is 0-indexed so valid — values are 1 through k, requiring k+1"
        },
        {
          "label": "BFS may temporarily use k+1 — eliminations before clamping back to k"
        }
      ],
      "explain": "rem starts at k and decreases; at any cell rem can be any value from 0 (budget exhausted) to k (no obstacles hit yet). Valid indices are [0..k], which is k+1 values — so `make([]bool, k+1)` is the correct size."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity where m×n is the grid size and k is the elimination budget?",
      "choices": [
        {
          "label": "O(m·n·k) time and O(m·n·k) space — The vis array has m·n·(k+1) states",
          "correct": true
        },
        {
          "label": "O(m·n·k²) time and O(m·n) space — The vis array has m·n·(k+1)"
        },
        {
          "label": "O(m·n) time and O(m·n·k) space — The vis array has m·n·(k+1)"
        },
        {
          "label": "O(m²·n²) time and O(m·n·k) space — The vis array has m·n·(k+1)"
        }
      ],
      "explain": "The vis array has m·n·(k+1) states; each state is enqueued and processed at most once, so BFS does O(m·n·k) work. The queue and vis array both require O(m·n·k) space."
    },
    {
      "id": "no-path",
      "prompt": "What does the function return when no path to (m-1, n-1) exists within the elimination budget?",
      "choices": [
        {
          "label": "Returns -1 after the BFS — queue empties without hitting the",
          "correct": true
        },
        {
          "label": "Returns 0 to indicate — impossible case"
        },
        {
          "label": "Returns m+n-2 as a fallback — estimate"
        },
        {
          "label": "Returns k to indicate — budget was fully consumed"
        }
      ],
      "explain": "The target check `if nr==m-1 && nc==n-1 { return steps }` is inside the BFS expansion. If the queue drains without this condition triggering, execution falls through to `return -1`, which is the problem's specified sentinel for an impossible case."
    }
  ]
};
