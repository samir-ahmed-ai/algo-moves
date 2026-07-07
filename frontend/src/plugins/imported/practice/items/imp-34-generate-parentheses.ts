import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'What class of backtracking does `genValidParen` perform?',
      choices: [
        {
          label: 'Constrained enumeration — pruning invalid branches before they are built',
          correct: true,
        },
        {
          label: 'Generate-and-filter — build all 2^(2n) strings then discard invalid ones',
        },
        {
          label: 'BFS level-order parenthesis — The two if guards (open < n and',
        },
        {
          label: 'Dynamic programming on bracket — The two if guards (open < n and',
        },
      ],
      explain:
        'The two `if` guards (`open < n` and `close < open`) prune the search tree so only valid-prefix paths are explored. No invalid string is ever completed, unlike a generate-and-filter approach.',
    },
    {
      id: 'pruning-rule',
      prompt: 'What is the exact pruning condition that prevents `)` from being added?',
      choices: [
        {
          label: '`close < open` a closing — bracket is only added when there is',
          correct: true,
        },
        {
          label: '`close < n` — closing brackets are limited to n total',
        },
        {
          label: '`open == close` — brackets are added in alternating order',
        },
        {
          label: '`len(path) < 2*n - 1` — stop one character before full length',
        },
      ],
      explain:
        '`close < open` ensures the string prefix always has a non-negative balance. `close < n` alone would allow illegal sequences like `))((`. The constraint `open < n` governs `(`.',
    },
    {
      id: 'base-case',
      prompt: 'When does `btParen` record a result?',
      choices: [
        {
          label: 'When `len(path) == 2*n` — The base case is len(path) == 2*n',
          correct: true,
        },
        {
          label: 'When `open == n && — close == n`',
        },
        {
          label: 'When neither `if` branch — fire',
        },
        {
          label: 'When `open == close == — n/2`',
        },
      ],
      explain:
        'The base case is `len(path) == 2*n`. At that point `open == n` and `close == n` are also true (due to the invariants), but the code checks length directly. Checking `open == n && close == n` would be equivalent here but is not what the code does.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `genValidParen(n)`?',
      choices: [
        {
          label: 'O(n · C_n) where C_n — is the nth Catalan number',
          correct: true,
        },
        {
          label: 'O(2^(2n)) — The number of valid',
        },
        {
          label: 'O(n^2) — The number of valid',
        },
        {
          label: 'O(n · 2^n) — The number of valid',
        },
      ],
      explain:
        'The number of valid parenthesizations is the nth Catalan number C_n ≈ 4^n / (n^(3/2) · √π). Each string has length 2n, so total output work is O(n · C_n). O(2^(2n)) is the size of the unfiltered search space, not the pruned one.',
    },
    {
      id: 'invariant',
      prompt: 'At any recursive call, what invariant holds about the partial string `path`?',
      choices: [
        {
          label: "Every prefix of `path` — at least as many '(' as ')'",
          correct: true,
        },
        {
          label: "The number of '(' always — equals the number of ')' in `path`",
        },
        {
          label: '`path` always — length',
        },
        {
          label: '`open + close == n` — Because ) is only added when',
        },
      ],
      explain:
        'Because `)` is only added when `close < open`, we always have `open >= close` at every point — meaning every prefix has non-negative balance. This is precisely the invariant that makes every completed string a valid parenthesization.',
    },
    {
      id: 'edge-n1',
      prompt: 'What does `genValidParen(1)` return?',
      choices: [
        {
          label: '["()"] — With n=1, open < 1 allows one (, then',
          correct: true,
        },
        {
          label: '[""] — With n=1, open < 1 allows one (,',
        },
        {
          label: '["(", ")"] — With n=1, open < 1 allows one (,',
        },
        {
          label: 'nil — With n=1, open < 1 allows one (,',
        },
      ],
      explain:
        'With n=1, `open < 1` allows one `(`, then `close < open` (0 < 1) allows one `)`. The path `"()"` has length 2 = 2*1, so it is recorded. That is the only valid sequence.',
    },
  ],
};
