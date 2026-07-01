import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does `kthLargest` / `btQuickSelect` use?",
      "choices": [
        {
          "label": "Quickselect with Lomuto-style — btPartition scans left-to-right",
          "correct": true
        },
        {
          "label": "Binary search on the value — range"
        },
        {
          "label": "Min-heap of size k — btPartition scans left-to-right"
        },
        {
          "label": "Merge sort with early termination — btPartition scans left-to-right"
        }
      ],
      "explain": "`btPartition` scans left-to-right keeping a single boundary `pos` and swaps the pivot into place at the end — a Lomuto partition. `btQuickSelect` then recurses only into the side that contains rank `k`. This is Quickselect, not a heap or binary search."
    },
    {
      "id": "rank-translation",
      "prompt": "In `kthLargest`, the call is `btQuickSelect(arr, 0, n-1, n+1-k)`. Why `n+1-k` instead of `k`?",
      "choices": [
        {
          "label": "The kth largest is the (n+1-k)th — so we reuse the",
          "correct": true
        },
        {
          "label": "To offset for 0-based indexing — btQuickSelect finds the element"
        },
        {
          "label": "To handle the case — k equals n"
        },
        {
          "label": "Because `btPartition` counts — btQuickSelect finds the element"
        }
      ],
      "explain": "`btQuickSelect` finds the element of rank `k` in ascending order. The kth largest in ascending order is at rank `n+1-k` (e.g., 1st largest = nth smallest)."
    },
    {
      "id": "partition-mechanic",
      "prompt": "In `btPartition`, the pivot is always `a[start]`. After the loop, `a[start]` and `a[pos]` are swapped. What invariant does this establish?",
      "choices": [
        {
          "label": "All elements at indices < — pos are < pivot, the pivot sits at",
          "correct": true
        },
        {
          "label": "All elements left of pos — are sorted in ascending order"
        },
        {
          "label": "pos holds the median — the subarray"
        },
        {
          "label": "Elements to the right — pos are sorted in descending order"
        }
      ],
      "explain": "The loop counts elements smaller than the pivot and moves them to the front. After the swap, the pivot lands in its final sorted position `pos`, with smaller values to its left and larger-or-equal values to its right."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case of `btQuickSelect`, and why is it sufficient?",
      "choices": [
        {
          "label": "`start == end`: only one — element remains, so it must be the",
          "correct": true
        },
        {
          "label": "`pivotIdx == 0`: the pivot — is the smallest element"
        },
        {
          "label": "`k == 1`: return — minimum of the subarray"
        },
        {
          "label": "`start == 0 && end — == n-1`: the full array has been"
        }
      ],
      "explain": "When the subarray has a single element, there's nothing left to partition — that element is definitionally the answer for any rank within a size-1 range."
    },
    {
      "id": "complexity",
      "prompt": "What is the average-case time complexity of `kthLargest`?",
      "choices": [
        {
          "label": "O(n) average, O(n²) worst case — Quickselect discards one side each",
          "correct": true
        },
        {
          "label": "O(n log n) always — Quickselect discards one side"
        },
        {
          "label": "O(log n) average — Quickselect discards one side"
        },
        {
          "label": "O(n) always, including worst case — Quickselect discards one side"
        }
      ],
      "explain": "Quickselect discards one side each round, and on average the kept side shrinks geometrically, giving O(n) expected time. With adversarial input and a fixed pivot like `a[start]`, every partition can be size-1, degrading to O(n²). Space is O(log n) for the average recursion depth."
    },
    {
      "id": "copy-rationale",
      "prompt": "Both `kthLargest` and `kthSmallest` copy the input with `make` + `copy` before calling `btQuickSelect`. Why?",
      "choices": [
        {
          "label": "`btPartition` swaps elements — copying prevents mutating the",
          "correct": true
        },
        {
          "label": "Go slices are not passed — by reference, so a copy is needed to"
        },
        {
          "label": "To allow parallel execution — the two functions"
        },
        {
          "label": "`btQuickSelect` requires a starting — a fresh backing array"
        }
      ],
      "explain": "Quickselect rearranges elements as a side effect of partitioning. Without the copy, the original slice `a` passed by the caller would be shuffled, which is typically undesirable."
    }
  ]
};
