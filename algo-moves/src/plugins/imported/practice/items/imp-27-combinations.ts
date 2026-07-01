import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern best describes `combinationNums`?",
      "choices": [
        {
          "label": "Backtracking with a fixed-length collect condition",
          "correct": true
        },
        {
          "label": "Backtracking enumeration that records state at every call"
        },
        {
          "label": "BFS that fans out k levels"
        },
        {
          "label": "Iterative bitmask enumeration"
        }
      ],
      "explain": "The solution only collects when `len(path) == k`, making it fixed-length backtracking. Unlike Subsets, it does NOT record at every call — it waits for the exact target length before saving."
    },
    {
      "id": "base-case",
      "prompt": "In `btComb`, the base case is `if len(path) == k`. What happens immediately after collecting and returning?",
      "choices": [
        {
          "label": "The loop in the parent call continues to the next value of `num`",
          "correct": true
        },
        {
          "label": "The entire recursion terminates"
        },
        {
          "label": "The path is cleared and the search restarts from `idx = 1`"
        },
        {
          "label": "The function backtracks by removing the last element before returning"
        }
      ],
      "explain": "Returning from the base case pops one stack frame back to the parent's `for num` loop, which then increments `num` and tries the next candidate — the standard backtracking unwind."
    },
    {
      "id": "loop-bound",
      "prompt": "The loop in `btComb` is `for num := idx; num <= n; num++`. Why `<=` rather than `<`?",
      "choices": [
        {
          "label": "Numbers are 1-indexed up to n inclusive, so n itself must be a valid candidate",
          "correct": true
        },
        {
          "label": "Using `<` would skip the last number and miss some combinations"
        },
        {
          "label": "Both are equivalent because `n` is never reached in practice"
        },
        {
          "label": "The `<=` prevents an off-by-one when copying the final path"
        }
      ],
      "explain": "The problem generates combinations from 1 to n inclusive. Without `<=`, `num == n` would be excluded and all combinations containing n would be missing."
    },
    {
      "id": "complexity",
      "prompt": "The time complexity is stated as O(k · C(n,k)). What accounts for the `k` factor?",
      "choices": [
        {
          "label": "Copying a length-k path into `res` for each of the C(n,k) valid combinations",
          "correct": true
        },
        {
          "label": "The recursion depth is k and each level does O(C(n,k)) work"
        },
        {
          "label": "Sorting k candidates at each node"
        },
        {
          "label": "The duplicate check compares k elements pairwise"
        }
      ],
      "explain": "`copy(row, path)` is O(k) and is called once per collected combination. With C(n,k) combinations, total copy cost is O(k · C(n,k))."
    },
    {
      "id": "no-reuse",
      "prompt": "Each recursive call uses `btComb(num+1, ...)` rather than `btComb(num, ...)`. What would happen if `num` were passed instead of `num+1`?",
      "choices": [
        {
          "label": "The same number could appear multiple times in a combination, producing combinations with repetition instead",
          "correct": true
        },
        {
          "label": "The recursion would terminate immediately"
        },
        {
          "label": "Only the last combination would be collected"
        },
        {
          "label": "The path would grow beyond length k, causing a panic"
        }
      ],
      "explain": "Passing `num` would allow the same position to be chosen again on the next call (combinations with repetition). Passing `num+1` ensures each number is picked at most once per combination."
    },
    {
      "id": "empty-k",
      "prompt": "What does `combinationNums(5, 0)` return?",
      "choices": [
        {
          "label": "A slice containing one element: the empty combination `[]`",
          "correct": true
        },
        {
          "label": "An empty slice"
        },
        {
          "label": "A slice of all integers 1..5"
        },
        {
          "label": "A runtime panic due to zero-length copy"
        }
      ],
      "explain": "The first call to `btComb` immediately hits `len(path) == k` (0 == 0), copies the empty path, and returns. The result is `[[]]`, mirroring the Subsets empty-input case."
    }
  ]
};
