import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "How does `combinationSubsetStr` differ from the Combinations problem?",
      "choices": [
        {
          "label": "Each character from the charset can be reused at every position; there is no start-index advancement",
          "correct": true
        },
        {
          "label": "It collects results at every call depth, not just at length k"
        },
        {
          "label": "It uses BFS instead of DFS"
        },
        {
          "label": "It sorts characters before iterating to avoid duplicates"
        }
      ],
      "explain": "`btSubsetStr` always iterates over the full `chars` slice (no `idx` parameter), so every character is available at every position. This gives s^k outcomes vs. C(n,k) for no-reuse combinations."
    },
    {
      "id": "reuse-mechanism",
      "prompt": "In `btSubsetStr`, the recursive call is `btSubsetStr(chars, k, append(path, ch), res)`. What is the key difference from the Subsets and Combinations solutions?",
      "choices": [
        {
          "label": "There is no start-index argument; the full charset is offered again at every level",
          "correct": true
        },
        {
          "label": "The path is cleared before the recursive call"
        },
        {
          "label": "Only the remaining suffix of chars is passed, not the full slice"
        },
        {
          "label": "Characters are removed from chars after being used"
        }
      ],
      "explain": "Because `chars` is passed unchanged and there is no index into it, every character competes at every depth — enabling repetition. Combinations pass `num+1` precisely to block this."
    },
    {
      "id": "base-case",
      "prompt": "The base case is `if len(path) == k`. What is appended to `res` at that point?",
      "choices": [
        {
          "label": "`string(path)` — the byte slice converted to a Go string",
          "correct": true
        },
        {
          "label": "A copy of the `path` byte slice"
        },
        {
          "label": "The individual characters as separate strings"
        },
        {
          "label": "The index of the last character chosen"
        }
      ],
      "explain": "`*res = append(*res, string(path))` converts the accumulated `[]byte` to a string in one step. Unlike the int-slice problems, no explicit `copy` into a new slice is needed here because `string()` always copies."
    },
    {
      "id": "complexity",
      "prompt": "Time complexity is O(k · s^k) where s = len(chars). Where does the s^k term originate?",
      "choices": [
        {
          "label": "At each of k depths the branching factor is s (every char available), yielding s^k leaves",
          "correct": true
        },
        {
          "label": "The outer loop runs k times and each iteration does s^(k-1) work"
        },
        {
          "label": "Sorting chars takes O(s log s) repeated k times"
        },
        {
          "label": "There are s^k calls but each call only costs O(1)"
        }
      ],
      "explain": "With s choices at each of k levels and full reuse, the recursion tree has s^k leaves. The k factor comes from converting each leaf's length-k path to a string in O(k) time."
    },
    {
      "id": "edge-empty-charset",
      "prompt": "If `str` is an empty string and `k > 0`, what does `combinationSubsetStr` return?",
      "choices": [
        {
          "label": "An empty slice — no combinations can be formed",
          "correct": true
        },
        {
          "label": "A slice with one empty string"
        },
        {
          "label": "A panic due to iterating over a nil slice"
        },
        {
          "label": "k empty strings"
        }
      ],
      "explain": "With `chars` empty, `for _, ch := range chars` never executes, so no recursive call is made and `len(path)` never reaches k. The result slice remains empty."
    },
    {
      "id": "string-aliasing",
      "prompt": "Why is it safe to store `string(path)` directly even though `path` is a reused `[]byte` that keeps mutating as recursion unwinds?",
      "choices": [
        {
          "label": "A `string` conversion copies the bytes into immutable backing storage, so later mutations to `path` cannot affect the stored value",
          "correct": true
        },
        {
          "label": "`path` is reallocated on every call, so no aliasing is possible"
        },
        {
          "label": "Go strings hold a pointer to `path`, so the value updates automatically"
        },
        {
          "label": "The recursion never reuses `path`'s underlying array"
        }
      ],
      "explain": "Converting `[]byte` to `string` in Go produces an immutable copy of the bytes. That is why this problem needs no explicit `copy` step, whereas the int-slice problems must snapshot the slice before storing it."
    }
  ]
};
