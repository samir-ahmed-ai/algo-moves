import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which algorithmic pattern best describes this solution to Perfect Squares?',
      choices: [
        {
          label: '1-D bottom-up DP minimizing — count',
          correct: true,
        },
        {
          label: 'BFS treating each number — a graph node',
        },
        {
          label: 'Greedy: always subtract the largest — perfect square',
        },
        {
          label: 'Backtracking: enumerate all square — The code fills a 1-D dp array',
        },
      ],
      explain:
        'The code fills a 1-D `dp` array from `1` to `n`, each time finding the minimum squares needed by peeling off one square `j*j`. Greedy fails (e.g., 12 = 4+4+4 not 9+1+1+1) and BFS, while valid, is not what this code does.',
    },
    {
      id: 'initialization',
      prompt:
        'The code sets `dp[i] = i` before the inner loop. Why is `i` the right initial value?',
      choices: [
        {
          label: 'Any number i can be expressed as i — so i is',
          correct: true,
        },
        {
          label: 'dp[i] = i — result for prime numbers where no',
        },
        {
          label: 'i is used — sentinel to detect unvisited cells',
        },
        {
          label: 'The inner loop overwrites dp[i] — immediately, so the initial value is',
        },
      ],
      explain:
        'Since 1 is a perfect square, every integer `i` can be decomposed into `i` copies of 1². Setting `dp[i] = i` provides a safe worst-case ceiling before the inner loop finds a better decomposition.',
    },
    {
      id: 'recurrence',
      prompt: 'The inner loop checks `dp[i-j*j] + 1 < dp[i]`. What does `+1` count?',
      choices: [
        {
          label: 'The one perfect square j² — being peeled off as the last term',
          correct: true,
        },
        {
          label: 'The extra step for transitioning — between DP states',
        },
        {
          label: "An off-by-one correction for arrays — We're saying: use exactly one",
        },
        {
          label: 'The minimum additional squares — for the remainder',
        },
      ],
      explain:
        "We're saying: use exactly one square `j*j`, then optimally decompose the remainder `i - j*j`. The `+1` counts that single square. `dp[i-j*j]` already holds the minimum for the remainder.",
    },
    {
      id: 'inner-loop-bound',
      prompt:
        'The inner loop condition is `j*j <= i`. What happens if you accidentally wrote `j <= i` instead?',
      choices: [
        {
          label: 'The loop would try squares — larger than i, making dp[i-j*j] a',
          correct: true,
        },
        {
          label: 'The result would be correct — but slower because most iterations',
        },
        {
          label: 'Only the last valid j — would differ, changing the final',
        },
        {
          label: 'Go would silently clamp the index — returning an incorrect',
        },
      ],
      explain:
        'When `j*j > i`, the index `i - j*j` becomes negative. Accessing `dp` at a negative index in Go causes a runtime panic. The `j*j <= i` guard is essential both for correctness and safety.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `leastSquareNumbersSumToK(n)`?',
      choices: [
        {
          label: 'O(n * sqrt(n)) — The outer loop runs n times',
          correct: true,
        },
        {
          label: 'O(n²) — The outer loop runs n times',
        },
        {
          label: 'O(n log n) — The outer loop runs n times',
        },
        {
          label: 'O(sqrt(n)) — The outer loop runs n times',
        },
      ],
      explain:
        'The outer loop runs `n` times. For each `i`, the inner loop runs at most `sqrt(i)` times (since `j*j <= i` implies `j <= sqrt(i)`). Summing over all `i` gives O(n * sqrt(n)) total work.',
    },
    {
      id: 'fill-order',
      prompt: 'Why must `dp[i]` be computed in increasing order of `i` (from 1 up to n)?',
      choices: [
        {
          label: 'dp[i] reads dp[i-j*j] for smaller — indices, which must already be',
          correct: true,
        },
        {
          label: 'Decreasing order would overflow — slice on the first iteration',
        },
        {
          label: 'The answer dp[n] — valid if dp[0] is computed last',
        },
        {
          label: 'Order is irrelevant — dp[i] is independent of the others',
        },
      ],
      explain:
        'Each `dp[i]` depends on `dp[i-j*j]` where `i-j*j < i`. Processing indices in increasing order guarantees every smaller subproblem is already solved before it is read, which is the defining requirement of bottom-up DP.',
    },
  ],
};
