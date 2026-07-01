import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic pattern does `climbStairs` implement?",
      "choices": [
        {
          "label": "1-D DP with two rolling — variables (Fibonacci-style)",
          "correct": true
        },
        {
          "label": "Top-down memoized recursion — The code uses two variables prev"
        },
        {
          "label": "BFS counting paths level — level"
        },
        {
          "label": "Combinatorics / binomial — The code uses two variables prev"
        }
      ],
      "explain": "The code uses two variables `prev` and `cur` updated in a loop — textbook bottom-up 1-D DP that avoids storing an array. There is no recursion, no queue, and no combinatorial formula."
    },
    {
      "id": "recurrence",
      "prompt": "What recurrence does the line `prev, cur = cur, prev+cur` encode?",
      "choices": [
        {
          "label": "ways(i) = ways(i-1) + ways(i-2) — After the update, cur holds prev+cur",
          "correct": true
        },
        {
          "label": "ways(i) = ways(i-1) * 2 — After the update, cur holds"
        },
        {
          "label": "ways(i) = ways(i-2) + 1 — After the update, cur holds"
        },
        {
          "label": "ways(i) = ways(i-1) + ways(i-3) — After the update, cur holds"
        }
      ],
      "explain": "After the update, `cur` holds `prev+cur` (old values), which equals ways at step i-1 plus ways at step i-2. This is exactly the Fibonacci recurrence: you reach stair i from i-1 (1-step) or i-2 (2-step)."
    },
    {
      "id": "base-case",
      "prompt": "Why does `climbStairs` return `n` directly when `n <= 2`?",
      "choices": [
        {
          "label": "There is 1 way for n=1 and 2 ways — which both",
          "correct": true
        },
        {
          "label": "The loop would divide — zero for small n"
        },
        {
          "label": "The Fibonacci sequence is undefined — for values below 3"
        },
        {
          "label": "n=0 and n=1 — same answer so special-casing avoids"
        }
      ],
      "explain": "For n=1 there is exactly 1 way (one 1-step). For n=2 there are 2 ways (1+1 or 2). In both cases the answer equals n, so returning n handles both without separate branches."
    },
    {
      "id": "space-complexity",
      "prompt": "What is the space complexity of this implementation, and why?",
      "choices": [
        {
          "label": "O(1) — only two integer variables are used regardless of n",
          "correct": true
        },
        {
          "label": "O(n) — a dp array of size n is allocated"
        },
        {
          "label": "O(log n) — the call stack depth for the implicit recursion"
        },
        {
          "label": "O(n²) — all pairs of steps are tracked"
        }
      ],
      "explain": "The solution stores only `prev` and `cur`, discarding earlier values. No array or call stack grows with n, so space is constant O(1)."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `climbStairs`?",
      "choices": [
        {
          "label": "O(n) — The loop runs from i=3 to i=n,",
          "correct": true
        },
        {
          "label": "O(log n) — The loop runs from i=3 to i=n,"
        },
        {
          "label": "O(n²) — The loop runs from i=3 to i=n,"
        },
        {
          "label": "O(2^n) — The loop runs from i=3 to i=n,"
        }
      ],
      "explain": "The loop runs from i=3 to i=n, performing O(1) work per iteration, giving O(n) overall. The naive recursive approach without memoization would be O(2^n), but that's not what this code does."
    }
  ]
};
