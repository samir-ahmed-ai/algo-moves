import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What kind of DP problem is `makeChange` solving?",
      "choices": [
        {
          "label": "Unbounded knapsack — count distinct combinations",
          "correct": true
        },
        {
          "label": "Unbounded knapsack — minimize number of coins"
        },
        {
          "label": "0/1 knapsack — count subsets with exact sum"
        },
        {
          "label": "Partition DP — split array into groups of equal sum"
        }
      ],
      "explain": "Each coin can be used unlimited times ('unbounded') and the goal is to count how many combinations reach the target amount. Coin Change I minimizes; this problem counts — a different DP objective."
    },
    {
      "id": "loop-order",
      "prompt": "In `makeChange`, why is the outer loop over coins and the inner loop over amounts (not vice versa)?",
      "choices": [
        {
          "label": "To count combinations (not permutations) — each coin denomination is fixed before filling amounts",
          "correct": true
        },
        {
          "label": "Because it produces the minimum number of coins rather than all combinations"
        },
        {
          "label": "Loop order doesn't matter; both give the same count"
        },
        {
          "label": "To handle the unbounded property; 0/1 knapsack would use the opposite order"
        }
      ],
      "explain": "With outer=coins, each coin is 'considered once' before moving on. This prevents counting [1,2] and [2,1] as different. Swapping the loops would count ordered sequences (permutations), giving a larger wrong answer."
    },
    {
      "id": "recurrence",
      "prompt": "What does `dp[i] += dp[i-coin]` mean in the context of counting combinations?",
      "choices": [
        {
          "label": "Every combination that sums to i-coin can be extended by one more `coin` to reach i",
          "correct": true
        },
        {
          "label": "dp[i] becomes the minimum of dp[i] and dp[i-coin]+1"
        },
        {
          "label": "dp[i-coin] is subtracted from dp[i] to avoid double-counting"
        },
        {
          "label": "The coin is removed from the set after being used once"
        }
      ],
      "explain": "Adding one copy of `coin` to every arrangement counted in `dp[i-coin]` gives new arrangements for `dp[i]`. Accumulating with `+=` sums all such contributions across coins."
    },
    {
      "id": "base-case",
      "prompt": "The code sets `dp[0] = 1` before the loops. What does this represent?",
      "choices": [
        {
          "label": "There is exactly one way to make amount 0: use no coins",
          "correct": true
        },
        {
          "label": "The first coin always contributes one combination"
        },
        {
          "label": "It prevents division-by-zero in the recurrence"
        },
        {
          "label": "It accounts for the empty-string edge case when n == 0"
        }
      ],
      "explain": "`dp[0] = 1` is the combinatorial base case: the empty selection sums to 0. Without it, every `dp[i]` would start at 0 and remain 0 — nothing could bootstrap."
    },
    {
      "id": "edge-cases",
      "prompt": "The function has three early-return guards: `n < 0`, `n == 0`, `len(coins) == 0`. Which guard is strictly necessary for correctness if the loops were run anyway?",
      "choices": [
        {
          "label": "`n < 0` — `make([]int, n+1)` panics for negative n",
          "correct": true
        },
        {
          "label": "`n == 0` — the loop would overwrite dp[0] and return wrong"
        },
        {
          "label": "`len(coins) == 0` — iterating an empty slice causes a nil panic"
        },
        {
          "label": "All three are equally necessary"
        }
      ],
      "explain": "In Go, `make([]int, n+1)` with n=-1 gives length 0 and then `dp[0] = 1` would panic (index out of range). The `n==0` return is a shortcut but the loop would correctly return dp[0]=1 anyway; `len(coins)==0` just skips the loop returning dp[n]=0 correctly."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `makeChange`?",
      "choices": [
        {
          "label": "O(amount * len(coins)) time, O(amount) space",
          "correct": true
        },
        {
          "label": "O(amount²) time, O(amount²) space"
        },
        {
          "label": "O(2^len(coins)) time, O(len(coins)) space"
        },
        {
          "label": "O(amount * len(coins)) time, O(amount * len(coins)) space"
        }
      ],
      "explain": "Two nested loops: outer runs len(coins) times, inner runs up to amount times each. The dp array has size n+1 = O(amount). No 2-D table is needed."
    }
  ]
};
