import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `sortSquares` use to produce a sorted result in O(n) time?",
      "choices": [
        {
          "label": "Two pointers from both ends, filling the result array from largest to smallest",
          "correct": true
        },
        {
          "label": "Binary search to find the split point between negatives and positives, then merge"
        },
        {
          "label": "In-place squaring followed by a standard sort"
        },
        {
          "label": "A min-heap that repeatedly extracts the smallest squared value"
        }
      ],
      "explain": "Pointers `i` (left) and `j` (right) compare absolute values; the larger square is placed at `res[k]` and `k` counts down from `n-1`. This works because the largest squares always come from one of the two ends of a sorted array containing negatives."
    },
    {
      "id": "fill-direction",
      "prompt": "Why does the result array `res` get filled from index `n-1` down to 0 instead of from 0 up?",
      "choices": [
        {
          "label": "The two-pointer comparison always identifies the current largest square, which belongs at the rightmost unfilled position",
          "correct": true
        },
        {
          "label": "To avoid overwriting elements still needed by the input pointer"
        },
        {
          "label": "Filling right-to-left avoids the need to allocate extra memory"
        },
        {
          "label": "Go slices are stored in reverse order in memory"
        }
      ],
      "explain": "At each step we know whichever end (`i` or `j`) has the larger absolute value produces the biggest remaining square. Placing it at `res[k]` (the last unfilled slot) and decrementing `k` naturally builds the sorted output largest-first without any extra sorting pass."
    },
    {
      "id": "pointer-update",
      "prompt": "After placing `a[i]*a[i]` into `res[k]`, which pointer is advanced?",
      "choices": [
        {
          "label": "`i` is incremented (`i++`), moving the left pointer rightward",
          "correct": true
        },
        {
          "label": "`j` is decremented (`j--`), moving the right pointer leftward"
        },
        {
          "label": "Both `i` and `j` are updated"
        },
        {
          "label": "`k` is incremented to step forward in `res`"
        }
      ],
      "explain": "When `absInt(a[i]) > absInt(a[j])`, `a[i]` (from the left) has the larger absolute value. After using it, `i++` moves left toward the middle. `j` stays put because the right end hasn't been consumed yet. `k` always decrements regardless of which side wins."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `sortSquares`?",
      "choices": [
        {
          "label": "O(n) time, O(n) space",
          "correct": true
        },
        {
          "label": "O(n log n) time, O(1) space"
        },
        {
          "label": "O(n) time, O(1) space"
        },
        {
          "label": "O(n log n) time, O(n) space"
        }
      ],
      "explain": "Each of the `n` elements is visited exactly once by either `i` or `j`, giving O(n) time. The output array `res` of size `n` is the O(n) space cost; beyond that only `i`, `j`, `k` are used. The space cannot be O(1) because the problem requires returning a new sorted array."
    },
    {
      "id": "edge-case",
      "prompt": "What happens when all elements in the input are negative (e.g., `[-5, -3, -1]`)?",
      "choices": [
        {
          "label": "The algorithm still works correctly; `j` keeps winning comparisons and the squares end up in ascending order",
          "correct": true
        },
        {
          "label": "It panics because `absInt` is not defined for negative numbers"
        },
        {
          "label": "The result is in descending order because negatives reverse the comparison"
        },
        {
          "label": "`i` and `j` cross immediately and the loop exits early"
        }
      ],
      "explain": "With all-negative input, `absInt(a[i]) >= absInt(a[j])` for the entire run (since `|a[0]|` is the largest). `i` advances every iteration, consuming elements left to right. The squares are inserted right to left into `res`, correctly producing `[1, 9, 25]` for `[-5,-3,-1]`."
    }
  ]
};
