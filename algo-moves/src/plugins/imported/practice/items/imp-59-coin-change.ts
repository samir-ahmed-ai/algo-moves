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
          "label": "The minimum coins to make amount a equals the minimum to make a-c plus one coin c",
          "correct": true
        },
        {
          "label": "The number of ways to make amount a using coin c"
        },
        {
          "label": "Whether amount a is reachable by adding one coin c to amount a-c"
        },
        {
          "label": "The maximum coins needed to make amount a"
        }
      ],
      "explain": "The code picks the best (minimum) `dp[a]` over all valid coins c. Adding coin c to the optimal solution for `a-c` gives a valid solution for `a` costing one more coin."
    },
    {
      "id": "sentinel",
      "prompt": "Why is `dp[i]` initialized to `1 << 30` (a large value) for i > 0?",
      "choices": [
        {
          "label": "To represent 'unreachable' so that unreachable amounts are never chosen as optimal",
          "correct": true
        },
        {
          "label": "To prevent integer overflow during the min comparison"
        },
        {
          "label": "To mark amounts that have already been computed"
        },
        {
          "label": "Because Go initializes slices to zero and we need a nonzero starting value"
        }
      ],
      "explain": "`1 << 30` acts as infinity. If no combination of coins reaches amount a, `dp[a]` stays at this sentinel. The final check `if dp[amount] == inf { return -1 }` uses this to detect the impossible case."
    },
    {
      "id": "loop-order",
      "prompt": "In `coinChange`, the outer loop is over amounts and the inner loop is over coins. What would happen if you swapped them (outer = coins, inner = amounts)?",
      "choices": [
        {
          "label": "The result would still be correct — both loop orders work for unbounded knapsack minimization",
          "correct": true
        },
        {
          "label": "Each coin would be counted at most once, turning it into a 0/1 knapsack"
        },
        {
          "label": "The dp array would be filled in the wrong direction, giving wrong answers"
        },
        {
          "label": "It would count combinations instead of the minimum number of coins"
        }
      ],
      "explain": "For unbounded-knapsack minimization (min coins), both loop orders are correct because you're taking the minimum — reusing a coin multiple times naturally emerges from the recurrence regardless of which dimension is outer."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `coinChange`?",
      "choices": [
        {
          "label": "O(amount * len(coins)) time, O(amount) space",
          "correct": true
        },
        {
          "label": "O(amount²) time, O(amount) space"
        },
        {
          "label": "O(2^len(coins)) time, O(len(coins)) space"
        },
        {
          "label": "O(amount * len(coins)) time, O(amount * len(coins)) space"
        }
      ],
      "explain": "The two nested loops run amount × len(coins) iterations. The `dp` array has length amount+1, so space is O(amount). No 2-D table is needed because coins are reusable."
    },
    {
      "id": "edge-amount-zero",
      "prompt": "What does `dp[0]` equal after initialization, and why is that correct?",
      "choices": [
        {
          "label": "0, because zero coins are needed to make amount 0",
          "correct": true
        },
        {
          "label": "1, because there is one 'empty' combination that sums to 0"
        },
        {
          "label": "inf, same as every other cell before processing"
        },
        {
          "label": "-1, signaling that amount 0 is a special impossible case"
        }
      ],
      "explain": "`make([]int, amount+1)` zero-initializes all cells, so `dp[0] = 0`. This is the correct base case: 0 coins are needed to reach amount 0, and all larger amounts build on this foundation."
    }
  ]
};
