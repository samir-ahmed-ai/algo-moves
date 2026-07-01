import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What distinguishes the binary search in `findPeakElement` from a standard value-target search?",
      "choices": [
        {
          "label": "It searches on slope direction (comparing adjacent elements) rather than on a target value",
          "correct": true
        },
        {
          "label": "It searches for the maximum value using a comparison against a stored max"
        },
        {
          "label": "It uses two pointers converging from both ends"
        },
        {
          "label": "It applies a modified QuickSelect pivot strategy"
        }
      ],
      "explain": "There is no target value. Instead, `nums[mid] > nums[mid+1]` reads the local slope: descending slope means a peak is at or before `mid`; ascending slope means a peak must exist after `mid`. This slope-comparison trick lets binary search work on an unsorted array."
    },
    {
      "id": "branch-logic",
      "prompt": "When `nums[mid] > nums[mid+1]`, the code sets `high = mid`. What does this guarantee?",
      "choices": [
        {
          "label": "`mid` itself could be the peak, so the search range is narrowed to `[low, mid]`",
          "correct": true
        },
        {
          "label": "The peak is strictly to the left of `mid`, so `high = mid-1` would be equally correct"
        },
        {
          "label": "The peak is strictly to the right of `mid+1`"
        },
        {
          "label": "Both `mid` and `mid+1` are discarded, shrinking the range by two"
        }
      ],
      "explain": "A descending step from `mid` to `mid+1` means `nums[mid]` might be higher than both its neighbours — it could be the peak. Setting `high = mid` (not `mid-1`) keeps `mid` in play. If we used `mid-1`, we'd risk discarding the answer."
    },
    {
      "id": "termination",
      "prompt": "Why does the loop use `low < high` instead of `low <= high`?",
      "choices": [
        {
          "label": "When `low == high` the single remaining element must be a peak, so we can return immediately without re-entering the loop",
          "correct": true
        },
        {
          "label": "To avoid accessing `nums[mid+1]` out of bounds when the array has one element"
        },
        {
          "label": "The `<` condition is only a style choice; `<=` would also be correct here"
        },
        {
          "label": "It prevents an infinite loop when `high = mid` and `low = mid`"
        }
      ],
      "explain": "The invariant maintained throughout is that a peak exists somewhere in `[low, high]`. When `low == high`, the range has exactly one candidate — it must be the peak — so returning `low` is safe. Using `<=` would enter the loop one more time and could panic accessing `nums[mid+1]` when `mid == len(nums)-1`."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `findPeakElement`?",
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
          "label": "O(n log n) time, O(n) space"
        }
      ],
      "explain": "Each iteration halves the range (either `high = mid` or `low = mid+1`), giving O(log n) time. Only `low`, `high`, and `mid` are stored — O(1) space."
    },
    {
      "id": "edge-case",
      "prompt": "How does the algorithm handle an array of length 1?",
      "choices": [
        {
          "label": "The loop condition `low < high` is false immediately, and `low` (= 0) is returned as the peak",
          "correct": true
        },
        {
          "label": "It panics accessing `nums[mid+1]`"
        },
        {
          "label": "It returns -1 to signal no peak"
        },
        {
          "label": "The loop runs once and returns `mid`"
        }
      ],
      "explain": "With one element, `low = 0` and `high = 0`, so `low < high` is false and the loop body never executes. `return low` yields 0, which is the only (and therefore peak) index. The `nums[mid+1]` access that would panic is safely guarded by the loop condition."
    }
  ]
};
