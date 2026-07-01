import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which DP strategy does `numberOfUniquePathsIn` use to count grid paths?",
      "choices": [
        {
          "label": "Space-optimized 1D DP updating a single row array in-place, row by row",
          "correct": true
        },
        {
          "label": "Full 2D DP table of size m×n"
        },
        {
          "label": "Recursive DFS with memoization"
        },
        {
          "label": "Mathematical combinatorics (binomial coefficient)"
        }
      ],
      "explain": "The code allocates only a 1D slice of length n and updates it row-by-row with `dp[j] += dp[j-1]`, achieving O(n) space instead of the O(m·n) a 2D table would need."
    },
    {
      "id": "base-case",
      "prompt": "Why is `dp[j] = 1` for all j before the main loop starts?",
      "choices": [
        {
          "label": "The first row has exactly one path to each cell (only move right), so all entries start at 1",
          "correct": true
        },
        {
          "label": "It avoids a division-by-zero in the recurrence"
        },
        {
          "label": "It represents that every column has one path downward"
        },
        {
          "label": "It is a sentinel value that is overwritten immediately"
        }
      ],
      "explain": "From the top-left corner, the first row is reachable only by moving right, so there is exactly one path to each cell in row 0. Initializing `dp[j] = 1` for all j encodes this before processing rows 1 through m-1."
    },
    {
      "id": "recurrence",
      "prompt": "What does the update `dp[j] += dp[j-1]` compute for each cell (i, j)?",
      "choices": [
        {
          "label": "Paths to (i, j) = paths from above (dp[j] before update) + paths from the left (dp[j-1] just updated)",
          "correct": true
        },
        {
          "label": "Paths to (i, j) = paths from the left minus paths from above"
        },
        {
          "label": "Paths to (i, j) = paths to the previous row's rightmost cell"
        },
        {
          "label": "It computes the running sum of all cells in the current row"
        }
      ],
      "explain": "Before the update, `dp[j]` holds the count for the cell directly above (i-1, j). `dp[j-1]` was just updated for (i, j-1). Adding them gives the number of paths arriving at (i, j) from either direction — exactly the grid DP recurrence."
    },
    {
      "id": "why-j-starts-at-1",
      "prompt": "The inner loop starts at `j = 1`, not `j = 0`. Why is `j = 0` skipped?",
      "choices": [
        {
          "label": "The leftmost column always has exactly one path (straight down), so dp[0] never changes from its initial value of 1",
          "correct": true
        },
        {
          "label": "Accessing `dp[-1]` would panic, so j = 0 is skipped for safety"
        },
        {
          "label": "The first cell is always 0 paths by convention"
        },
        {
          "label": "The update `dp[0] += dp[-1]` would wrap around to the last element"
        }
      ],
      "explain": "In a grid where you can only move right or down, the leftmost column (j = 0) is reachable only by moving straight down — one path for every row. Starting the inner loop at j = 1 preserves dp[0] = 1 throughout, correctly reflecting this."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `numberOfUniquePathsIn`?",
      "choices": [
        {
          "label": "O(m·n) time, O(n) space",
          "correct": true
        },
        {
          "label": "O(m·n) time, O(m·n) space"
        },
        {
          "label": "O(m+n) time, O(n) space"
        },
        {
          "label": "O(n²) time, O(1) space"
        }
      ],
      "explain": "The double loop iterates m×n cells total — O(m·n) time. Only a 1D array of size n is allocated, so space is O(n) regardless of m."
    },
    {
      "id": "edge-case",
      "prompt": "What does the function return when m = 1 (a single-row grid)?",
      "choices": [
        {
          "label": "1 — the outer loop `for i := 1; i < m` never executes, so dp stays all 1s and dp[n-1] = 1",
          "correct": true
        },
        {
          "label": "n — one path per column"
        },
        {
          "label": "0 — the grid has no valid path"
        },
        {
          "label": "It panics because the loop bounds become negative"
        }
      ],
      "explain": "When m = 1, the outer loop condition `i < m` is immediately false, so dp is returned as initialized: all 1s. `dp[n-1]` is 1, which is correct — there is exactly one path in a single row (move right all the way)."
    }
  ]
};
