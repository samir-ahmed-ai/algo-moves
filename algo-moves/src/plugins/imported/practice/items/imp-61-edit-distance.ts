import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `editDistance` use?",
      "choices": [
        {
          "label": "2-D DP over character prefixes of both strings",
          "correct": true
        },
        {
          "label": "1-D DP with rolling array over one string"
        },
        {
          "label": "Memoized DFS with pruning"
        },
        {
          "label": "Longest Common Subsequence converted to edit distance"
        }
      ],
      "explain": "The code allocates a `(m+1)×(n+1)` grid `dp` and fills it bottom-up. Each cell `dp[i][j]` holds the edit distance between `word1[:i]` and `word2[:j]` — classic 2-D string DP."
    },
    {
      "id": "recurrence",
      "prompt": "When `word1[i-1] != word2[j-1]`, what does `dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])` represent?",
      "choices": [
        {
          "label": "1 + minimum of (delete from word1, insert into word1, replace)",
          "correct": true
        },
        {
          "label": "1 + length of the longest common subsequence so far"
        },
        {
          "label": "The number of mismatched characters between the two prefixes"
        },
        {
          "label": "1 + minimum of (skip in word1, skip in word2, match both)"
        }
      ],
      "explain": "`dp[i-1][j]` = delete word1[i-1]; `dp[i][j-1]` = insert a character (advance word2); `dp[i-1][j-1]` = replace word1[i-1] with word2[j-1]. We pick the cheapest and add 1 for the current operation."
    },
    {
      "id": "equal-chars",
      "prompt": "When `word1[i-1] == word2[j-1]`, the code sets `dp[i][j] = dp[i-1][j-1]` (no +1). Why no cost?",
      "choices": [
        {
          "label": "The characters already match, so no edit operation is needed; just move both pointers forward",
          "correct": true
        },
        {
          "label": "The minimum of the three neighbors happens to equal dp[i-1][j-1] in this case"
        },
        {
          "label": "To avoid counting the same character twice"
        },
        {
          "label": "Equal characters indicate the strings are already aligned at this position, costing -1 to offset the base case"
        }
      ],
      "explain": "A matching character requires zero edits. Extending both prefixes by one equal character leaves the edit distance unchanged from the prefixes without that character (`dp[i-1][j-1]`)."
    },
    {
      "id": "base-case",
      "prompt": "What do `dp[i][0] = i` and `dp[0][j] = j` represent?",
      "choices": [
        {
          "label": "The cost to convert a prefix of length i (or j) to an empty string by deleting all characters",
          "correct": true
        },
        {
          "label": "The index of the current character being processed"
        },
        {
          "label": "Placeholder values that are overwritten during the main fill"
        },
        {
          "label": "The minimum number of insertions needed when one string is empty"
        }
      ],
      "explain": "To turn `word1[:i]` into `\"\"` you delete all i characters, cost i. Symmetrically, turning `\"\"` into `word2[:j]` requires j insertions, cost j. These seed the DP table."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `editDistance`?",
      "choices": [
        {
          "label": "O(m*n) time and O(m*n) space",
          "correct": true
        },
        {
          "label": "O(m+n) time and O(m+n) space"
        },
        {
          "label": "O(m*n) time and O(min(m,n)) space"
        },
        {
          "label": "O(m²*n²) time and O(m*n) space"
        }
      ],
      "explain": "Both loops run m×n iterations total, and the 2-D `dp` array stores (m+1)×(n+1) values. A space-optimized version using two rows would be O(n), but this code uses the full grid."
    },
    {
      "id": "edge-empty",
      "prompt": "If `word1` is empty (m=0), what does the code return?",
      "choices": [
        {
          "label": "len(word2), because you need to insert every character of word2",
          "correct": true
        },
        {
          "label": "0, because no characters need to be deleted"
        },
        {
          "label": "-1, signaling an invalid input"
        },
        {
          "label": "1, because at least one operation is always required"
        }
      ],
      "explain": "With m=0, `dp[0][j] = j` for all j is set in the base-case loop, and the main fill loop never executes. The return is `dp[0][n] = n = len(word2)`: n insertions to build word2 from scratch."
    }
  ]
};
