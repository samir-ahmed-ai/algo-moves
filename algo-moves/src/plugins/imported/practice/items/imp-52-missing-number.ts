import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What pattern does `findMissingInConsecNums` apply to locate the missing number?",
      "choices": [
        {
          "label": "Binary search on a sorted consecutive sequence using index-vs-value drift",
          "correct": true
        },
        {
          "label": "Linear scan comparing adjacent elements"
        },
        {
          "label": "Hash set membership check"
        },
        {
          "label": "Prefix-sum difference"
        }
      ],
      "explain": "The code binary-searches the sorted array and at each `mid` compares `a[mid]` against `a[0]+mid` (the expected value if no gap exists). A discrepancy signals the gap is at or before `mid`. Linear scan, hashing, and prefix-sum are all O(n) approaches not used here."
    },
    {
      "id": "key-invariant",
      "prompt": "What does the expression `a[0] + mid` represent inside the loop?",
      "choices": [
        {
          "label": "The value `a[mid]` should have if no number is missing before index `mid`",
          "correct": true
        },
        {
          "label": "The midpoint index of the remaining search range"
        },
        {
          "label": "The value of the missing number itself"
        },
        {
          "label": "A checksum used to detect corruption"
        }
      ],
      "explain": "Because the array is consecutive starting at `a[0]`, element at index `mid` should equal `a[0]+mid`. Any deviation means a number has been dropped somewhere in `[0, mid]`. This comparison drives both the early-return and the search direction decisions."
    },
    {
      "id": "early-return",
      "prompt": "Under what condition does the code return `expected` immediately instead of continuing to binary-search?",
      "choices": [
        {
          "label": "When `mid > 0`, the previous element is in place (`a[mid-1] == a[0]+mid-1`), and the current element is out of place (`a[mid] != expected`)",
          "correct": true
        },
        {
          "label": "Whenever `a[mid] != expected`, regardless of the previous element"
        },
        {
          "label": "When `low == high`"
        },
        {
          "label": "When `a[mid] > expected`"
        }
      ],
      "explain": "The guard `mid > 0 && a[mid-1] == a[0]+mid-1 && a[mid] != expected` pins the missing number exactly at position `mid`: the element just before is correct but this one is wrong, so `expected` (= `a[0]+mid`) is the missing value. Without the `a[mid-1]` check the code could fire at a position where the gap is earlier."
    },
    {
      "id": "fallback",
      "prompt": "After the loop exits normally (without hitting the early return), what does the code return?",
      "choices": [
        {
          "label": "`a[0] + low`",
          "correct": true
        },
        {
          "label": "`a[0] + high`"
        },
        {
          "label": "`a[len(a)-1] + 1`"
        },
        {
          "label": "-1 to indicate not found"
        }
      ],
      "explain": "`low` ends up pointing past the last matching index, so `a[0]+low` is the first expected value that has no matching element — the missing number. Using `high` would be off by one in the other direction."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `findMissingInConsecNums`?",
      "choices": [
        {
          "label": "O(log n) time, O(1) space",
          "correct": true
        },
        {
          "label": "O(n) time, O(1) space"
        },
        {
          "label": "O(log n) time, O(log n) space"
        },
        {
          "label": "O(n log n) time, O(1) space"
        }
      ],
      "explain": "Each iteration halves the search space — classic binary search giving O(log n) time. Only a handful of scalar variables (`low`, `high`, `mid`, `expected`) are used, so space is O(1)."
    },
    {
      "id": "edge-case",
      "prompt": "If the missing number is the very last element that should follow the array (e.g., array is `[3, 4, 5]` and 6 is missing), which code path handles this?",
      "choices": [
        {
          "label": "The fallback `return a[0] + low` after the loop exits",
          "correct": true
        },
        {
          "label": "The early-return inside the loop when `a[mid] != expected`"
        },
        {
          "label": "A special sentinel check before the loop"
        },
        {
          "label": "The `high = mid - 1` branch moves `high` past the end"
        }
      ],
      "explain": "When the gap is at the far right, `a[mid] == expected` for every `mid`, so `low` keeps advancing to `len(a)`. The loop exits and `a[0]+low` correctly yields the value one past the last element. The early-return condition (`a[mid] != expected`) is never triggered."
    }
  ]
};
