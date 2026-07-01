import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic category best describes `searchRotated`?",
      "choices": [
        {
          "label": "Binary search on a rotated sorted array",
          "correct": true
        },
        {
          "label": "Linear scan with early exit"
        },
        {
          "label": "Two-pointer convergence"
        },
        {
          "label": "Divide-and-conquer merge"
        }
      ],
      "explain": "The code maintains `low`/`high` pointers and halves the search space each iteration — binary search — but the rotation means one extra check is needed to determine which half is sorted."
    },
    {
      "id": "sorted-half-invariant",
      "prompt": "The condition `a[low] <= a[mid]` in `searchRotated` is used to determine what?",
      "choices": [
        {
          "label": "Whether the left half [low, mid] is the sorted half",
          "correct": true
        },
        {
          "label": "Whether `mid` is the rotation pivot"
        },
        {
          "label": "Whether `key` is less than `a[mid]`"
        },
        {
          "label": "Whether the right half [mid, high] is the sorted half"
        }
      ],
      "explain": "`a[low] <= a[mid]` means no rotation break exists between `low` and `mid`, so that segment is fully sorted. When false, the rotation must be in the left half, meaning the right half [mid, high] is the sorted one."
    },
    {
      "id": "key-mechanic",
      "prompt": "After confirming the left half is sorted (`a[low] <= a[mid]`), the code moves `high = mid - 1` when which condition holds?",
      "choices": [
        {
          "label": "`a[low] <= key && key < a[mid]`",
          "correct": true
        },
        {
          "label": "`key < a[low]`"
        },
        {
          "label": "`a[mid] < key && key <= a[high]`"
        },
        {
          "label": "`key == a[mid]`"
        }
      ],
      "explain": "When the key falls within the sorted left range `[a[low], a[mid])`, we discard the right half by setting `high = mid - 1`. The symmetric condition in the else branch handles the case where the right half is sorted."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `searchRotated`?",
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
      "explain": "The iterative loop halves the search space each round, giving O(log n) time. No auxiliary data structures are allocated, so space is O(1)."
    },
    {
      "id": "edge-case",
      "prompt": "What does `searchRotated` return when `key` is not present in the array?",
      "choices": [
        {
          "label": "-1, because the loop exits with `low > high` and no match was found",
          "correct": true
        },
        {
          "label": "0, the default integer value"
        },
        {
          "label": "The index of the closest element"
        },
        {
          "label": "It panics with an index-out-of-bounds error"
        }
      ],
      "explain": "The only explicit returns inside the loop are for `a[mid] == key`. When the loop terminates without a match (`low > high`), the function falls through to `return -1`."
    },
    {
      "id": "mid-calculation",
      "prompt": "Why does the code compute `mid := low + (high-low)/2` instead of `(low+high)/2`?",
      "choices": [
        {
          "label": "To avoid integer overflow when `low` and `high` are large",
          "correct": true
        },
        {
          "label": "To ensure `mid` always rounds up"
        },
        {
          "label": "To handle the case where `low == high`"
        },
        {
          "label": "Because Go's integer division truncates differently for negative numbers"
        }
      ],
      "explain": "`low + high` can overflow the integer type for very large indices. Subtracting first keeps the intermediate value bounded by the array size."
    }
  ]
};
