import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which high-level strategy does `minimumDifference` use to partition the array?",
      "choices": [
        {
          "label": "Meet in the middle: enumerate — subset sums for each half, then",
          "correct": true
        },
        {
          "label": "2D knapsack DP over items — and target weight"
        },
        {
          "label": "Greedy: always move the largest — element to the smaller-sum group"
        },
        {
          "label": "BFS over (index, running-sum) states — With n up to 15, the code splits"
        }
      ],
      "explain": "With n up to 15, the code splits the 2n-element array in half and enumerates all 2^n subset sums per half (via bitmask in `genSubsetSums`). It then sorts the right-half sums and binary-searches for the best complementary value — the classic meet-in-the-middle pattern."
    },
    {
      "id": "subset-grouping",
      "prompt": "In `genSubsetSums`, why are subset sums stored in `sums[cnt]` indexed by `cnt` (the number of elements chosen)?",
      "choices": [
        {
          "label": "Each partition must put exactly — n elements in each half; pairing by",
          "correct": true
        },
        {
          "label": "Sorting by count improves — performance"
        },
        {
          "label": "It deduplicates subsets — the same sum but different sizes"
        },
        {
          "label": "It avoids integer overflow — limiting how many elements are summed"
        }
      ],
      "explain": "The full array has 2n elements, and we want each partition group to contain exactly n elements. If we pick `sz` elements from the left half, we must pick `n - sz` from the right half. Indexing by count (`sums[cnt]`) makes it trivial to look up the matching right-half sums via `rs[n - sz]`."
    },
    {
      "id": "binary-search-step",
      "prompt": "After computing `t = target - lSum`, why does the code check both `arr[idx]` and `arr[idx-1]`?",
      "choices": [
        {
          "label": "Binary search finds — value >= t; the closest match could",
          "correct": true
        },
        {
          "label": "To handle duplicate sums — appear at consecutive indices"
        },
        {
          "label": "Because `sort.Search` may return — off-by-one index"
        },
        {
          "label": "To ensure the total sum — is even before computing the"
        }
      ],
      "explain": "`sort.Search` returns the first index where `arr[i] >= t`. The ideal complement is exactly t, but since t may not exist, the nearest values are `arr[idx]` (>= t, possibly overshoots) and `arr[idx-1]` (< t, possibly undershoots). Both are candidates for minimizing `|total - 2*(lSum + rSum)|`."
    },
    {
      "id": "objective-formula",
      "prompt": "The code computes `absInt(total - 2*(lSum + arr[idx]))` to evaluate a candidate partition. What does this formula measure?",
      "choices": [
        {
          "label": "The absolute difference — If one group sums to S, the other",
          "correct": true
        },
        {
          "label": "The number of elements — the larger group minus the smaller"
        },
        {
          "label": "The distance from the current — subset sum to the global average"
        },
        {
          "label": "The sum of elements — selected in either half"
        }
      ],
      "explain": "If one group sums to S, the other sums to total - S. The difference is |(total - S) - S| = |total - 2S|. Here S = lSum + rSum, giving `|total - 2*(lSum + rSum)|`. Minimizing this is equivalent to making S as close to total/2 as possible."
    },
    {
      "id": "complexity",
      "prompt": "Which step dominates the running time of `minimumDifference`, where n = len(nums)/2?",
      "choices": [
        {
          "label": "Enumerating the 2^n subset sums — per half, each costing O(n) to",
          "correct": true
        },
        {
          "label": "The final return statement — which scans the whole array once"
        },
        {
          "label": "Computing `total` by summing — 2n elements"
        },
        {
          "label": "Allocating the `sums` slice — length n+1"
        }
      ],
      "explain": "`genSubsetSums` iterates 2^n masks and spends O(n) per mask scanning bits, so building the subset sums is O(n·2^n) per half. The subsequent sorting and binary searches operate over the same 2^n sums and do not change the asymptotic order beyond log factors; the problem reports O(n·2^n) time and O(2^n) space, matching the subset-sum storage."
    },
    {
      "id": "edge-case",
      "prompt": "What happens in the outer loop when `sz = 0` (choosing 0 elements from the left half)?",
      "choices": [
        {
          "label": "It considers partitions — ls[0] contains exactly one subset",
          "correct": true
        },
        {
          "label": "The loop is skipped because — rs[n] would be out of bounds"
        },
        {
          "label": "It handles the case — the array has only two elements"
        },
        {
          "label": "`ls[0]` is empty — inner loop does nothing"
        }
      ],
      "explain": "`ls[0]` contains exactly one subset sum: 0 (the empty subset). When sz = 0, rSz = n, so we look at `rs[n]` — subsets where all n elements from the right half are chosen. This correctly models a partition where the left half contributes nothing to one group."
    }
  ]
};
