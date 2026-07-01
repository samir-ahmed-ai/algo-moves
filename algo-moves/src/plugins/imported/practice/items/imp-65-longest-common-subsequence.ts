import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What DP table shape does `longestCommonSequence` use?",
      "choices": [
        {
          "label": "2D table of size (m+1) — × (n+1) where m and n are string",
          "correct": true
        },
        {
          "label": "1D array of size max(m — n)+1 reused per row"
        },
        {
          "label": "A hash map from (i — j) pairs to LCS lengths"
        },
        {
          "label": "A 2D table of size — m × n without padding rows/columns"
        }
      ],
      "explain": "The code allocates `dp[m+1][n+1]`, where the extra row 0 and column 0 serve as zero-initialized base cases (empty prefix of either string). This avoids bounds checks inside the loop."
    },
    {
      "id": "recurrence-match",
      "prompt": "When `text1[i-1] == text2[j-1]`, the code sets `dp[i][j] = dp[i-1][j-1] + 1`. What does `dp[i-1][j-1]` represent?",
      "choices": [
        {
          "label": "The LCS length — prefixes text1[:i-1] and text2[:j-1]",
          "correct": true
        },
        {
          "label": "The LCS length — prefixes text1[:i] and text2[:j]"
        },
        {
          "label": "The length of the longest — match ending at the previous"
        },
        {
          "label": "The minimum edits needed — align text1[:i] and text2[:j]"
        }
      ],
      "explain": "When both current characters match, we extend the LCS of the two shorter prefixes (everything before position i and j) by 1. `dp[i-1][j-1]` is that diagonal predecessor — the sub-problem without these matching characters."
    },
    {
      "id": "recurrence-mismatch",
      "prompt": "When the characters don't match, the code computes `max(dp[i-1][j], dp[i][j-1])`. What do these two values represent?",
      "choices": [
        {
          "label": "Skipping the current char of text1 — or skipping the current char",
          "correct": true
        },
        {
          "label": "The LCS ending at text1[i-1] — vs the LCS ending at text2[j-1]"
        },
        {
          "label": "The LCS of the two — strings reversed, used for palindrome"
        },
        {
          "label": "The edit distance contributions — deletions vs insertions"
        }
      ],
      "explain": "`dp[i-1][j]` = best LCS when we ignore text1[i-1]; `dp[i][j-1]` = best when we ignore text2[j-1]. Since we can't include both mismatched characters in the LCS, we take the maximum of either sacrifice."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of this solution?",
      "choices": [
        {
          "label": "Time O(m*n), Space O(m*n) — Every cell in the (m+1)×(n+1) table",
          "correct": true
        },
        {
          "label": "Time O(m*n), Space O(min(m,n)) — Every cell in the (m+1)×(n+1)"
        },
        {
          "label": "Time O(m+n), Space O(m*n) — Every cell in the (m+1)×(n+1)"
        },
        {
          "label": "Time O(m²*n²), Space O(m*n) — Every cell in the (m+1)×(n+1)"
        }
      ],
      "explain": "Every cell in the (m+1)×(n+1) table is computed exactly once, giving O(m*n) time. The full table is retained in memory, so space is also O(m*n). A space-optimized version could get by with O(min(m,n)) using two rolling rows."
    },
    {
      "id": "base-case",
      "prompt": "The zero row and zero column of `dp` are never explicitly set. Why are they correctly zero?",
      "choices": [
        {
          "label": "Go zero-initializes slices Go's — Go's make([][]int,",
          "correct": true
        },
        {
          "label": "The loops start at i=1 — and j=1, so row 0 and col 0 are never"
        },
        {
          "label": "The max() calls propagate zeros — from the boundaries automatically"
        },
        {
          "label": "The +1 offset means row — 0 corresponds to an impossible state"
        }
      ],
      "explain": "Go's `make([][]int, ...)` zero-initializes all elements. Row 0 represents an empty text1 prefix; column 0 represents an empty text2 prefix. The LCS of anything with an empty string is 0, so zeros are exactly correct without any explicit initialization."
    },
    {
      "id": "index-offset",
      "prompt": "Inside the loops, the code compares `text1[i-1]` and `text2[j-1]` (not `text1[i]`). Why the -1 offset?",
      "choices": [
        {
          "label": "dp[i][j] represents prefixes of i — so character index i-1 is",
          "correct": true
        },
        {
          "label": "The -1 corrects for Go — strings being 1-indexed"
        },
        {
          "label": "It avoids reading past — end of the string when i equals m"
        },
        {
          "label": "The loop bounds include — off-by-one that the -1 compensates for"
        }
      ],
      "explain": "`dp[i][j]` is defined as the LCS of the first `i` chars of text1 and first `j` chars of text2. The last character in that prefix is at 0-based index `i-1`. The table's extra row/column (index 0) represents the empty-prefix base case."
    }
  ]
};
