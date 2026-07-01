import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `countOccurrence` use to count how many times `key` appears in the sorted array?",
      "choices": [
        {
          "label": "Two binary searches — one for the first index ≥ key and one for the first index > key — then subtracts them",
          "correct": true
        },
        {
          "label": "A single binary search that counts matching elements outward from the hit"
        },
        {
          "label": "Linear scan incrementing a counter"
        },
        {
          "label": "Hash map frequency count"
        }
      ],
      "explain": "`btFirstGreaterOrEqual` finds `left` (first position where `a[pos] >= key`) and `btFirstGreater` finds `right` (first position where `a[pos] > key`). The difference `right - left` is exactly the count. Scanning outward or a linear pass would be O(n)."
    },
    {
      "id": "lower-bound-pivot",
      "prompt": "In `btFirstGreaterOrEqual`, when `a[mid] >= key` the code sets `high = mid`. Why not `high = mid - 1`?",
      "choices": [
        {
          "label": "Because `mid` itself could be the answer, so it must remain inside the search range",
          "correct": true
        },
        {
          "label": "To avoid an infinite loop when `low == high`"
        },
        {
          "label": "Because the loop condition is `low <= high`, so shrinking further is safe"
        },
        {
          "label": "It is a bug — `high = mid - 1` would be more correct"
        }
      ],
      "explain": "This is the classic lower-bound template: when the current element already satisfies `>= key`, it might be the leftmost occurrence, so we keep it in play by setting `high = mid` (not `mid-1`). The loop invariant guarantees eventual convergence because `mid < high` whenever `low < high`."
    },
    {
      "id": "upper-bound-pivot",
      "prompt": "In `btFirstGreater`, the loop initializes `high = len(a)` (one past the end). Why?",
      "choices": [
        {
          "label": "To allow `right` to equal `len(a)` when all elements are <= key, signalling key occupies the tail of the array",
          "correct": true
        },
        {
          "label": "To prevent an index-out-of-bounds panic at `a[mid]`"
        },
        {
          "label": "Because `btFirstGreater` uses `low <= high` instead of `low < high`"
        },
        {
          "label": "It is a typo; it should be `len(a)-1`"
        }
      ],
      "explain": "If every element is ≤ key, the first position strictly greater than key does not exist within the array, and `right = len(a)` correctly encodes that. The count `right - left` then equals the number of trailing occurrences. Setting `high = len(a)-1` would silently undercount the last element."
    },
    {
      "id": "empty-guard",
      "prompt": "What does `countOccurrence` return when the input array is empty?",
      "choices": [
        {
          "label": "0, via the early `len(a) == 0` check",
          "correct": true
        },
        {
          "label": "-1 to signal an error"
        },
        {
          "label": "It panics because `btFirstGreaterOrEqual` would access index 0"
        },
        {
          "label": "0, but only because `btFirstGreater` happens to return 0 as well"
        }
      ],
      "explain": "The first lines `if len(a) == 0 { return 0 }` guard against an empty slice before either helper is called. Without this guard, `btFirstGreaterOrEqual` would access `a[low]` on an empty slice and panic."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `countOccurrence`?",
      "choices": [
        {
          "label": "O(log n)",
          "correct": true
        },
        {
          "label": "O(n)"
        },
        {
          "label": "O(n log n)"
        },
        {
          "label": "O(log² n)"
        }
      ],
      "explain": "Two independent binary searches each run in O(log n); constant-time subtraction and the guard check don't change the overall bound. O(log n) + O(log n) is still O(log n)."
    },
    {
      "id": "not-found",
      "prompt": "After calling `btFirstGreaterOrEqual`, what secondary check ensures `key` is actually present before computing the count?",
      "choices": [
        {
          "label": "`left == len(a) || a[left] != key`",
          "correct": true
        },
        {
          "label": "`left < 0`"
        },
        {
          "label": "`a[left] > key`"
        },
        {
          "label": "No check is needed; `btFirstGreaterOrEqual` returns -1 when the key is absent"
        }
      ],
      "explain": "`btFirstGreaterOrEqual` always returns a valid index (or `len(a)`). If `left == len(a)`, key is beyond all elements. If `a[left] != key`, the smallest element ≥ key is strictly greater, meaning key is absent. Both cases must return 0."
    }
  ]
};
