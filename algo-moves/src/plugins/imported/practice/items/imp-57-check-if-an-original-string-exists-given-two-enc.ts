import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does `possiblyEquals` use to decide if s1 and s2 could decode to the same string?",
      "choices": [
        {
          "label": "Memoized DFS over a 3-D state (i, j, diff)",
          "correct": true
        },
        {
          "label": "Bottom-up 2D DP table over positions (i, j)"
        },
        {
          "label": "BFS expanding all reachable (i, j) pairs level by level"
        },
        {
          "label": "Greedy: consume the smaller side first until both strings are exhausted"
        }
      ],
      "explain": "The code calls `btPossiblyEquals` recursively on state `(i, j, diff)` and caches results in a `map[[3]int]bool`. BFS and bottom-up DP don't appear; greedy can't handle ambiguous digit runs."
    },
    {
      "id": "state-meaning",
      "prompt": "In `btPossiblyEquals`, what does the integer `diff` represent at any point in the recursion?",
      "choices": [
        {
          "label": "How many more characters s1 has consumed than s2 from their decoded originals",
          "correct": true
        },
        {
          "label": "The total number of characters remaining unmatched across both strings"
        },
        {
          "label": "The index difference between i and j"
        },
        {
          "label": "The numeric value of the last digit run parsed from s1"
        }
      ],
      "explain": "When a digit run of value `num` is seen in s1 the code does `diff+num`; a digit run in s2 does `diff-num`. So `diff > 0` means s1's decoded side is ahead by that many characters, waiting for s2 to catch up."
    },
    {
      "id": "digit-branching",
      "prompt": "Why does the digit-handling loop (e.g., `for p := i; p < m && s1[p] >= '0'...`) iterate instead of consuming the whole digit run at once?",
      "choices": [
        {
          "label": "Because any prefix of the digit run is a valid interpretation (e.g., '12' can mean 1 then 2, or 12)",
          "correct": true
        },
        {
          "label": "To avoid integer overflow when the number exceeds 32 bits"
        },
        {
          "label": "Because only single-digit runs are allowed by the encoding"
        },
        {
          "label": "To match the digit run character-by-character against s2"
        }
      ],
      "explain": "The encoded strings can represent any positive integer, and each prefix of a digit sequence is a separate valid number. The loop tries every prefix (1, 12, 123, …) and recurses from `p+1`, capturing all valid interpretations."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case of `btPossiblyEquals` and what must be true for it to return `true`?",
      "choices": [
        {
          "label": "Both i == m and j == n, and diff == 0",
          "correct": true
        },
        {
          "label": "Either i == m or j == n, with no constraint on diff"
        },
        {
          "label": "diff == 0 at any point, regardless of i and j"
        },
        {
          "label": "i == m and j == n, regardless of the value of diff"
        }
      ],
      "explain": "The check `if i == m && j == n { return diff == 0 }` requires both strings to be fully consumed AND no outstanding imbalance. A nonzero diff means one decoded string is still longer than the other."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `possiblyEquals`?",
      "choices": [
        {
          "label": "O(m·n·2000) time and O(m·n·2000) space",
          "correct": true
        },
        {
          "label": "O(m·n) time and O(m·n) space"
        },
        {
          "label": "O(2^(m+n)) time and O(m+n) space"
        },
        {
          "label": "O(m·n·max(m,n)) time and O(m·n·max(m,n)) space"
        }
      ],
      "explain": "The memo key is `(i, j, diff)` where i ∈ [0,m], j ∈ [0,n], and diff ∈ [−999, 999] (up to 2000 values given digit runs ≤ 999). Each unique state is computed once, giving O(m·n·2000) for both time and space."
    },
    {
      "id": "letter-match",
      "prompt": "When `diff == 0` and both `s1[i]` and `s2[j]` are letters, what does the code require to advance both pointers?",
      "choices": [
        {
          "label": "The two letters must be equal: s1[i] == s2[j]",
          "correct": true
        },
        {
          "label": "Either letter can be anything; only position alignment matters"
        },
        {
          "label": "The letters must differ so the edit distance remains zero"
        },
        {
          "label": "One letter must be a vowel and the other a consonant"
        }
      ],
      "explain": "The code checks `s1[i] == s2[j] && btPossiblyEquals(s1, s2, i+1, j+1, 0, ...)`. When diff is zero both strings must be at the same position in the decoded original, so the characters must match exactly."
    }
  ]
};
