import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which DP formulation does `checkRecord` use?',
      choices: [
        {
          label: 'Constant-space DP over 6 states — tracking absences and trailing lates',
          correct: true,
        },
        {
          label: '1-D rolling DP over days — with a single accumulator',
        },
        {
          label: 'Memoized DFS on (day — absences lates) triples',
        },
        {
          label: 'Combinatorics with sequences — The dp[2][3] array encodes 6',
        },
      ],
      explain:
        'The `dp[2][3]` array encodes 6 states: 2 choices for total absences seen (0 or 1) × 3 choices for consecutive trailing lates (0, 1, or 2). Each iteration produces a new `nd` table — constant space O(1) rolled forward.',
    },
    {
      id: 'state-meaning',
      prompt: 'What does `dp[a][l]` represent after processing `i` days?',
      choices: [
        {
          label: 'The count of valid length-i — sequences with exactly `a` total',
          correct: true,
        },
        {
          label: 'The count of sequences — day `a` was absent and the last `l`',
        },
        {
          label: 'Whether it is possible — have `a` absences and `l` lates after',
        },
        {
          label: 'The maximum number of valid — sequences ending with `a` absences',
        },
      ],
      explain:
        "`a` (0 or 1) tracks whether an 'A' has appeared anywhere in the sequence so far; `l` (0–2) tracks the current run of trailing 'L's. Together they capture all the state needed to determine validity going forward.",
    },
    {
      id: 'transition-absent',
      prompt:
        "How does the code transition to states with `a=1` (one absence seen) when appending 'A' to a day?",
      choices: [
        {
          label: 'nd[1][0] += dp[0][0] + dp[0][1] — + dp[0][2] (sum all no-absence states)',
          correct: true,
        },
        {
          label: "nd[1][0] = dp[0][0] only (must — have no trailing lates before 'A')",
        },
        {
          label: 'nd[1][1] += dp[0][0] + dp[0][1] — + dp[0][2] (lates reset to 1 after',
        },
        {
          label: 'nd[1][0] = dp[1][0] + dp[1][1] — + dp[1][2] (already had one absence)',
        },
      ],
      explain:
        "Appending 'A' is valid only if no 'A' has appeared yet (a=0 states). After adding 'A', the trailing-late count resets to 0 (l=0). Sequences already at a=1 cannot append another 'A' without becoming invalid.",
    },
    {
      id: 'why-mod',
      prompt:
        'Why does the code apply `% mod` (1e9+7) at each transition rather than only at the end?',
      choices: [
        {
          label: 'To prevent integer overflow — counts grow exponentially with n',
          correct: true,
        },
        {
          label: 'Because the problem guarantees n — ≤ 1000, making intermediate values',
        },
        {
          label: "To satisfy the Go compiler's — int size constraints on 32-bit systems",
        },
        {
          label: 'Because the final answer must — be exactly 1e9+7 when n is large',
        },
      ],
      explain:
        'The number of valid sequences grows exponentially — for large n sums can far exceed int64 range. Taking mod at each step keeps every intermediate value below 10^9+7, preventing overflow. Waiting until the end would overflow before the final mod.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time and space complexity of `checkRecord`?',
      choices: [
        {
          label: 'O(n) time, O(1) space — There is one pass over n days, each',
          correct: true,
        },
        {
          label: 'O(n) time, O(n) space — There is one pass over n days,',
        },
        {
          label: 'O(n²) time, O(1) space — There is one pass over n days,',
        },
        {
          label: 'O(n·6) time, O(n·6) space — There is one pass over n days,',
        },
      ],
      explain:
        'There is one pass over n days, each doing a constant number of operations on the fixed 2×3 array. Because `dp` is replaced by `nd` each iteration (no history kept), space is O(1) — not O(n).',
    },
    {
      id: 'initial-state',
      prompt:
        'The code sets `dp[0][0]=1`, `dp[0][1]=1`, and `dp[1][0]=1` before the loop (i=2). What sequences do these represent?',
      choices: [
        {
          label: "The valid length-1 sequences: 'P' — (no A, 0 late), 'L' (no A, 1 late),",
          correct: true,
        },
        {
          label: "The empty sequence, a sequence — of one 'P', and a sequence of one 'A'",
        },
        {
          label: 'Three base cases needed — avoid division by zero in transitions',
        },
        {
          label: "Length-2 sequences: 'PP', 'PL', 'PA' — After one day there are exactly",
        },
      ],
      explain:
        "After one day there are exactly three valid records: 'P' maps to state [0][0], 'L' to [0][1], and 'A' to [1][0]. The loop then starts at i=2 to build on these single-day foundations.",
    },
  ],
};
