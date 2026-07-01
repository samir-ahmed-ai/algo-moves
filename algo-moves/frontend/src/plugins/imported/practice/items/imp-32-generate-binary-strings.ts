import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic category best describes `genBinStrings`?",
      "choices": [
        {
          "label": "Backtracking enumeration via DFS — btBin branches into two recursive",
          "correct": true
        },
        {
          "label": "BFS level-order generation — btBin branches into two"
        },
        {
          "label": "Dynamic programming with memoization — btBin branches into two"
        },
        {
          "label": "Greedy bit-by-bit selection — btBin branches into two"
        }
      ],
      "explain": "`btBin` branches into two recursive calls ('0' and '1') and builds strings down the call stack — that is DFS-based backtracking enumeration. BFS would use an explicit queue; this never does."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case in `btBin`, and what action does it take?",
      "choices": [
        {
          "label": "When `len(path) == n`, append — `path` to `res` and return",
          "correct": true
        },
        {
          "label": "When `n == 0`, return — an empty slice immediately"
        },
        {
          "label": "When `path` equals `\"0\"` or `\"1\"` — stop recursion"
        },
        {
          "label": "When both recursive calls — collect results"
        }
      ],
      "explain": "The guard `if len(path) == n` detects a complete string and records it. There is no `n == 0` guard in `btBin` — that detail is a distractor."
    },
    {
      "id": "branching",
      "prompt": "How does `btBin` produce exactly 2^n strings for length n?",
      "choices": [
        {
          "label": "It makes two recursive calls — at every level one appending '0', one",
          "correct": true
        },
        {
          "label": "It iterates over a pre-built — alphabet slice of size 2 in a loop"
        },
        {
          "label": "It uses a bitmask — enumerate all n-bit integers"
        },
        {
          "label": "It calls itself n times — sequentially, doubling a list each"
        }
      ],
      "explain": "Each call to `btBin` spawns `btBin(path+\"0\", …)` and `btBin(path+\"1\", …)`. At depth n the recursion terminates, giving a full binary tree with 2^n leaves — one per output string."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `genBinStrings(n)`?",
      "choices": [
        {
          "label": "Time O(n · 2^n), Space — O(2^n)",
          "correct": true
        },
        {
          "label": "Time O(2^n), Space O(n) — There are 2^n strings, each of"
        },
        {
          "label": "Time O(n^2), Space O(n) — There are 2^n strings, each of"
        },
        {
          "label": "Time O(n · 2^n), Space — O(n)"
        }
      ],
      "explain": "There are 2^n strings, each of length n, so collecting them costs O(n · 2^n) time. Storing all results requires O(2^n) space (each string is length n, but the dominant factor is the count of strings). The recursion stack depth is only O(n), but the output dominates."
    },
    {
      "id": "path-mutation",
      "prompt": "Why does `btBin` pass `path+\"0\"` and `path+\"1\"` (new strings) rather than mutating a shared byte slice?",
      "choices": [
        {
          "label": "Go strings are immutable — so each concatenation creates a new",
          "correct": true
        },
        {
          "label": "Mutation would cause a data — race on concurrent goroutines"
        },
        {
          "label": "A shared slice would overflow — the stack faster"
        },
        {
          "label": "The compiler requires immutable — for recursive functions"
        }
      ],
      "explain": "Because Go strings are value types, `path+\"0\"` allocates a new string for the '0' branch, leaving `path` unchanged for the '1' branch. This naturally handles backtracking without an explicit undo step."
    },
    {
      "id": "edge-empty",
      "prompt": "What does `genBinStrings(0)` return?",
      "choices": [
        {
          "label": "An empty slice — elements"
        },
        {
          "label": "A slice containing one element: — the empty string `\"\"`",
          "correct": true
        },
        {
          "label": "nil — With n=0, btBin(\"\", 0, &res) is"
        },
        {
          "label": "A panic due to zero-length — allocation"
        }
      ],
      "explain": "With n=0, `btBin(\"\", 0, &res)` is called. `len(\"\") == 0 == n` is immediately true, so `\"\"` is appended and returned. The result is `[\"\"]`, a slice with one (empty-string) element."
    }
  ]
};
