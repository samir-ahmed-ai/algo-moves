import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "How does `btPermStr` differ from a typical backtracking approach that builds a new path string?",
      "choices": [
        {
          "label": "It operates directly on a shared byte slice, swapping bytes in place and restoring them after each recursive call",
          "correct": true
        },
        {
          "label": "It converts each character to an integer and backtracks over integer indices"
        },
        {
          "label": "It uses a visited boolean array to mark characters already chosen for the prefix"
        },
        {
          "label": "It sorts the byte slice lexicographically before each recursion level"
        }
      ],
      "explain": "`btPermStr` works on a single `[]byte` (from `[]byte(str)`), swapping `path[low]` with `path[i]` to select a character, recursing, and swapping back. No separate path-building string or `used` array is needed."
    },
    {
      "id": "base-case",
      "prompt": "The base case in `btPermStr` is `low == high`. What does this condition mean?",
      "choices": [
        {
          "label": "Only one position remains unfixed, so the full permutation is determined and can be recorded",
          "correct": true
        },
        {
          "label": "The slice has been reversed, signaling that all permutations have been generated"
        },
        {
          "label": "`low` and `high` cross each other, indicating the search space is exhausted"
        },
        {
          "label": "The two pointers meet at the midpoint, so the string is a palindrome"
        }
      ],
      "explain": "`low` tracks the first unfixed position and `high` is the last index. When `low == high`, every position before `low` is already committed, and only one character (at `path[high]`) remains — the permutation is complete."
    },
    {
      "id": "swap-restore",
      "prompt": "The loop body swaps `path[low]` and `path[i]`, recurses, then swaps them back. What would break if the restore swap were omitted?",
      "choices": [
        {
          "label": "Subsequent iterations of the loop would see a mutated `path`, causing wrong characters to be selected and duplicate or missing permutations",
          "correct": true
        },
        {
          "label": "The recursion would terminate early because `low` would equal `high` sooner"
        },
        {
          "label": "Go's garbage collector would reclaim the byte slice between calls"
        },
        {
          "label": "Nothing — each recursive frame gets its own copy of `path`"
        }
      ],
      "explain": "All recursive calls share the same `path` slice. Without the undo swap, when the loop advances `i` and tries the next candidate, the slice is already in a modified state from the previous iteration, producing incorrect results."
    },
    {
      "id": "conversion",
      "prompt": "`permString` converts the input string to `[]byte` before passing it to `btPermStr`. Why?",
      "choices": [
        {
          "label": "Go strings are immutable; a `[]byte` slice allows in-place character swaps",
          "correct": true
        },
        {
          "label": "A byte slice has a lower memory overhead than a string for ASCII characters"
        },
        {
          "label": "`string` type does not support index assignment, so Go requires a byte slice for sorting"
        },
        {
          "label": "The conversion normalizes Unicode code points to single bytes"
        }
      ],
      "explain": "In Go, strings are read-only. `s[i] = x` on a string is a compile error. Converting to `[]byte` gives a mutable buffer where individual bytes can be swapped without allocating a new string per level."
    },
    {
      "id": "complexity",
      "prompt": "Time complexity is `O(s · s!)`. If the input string has `s` characters, where does the `s!` come from?",
      "choices": [
        {
          "label": "There are `s!` distinct permutations of `s` characters, and each takes `O(s)` to convert to a string at the leaf",
          "correct": true
        },
        {
          "label": "The loop at each of `s` levels runs `s` times, giving `s^s` which simplifies to `s!`"
        },
        {
          "label": "`s!` is the number of swap operations needed to enumerate all arrangements"
        },
        {
          "label": "Sorting the byte slice at each level costs `O(s log s)`, and there are `s!` levels"
        }
      ],
      "explain": "The recursion tree has `s!` leaves — one per permutation. At each leaf, `string(path)` allocates and copies an `O(s)`-length string. The leaf cost dominates the swap operations, giving `O(s · s!)` total."
    },
    {
      "id": "high-parameter",
      "prompt": "The initial call is `btPermStr(path, 0, len(path)-1, &res)`. What is the role of passing `len(path)-1` rather than `len(path)` as `high`?",
      "choices": [
        {
          "label": "`high` is an inclusive index; `len(path)-1` is the last valid byte position in the slice",
          "correct": true
        },
        {
          "label": "`high` marks the exclusive upper bound used by Go slice expressions `path[:high]`"
        },
        {
          "label": "Passing `len(path)` would cause the base case `low==high` to trigger immediately"
        },
        {
          "label": "It reserves the last position for a null terminator byte"
        }
      ],
      "explain": "The loop `for i := low; i <= high; i++` uses `<=`, treating `high` as an inclusive boundary. `len(path)-1` is the index of the last character. Passing `len(path)` would make the loop access `path[len(path)]`, causing an out-of-bounds panic."
    }
  ]
};
