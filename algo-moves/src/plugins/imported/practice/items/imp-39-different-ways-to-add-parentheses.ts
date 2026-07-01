import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic pattern does `btOps` implement?",
      "choices": [
        {
          "label": "Divide-and-conquer with memoization",
          "correct": true
        },
        {
          "label": "Pure backtracking without caching"
        },
        {
          "label": "Bottom-up dynamic programming over a table"
        },
        {
          "label": "BFS across operator positions"
        }
      ],
      "explain": "`btOps` splits the token slice at every position (divide), solves left and right subproblems recursively (conquer), and caches results in a `memo` map. There is no iterative DP table or BFS queue."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case of `btOps`, and what does it return?",
      "choices": [
        {
          "label": "`len(t) == 1` — returns the single number `t[0]`",
          "correct": true
        },
        {
          "label": "`len(t) == 0` — returns an empty slice"
        },
        {
          "label": "`len(t) == 2` — returns the two numbers applied to each other"
        },
        {
          "label": "`i == 0` inside the loop — returns the left sub-result"
        }
      ],
      "explain": "When the token slice holds exactly one element, there is nothing left to split, so the only possible result is that single integer. `len(t) == 0` is never reached because the split loop starts at `i := 1`, keeping every left sub-slice non-empty."
    },
    {
      "id": "combination-step",
      "prompt": "After computing `left` and `right` sub-results, the code combines them with `+`, `-`, `*`, and optionally `/`. What guards the division?",
      "choices": [
        {
          "label": "`if b != 0` — division is skipped when the right operand is zero",
          "correct": true
        },
        {
          "label": "`if a != 0` — division is skipped when the left operand is zero"
        },
        {
          "label": "No guard; integer division by zero is allowed in Go"
        },
        {
          "label": "`if len(right) > 0` — division is skipped when the right sub-result is empty"
        }
      ],
      "explain": "The code appends `a/b` only inside `if b != 0`, preventing a divide-by-zero panic. `a` (the left operand) can be zero without issue."
    },
    {
      "id": "memo-key",
      "prompt": "Why does `btOps` use a string key built from the token slice content rather than the slice indices `(start, end)`?",
      "choices": [
        {
          "label": "The function receives a re-sliced sub-slice, so indices are relative; the serialized content uniquely identifies the subproblem",
          "correct": true
        },
        {
          "label": "String keys are faster to look up in Go maps than integer pairs"
        },
        {
          "label": "The token slice is modified in place, so indices would become stale"
        },
        {
          "label": "Go does not allow composite keys in maps, so a string is required"
        }
      ],
      "explain": "`btOps` is called with `t[:i]` and `t[i:]` — sub-slices whose indices always start at 0 from the callee's view. Storing `(start, end)` would require threading those bounds through every call. Serializing the actual values into a string identifies the subproblem regardless of how the slice was derived. (Go does allow array/struct keys, so option D is false.)"
    },
    {
      "id": "complexity",
      "prompt": "The comments state time and space are both `O(C_n^2)`. What does `C_n` represent here?",
      "choices": [
        {
          "label": "The n-th Catalan number — the count of distinct parenthesizations grows as the Catalan numbers",
          "correct": true
        },
        {
          "label": "n choose 2 — the number of operator pairs in the expression"
        },
        {
          "label": "n^2 — quadratic in the number of tokens"
        },
        {
          "label": "2^n — one branch per operator, doubling each level"
        }
      ],
      "explain": "The number of distinct ways to parenthesize an expression with n operators is the n-th Catalan number C_n. The number of results produced grows with the Catalan numbers, and the combine step pairs left results against right results, so the per-call work scales like C_n^2 — hence the `O(C_n^2)` annotation."
    },
    {
      "id": "split-loop",
      "prompt": "The split loop is `for i := 1; i < len(t); i++`. What would happen if it started at `i := 0` instead?",
      "choices": [
        {
          "label": "It would recurse on an empty left slice `t[:0]`, which hits neither the `len==1` base case nor the memo and breaks the recurrence",
          "correct": true
        },
        {
          "label": "It would include the first number twice, producing duplicate results"
        },
        {
          "label": "Nothing changes — the base case `len(t)==1` already covers that path"
        },
        {
          "label": "Go slicing panics on `t[:0]`, so the program would crash"
        }
      ],
      "explain": "Starting at `i=0` passes an empty `t[:0]` to a recursive call. That call has `len(t)==0`, which matches neither the base case (`len==1`) nor any memo entry, and falls through to an empty `res` — corrupting the combine step. Starting at `i=1` guarantees the left sub-slice always has at least one element. (Go does not panic on `t[:0]`; it returns an empty slice.)"
    }
  ]
};
