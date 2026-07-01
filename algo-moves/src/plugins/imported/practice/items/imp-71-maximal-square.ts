import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "recurrence",
      "prompt": "For a cell where `matrix[r-1][c-1] == '1'`, how does the code compute `dp[r][c]`?",
      "choices": [
        {
          "label": "min(dp[r-1][c], dp[r][c-1], dp[r-1][c-1]) + 1",
          "correct": true
        },
        {
          "label": "max(dp[r-1][c], dp[r][c-1], dp[r-1][c-1]) + 1"
        },
        {
          "label": "dp[r-1][c] + dp[r][c-1] - dp[r-1][c-1] + 1"
        },
        {
          "label": "min(dp[r-1][c], dp[r][c-1]) + 1"
        }
      ],
      "explain": "A square can only be as large as the smallest square anchored at the three neighbors (top, left, top-left). Taking the min of all three and adding 1 gives the largest square whose bottom-right corner is at (r,c)."
    },
    {
      "id": "dp-size",
      "prompt": "The `dp` array is sized `(m+1) × (n+1)` with an extra row and column of zeros. What does this extra border provide?",
      "choices": [
        {
          "label": "Implicit base cases: cells on row 0 or column 0 of dp are always 0, so the recurrence works without bounds checks for the first real row/column",
          "correct": true
        },
        {
          "label": "Space to store the total area of all squares found"
        },
        {
          "label": "A guard row to detect when the matrix is fully traversed"
        },
        {
          "label": "Padding required because matrix indices are 1-based in Go"
        }
      ],
      "explain": "By allocating dp with an extra row and column, `dp[r-1][c]`, `dp[r][c-1]`, and `dp[r-1][c-1]` are all in-bounds even when r=1 or c=1, and they're naturally 0 — eliminating if-guards for the matrix boundary."
    },
    {
      "id": "return-value",
      "prompt": "The function tracks `res` as the maximum *side length* seen, then returns `res * res`. Why not track the area directly?",
      "choices": [
        {
          "label": "dp[r][c] stores side length, so comparing and updating side lengths is natural; the area is derived at the end",
          "correct": true
        },
        {
          "label": "Area values could overflow int during the inner loop"
        },
        {
          "label": "The problem requires returning both side length and area as separate fields"
        },
        {
          "label": "Multiplying at the end is faster than computing area inside the nested loop"
        }
      ],
      "explain": "`dp[r][c]` represents the side length of the largest all-1 square with (r,c) as its bottom-right corner. Tracking the max side length and squaring it once at the end is clean and avoids maintaining a separate area variable."
    },
    {
      "id": "why-min-not-max",
      "prompt": "Why does the recurrence use `min` of three neighbors rather than `max`?",
      "choices": [
        {
          "label": "A square requires ALL cells to be '1'; the weakest (smallest) neighbor limits how large the square can be",
          "correct": true
        },
        {
          "label": "Using max would count cells with '0' as part of the square"
        },
        {
          "label": "Using max would double-count corners shared between adjacent squares"
        },
        {
          "label": "min is needed to avoid integer overflow when side lengths are large"
        }
      ],
      "explain": "To form a k×k square at (r,c), the top, left, and top-left neighbors must each support at least a (k-1)×(k-1) square. If any of them is smaller, the square at (r,c) is constrained to that smaller size — hence the min."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `maxSquareArea`?",
      "choices": [
        {
          "label": "O(m·n) time, O(m·n) space",
          "correct": true
        },
        {
          "label": "O(m·n) time, O(n) space"
        },
        {
          "label": "O(m·n·min(m,n)) time, O(m·n) space"
        },
        {
          "label": "O(m²·n²) time, O(m·n) space"
        }
      ],
      "explain": "Each of the m·n cells is visited once, giving O(m·n) time. The dp table has (m+1)·(n+1) entries, so space is O(m·n). A rolling-row optimization could reduce space to O(n), but the code allocates the full table."
    },
    {
      "id": "edge-no-ones",
      "prompt": "What does the function return if the entire matrix contains only '0's?",
      "choices": [
        {
          "label": "0",
          "correct": true
        },
        {
          "label": "1"
        },
        {
          "label": "Panic (index out of range)"
        },
        {
          "label": "The area of the matrix (m*n)"
        }
      ],
      "explain": "`dp[r][c]` is only updated when `matrix[r-1][c-1] == '1'`. With all zeros, every cell is skipped, `res` stays 0, and `res * res` returns 0. The empty-matrix guard at the top handles `len(matrix) == 0`."
    }
  ]
};
