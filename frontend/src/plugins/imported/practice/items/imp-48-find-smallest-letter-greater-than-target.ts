import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which binary search variant does `firstLargerThan` implement?",
      "choices": [
        {
          "label": "Find the leftmost element strictly — greater than `key`",
          "correct": true
        },
        {
          "label": "Find the rightmost element — than or equal to `key`"
        },
        {
          "label": "Find an exact match — return -1"
        },
        {
          "label": "Find the element closest — `key` in absolute value"
        }
      ],
      "explain": "Every time `a[mid] > key` the code records `mid` as a candidate and continues left (`high = mid - 1`), ensuring it finds the smallest such index."
    },
    {
      "id": "result-tracking",
      "prompt": "The variable `res` is initialized to `-1` and updated inside the loop. What does `res == -1` after the loop signify?",
      "choices": [
        {
          "label": "No element in `a` — strictly greater than `key`",
          "correct": true
        },
        {
          "label": "The array is empty — res is only set when a[mid] > key"
        },
        {
          "label": "`key` is the first element — of the array"
        },
        {
          "label": "Binary search didn't converge — res is only set when a[mid] > key"
        }
      ],
      "explain": "`res` is only set when `a[mid] > key`. If the loop exits without ever entering that branch, every element is ≤ `key`, and the function correctly returns `-1`."
    },
    {
      "id": "key-mechanic",
      "prompt": "When `a[mid] > key`, the code sets `res = mid` and then `high = mid - 1`. What is the purpose of `high = mid - 1`?",
      "choices": [
        {
          "label": "To search the left half — for a potentially smaller element",
          "correct": true
        },
        {
          "label": "To discard `mid` from future — consideration"
        },
        {
          "label": "To handle the case — `a[mid]` equals `key + 1`"
        },
        {
          "label": "To advance towards larger values — We've found *a* valid answer at"
        }
      ],
      "explain": "We've found *a* valid answer at `mid`, but the smallest such element could be further left. Narrowing right boundary to `mid - 1` forces the search into smaller indices."
    },
    {
      "id": "return-value",
      "prompt": "The function returns `a[res]` (not `res`). What does this mean for the caller?",
      "choices": [
        {
          "label": "The caller receives the value — of the smallest",
          "correct": true
        },
        {
          "label": "The function is incorrect — it should return the index"
        },
        {
          "label": "It always returns the element — at position 0"
        },
        {
          "label": "It returns the distance — `key` to the found element"
        }
      ],
      "explain": "The problem asks for the *letter* (value), not its position, so returning `a[res]` is correct. The index `res` is only used internally to track the best candidate."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `firstLargerThan`?",
      "choices": [
        {
          "label": "O(log n) time, O(1) space — Each loop iteration halves the search",
          "correct": true
        },
        {
          "label": "O(n) time, O(1) space — Each loop iteration halves the"
        },
        {
          "label": "O(log n) time, O(n) space — Each loop iteration halves the"
        },
        {
          "label": "O(n log n) time, O(1) — space"
        }
      ],
      "explain": "Each loop iteration halves the search window, giving O(log n). Only a constant number of variables (`low`, `high`, `mid`, `res`) are used."
    }
  ]
};
