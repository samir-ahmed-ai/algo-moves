import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `longestIncreasingSubsequence` use to achieve O(n log n)?",
      "choices": [
        {
          "label": "Patience sorting with binary search on a tails array",
          "correct": true
        },
        {
          "label": "2D DP table comparing every pair of elements"
        },
        {
          "label": "Segment tree with range-max queries"
        },
        {
          "label": "Monotonic stack tracking decreasing suffixes"
        }
      ],
      "explain": "The code maintains a `tails` slice where `tails[k]` is the smallest tail of any increasing subsequence of length `k+1`, and uses binary search to place each element. This is the classic patience-sorting approach, giving O(log n) per element."
    },
    {
      "id": "tails-invariant",
      "prompt": "What does `tails[i]` represent at any point during the algorithm?",
      "choices": [
        {
          "label": "The smallest possible tail value of any increasing subsequence of length i+1 seen so far",
          "correct": true
        },
        {
          "label": "The i-th element of the longest increasing subsequence found so far"
        },
        {
          "label": "The index in nums where the current LIS of length i+1 ends"
        },
        {
          "label": "The largest element seen among all subsequences of length i+1"
        }
      ],
      "explain": "Keeping the *smallest* tail for each length is the key invariant. A smaller tail is strictly better because it leaves more room to extend the subsequence with future elements. Note: `tails` is NOT the actual LIS, just a length-tracking structure."
    },
    {
      "id": "binary-search-condition",
      "prompt": "The binary search checks `tails[mid] < x` (strict less-than). What would happen if it used `<=` instead?",
      "choices": [
        {
          "label": "Equal elements would be treated as extendable, allowing non-strictly-increasing subsequences",
          "correct": true
        },
        {
          "label": "The search would fail to find the correct insertion point, causing incorrect length"
        },
        {
          "label": "Duplicate values in nums would cause an infinite loop"
        },
        {
          "label": "Nothing changes — < and <= produce identical results here"
        }
      ],
      "explain": "The problem asks for *strictly increasing* subsequences. With `< x`, an equal element (`tails[mid] == x`) causes `high = mid`, placing `x` at `mid` and replacing the equal tail — correctly refusing to extend. Using `<= x` would allow extending a subsequence with an equal value, counting non-strictly increasing sequences."
    },
    {
      "id": "append-vs-replace",
      "prompt": "When `low == len(tails)`, the code appends `x`; otherwise it sets `tails[low] = x`. What does each branch mean?",
      "choices": [
        {
          "label": "Append: x extends the longest known subsequence by 1; Replace: x is a better (smaller) tail for an existing length",
          "correct": true
        },
        {
          "label": "Append: x starts a new subsequence; Replace: x continues the current longest subsequence"
        },
        {
          "label": "Append: x is larger than all current tails; Replace: x is smaller than all current tails"
        },
        {
          "label": "Append: x can't fit anywhere in tails; Replace: x fits exactly at the end"
        }
      ],
      "explain": "`low == len(tails)` means `x` is larger than every current tail, so it genuinely extends the LIS by one level — we append. Otherwise, `x` replaces `tails[low]` to record a smaller (better) tail for that subsequence length, without changing `len(tails)`."
    },
    {
      "id": "complexity",
      "prompt": "Why is the time complexity O(n log n) rather than O(n²)?",
      "choices": [
        {
          "label": "Each element triggers one binary search over tails (length ≤ n), costing O(log n) per element",
          "correct": true
        },
        {
          "label": "The tails slice is sorted, enabling O(log n) comparisons to skip elements"
        },
        {
          "label": "Early termination in the outer loop reduces average iterations to O(log n)"
        },
        {
          "label": "Sorting the input first costs O(n log n) and dominates the rest"
        }
      ],
      "explain": "The outer loop visits each of the `n` elements once. For each, a binary search on `tails` (which has at most `n` entries) takes O(log n). Total: O(n log n). The classic O(n²) DP compares every pair; binary search eliminates that inner linear scan. (Note: this code does not sort the input at all.)"
    },
    {
      "id": "edge-single",
      "prompt": "What does the function return when `nums` contains a single element?",
      "choices": [
        {
          "label": "1 — the single element forms an LIS of length 1",
          "correct": true
        },
        {
          "label": "0 — no pair of elements can form an increasing subsequence"
        },
        {
          "label": "The element's value itself"
        },
        {
          "label": "It panics because the binary search has no range to search"
        }
      ],
      "explain": "On the first (and only) iteration, `tails` is empty so `low == high == 0 == len(tails)`. The code appends the single element, making `tails` length 1. `len(tails)` = 1 is returned. A single element is trivially an increasing subsequence."
    }
  ]
};
