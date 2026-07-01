import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which DP pattern does `isValidPalindrome` use?",
      "choices": [
        {
          "label": "Space-optimized LPS (Longest Palindromic Subsequence) DP",
          "correct": true
        },
        {
          "label": "Edit distance (Levenshtein) DP between s and reverse(s)"
        },
        {
          "label": "Expand-around-center palindrome enumeration"
        },
        {
          "label": "Two-pointer greedy with a deletion counter"
        }
      ],
      "explain": "The code computes the LPS length of `s` using a rolling 1-D `dp` array, then checks whether `n - dp[n-1] <= k` (i.e., at most k deletions needed). This is the space-optimized variant of the classic O(n²) LPS DP."
    },
    {
      "id": "dp-meaning",
      "prompt": "After the outer loop sets `i`, what does `dp[j]` represent?",
      "choices": [
        {
          "label": "The length of the longest palindromic subsequence of s[i..j]",
          "correct": true
        },
        {
          "label": "The minimum deletions to make s[i..j] a palindrome"
        },
        {
          "label": "The length of the longest palindromic subsequence of s[0..j]"
        },
        {
          "label": "The number of palindromic substrings ending at index j"
        }
      ],
      "explain": "The outer loop iterates `i` from the second-to-last position down to 0, so after each outer iteration `dp[j]` holds the LPS of the substring `s[i..j]`. The rolling `prev` variable carries the diagonal value needed for the next cell."
    },
    {
      "id": "recurrence",
      "prompt": "When `s[i] == s[j]`, what value is assigned to `dp[j]`?",
      "choices": [
        {
          "label": "prev + 2, where prev held dp[j] from before this inner iteration (i.e., LPS of s[i+1..j-1])",
          "correct": true
        },
        {
          "label": "dp[j-1] + 2"
        },
        {
          "label": "dp[j] + 2"
        },
        {
          "label": "prev + 1"
        }
      ],
      "explain": "`prev` captures `dp[j]` before it was overwritten — it is the LPS of s[i+1..j-1], the diagonal predecessor. Adding 2 extends the palindrome by the matching characters s[i] and s[j]. Using `dp[j-1]+2` would take the wrong predecessor."
    },
    {
      "id": "mismatch-case",
      "prompt": "When `s[i] != s[j]`, what recurrence does the code use?",
      "choices": [
        {
          "label": "dp[j] = max(dp[j-1], dp[j]) — keep the better of excluding s[i] or s[j]",
          "correct": true
        },
        {
          "label": "dp[j] = prev + 1"
        },
        {
          "label": "dp[j] = dp[j-1] + dp[j]"
        },
        {
          "label": "dp[j] remains unchanged"
        }
      ],
      "explain": "`dp[j-1]` is the LPS of s[i..j-1] (exclude s[j]) and `dp[j]` before update is the LPS of s[i+1..j] (exclude s[i]). Taking the max of the two is the standard LPS mismatch transition, here written as an if-guard rather than a math.Max call."
    },
    {
      "id": "answer-check",
      "prompt": "How does the function decide whether s can be made a palindrome with at most k deletions?",
      "choices": [
        {
          "label": "n - dp[n-1] <= k, because n minus the LPS length equals minimum deletions needed",
          "correct": true
        },
        {
          "label": "dp[n-1] >= k"
        },
        {
          "label": "dp[n-1] == n - k"
        },
        {
          "label": "k >= n / 2 - dp[n-1]"
        }
      ],
      "explain": "The LPS of the full string `s[0..n-1]` ends up in `dp[n-1]` after the outer loop. Characters not in the LPS must be deleted to form a palindrome, so the minimum deletions = n - dp[n-1]. The condition `<= k` checks whether this fits the budget."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `isValidPalindrome`?",
      "choices": [
        {
          "label": "O(n²) time, O(n) space",
          "correct": true
        },
        {
          "label": "O(n²) time, O(n²) space"
        },
        {
          "label": "O(n log n) time, O(n) space"
        },
        {
          "label": "O(n²) time, O(1) space"
        }
      ],
      "explain": "The nested i/j loops visit O(n²) pairs. Using a rolling 1-D `dp` array instead of a 2-D table reduces space from O(n²) to O(n). O(1) would be impossible here since the dp array itself scales with n."
    }
  ]
};
