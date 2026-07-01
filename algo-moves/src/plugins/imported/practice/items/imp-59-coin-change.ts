import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which DP variant does `coinChange` implement?",
      "choices": [
        {
          "label": "Unbounded knapsack — minimize coins, coins reusable",
          "correct": true
        },
        {
          "label": "0/1 knapsack — each coin used at most once"
        },
        {
          "label": "Bounded knapsack — each coin has a fixed supply"
        },
        {
          "label": "Interval DP — subproblems are contiguous subarrays"
        }
      ],
      "explain": "Coins can be reused any number of times ('unbounded'). The code iterates coins inside the amount loop without restricting how many times each coin is used — the classic unbounded-knapsack structure."
    },
    {
      "id": "recurrence",
      "prompt": "What transition does `dp[a] = dp[a-c] + 1` express?",
      "choices": [
        {
          "label": "The minimum coins to make — amount a equals the minimum to make",
          "correct": true
        },
        {
          "label": "The number of ways — make amount a using coin c"
        },
        {
          "label": "Whether amount a is reachable — by adding one coin c to amount a-c"
        },
        {
          "label": "The maximum coins needed — make amount a"
        }
      ],
      "explain": "The code picks the best (minimum) `dp[a]` over all valid coins c. Adding coin c to the optimal solution for `a-c` gives a valid solution for `a` costing one more coin."
    },
    {
      "id": "sentinel",
      "prompt": "Why is `dp[i]` initialized to `1 << 30` (a large value) for i > 0?",
      "choices": [
        {
          "label": "To represent 'unreachable' — 1 << 30 acts as infinity",
          "correct": true
        },
        {
          "label": "To prevent integer overflow — the min comparison"
        },
        {
          "label": "To mark amounts — already been computed"
        },
        {
          "label": "Because Go initializes slices — zero and we need a nonzero starting"
        }
      ],
      "explain": "`1 << 30` acts as infinity. If no combination of coins reaches amount a, `dp[a]` stays at this sentinel. The final check `if dp[amount] == inf { return -1 }` uses this to detect the impossible case."
    },
    {
      "id": "loop-order",
      "prompt": "In `coinChange`, the outer loop is over amounts and the inner loop is over coins. What would happen if you swapped them (outer = coins, inner = amounts)?",
      "choices": [
        {
          "label": "The result — correct both loop orders work for",
          "correct": true
        },
        {
          "label": "Each coin would be counted — at most once, turning it into a 0/1"
        },
        {
          "label": "The dp array would be filled — giving"
        },
        {
          "label": "It would count combinations instead — of the minimum number of coins"
        }
      ],
      "explain": "For unbounded-knapsack minimization (min coins), both loop orders are correct because you're taking the minimum — reusing a coin multiple times naturally emerges from the recurrence regardless of which dimension is outer."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `coinChange`?",
      "choices": [
        {
          "label": "O(amount * len(coins)) time space — The two nested loops run amount ×",
          "correct": true
        },
        {
          "label": "O(amount²) time, O(amount) space — The two nested loops run amount"
        },
        {
          "label": "O(2^len(coins)) time, O(len(coins)) — The two nested loops run amount"
        },
        {
          "label": "O(amount * len(coins)) time * — len(coins)) space"
        }
      ],
      "explain": "The two nested loops run amount × len(coins) iterations. The `dp` array has length amount+1, so space is O(amount). No 2-D table is needed because coins are reusable."
    },
    {
      "id": "edge-amount-zero",
      "prompt": "What does `dp[0]` equal after initialization, and why is that correct?",
      "choices": [
        {
          "label": "0 — because zero coins are needed to make",
          "correct": true
        },
        {
          "label": "1, because there is one — 'empty' combination that sums to 0"
        },
        {
          "label": "inf — same as every other cell before"
        },
        {
          "label": "-1, signaling that amount 0 — is a special impossible case"
        }
      ],
      "explain": "`make([]int, amount+1)` zero-initializes all cells, so `dp[0] = 0`. This is the correct base case: 0 coins are needed to reach amount 0, and all larger amounts build on this foundation."
    }
  ]
};
