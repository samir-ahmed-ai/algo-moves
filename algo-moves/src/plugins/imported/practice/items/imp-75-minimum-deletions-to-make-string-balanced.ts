import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic pattern does `minimumDeletions` use to solve this problem?",
      "choices": [
        {
          "label": "Single-pass DP tracking b-count and minimum deletions",
          "correct": true
        },
        {
          "label": "Two-pointer shrinking window"
        },
        {
          "label": "2D DP over prefix pairs"
        },
        {
          "label": "Greedy with a stack to cancel mismatched characters"
        }
      ],
      "explain": "The code makes one left-to-right pass, maintaining `bCount` (b's seen so far) and `dp` (min deletions so far), updating `dp` at each 'a'. There is no second pointer, 2D table, or stack."
    },
    {
      "id": "state-variables",
      "prompt": "What do the two variables `bCount` and `dp` represent at each iteration?",
      "choices": [
        {
          "label": "`bCount` = number of 'b's seen so far; `dp` = minimum deletions to balance the prefix ending here",
          "correct": true
        },
        {
          "label": "`bCount` = total 'b's in the string; `dp` = deletions of 'a's only"
        },
        {
          "label": "`bCount` = index of the last 'b'; `dp` = current window size"
        },
        {
          "label": "`bCount` = deletions of 'b's; `dp` = deletions of 'a's"
        }
      ],
      "explain": "`bCount` is incremented each time a 'b' is encountered, so it always equals the number of 'b's in the prefix processed so far. `dp` is the minimum deletions to make that prefix balanced — it is updated only when an 'a' is seen."
    },
    {
      "id": "recurrence",
      "prompt": "When `s[i] == 'a'`, how does the code update `dp`?",
      "choices": [
        {
          "label": "`dp = min(dp+1, bCount)` — delete this 'a' or delete all 'b's before it, whichever is cheaper",
          "correct": true
        },
        {
          "label": "`dp++` unconditionally"
        },
        {
          "label": "`dp = bCount` unconditionally"
        },
        {
          "label": "`dp = dp - bCount` to cancel b deletions"
        }
      ],
      "explain": "The code checks `if dp+1 < bCount { dp++ } else { dp = bCount }`, which is exactly `dp = min(dp+1, bCount)`. Deleting this 'a' costs dp+1; deleting all preceding 'b's costs bCount. The minimum is taken."
    },
    {
      "id": "why-no-array",
      "prompt": "Why does this solution use O(1) space instead of an array of size n?",
      "choices": [
        {
          "label": "Each step only needs the running `bCount` and the previous `dp` value, not any earlier state",
          "correct": true
        },
        {
          "label": "The string contains only two characters, so space can always be reduced"
        },
        {
          "label": "Go slices are passed by reference so no copy is needed"
        },
        {
          "label": "The recurrence looks two characters ahead, making an array redundant"
        }
      ],
      "explain": "The transition `dp = min(dp+1, bCount)` depends only on the current `dp` and the running `bCount`. No earlier DP values are revisited, so a single scalar suffices instead of a full dp array."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `minimumDeletions`?",
      "choices": [
        {
          "label": "O(n) time, O(1) space",
          "correct": true
        },
        {
          "label": "O(n) time, O(n) space"
        },
        {
          "label": "O(n log n) time, O(1) space"
        },
        {
          "label": "O(n²) time, O(1) space"
        }
      ],
      "explain": "A single loop over n characters gives O(n) time. Only two integer variables (`bCount`, `dp`) are maintained regardless of input size, giving O(1) space."
    },
    {
      "id": "edge-case",
      "prompt": "What does `minimumDeletions` return for a string that contains only 'b's (e.g., \"bbb\")?",
      "choices": [
        {
          "label": "0 — the string is already balanced; no 'a' appears after any 'b'",
          "correct": true
        },
        {
          "label": "3 — all 'b's must be deleted"
        },
        {
          "label": "1 — one deletion normalizes the string"
        },
        {
          "label": "The function panics because `dp` is never updated"
        }
      ],
      "explain": "The `dp` update branch executes only when `s[i] == 'a'`. A string of all 'b's never triggers it, so `dp` stays 0 — correctly reflecting that no deletions are needed."
    }
  ]
};
