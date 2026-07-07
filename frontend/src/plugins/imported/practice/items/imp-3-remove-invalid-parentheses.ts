import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        'What algorithmic pattern does `removeInvalidParentheses` use to guarantee minimal removals?',
      choices: [
        {
          label: 'BFS level-by-level BFS explores — strings obtained by',
          correct: true,
        },
        {
          label: 'DFS backtracking that counts — minimum removals before generating',
        },
        {
          label: 'Dynamic programming on prefix — counts',
        },
        {
          label: 'Greedy scanning left-to-right — first unmatched parenthesis',
        },
      ],
      explain:
        "BFS explores all strings obtained by removing exactly 1 character (level 1), then 2 characters (level 2), etc. The first level that produces a valid string gives the minimal-removal answer. DFS could find valid strings faster but wouldn't guarantee minimality without extra bookkeeping.",
    },
    {
      id: 'found-flag',
      prompt: 'What does the `found` flag control once the first valid string is discovered?',
      choices: [
        {
          label: 'It stops generating new children — from the current level but still',
          correct: true,
        },
        {
          label: 'It immediately exits the outer — BFS loop, returning after one valid',
        },
        {
          label: 'It clears the queue — no further BFS levels run',
        },
        {
          label: 'It switches the search — BFS to DFS for the remaining nodes',
        },
      ],
      explain:
        "When `found` is true the code does `continue` (skips generating children) but keeps processing the rest of the current level's queue to collect all valid strings at that depth. The outer loop condition `!found` then stops any further levels from running.",
    },
    {
      id: 'visited-map',
      prompt: 'Why does the code maintain the `vis` map?',
      choices: [
        {
          label: 'To prevent the same string — from being enqueued multiple times,',
          correct: true,
        },
        {
          label: 'To track which characters — already been removed',
        },
        {
          label: 'To memoize the `isValid` result — for each string',
        },
        {
          label: 'To count how many removals — were made to reach each string',
        },
      ],
      explain:
        'Many different removal sequences can produce the same string (e.g., removing index 1 then 2 vs. index 2 then 1). Without `vis`, the same candidate would be enqueued repeatedly, causing duplicate results and exponential redundancy.',
    },
    {
      id: 'validity-check',
      prompt: 'In `isValid`, why does an immediate `return false` trigger when `cnt < 0`?',
      choices: [
        {
          label: 'A closing `)` — matching preceding `(` means the',
          correct: true,
        },
        {
          label: 'It prevents integer overflow — deeply nested parentheses occur',
        },
        {
          label: 'It handles the case — the string contains non-parenthesis',
        },
        {
          label: 'It short-circuits to avoid scanning — past the first valid prefix',
        },
      ],
      explain:
        "`cnt` tracks unmatched `(` seen so far. A negative count means we've encountered a `)` before any open `(` to match it — no future characters can fix this, so the string is invalid. Returning early saves scanning the rest.",
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `removeInvalidParentheses`?',
      choices: [
        {
          label: 'O(n·2^n) — There are up to 2^n subsets of',
          correct: true,
        },
        {
          label: 'O(n²) — There are up to 2^n subsets of',
        },
        {
          label: 'O(2^n) without the n factor — There are up to 2^n subsets of',
        },
        {
          label: 'O(n! ) because of permutation-style — enumeration',
        },
      ],
      explain:
        "There are up to 2^n subsets of positions to remove; generating each candidate string from the current one takes O(n) time (string slicing). The `vis` map prevents re-processing duplicates but doesn't change the worst-case bound.",
    },
    {
      id: 'non-paren-skip',
      prompt:
        "The inner loop skips characters with `if cur[j] != '(' && cur[j] != ')' { continue }`. What would happen if this check were removed?",
      choices: [
        {
          label: 'Letters would also be removed — e.g. `"(ab)"` would generate `"(b)"`',
          correct: true,
        },
        {
          label: 'Nothing — `isValid` would filter them out immediately',
        },
        {
          label: 'The BFS would run faster — because more candidates are pruned',
        },
        {
          label: 'The code would Removing — letter produces a',
        },
      ],
      explain:
        'Removing a letter produces a candidate (e.g. `"(b)"` from `"(ab)"`) that deletes content which was never part of the imbalance. `isValid` would still accept such strings, but the goal is to remove only unmatched parentheses, so dropping letters wastes BFS work and returns answers with altered text.',
    },
  ],
};
