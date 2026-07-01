import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `cutRibbons` implement?",
      "choices": [
        {
          "label": "Binary search on the answer — space",
          "correct": true
        },
        {
          "label": "Greedy interval scheduling — Rather than searching an"
        },
        {
          "label": "Dynamic programming on ribbon — Rather than searching an"
        },
        {
          "label": "Binary search on the input — array"
        }
      ],
      "explain": "Rather than searching an existing sorted array, the code searches the *answer domain* — all candidate lengths from 1 to max(ribbons). This is the classic 'binary search on answer' pattern."
    },
    {
      "id": "feasibility-check",
      "prompt": "What does the inner loop `cnt += r / mid` compute, and how is it used?",
      "choices": [
        {
          "label": "The total number of pieces — of length `mid` obtainable from all",
          "correct": true
        },
        {
          "label": "The remainder after cutting — ribbon to length `mid`"
        },
        {
          "label": "The number of ribbons longer — than `mid`"
        },
        {
          "label": "The sum of all ribbon — lengths divided by `mid`"
        }
      ],
      "explain": "Integer division `r / mid` gives how many full pieces of length `mid` fit in ribbon `r`. Summing across all ribbons yields the total piece count; feasibility requires `cnt >= k`."
    },
    {
      "id": "search-bound",
      "prompt": "Why is `high` initialized to the maximum value in `ribbons` rather than `len(ribbons)`?",
      "choices": [
        {
          "label": "A single piece — at most as long as the longest",
          "correct": true
        },
        {
          "label": "To avoid reading past — end of the slice"
        },
        {
          "label": "Because the binary search needs — a power-of-two range"
        },
        {
          "label": "`len(ribbons)` could be zero — divide-by-zero"
        }
      ],
      "explain": "The answer is a physical length in the same units as the ribbon values. The longest any cut can be is the longest ribbon itself, making `max(ribbons)` the correct upper bound."
    },
    {
      "id": "result-update",
      "prompt": "When `cnt >= k`, the code sets `res = mid` and then `low = mid + 1`. Why does it keep searching right instead of returning immediately?",
      "choices": [
        {
          "label": "To find the *maximum* feasible — length a larger `mid` might also",
          "correct": true
        },
        {
          "label": "To verify there — duplicate lengths"
        },
        {
          "label": "Because `mid` could equal `k` — by coincidence"
        },
        {
          "label": "To shrink the search space — to the feasible region"
        }
      ],
      "explain": "Any `mid` that satisfies `cnt >= k` is a valid answer, but we want the largest one. Continuing right with `low = mid + 1` searches for a better (longer) cut while keeping the best seen in `res`."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `cutRibbons`, given `n` ribbons and max ribbon value `M`?",
      "choices": [
        {
          "label": "O(n·log M) — The outer binary search runs O(log M)",
          "correct": true
        },
        {
          "label": "O(n·log n) — The outer binary search runs"
        },
        {
          "label": "O(M·log n) — The outer binary search runs"
        },
        {
          "label": "O(n + M) — The outer binary search runs"
        }
      ],
      "explain": "The outer binary search runs O(log M) iterations (searching lengths 1..M). Each iteration scans all `n` ribbons for the feasibility count, giving O(n·log M) total."
    },
    {
      "id": "feasibility-monotonic",
      "prompt": "Why is binary search valid here — what property does the feasibility predicate `cnt(mid) >= k` have as `mid` increases?",
      "choices": [
        {
          "label": "It is monotonic: larger `mid` — yields fewer (or equal) pieces, so",
          "correct": true
        },
        {
          "label": "It is periodic — repeating every `k` lengths"
        },
        {
          "label": "It is strictly increasing — `mid`"
        },
        {
          "label": "It has no particular structure; — the search just happens to work"
        }
      ],
      "explain": "`r / mid` is non-increasing as `mid` grows, so the total piece count `cnt` is non-increasing in `mid`. That monotonicity (feasible for small lengths, infeasible for large ones) is exactly what lets binary search find the largest feasible length."
    }
  ]
};
