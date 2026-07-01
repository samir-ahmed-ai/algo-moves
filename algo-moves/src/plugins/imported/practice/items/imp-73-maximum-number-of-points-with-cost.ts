import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "pattern",
      "prompt": "What technique does `maxPoints` use to avoid an O(n²) transition for each row?",
      "choices": [
        {
          "label": "Left-to-right and right-to-left prefix-max sweeps that propagate the best previous-row score while subtracting 1 per column moved",
          "correct": true
        },
        {
          "label": "A segment tree that answers range-maximum queries in O(log n) per cell"
        },
        {
          "label": "A monotonic deque that tracks the maximum within a sliding window"
        },
        {
          "label": "Divide-and-conquer on column ranges to compute the optimal transitions"
        }
      ],
      "explain": "`left[j]` carries the best score reachable from the left with the move cost already deducted (decremented by 1 each step), and `right[j]` does the same from the right. This reduces each row's transition from O(n²) to O(n)."
    },
    {
      "id": "left-sweep",
      "prompt": "In the left sweep, the update is `left[j] = max(dp[j], left[j-1] - 1)`. What does subtracting 1 represent?",
      "choices": [
        {
          "label": "The cost of moving one column to the right from the previous cell, which equals |i - j| = 1 for adjacent cells",
          "correct": true
        },
        {
          "label": "A penalty for choosing the same column as the previous row"
        },
        {
          "label": "Normalizing the score by the column index"
        },
        {
          "label": "Preventing the dp value from exceeding the row's maximum point value"
        }
      ],
      "explain": "The cost of picking column `k` in the previous row and landing on column `j` in the current row is `|k - j|`. Moving one column at a time and decrementing by 1 at each step accumulates exactly this cost by the time the sweep reaches `j`."
    },
    {
      "id": "why-two-sweeps",
      "prompt": "Why are both a left sweep and a right sweep needed?",
      "choices": [
        {
          "label": "The left sweep finds the best previous-row score for transitions coming from the left, and the right sweep finds the best for transitions coming from the right; combining them covers all columns",
          "correct": true
        },
        {
          "label": "The left sweep handles even columns and the right sweep handles odd columns"
        },
        {
          "label": "One sweep is for computing dp values and the other is for backtracking the path"
        },
        {
          "label": "The two sweeps together are equivalent to two passes of bubble sort needed to propagate values correctly"
        }
      ],
      "explain": "For column `j`, the best predecessor could be to its left (k < j) or to its right (k > j). The left sweep propagates the maximum from smaller column indices; the right sweep propagates from larger ones. Taking the max of both at each `j` gives the global best."
    },
    {
      "id": "space-opt",
      "prompt": "The code uses a 1-D `dp` array that is overwritten each row rather than a full m×n table. Why is this valid?",
      "choices": [
        {
          "label": "Each row's dp values depend only on the previous row's dp values, so only one row needs to be kept in memory at a time",
          "correct": true
        },
        {
          "label": "The problem guarantees the matrix has only one row"
        },
        {
          "label": "The left and right arrays together already store the full history"
        },
        {
          "label": "It is not valid and could produce wrong answers on large inputs"
        }
      ],
      "explain": "The transition for row `i` only reads `dp` values from row `i-1`. After computing `left`, `right`, and the new `dp[j]` values, the previous row is no longer needed, so the single array can be safely overwritten."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `maxPoints` for an m×n grid?",
      "choices": [
        {
          "label": "O(m·n) time, O(n) space",
          "correct": true
        },
        {
          "label": "O(m·n) time, O(m·n) space"
        },
        {
          "label": "O(m·n²) time, O(n) space"
        },
        {
          "label": "O(m·n·log n) time, O(n) space"
        }
      ],
      "explain": "Each row processes n columns three times (left sweep, right sweep, update). Across m rows this is O(m·n). Only the `dp`, `left`, and `right` arrays of length n are kept, giving O(n) space."
    },
    {
      "id": "final-answer",
      "prompt": "After processing all rows, how does the code extract the final answer?",
      "choices": [
        {
          "label": "It scans the `dp` array and returns the maximum value",
          "correct": true
        },
        {
          "label": "It returns `dp[0]`, because the left sweep always moves the maximum to the first position"
        },
        {
          "label": "It sums all values in `dp` to get the total achievable points"
        },
        {
          "label": "It returns `dp[n-1]`, the value of the last column"
        }
      ],
      "explain": "The optimal last-row column is unknown in advance, so the code iterates over all entries of `dp` and returns the maximum — the best total score over any ending column."
    }
  ]
};
