import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern best describes the approach used in `btIP`?",
      "choices": [
        {
          "label": "Backtracking with pruning to enumerate valid IP partitions",
          "correct": true
        },
        {
          "label": "Dynamic programming over substring lengths"
        },
        {
          "label": "Sliding window over the digit string"
        },
        {
          "label": "BFS level-by-level, one octet per level"
        }
      ],
      "explain": "`btIP` builds a path by choosing 1–3 digit segments at each step and recurses; invalid segments are pruned before recursing, and the function explores alternatives by unwinding the call stack — classic backtracking."
    },
    {
      "id": "termination",
      "prompt": "When does `btIP` finalize a candidate IP address and add it to `res`?",
      "choices": [
        {
          "label": "When `dots == 3` and the remaining suffix `s[idx:]` is a valid octet",
          "correct": true
        },
        {
          "label": "When `dots == 4` and `idx == len(s)`"
        },
        {
          "label": "When `idx == len(s)` regardless of how many dots have been placed"
        },
        {
          "label": "When `dots == 3` and `idx == len(s)-1`"
        }
      ],
      "explain": "After placing 3 dots, three octets are in `path` and the 4th is the remaining suffix `s[idx:]`. The code validates that suffix with `btValidIPPart(s[idx:])` before appending. `dots` never reaches 4 in this code, and `idx==len(s)` alone would skip validating the final segment."
    },
    {
      "id": "leading-zero-pruning",
      "prompt": "Inside `btIP`, the condition `if i > idx && s[idx] == '0' { break }` prunes a branch. What does it guard against?",
      "choices": [
        {
          "label": "Multi-digit segments that start with '0', e.g. '01' or '00'",
          "correct": true
        },
        {
          "label": "Any segment longer than 3 characters"
        },
        {
          "label": "The digit '0' appearing anywhere in the segment"
        },
        {
          "label": "An index that runs past the end of the string"
        }
      ],
      "explain": "`s[idx]=='0'` checks the first character of the current segment. When `i > idx` (segment is more than one character long) and it starts with '0', the segment has an illegal leading zero — the loop breaks, so a single '0' is still allowed but any longer extension is rejected."
    },
    {
      "id": "early-exit",
      "prompt": "`partitionCombinations` immediately returns `nil` if `len(digits) > 12`. Why 12?",
      "choices": [
        {
          "label": "An IPv4 address has 4 octets of at most 3 digits each, giving a maximum of 12 digits",
          "correct": true
        },
        {
          "label": "12 is the maximum value expressible as a 4-bit octet"
        },
        {
          "label": "The backtracking tree has depth 12 regardless of input length"
        },
        {
          "label": "Go string indexing requires the length to fit in a signed byte"
        }
      ],
      "explain": "The longest valid IPv4 address is '255.255.255.255' — four 3-digit octets = 12 digit characters. Any string longer than 12 digits cannot be partitioned into four valid octets, so the early return avoids useless recursion."
    },
    {
      "id": "complexity",
      "prompt": "The time and space complexity are listed as `O(1)`. Why is this reasonable despite the recursive calls?",
      "choices": [
        {
          "label": "The input is bounded: at most 12 digits, 4 octets, and at most 3 choices per octet, so the search space is a small constant",
          "correct": true
        },
        {
          "label": "The function uses tail recursion, which Go optimizes to O(1) stack space"
        },
        {
          "label": "The result slice is pre-allocated to a fixed size before recursion starts"
        },
        {
          "label": "Memoization collapses redundant subproblems to constant work"
        }
      ],
      "explain": "Because the input is capped at 12 digits and each of the 4 octets has at most 3 digit choices, the total number of recursive calls and result strings is bounded by a constant. There is no memoization — the O(1) bound comes purely from the fixed input size."
    },
    {
      "id": "separator-logic",
      "prompt": "In `btIP`, the separator `sep` is set to `\".\"` by default but to `\"\"` when `path == \"\"`. What problem does this solve?",
      "choices": [
        {
          "label": "It avoids a leading dot before the very first octet",
          "correct": true
        },
        {
          "label": "It avoids a trailing dot after the last octet"
        },
        {
          "label": "It prevents placing two consecutive dots when an octet is empty"
        },
        {
          "label": "It handles the case where the original string already contains dots"
        }
      ],
      "explain": "When `path` is still empty, no octets have been added yet. Prepending `\".\"` would produce `.12.3.4` instead of `12.3.4`. The empty separator on the first octet prevents that leading dot."
    }
  ]
};
