import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which binary search variant does `firstSmallerThan` implement?",
      "choices": [
        {
          "label": "Find the rightmost element strictly less than `key`",
          "correct": true
        },
        {
          "label": "Find the leftmost element strictly greater than `key`"
        },
        {
          "label": "Find an exact match or return -1"
        },
        {
          "label": "Find the floor of `key` (largest element ≤ key)"
        }
      ],
      "explain": "The branch `a[mid] < key` records `mid` and moves *right* (`low = mid + 1`), continuously updating `res` to the latest (rightmost) candidate smaller than `key`. Because the test is strict `<`, an element equal to `key` is never recorded, so this is not the floor (≤) variant."
    },
    {
      "id": "result-tracking",
      "prompt": "When `a[mid] >= key`, the code sets `high = mid - 1`. What does this accomplish?",
      "choices": [
        {
          "label": "Discards `mid` and everything to its right, since they are all ≥ key and can't be the answer",
          "correct": true
        },
        {
          "label": "Records `mid` as a candidate and searches left for a better one"
        },
        {
          "label": "Handles the exact-match case"
        },
        {
          "label": "Advances toward larger values"
        }
      ],
      "explain": "We need the largest element *strictly less than* `key`. Any `a[mid] >= key` is too large (or equal), so we must look further left by setting `high = mid - 1`."
    },
    {
      "id": "return-value",
      "prompt": "Like `firstLargerThan`, this function returns `a[res]`. What happens when `res == -1`?",
      "choices": [
        {
          "label": "The function returns -1, indicating no element is strictly less than `key`",
          "correct": true
        },
        {
          "label": "It returns `a[-1]`, causing a panic"
        },
        {
          "label": "It returns 0"
        },
        {
          "label": "It returns `key - 1`"
        }
      ],
      "explain": "The guard `if res == -1 { return -1 }` short-circuits before `a[res]` is accessed. This covers the case where every element in `a` is ≥ key."
    },
    {
      "id": "contrast-with-larger",
      "prompt": "Compared to `firstLargerThan` (imp-48), the main structural difference in `firstSmallerThan` is:",
      "choices": [
        {
          "label": "The active branch is `a[mid] < key` and it moves `low` right (not `high` left)",
          "correct": true
        },
        {
          "label": "It uses a different mid-calculation formula"
        },
        {
          "label": "It returns the index instead of the value"
        },
        {
          "label": "It initializes `res` to 0 instead of -1"
        }
      ],
      "explain": "`firstLargerThan` records on `a[mid] > key` and searches left. `firstSmallerThan` records on `a[mid] < key` and searches right — the mirror image, reflected across the exact-match boundary."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `firstSmallerThan`?",
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
      "explain": "Iterative binary search halves the window each step: O(log n) time. Only four variables are maintained: O(1) space."
    }
  ]
};
