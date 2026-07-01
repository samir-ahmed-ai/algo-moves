import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "pattern",
      "prompt": "Which DP pattern does `minPathSumInMatrix` use?",
      "choices": [
        {
          "label": "In-place grid DP: overwrite each cell with the cumulative minimum path cost from the top-left",
          "correct": true
        },
        {
          "label": "Dijkstra's algorithm with a min-heap to find the cheapest path"
        },
        {
          "label": "Top-down memoized recursion from the bottom-right cell"
        },
        {
          "label": "BFS with a deque to process cells in non-decreasing cost order"
        }
      ],
      "explain": "The code modifies `grid` in place, accumulating costs leftward along the first row and downward along the first column, then filling the rest with `grid[r][c] += min(grid[r-1][c], grid[r][c-1])`. No extra array is needed."
    },
    {
      "id": "boundary-init",
      "prompt": "Before the main nested loop, the code separately initializes the first column and first row. Why can't these be handled inside the main loop?",
      "choices": [
        {
          "label": "Cells in the first row have no left neighbor and cells in the first column have no top neighbor, so the min(top, left) recurrence would read out-of-bounds or use zero incorrectly",
          "correct": true
        },
        {
          "label": "Go does not allow modifying a slice element inside a range loop"
        },
        {
          "label": "The first row and column always contain the minimum values and must be fixed before the DP propagates"
        },
        {
          "label": "Initializing them separately avoids an off-by-one error in the row/column indices"
        }
      ],
      "explain": "The first column can only be reached from above (no left neighbor), and the first row can only be reached from the left (no top neighbor). The recurrence `min(grid[r-1][c], grid[r][c-1])` would use uninitialized (zero) values if these boundaries weren't pre-filled with their running prefix sums."
    },
    {
      "id": "recurrence",
      "prompt": "For interior cell (r, c), the update is `grid[r][c] += min(grid[r-1][c], grid[r][c-1])`. What invariant holds for `grid[r-1][c]` and `grid[r][c-1]` at this point?",
      "choices": [
        {
          "label": "They already hold the minimum path cost from (0,0) to those neighbors",
          "correct": true
        },
        {
          "label": "They hold the original matrix values unchanged"
        },
        {
          "label": "They hold the maximum path cost to those neighbors, which the min selects the cheaper from"
        },
        {
          "label": "They hold the sum of all cells on the shortest path to those neighbors"
        }
      ],
      "explain": "Because the loops process cells in row-major order (top-to-bottom, left-to-right), both the top neighbor (r-1,c) and left neighbor (r,c-1) have already been updated to reflect their minimum path cost from (0,0) when (r,c) is processed."
    },
    {
      "id": "space-complexity",
      "prompt": "The problem's space annotation says `O(1) in-place`. What enables this?",
      "choices": [
        {
          "label": "The code overwrites the input `grid` directly rather than allocating a separate dp table",
          "correct": true
        },
        {
          "label": "Go's garbage collector reclaims the grid after each row is processed"
        },
        {
          "label": "The algorithm only needs to store the current cell's value, not the entire grid"
        },
        {
          "label": "A rolling-array optimization reduces the dp table to a single row"
        }
      ],
      "explain": "By reusing `grid` as the dp table, no auxiliary array is allocated. This is O(1) auxiliary space (beyond the input itself). A separate dp array would cost O(m·n)."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `minPathSumInMatrix`?",
      "choices": [
        {
          "label": "O(m·n)",
          "correct": true
        },
        {
          "label": "O((m+n)·log(m·n))"
        },
        {
          "label": "O(m·n·min(m,n))"
        },
        {
          "label": "O(m²·n²)"
        }
      ],
      "explain": "The first-column and first-row passes each visit O(m) and O(n) cells respectively. The main nested loop visits each of the remaining (m-1)·(n-1) cells once. Total work is proportional to m·n."
    },
    {
      "id": "edge-single-cell",
      "prompt": "If `grid` is a 1×1 matrix containing the value 7, what does the function return?",
      "choices": [
        {
          "label": "7",
          "correct": true
        },
        {
          "label": "0"
        },
        {
          "label": "Panic (index out of range)"
        },
        {
          "label": "14, because the path visits the cell once going right and once going down"
        }
      ],
      "explain": "With m=1 and n=1, both boundary loops and the main nested loop have zero iterations. The function returns `grid[0][0]`, which is 7. There is exactly one cell and one path (staying in place)."
    }
  ]
};
