import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What pattern does `decodeNumbers` implement?",
      "choices": [
        {
          "label": "DFS backtracking with matching — At each position, the code tries",
          "correct": true
        },
        {
          "label": "Bottom-up DP on the digit — string"
        },
        {
          "label": "BFS where each level tries — one digit"
        },
        {
          "label": "Greedy left-to-right character — At each position, the code tries"
        }
      ],
      "explain": "At each position, the code tries every key in `dict` to see if it matches the current prefix of `s`, then recurses — classic DFS backtracking. A DP approach would count ways, not enumerate paths."
    },
    {
      "id": "prefix-match",
      "prompt": "The condition `idx+len(key) <= len(s) && s[idx:idx+len(key)] == key` guards each branch. What does the first sub-condition prevent?",
      "choices": [
        {
          "label": "A slice-out-of-bounds panic — dictionary key is longer than the",
          "correct": true
        },
        {
          "label": "Matching a key that contains — non-digit characters"
        },
        {
          "label": "Revisiting a position — <= len(s) ensures"
        },
        {
          "label": "Using the same dictionary key — twice in one path"
        }
      ],
      "explain": "`idx+len(key) <= len(s)` ensures there are enough characters left before slicing `s[idx:idx+len(key)]`. Without it, that slice expression would panic on short suffixes."
    },
    {
      "id": "base-case",
      "prompt": "The base case is `if idx == len(s)`. What does this mean in terms of the decoding?",
      "choices": [
        {
          "label": "The entire digit string — been consumed by dictionary keys;",
          "correct": true
        },
        {
          "label": "All dictionary keys — tried at least once"
        },
        {
          "label": "The remaining suffix — short for any key to match"
        },
        {
          "label": "A mismatch was detected — the branch must be abandoned"
        }
      ],
      "explain": "When `idx` reaches `len(s)`, every character in `s` has been matched by some sequence of dictionary keys. The accumulated `path` is a valid decode and is recorded in `res`."
    },
    {
      "id": "complexity",
      "prompt": "Time complexity is O(s · d^s) where s = len(digits) and d = len(dict). What does d^s represent?",
      "choices": [
        {
          "label": "The recursion tree has branching — factor d at each of the s positions,",
          "correct": true
        },
        {
          "label": "There are s! orderings — d keys"
        },
        {
          "label": "Each key match costs O(d) — and there are s levels"
        },
        {
          "label": "The result set contains exactly — d^s decoded strings"
        }
      ],
      "explain": "If every position in `s` could match any of the d keys (worst case: all keys have length 1), the tree branches d ways at every step up to depth s — d^s leaves. The s factor comes from the string concatenation `path+string(ch)` at each node."
    },
    {
      "id": "variable-key-length",
      "prompt": "Unlike single-digit decode problems, this solution supports dictionary keys of varying lengths (`len(key)` differs per key). How is this handled?",
      "choices": [
        {
          "label": "Each key is matched — `s[idx:idx+len(key)]` and the index",
          "correct": true
        },
        {
          "label": "Keys are padded — same length before matching"
        },
        {
          "label": "The loop iterates character — character and accumulates key"
        },
        {
          "label": "Only single-character keys — keys are ignored"
        }
      ],
      "explain": "The slice `s[idx:idx+len(key)]` checks an exact-length window, and `btDecode` is called with `idx+len(key)` to skip the matched portion. This naturally handles keys of any length without any padding or special casing."
    },
    {
      "id": "map-iteration-order",
      "prompt": "The inner loop is `for key, ch := range dict`, iterating over a Go map. What does this imply about the order of decoded strings in `res`?",
      "choices": [
        {
          "label": "The order is not deterministic — Go randomizes map iteration order, so",
          "correct": true
        },
        {
          "label": "Results are always sorted — by key"
        },
        {
          "label": "Results follow the insertion order — of the dictionary"
        },
        {
          "label": "Results are ordered — byte value of `ch`"
        }
      ],
      "explain": "Go intentionally randomizes map iteration order, so the sequence in which keys are tried — and thus the order of decodings appended to `res` — is not guaranteed. The set of decodings is the same, but their order can differ between runs."
    }
  ]
};
