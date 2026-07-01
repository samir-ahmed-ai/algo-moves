import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does `findMissingInAp` use?",
      "choices": [
        {
          "label": "Binary search on the expected — AP term",
          "correct": true
        },
        {
          "label": "Prefix-sum difference scan — The code computes expected ="
        },
        {
          "label": "Two-pointer arithmetic — The code computes expected ="
        },
        {
          "label": "Hash-set membership check — The code computes expected ="
        }
      ],
      "explain": "The code computes `expected = a[0] + mid*diff` for each `mid` and compares with the actual value. A match means the prefix is intact and the gap is to the right; a mismatch means the gap is at or left of `mid`, and the search halves accordingly."
    },
    {
      "id": "diff-calculation",
      "prompt": "The common difference is computed as `diff := (a[high] - a[low]) / n` where `n = len(a)`. Why divide by `n` instead of `n-1`?",
      "choices": [
        {
          "label": "The slice holds n present — terms but, with one interior term",
          "correct": true
        },
        {
          "label": "To avoid a divide-by-zero — the array has one element"
        },
        {
          "label": "Because `a` is 0-indexed — The complete progression has n+1"
        },
        {
          "label": "To match Go's integer division — semantics"
        }
      ],
      "explain": "The complete progression has n+1 terms (n steps between first and last). One interior term is missing, so the n-element slice still runs from the true first to the true last term — a span of n steps. Dividing the full span `a[high]-a[low]` by n therefore recovers the true common difference."
    },
    {
      "id": "key-mechanic",
      "prompt": "When `a[mid] == expected`, the code sets `low = mid + 1`. What does this mean about the missing term?",
      "choices": [
        {
          "label": "The left half [low, mid] — is intact, so the missing term must",
          "correct": true
        },
        {
          "label": "The missing term — found at `mid`"
        },
        {
          "label": "The array has no missing — term"
        },
        {
          "label": "The pivot is the missing — term"
        }
      ],
      "explain": "If the actual value matches the expected AP value at `mid`, the sequence up to that point has no gaps. The missing element must lie somewhere to the right, so we advance `low`."
    },
    {
      "id": "answer-derivation",
      "prompt": "After the loop exits, the answer is returned as `a[0] + low*diff`. Why is `low` (not `high`) used here?",
      "choices": [
        {
          "label": "The loop exits with `low — > high`; `low` is the first index",
          "correct": true
        },
        {
          "label": "Because `high` might be negative — after the last decrement"
        },
        {
          "label": "`low` is always the midpoint — of the final interval"
        },
        {
          "label": "Go range semantics make `low` — safer to access"
        }
      ],
      "explain": "Every index `< low` matched its expected AP value, and `low` is the first index that did not (or is one past the end). That boundary `low` is the slot the missing term would occupy, so `a[0] + low*diff` reconstructs it."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `findMissingInAp`?",
      "choices": [
        {
          "label": "O(log n) time, O(1) space — One binary search over the n-element",
          "correct": true
        },
        {
          "label": "O(n) time, O(1) space — One binary search over the"
        },
        {
          "label": "O(n log n) time, O(1) — space"
        },
        {
          "label": "O(log n) time, O(n) space — One binary search over the"
        }
      ],
      "explain": "One binary search over the n-element array: O(log n). Only scalar variables are allocated: O(1) space."
    },
    {
      "id": "edge-case",
      "prompt": "What does `findMissingInAp` rely on about *where* the missing term is, for `diff` to come out correct?",
      "choices": [
        {
          "label": "The missing term must — interior if the first or last term",
          "correct": true
        },
        {
          "label": "Nothing; it returns `a[0] - — diff` for a missing first term"
        },
        {
          "label": "Nothing; it returns `a[n-1] + — diff` for a missing last term"
        },
        {
          "label": "It returns 0 whenever — missing term is at an endpoint"
        }
      ],
      "explain": "`diff = (a[high]-a[low]) / n` assumes a[0] and a[n-1] are the true endpoints of the full progression. If an endpoint term were the missing one, that span would cover fewer than n steps, `diff` would be miscomputed, and the result would be wrong — so the constraint that the missing term is interior is implicit."
    }
  ]
};
