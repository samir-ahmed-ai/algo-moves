import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "How is `numberOfDistinctSubsequence` categorized as a DP problem?",
      "choices": [
        {
          "label": "2D string DP where dp[i][j] — counts ways s[:i] can form t[:j]",
          "correct": true
        },
        {
          "label": "1D DP with a rolling — window over characters of t"
        },
        {
          "label": "Backtracking with memoization — The code allocates a 2D table"
        },
        {
          "label": "Greedy matching of t's characters — left-to-right in s"
        }
      ],
      "explain": "The code allocates a 2D table `dp[m+1][n+1]` and fills it by considering every prefix of s against every prefix of t — classic 2D string DP."
    },
    {
      "id": "base-case",
      "prompt": "Why does the code set `dp[i][0] = 1` for all i from 0 to m?",
      "choices": [
        {
          "label": "An empty target t — always be formed from any prefix of s",
          "correct": true
        },
        {
          "label": "It prevents divide-by-zero — recurrence"
        },
        {
          "label": "It represents the case — s is empty and t is non-empty"
        },
        {
          "label": "It handles the edge case — where s and t have the same length"
        }
      ],
      "explain": "There is exactly one subsequence of any string that equals the empty string: the empty selection. Setting `dp[i][0] = 1` encodes this base case. `dp[0][j] = 0` for j > 0 is left at its zero-initialized value, correctly reflecting that an empty s cannot form a non-empty t."
    },
    {
      "id": "recurrence",
      "prompt": "What does `dp[i][j] = dp[i-1][j]` represent before the character-match check?",
      "choices": [
        {
          "label": "Skip s[i-1]: all ways — form t[:j] from s[:i-1] are still",
          "correct": true
        },
        {
          "label": "Delete t[j-1] and inherit — count from the previous row"
        },
        {
          "label": "Copy the value — previous column to avoid recomputation"
        },
        {
          "label": "Mark that s[i-1] and t[j-1] — do not match"
        }
      ],
      "explain": "`dp[i-1][j]` is the number of ways to form t[:j] using s[:i-1]. Because we can always ignore the current character s[i-1], those ways carry over to dp[i][j] unconditionally. The match branch then adds diagonal ways on top."
    },
    {
      "id": "match-step",
      "prompt": "When `s[i-1] == t[j-1]`, why is `dp[i-1][j-1]` added to `dp[i][j]`?",
      "choices": [
        {
          "label": "It counts the ways we — can use s[i-1] to match t[j-1],",
          "correct": true
        },
        {
          "label": "It corrects an off-by-one error — introduced by the base case"
        },
        {
          "label": "It counts permutations instead — combinations"
        },
        {
          "label": "It handles overlapping characters — subtracting duplicates"
        }
      ],
      "explain": "When characters match, we get an additional family of subsequences: pick s[i-1] as the match for t[j-1], then rely on the dp[i-1][j-1] ways to match the remaining t[:j-1] using s[:i-1]. The diagonal term exactly captures this."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `numberOfDistinctSubsequence`?",
      "choices": [
        {
          "label": "O(m·n) time, O(m·n) space — The double loop fills an (m+1)×(n+1)",
          "correct": true
        },
        {
          "label": "O(m·n) time, O(n) space — The double loop fills an"
        },
        {
          "label": "O(m+n) time, O(m·n) space — The double loop fills an"
        },
        {
          "label": "O(m·n·log n) time, O(m·n) space — The double loop fills an"
        }
      ],
      "explain": "The double loop fills an (m+1)×(n+1) table with O(1) work per cell, giving O(m·n) time. The table itself occupies O(m·n) space. A 1-D rolling optimization is possible but not implemented here."
    },
    {
      "id": "edge-case",
      "prompt": "What value does `dp[m][0]` hold at the end, and what does it mean?",
      "choices": [
        {
          "label": "1 — there is exactly one way to form an empty t from any s",
          "correct": true
        },
        {
          "label": "0 — an empty target is unreachable"
        },
        {
          "label": "m — one way per character of s"
        },
        {
          "label": "It is undefined — accessed"
        }
      ],
      "explain": "The base-case loop sets `dp[i][0] = 1` for every i including m. There is one way to form the empty string (select nothing), so this is correct. The function returns `dp[m][n]`, not this cell, but the base case is what allows the recurrence to propagate correctly."
    }
  ]
};
