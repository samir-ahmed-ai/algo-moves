import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which DP variant does this knapsack solution belong to?",
      "choices": [
        {
          "label": "0/1 Knapsack — each item used at most once",
          "correct": true
        },
        {
          "label": "Unbounded Knapsack — each item used any number of times"
        },
        {
          "label": "Fractional Knapsack — items can be split"
        },
        {
          "label": "2D DP — a separate dimension tracks item count"
        }
      ],
      "explain": "The inner loop runs from `capacity` down to `w`, which prevents an item from being counted more than once. Unbounded knapsack would iterate left-to-right so the same item could be reused."
    },
    {
      "id": "inner-loop-direction",
      "prompt": "The inner capacity loop runs `for c := capacity; c >= w; c--`. Why does it iterate right-to-left (high to low)?",
      "choices": [
        {
          "label": "To ensure each item is considered at most once per outer iteration",
          "correct": true
        },
        {
          "label": "To avoid array index out-of-bounds when accessing dp[c-w]"
        },
        {
          "label": "To fill base cases before dependent cells"
        },
        {
          "label": "Left-to-right would give the same result; direction is arbitrary"
        }
      ],
      "explain": "If we iterated left-to-right, dp[c-w] would already reflect the current item being added, allowing the item to be used multiple times in a single pass. Right-to-left guarantees dp[c-w] still holds the state from BEFORE this item was considered."
    },
    {
      "id": "recurrence",
      "prompt": "What does `dp[c] = dp[c-w] + v` represent?",
      "choices": [
        {
          "label": "Take this item: the best value at capacity c-w plus this item's value",
          "correct": true
        },
        {
          "label": "Skip this item: carry forward the best value seen so far"
        },
        {
          "label": "The total value of all items with weight ≤ c"
        },
        {
          "label": "The maximum weight used when filling capacity c"
        }
      ],
      "explain": "`dp[c-w] + v` says: if we use this item (costing weight `w`, gaining value `v`), the remaining capacity is `c-w`, and we inherit the best value already stored there. The `if` guard only updates when this is better than skipping."
    },
    {
      "id": "space",
      "prompt": "The solution allocates `dp := make([]int, capacity+1)`. What space complexity does this achieve, compared to a naive 2D DP table?",
      "choices": [
        {
          "label": "O(capacity) instead of O(n * capacity)",
          "correct": true
        },
        {
          "label": "O(n) instead of O(n * capacity)"
        },
        {
          "label": "O(1) — only a few variables are needed"
        },
        {
          "label": "O(n * capacity) — same as the 2D version"
        }
      ],
      "explain": "By reusing a single 1D array and sweeping right-to-left, the previous row of the 2D table is never explicitly stored. This reduces space from O(n * capacity) to O(capacity)."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of this solution?",
      "choices": [
        {
          "label": "O(n * capacity)",
          "correct": true
        },
        {
          "label": "O(n²)"
        },
        {
          "label": "O(capacity²)"
        },
        {
          "label": "O(n * capacity²)"
        }
      ],
      "explain": "The outer loop iterates over `n` items and the inner loop over up to `capacity` values, giving O(n * capacity). This is pseudo-polynomial — it depends on the numeric value of capacity, not just the input length."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case for this DP, and how is it established?",
      "choices": [
        {
          "label": "dp[0..capacity] = 0: make([]int, capacity+1) zero-initializes the slice",
          "correct": true
        },
        {
          "label": "dp[0] = 1: a knapsack of zero capacity holds one empty set"
        },
        {
          "label": "dp[0] = infinity: no items fit, so value is undefined"
        },
        {
          "label": "dp[i][0] = 0: an explicit row for zero items must be set"
        }
      ],
      "explain": "Go's `make([]int, capacity+1)` zero-initializes all entries, encoding the base case: a knapsack of any capacity with no items considered yet has value 0. No explicit loop is needed."
    }
  ]
};
