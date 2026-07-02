import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "The `allSubsets` solution records the path at every recursive call, not just leaf nodes. Which algorithmic pattern does this reflect?",
      "choices": [
        {
          "label": "Backtracking enumeration — collect state at every call",
          "correct": true
        },
        {
          "label": "BFS level-by-level traversal — Recording path at every call"
        },
        {
          "label": "Dynamic programming with a 2-D — table"
        },
        {
          "label": "Divide-and-conquer merge step — Recording path at every call"
        }
      ],
      "explain": "Recording `path` at every call (before the loop) gives all 2^n subsets including the empty set and the full set — the hallmark of backtracking subset enumeration. BFS and DP would use completely different structures."
    },
    {
      "id": "start-index",
      "prompt": "In `btSubsets`, the loop starts at `idx` and each recursive call passes `i+1` as the new index. What does this enforce?",
      "choices": [
        {
          "label": "Each element is used at most once — and elements are chosen in",
          "correct": true
        },
        {
          "label": "Elements can be reused — number of times"
        },
        {
          "label": "The path is always sorted — in descending order"
        },
        {
          "label": "Duplicate values in the input — are automatically skipped"
        }
      ],
      "explain": "Passing `i+1` prevents revisiting earlier indices, ensuring no duplicates and no reuse of the same position. Reuse would require passing `i` instead of `i+1`."
    },
    {
      "id": "snapshot-copy",
      "prompt": "Why does `btSubsets` do `row := make([]int, len(path)); copy(row, path)` before appending to `res`?",
      "choices": [
        {
          "label": "Because Go slices share — append(path, a[i]) may reuse the",
          "correct": true
        },
        {
          "label": "To sort the path — storing it"
        },
        {
          "label": "To avoid hitting the recursion — depth limit"
        },
        {
          "label": "Because `append(path, a[i])` — path in-place"
        }
      ],
      "explain": "`append(path, a[i])` may reuse the underlying array if there is capacity, so later calls can overwrite earlier stored subsets. Copying into a fresh slice captures the snapshot safely."
    },
    {
      "id": "complexity",
      "prompt": "The stated time complexity is O(n · 2^n). Where does the `n` factor come from?",
      "choices": [
        {
          "label": "Each of the 2^n subsets — requires up to O(n) work to copy into",
          "correct": true
        },
        {
          "label": "There are n levels — recursion and each level doubles the"
        },
        {
          "label": "Sorting the input takes O(n — log n) which dominates"
        },
        {
          "label": "The duplicate-skip check — node costs O(n)"
        }
      ],
      "explain": "There is no sort; the `n` factor comes from `copy(row, path)` which is O(len(path)) ≤ O(n) per subset, and there are 2^n subsets total. Multiplying gives O(n · 2^n)."
    },
    {
      "id": "base-case",
      "prompt": "There is no explicit `if len(path) == n { return }` in `btSubsets`. How does the recursion terminate?",
      "choices": [
        {
          "label": "The loop `for i := — idx; i < len(a)` naturally exits when",
          "correct": true
        },
        {
          "label": "Go's runtime enforces a maximum — recursion depth"
        },
        {
          "label": "The `copy` call panics when path — unwinding the"
        },
        {
          "label": "A hidden sentinel value — the end of `a` triggers a `return`"
        }
      ],
      "explain": "When `idx == len(a)`, the loop condition `i < len(a)` is immediately false, so no recursive calls are made. The function snapshots the current path and returns naturally — no explicit base-case guard is needed."
    },
    {
      "id": "edge-empty-input",
      "prompt": "If `a` is an empty slice, what does `allSubsets` return?",
      "choices": [
        {
          "label": "A slice containing exactly one — element: the empty subset `[]`",
          "correct": true
        },
        {
          "label": "An empty slice `[]` — btSubsets always records path"
        },
        {
          "label": "A panic due to nil — dereference"
        },
        {
          "label": "A slice containing one nil — element"
        }
      ],
      "explain": "`btSubsets` always records `path` before the loop. On the first (and only) call with an empty `a`, `path` is `[]int{}`, so a copy of the empty path is appended. The result is `[[]]`, not `[]`."
    }
  ]
};
