import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic pattern does `minimumDeletions` use to solve this problem?",
      "choices": [
        {
          "label": "Single-pass DP tracking b-count — minimum deletions",
          "correct": true
        },
        {
          "label": "Two-pointer shrinking window — The code makes one left-to-right"
        },
        {
          "label": "2D DP over prefix pairs — The code makes one left-to-right"
        },
        {
          "label": "Greedy with a stack — cancel mismatched characters"
        }
      ],
      "explain": "The code makes one left-to-right pass, maintaining `bCount` (b's seen so far) and `dp` (min deletions so far), updating `dp` at each 'a'. There is no second pointer, 2D table, or stack."
    },
    {
      "id": "state-variables",
      "prompt": "What do the two variables `bCount` and `dp` represent at each iteration?",
      "choices": [
        {
          "label": "`bCount` = number of 'b's — seen so far; `dp` = minimum deletions",
          "correct": true
        },
        {
          "label": "`bCount` = total 'b's — the string; `dp` = deletions of 'a's"
        },
        {
          "label": "`bCount` = index — last 'b'; `dp` = current window size"
        },
        {
          "label": "`bCount` = deletions of 'b's; — `dp` = deletions of 'a's"
        }
      ],
      "explain": "`bCount` is incremented each time a 'b' is encountered, so it always equals the number of 'b's in the prefix processed so far. `dp` is the minimum deletions to make that prefix balanced — it is updated only when an 'a' is seen."
    },
    {
      "id": "recurrence",
      "prompt": "When `s[i] == 'a'`, how does the code update `dp`?",
      "choices": [
        {
          "label": "`dp = min(dp+1, bCount)` delete — this 'a' or delete all 'b's before",
          "correct": true
        },
        {
          "label": "`dp++` unconditionally — The code checks if dp+1 < bCount"
        },
        {
          "label": "`dp = bCount` unconditionally — The code checks if dp+1 < bCount"
        },
        {
          "label": "`dp = dp - bCount` — to cancel b deletions"
        }
      ],
      "explain": "The code checks `if dp+1 < bCount { dp++ } else { dp = bCount }`, which is exactly `dp = min(dp+1, bCount)`. Deleting this 'a' costs dp+1; deleting all preceding 'b's costs bCount. The minimum is taken."
    },
    {
      "id": "why-no-array",
      "prompt": "Why does this solution use O(1) space instead of an array of size n?",
      "choices": [
        {
          "label": "Each step only needs — running `bCount` and the previous",
          "correct": true
        },
        {
          "label": "The string contains only two — characters, so space can always be"
        },
        {
          "label": "Go slices are passed — reference so no copy is needed"
        },
        {
          "label": "The recurrence looks two characters — ahead, making an array redundant"
        }
      ],
      "explain": "The transition `dp = min(dp+1, bCount)` depends only on the current `dp` and the running `bCount`. No earlier DP values are revisited, so a single scalar suffices instead of a full dp array."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `minimumDeletions`?",
      "choices": [
        {
          "label": "O(n) time, O(1) space — A single loop over n characters gives",
          "correct": true
        },
        {
          "label": "O(n) time, O(n) space — A single loop over n characters"
        },
        {
          "label": "O(n log n) time, O(1) — space"
        },
        {
          "label": "O(n²) time, O(1) space — A single loop over n characters"
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
          "label": "The function panics because `dp` — is never updated"
        }
      ],
      "explain": "The `dp` update branch executes only when `s[i] == 'a'`. A string of all 'b's never triggers it, so `dp` stays 0 — correctly reflecting that no deletions are needed."
    }
  ]
};
