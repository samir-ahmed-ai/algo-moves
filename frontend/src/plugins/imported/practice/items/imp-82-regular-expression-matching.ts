import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which algorithmic pattern does this `isMatch` solution use?',
      choices: [
        {
          label: 'Memoized top-down DFS — btIsMatch recurses on (i,j) indices',
          correct: true,
        },
        {
          label: 'Bottom-up tabulation DP — btIsMatch recurses on (i,j)',
        },
        {
          label: 'NFA simulation with a queue — btIsMatch recurses on (i,j)',
        },
        {
          label: 'Backtracking without memoization — btIsMatch recurses on (i,j)',
        },
      ],
      explain:
        '`btIsMatch` recurses on (i,j) indices and stores results in a `memo` 2D slice — classic top-down memoization. Bottom-up DP would fill a table iteratively; NFA would use a set of active states.',
    },
    {
      id: 'star-handling',
      prompt: "When `p[j+1] == '*'`, what two recursive cases does `btIsMatch` try?",
      choices: [
        {
          label: 'Skip the x* pattern (j+2) — OR consume one matching char (i+1,',
          correct: true,
        },
        {
          label: 'Consume one matching char (i+1 j+2) — j+2)',
        },
        {
          label: 'Match zero chars (i, j+1) — OR match one char (i+1, j+2)',
        },
        {
          label: 'Match all consecutive matching chars — greedily, then recurse',
        },
      ],
      explain:
        'The code does `btIsMatch(s,p,i,j+2,memo) || (match && btIsMatch(s,p,i+1,j,memo))`: the first branch uses x* as zero occurrences; the second advances s by one while staying at pattern j to consume more. Advancing j in the second branch would be wrong — it would only allow exactly one match.',
    },
    {
      id: 'base-case',
      prompt: 'What does `btIsMatch` return when both `i == len(s)` and `j == len(p)`?',
      choices: [
        {
          label: 'true — both string and pattern are fully consumed',
          correct: true,
        },
        {
          label: 'false — the function requires at least one character to match',
        },
        {
          label: 'It panics with an index — out-of-range',
        },
        {
          label: "false — only reached when the pattern has unconsumed '*' wildcards",
        },
      ],
      explain:
        'Reaching i==len(s) AND j==len(p) means every character of s matched every character of p, so the answer is true. The code checks this case first before all other conditions.',
    },
    {
      id: 'memo-encoding',
      prompt:
        'Why does the code initialize `memo[i][j] = -1` and store `0` or `1` instead of using `bool`?',
      choices: [
        {
          label: "To distinguish 'not A bool slice — A bool slice would default to false,",
          correct: true,
        },
        {
          label: 'Because Go slices of bool — cannot be 2D',
        },
        {
          label: 'To avoid a function call — overhead when converting bool to int',
        },
        {
          label: 'Because false and 0 — distinct states needed by the',
        },
      ],
      explain:
        'A bool slice would default to false, making it impossible to tell whether a cell was computed and returned false versus never visited. Using -1 as sentinel and 0/1 for the two results solves that ambiguity.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time and space complexity of this memoized `isMatch`?',
      choices: [
        {
          label: 'O(m·n) time, O(m·n) space — There are (m+1)*(n+1) distinct (i,j)',
          correct: true,
        },
        {
          label: 'O(2^(m+n)) time, O(m+n) space — There are (m+1)*(n+1) distinct',
        },
        {
          label: 'O(m·n) time, O(m+n) space — There are (m+1)*(n+1) distinct',
        },
        {
          label: 'O(m²·n²) time, O(m·n) space — There are (m+1)*(n+1) distinct',
        },
      ],
      explain:
        'There are (m+1)*(n+1) distinct (i,j) states and each is computed at most once — O(m·n) time. The memo table plus the call stack (bounded by m+n) together give O(m·n) space.',
    },
    {
      id: 'dot-handling',
      prompt: 'How does the code check whether the current characters match, accounting for `.`?',
      choices: [
        {
          label: "match := i < len(s) — && (s[i] == p[j] || p[j] == '.')",
          correct: true,
        },
        {
          label: "match := s[i] == p[j] — || p[j] == '*'",
        },
        {
          label: 'match := i < len(s) — && s[i] == p[j]',
        },
        {
          label: "match := p[j] == '.' — || (i < len(s) && s[i] == p[j])",
        },
      ],
      explain:
        "The guard `i < len(s)` prevents out-of-bounds access before comparing characters. `p[j] == '.'` is the wildcard check. Option D omits the bounds guard when p[j] != '.', which would panic on an empty remaining s.",
    },
  ],
};
