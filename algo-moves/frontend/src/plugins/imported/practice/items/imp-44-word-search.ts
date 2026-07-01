import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `exist` / `btWordSearch` use to find the word in the grid?",
      "choices": [
        {
          "label": "DFS backtracking with in-place cell — marking from every starting cell",
          "correct": true
        },
        {
          "label": "BFS expanding a frontier — partial matches level by level"
        },
        {
          "label": "Dynamic programming storing match — in a 2-D table"
        },
        {
          "label": "Trie-based prefix search — grid rows"
        }
      ],
      "explain": "The outer loops in `exist` try every cell as a starting point; `btWordSearch` then performs DFS, marking visited cells with `'#'` in place and restoring them on return — classic backtracking."
    },
    {
      "id": "visited-marking",
      "prompt": "The code saves the current cell as `tmp`, writes `'#'` to it, recurses, then restores it. What would go wrong if the restore step were removed?",
      "choices": [
        {
          "label": "A cell used in one — recursive branch would remain marked",
          "correct": true
        },
        {
          "label": "The grid would accumulate `'#'` — values and grow indefinitely, causing"
        },
        {
          "label": "The mismatch check `board[r][c] != — word[idx]` would always fail,"
        },
        {
          "label": "Nothing `'#'` never equals — so restored or not,"
        }
      ],
      "explain": "The restore step is the backtrack. Without it, a cell visited in one path is permanently blocked. When the algorithm backtracks and explores a different direction, the falsely-blocked cell would make reachable paths appear unreachable."
    },
    {
      "id": "pruning",
      "prompt": "The bounds check and mismatch check are combined in one `if` condition at the top of `btWordSearch`. What pruning does the mismatch check `board[r][c] != word[idx]` provide?",
      "choices": [
        {
          "label": "It short-circuits any If board[r][c] — does not match",
          "correct": true
        },
        {
          "label": "It filters duplicate paths — revisit the same cell through"
        },
        {
          "label": "It ensures `idx` never exceeds — `len(word)`, preventing an"
        },
        {
          "label": "It handles the special `'#'` — sentinel by treating it as a"
        }
      ],
      "explain": "If `board[r][c]` does not match `word[idx]`, there is no point recursing into the four neighbors — none of them can extend a valid match from this cell. This prunes the search tree significantly in mismatched branches."
    },
    {
      "id": "base-case",
      "prompt": "The function returns `true` when `idx == len(word)`. Why is this check placed *before* the bounds and mismatch checks?",
      "choices": [
        {
          "label": "By the time `idx == — len(word)`, all characters have been",
          "correct": true
        },
        {
          "label": "The base case must precede — bounds checks to avoid returning"
        },
        {
          "label": "Go evaluates conditions — placing it first is a"
        },
        {
          "label": "The bounds check would wrongly — reject the call because `r` and `c`"
        }
      ],
      "explain": "`word[idx]` would panic if `idx == len(word)`. Placing the success check first returns `true` immediately upon matching all characters, before the mismatch condition attempts to read `word[idx]`."
    },
    {
      "id": "complexity",
      "prompt": "Time complexity is `O(m·n·3^L)`. Why is the branching factor 3, not 4?",
      "choices": [
        {
          "label": "From any cell mid-path — the neighbor we just came from is",
          "correct": true
        },
        {
          "label": "The grid boundary eliminates one — direction on average, reducing 4 to 3"
        },
        {
          "label": "The algorithm only searches — down, and"
        },
        {
          "label": "One direction is always pruned — by the mismatch check on the first"
        }
      ],
      "explain": "The cell from which the current call was made is already marked `'#'`, so when recursing from `(r,c)` into a neighbor, the path back to the parent is blocked. This reduces the effective branching factor from 4 to at most 3."
    },
    {
      "id": "early-return",
      "prompt": "The outer loop in `exist` returns `true` as soon as any `btWordSearch` call succeeds. What is the consequence of this short-circuit?",
      "choices": [
        {
          "label": "It stops searching — The problem asks whether the word",
          "correct": true
        },
        {
          "label": "It prevents the grid — being fully restored after the"
        },
        {
          "label": "It may miss shorter paths — starting from later cells"
        },
        {
          "label": "It forces exactly one result — even when multiple valid paths exist"
        }
      ],
      "explain": "The problem asks whether the word *exists*, not to enumerate all paths. Returning `true` on the first success is correct. Grid restoration happens within `btWordSearch` (each cell is restored after its recursion), so the early return does not leave the grid corrupted."
    }
  ]
};
