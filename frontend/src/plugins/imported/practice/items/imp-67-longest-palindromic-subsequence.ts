import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which DP pattern does `longestPalindromicSubsequence` use?',
      choices: [
        {
          label: 'Interval DP — subproblems are contiguous substrings [i, j]',
          correct: true,
        },
        {
          label: '1-D DP — subproblems are prefixes of the string',
        },
        {
          label: '2D DP matching two separate — strings (like LCS)',
        },
        {
          label: "Divide and conquer splitting — the string's midpoint",
        },
      ],
      explain:
        'The table `dp[i][j]` represents the longest palindromic subsequence within `s[i..j]` — a contiguous interval. The outer loop iterates over increasing interval lengths, which is the hallmark of interval DP.',
    },
    {
      id: 'base-case',
      prompt: 'The code sets `dp[i][i] = 1` during initialization. What does this encode?',
      choices: [
        {
          label: 'A single character — palindrome of length 1',
          correct: true,
        },
        {
          label: 'The empty interval [i, i] — has zero palindromic subsequences',
        },
        {
          label: 'Length-1 intervals are the hardest — subproblems, so they need explicit',
        },
        {
          label: '1 is used — sentinel to distinguish filled cells',
        },
      ],
      explain:
        'Every single character is trivially a palindrome of length 1. These length-1 base cases anchor the interval DP: longer intervals rely on shorter ones being solved first.',
    },
    {
      id: 'recurrence-match',
      prompt: 'When `s[i] == s[j]`, the code sets `dp[i][j] = dp[i+1][j-1] + 2`. Why +2?',
      choices: [
        {
          label: 'Both the matching characters s[i] — and s[j] are added to the palindrome',
          correct: true,
        },
        {
          label: '+1 for the match — +1 for an off-by-one correction',
        },
        {
          label: 'Every interval is built two — characters at a time, so all',
        },
        {
          label: '2 accounts for extending — palindrome on both ends by one step',
        },
      ],
      explain:
        "When the outermost characters match, we can wrap them around the best palindromic subsequence of the inner interval `[i+1, j-1]`. Each matching character contributes 1, so we add 2 total. The inner interval's answer `dp[i+1][j-1]` is already computed because it's a shorter interval.",
    },
    {
      id: 'recurrence-mismatch',
      prompt:
        'When `s[i] != s[j]`, the code sets `dp[i][j] = max(dp[i+1][j], dp[i][j-1])`. What does this express?',
      choices: [
        {
          label: 'Skip either the left — right endpoint whichever sacrifice',
          correct: true,
        },
        {
          label: 'The palindrome must use either s[i] — so we try each',
        },
        {
          label: 'We shrink the interval — both ends and take the better result',
        },
        {
          label: 'dp[i+1][j] skips s[i]; dp[i][j-1] — s[j]; we sum them for the total',
        },
      ],
      explain:
        "Since `s[i]` and `s[j]` can't both be endpoints of a palindrome (they don't match), we must exclude at least one. `dp[i+1][j]` is the answer without `s[i]`; `dp[i][j-1]` is without `s[j]`. We take the max of these two options.",
    },
    {
      id: 'loop-order',
      prompt:
        'The outer loop iterates `length` from 2 to n, and the inner loop sets `j = i + length - 1`. Why must shorter lengths be computed first?',
      choices: [
        {
          label: 'dp[i][j] depends on dp[i+1][j-1] — all of which are',
          correct: true,
        },
        {
          label: 'Longer intervals always dominate — ones, so we need the max before',
        },
        {
          label: 'The base cases dp[i][i] must — be processed first to avoid circular',
        },
        {
          label: 'Iterating from largest — dp[i][j] is computed from',
        },
      ],
      explain:
        'Every `dp[i][j]` is computed from strictly smaller intervals: `[i+1][j-1]` (two shorter), `[i+1][j]` (one shorter on left), `[i][j-1]` (one shorter on right). Processing intervals in increasing length order ensures all dependencies are already filled.',
    },
    {
      id: 'complexity',
      prompt: 'What are the time and space complexities of this solution?',
      choices: [
        {
          label: 'Time O(n²), Space O(n²) — There are O(n²) intervals [i, j], and',
          correct: true,
        },
        {
          label: 'Time O(n²), Space O(n) — There are O(n²) intervals [i,',
        },
        {
          label: 'Time O(n³), Space O(n²) — There are O(n²) intervals [i,',
        },
        {
          label: 'Time O(n log n), Space — O(n²)',
        },
      ],
      explain:
        'There are O(n²) intervals [i, j], and each is computed in O(1) using previously stored sub-interval results. The full n×n table is retained, giving O(n²) space. No further optimization (e.g., rolling rows) is applied here.',
    },
  ],
};
