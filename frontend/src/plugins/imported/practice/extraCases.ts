import type { PracticeBundle } from '../../_shared/pluginKit';
import { circleLayout } from '../../_shared/graphLayout';

/** Hand-authored worked cases for high-traffic imported simulators (top-20 expansion). */
export const EXTRA_CASE_BUNDLES: Record<string, PracticeBundle> = {
  'imp-59-coin-change': {
    cases: {
      intro: 'Unbounded knapsack on coin counts — dp[a] = min coins to make amount a.',
      good: [
        {
          id: '134-6',
          title: 'Greedy fails, DP finds 2 coins',
          input: { coins: [1, 3, 4], amount: 6 },
          inputLabel: 'coins {1,3,4}, amount 6',
          returns: '2 coins (3+3)',
          tone: 'ok',
          question: 'Greedy picks 4+1+1 = three coins — why does DP beat that?',
          answer:
            'dp[6] = min(dp[5]+1, dp[3]+1, dp[2]+1) = min(2, 2, 2) from the 3-coin choice. Two 3s beat any greedy mix with a 4.',
        },
      ],
      bad: [
        {
          id: '2-only',
          title: 'Odd amount, even coins only',
          input: { coins: [2], amount: 3 },
          inputLabel: 'coins {2}, amount 3',
          returns: 'impossible (−1)',
          tone: 'bad',
          question: 'Why does dp[3] stay at infinity?',
          answer:
            'Only even partial sums are reachable with coin 2. Amount 3 is odd, so no combination works and the table never improves dp[3].',
        },
      ],
    },
  },
  'imp-65-longest-common-subsequence': {
    cases: {
      intro: 'Fill dp[i][j] with LCS length of prefixes text1[0..i) and text2[0..j).',
      good: [
        {
          id: 'classic',
          title: 'Classic "abcde" vs "ace"',
          input: { a: 'abcde', b: 'ace' },
          inputLabel: 'a="abcde", b="ace"',
          returns: 'LCS length 3 ("ace")',
          tone: 'ok',
          question: 'Which letters align without reordering?',
          answer:
            'a, c, e appear in order in both strings. dp walks both pointers; matches extend the diagonal, mismatches take max of left/top.',
        },
      ],
      bad: [
        {
          id: 'disjoint',
          title: 'No shared characters',
          input: { a: 'abc', b: 'xyz' },
          inputLabel: 'a="abc", b="xyz"',
          returns: 'LCS length 0',
          tone: 'bad',
          question: 'Every comparison mismatches — what does dp[3][3] hold?',
          answer:
            'With no equal letters, only empty-prefix cells are non-zero. The full-table corner stays 0.',
        },
      ],
    },
  },
  'imp-74-minimum-path-sum': {
    cases: {
      intro: 'Grid DP: can only move right or down; dp[r][c] = cell cost + min(top, left).',
      good: [
        {
          id: '3x3',
          title: 'Small grid with a cheap corridor',
          input: {
            grid: [
              [1, 3, 1],
              [1, 5, 1],
              [4, 2, 1],
            ],
          },
          inputLabel: '3×3 grid with a 1-cost path along bottom-right',
          returns: 'minimum sum 7',
          tone: 'ok',
          question: 'Why not go through the 5 in the center?',
          answer:
            'The optimal route slides along the bottom edge where costs are 1: 1→3→1→1→1 sums to 7. The middle 5 is on a longer expensive branch.',
        },
      ],
    },
  },
  'imp-77-unique-paths': {
    cases: {
      intro: 'Robot in m×n grid — only right/down moves; dp counts paths to bottom-right.',
      good: [
        {
          id: '3x3',
          title: '3×3 board',
          input: { m: 3, n: 3 },
          inputLabel: 'm=3, n=3',
          returns: '6 paths',
          tone: 'ok',
          question: 'How many right/down choices in a 3×3?',
          answer:
            'Need 2 rights and 2 downs in any order: C(4,2) = 6. dp[r][c] = dp[r-1][c] + dp[r][c-1] accumulates the same count.',
        },
      ],
    },
  },
  'imp-10-word-ladder': {
    cases: {
      intro: 'BFS on implicit word graph — edges connect words differing by one letter.',
      good: [
        {
          id: 'hit-cog',
          title: 'Classic "hit" → "cog"',
          input: {
            beginWord: 'hit',
            endWord: 'cog',
            wordList: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'],
          },
          inputLabel: 'hit → cog with 6 intermediates',
          returns: '5 words in ladder',
          tone: 'ok',
          question: 'Why is BFS the right tool here?',
          answer:
            'Each transformation is an unweighted edge. BFS from "hit" finds the fewest hops to "cog" before exploring longer ladders.',
        },
      ],
      bad: [
        {
          id: 'no-ladder',
          title: 'End word missing from dictionary',
          input: {
            beginWord: 'hit',
            endWord: 'cog',
            wordList: ['hot', 'dot', 'dog', 'lot', 'log'],
          },
          inputLabel: 'hit → cog but "cog" not in list',
          returns: '0 (no ladder)',
          tone: 'bad',
          question: 'BFS drains the queue — why is 0 correct?',
          answer:
            '"cog" is never enqueued because it is not in wordList. No path can end on a word outside the dictionary.',
        },
      ],
    },
  },
  'imp-63-0-1-knapsack': {
    cases: {
      intro: 'Each item once — dp[w] = max value with capacity w after considering items 0..i.',
      good: [
        {
          id: 'classic',
          title: 'Two items, tight capacity',
          input: { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 },
          inputLabel: 'weights [1,3,4,5], values [1,4,5,7], capacity 7',
          returns: 'max value 9',
          tone: 'ok',
          question: 'Why not take the heaviest item (value 7)?',
          answer:
            'Item 4 alone gives 7, but items 2+3 (weights 3+4, values 4+5) fit in 7 and sum to 9. 0/1 means each item at most once.',
        },
      ],
    },
  },
  'imp-82-regular-expression-matching': {
    cases: {
      intro: 'dp[i][j]: does s[0..i) match p[0..j) with . and * semantics.',
      good: [
        {
          id: 'aab-star',
          title: '"aab" vs "c*a*b"',
          input: { s: 'aab', p: 'c*a*b' },
          inputLabel: 's="aab", p="c*a*b"',
          returns: 'matches',
          tone: 'ok',
          question: 'How does c* consume zero characters?',
          answer:
            'c* matches the empty string, so the pattern reduces to a*b matching "aab". a* eats "aa", then b matches "b".',
        },
      ],
    },
  },
  'imp-53-find-first-and-last-position-of-element-in-sorte': {
    cases: {
      intro: 'Two binary searches — one for leftmost, one for rightmost occurrence.',
      good: [
        {
          id: 'duplicates',
          title: 'Target with duplicates',
          input: { values: [5, 7, 7, 8, 8, 10], target: 8 },
          inputLabel: 'nums=[5,7,7,8,8,10], target=8',
          returns: '[3, 4]',
          tone: 'ok',
          question: 'Why two binary searches instead of one?',
          answer:
            'Standard binary search finds any 8. A left-biased search lands on index 3; a right-biased search lands on index 4 — the full range of 8s.',
        },
      ],
    },
  },
  'imp-46-search-in-rotated-sorted-array': {
    cases: {
      intro: 'One half of the rotated array is always sorted — pick that side each step.',
      good: [
        {
          id: 'rotated',
          title: 'Pivot in the middle',
          input: { values: [4, 5, 6, 7, 0, 1, 2], target: 0 },
          inputLabel: 'nums=[4,5,6,7,0,1,2], target=0',
          returns: 'found at index 4',
          tone: 'ok',
          question: 'At lo=0, hi=6, mid=3 (value 7) — which half is sorted?',
          answer:
            'Left half [4,5,6,7] is sorted. Target 0 is not in [4,7], so discard left and search lo=4..6 where 0 lives.',
        },
      ],
      bad: [
        {
          id: 'absent',
          title: 'Target not in array',
          input: { values: [4, 5, 6, 7, 0, 1, 2], target: 3 },
          inputLabel: 'same rotation, target=3',
          returns: 'not found (−1)',
          tone: 'bad',
          question: 'Window collapses with no hit — why is −1 safe?',
          answer:
            '3 never appears in the rotated sorted sequence. Binary search exhausts the half-discard logic until lo > hi.',
        },
      ],
    },
  },
  'imp-0-02-clone-graph': {
    cases: {
      intro: 'DFS/BFS with a hash map from original node to its copy.',
      good: [
        {
          id: 'adj-list',
          title: 'Two-node graph',
          input: {
            adj: [[1], [0]],
            pos: circleLayout(2),
          },
          inputLabel: 'nodes 0 ↔ 1',
          returns: 'deep copy with same structure',
          tone: 'ok',
          question: 'Why map old node → new node?',
          answer:
            'When you revisit a node through a cycle, the copy must wire to the already-created clone, not allocate again — the map breaks infinite recursion.',
        },
      ],
    },
  },
  'imp-0-01-bfs-shortest-reach': {
    cases: {
      intro: 'Multi-source BFS from start node — distance × edge weight (here weight 6 mod rule).',
      good: [
        {
          id: 'reachable',
          title: 'Connected component from node 0',
          input: {
            adj: [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []],
            pos: circleLayout(6),
            start: 0,
          },
          inputLabel: '6-node graph, BFS from 0',
          returns: 'distances to all reachable nodes',
          tone: 'ok',
          question: 'Why does BFS give shortest hop count?',
          answer:
            'Nodes are dequeued in non-decreasing distance from the start. The first time you reach a node is along a shortest path in an unweighted graph.',
        },
      ],
      bad: [
        {
          id: 'isolated',
          title: 'Isolated node stays −1',
          input: {
            adj: [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []],
            pos: circleLayout(6),
            start: 0,
          },
          inputLabel: 'node 5 has no edges',
          returns: 'node 5 unreachable (−1)',
          tone: 'bad',
          question: 'Which node never gets dequeued?',
          answer:
            'Node 5 has an empty adjacency list and no path from 0. BFS never paints it, so its distance stays −1.',
        },
      ],
    },
  },
  'imp-34-generate-parentheses': {
    cases: {
      intro: 'Backtrack with open/close counts — prune when close > open.',
      good: [
        {
          id: 'n2',
          title: 'n = 2 pairs',
          input: { n: 2 },
          inputLabel: 'n = 2',
          returns: '2 valid strings: (()) and ()()',
          tone: 'ok',
          question: 'Why can close never exceed open mid-build?',
          answer:
            'A closing paren without a matching open prefix is invalid. The prune keeps every partial string a prefix of some valid completion.',
        },
      ],
    },
  },
  'imp-0-03-find-shortest-path-with-bfs': {
    cases: {
      intro:
        'BFS expands layer by layer from src — first time dst is dequeued gives shortest hop count.',
      good: [
        {
          id: 'g7',
          title: '7 nodes · 0→5',
          input: {
            adj: [
              [1, 2],
              [0, 3],
              [0, 3, 6],
              [1, 2, 4],
              [3, 5],
              [4, 6],
              [2, 5],
            ],
            pos: circleLayout(7),
            src: 0,
            dst: 5,
          },
          inputLabel: 'src=0, dst=5',
          returns: 'shortest path length 3',
          tone: 'ok',
          question: 'Why does BFS find the shortest route here?',
          answer:
            'BFS visits nodes in non-decreasing distance from src; the first path reconstruction to dst uses the minimum number of edges.',
        },
      ],
    },
  },
  'imp-44-word-search': {
    cases: {
      intro: 'DFS from each cell matching word[0]; backtrack when the next char fails.',
      good: [
        {
          id: 'abcced',
          title: '"ABCCED" on classic board',
          input: {
            board: [
              ['A', 'B', 'C', 'E'],
              ['S', 'F', 'C', 'S'],
              ['A', 'D', 'E', 'E'],
            ],
            word: 'ABCCED',
          },
          inputLabel: 'word = ABCCED',
          returns: 'found',
          tone: 'ok',
          question: 'Why reuse the same cell letter twice along the path?',
          answer:
            'The path may revisit cells only if the match sequence requires it — here C appears twice in ABCCED along valid adjacent steps.',
        },
      ],
      bad: [
        {
          id: 'abcb',
          title: '"ABCB" — no valid path',
          input: {
            board: [
              ['A', 'B', 'C', 'E'],
              ['S', 'F', 'C', 'S'],
              ['A', 'D', 'E', 'E'],
            ],
            word: 'ABCB',
          },
          inputLabel: 'word = ABCB',
          returns: 'not found',
          tone: 'bad',
          question: 'Why does ABCB fail on this board?',
          answer:
            'After matching ABC, returning to B would reuse a cell already on the path — DFS backtracks and exhausts without a full match.',
        },
      ],
    },
  },
  'imp-70-maximal-rectangle': {
    cases: {
      intro:
        'For each cell, track histogram height of consecutive 1s upward; largest rectangle in histogram gives best area.',
      good: [
        {
          id: 'classic',
          title: 'Classic 4×5 matrix',
          input: {
            matrix: [
              ['1', '0', '1', '0', '0'],
              ['1', '0', '1', '1', '1'],
              ['1', '1', '1', '1', '1'],
              ['1', '0', '0', '1', '0'],
            ],
          },
          inputLabel: '4×5 binary matrix',
          returns: 'max area 6',
          tone: 'ok',
          question: 'What does heights[i][j] represent?',
          answer:
            'The number of consecutive 1s directly above (i,j) inclusive — a histogram bar height for row i.',
        },
      ],
    },
  },
  'imp-54-find-peak-element': {
    cases: {
      intro:
        'Binary search on slope: if nums[mid] < nums[mid+1], peak lies to the right; else to the left.',
      good: [
        {
          id: 'p1',
          title: '[1,2,1,3,5,6,4]',
          input: { values: [1, 2, 1, 3, 5, 6, 4] },
          inputLabel: 'values = [1,2,1,3,5,6,4]',
          returns: 'peak at index 5 (value 6) or 1 (value 2)',
          tone: 'ok',
          question: 'Why compare mid with mid+1 instead of mid-1?',
          answer:
            'If the right neighbor is larger, the array rises to the right so some peak exists in (mid, hi]; otherwise peak is in [lo, mid].',
        },
      ],
    },
  },
  'imp-52-missing-number': {
    cases: {
      intro: 'Binary search on the index where nums[i] ≠ i in the sorted-with-hole array.',
      good: [
        {
          id: 'm1',
          title: '[3,0,1] → missing 2',
          input: { nums: [3, 0, 1] },
          inputLabel: 'nums = [3,0,1]',
          returns: 'missing 2',
          tone: 'ok',
          question: 'Why does nums[mid] ≠ mid shrink the search?',
          answer:
            'If nums[mid] > mid, the hole is at or before mid; if nums[mid] === mid, every index < mid matches so the hole is after mid.',
        },
      ],
    },
  },
  'imp-27-combinations': {
    cases: {
      intro:
        'Choose k numbers from 1..n in increasing order — backtrack by trying the next start value.',
      good: [
        {
          id: '4c2',
          title: 'C(4,2) = 6 subsets',
          input: { n: 4, k: 2 },
          inputLabel: 'n=4, k=2',
          returns: '[1,2] [1,3] [1,4] [2,3] [2,4] [3,4]',
          tone: 'ok',
          question: 'Why only append candidates ≥ last chosen?',
          answer: 'Fixing increasing order avoids duplicate combinations like [2,1] vs [1,2].',
        },
      ],
    },
  },
  'imp-60-coin-change-ii': {
    cases: {
      intro:
        'Count ways to make amount using each coin unlimited times — 1-D DP over coins then amounts.',
      good: [
        {
          id: 'c125',
          title: 'coins {1,2,5}, amount 5',
          input: { coins: [1, 2, 5], amount: 5 },
          inputLabel: 'coins=[1,2,5], amount=5',
          returns: '4 combinations',
          tone: 'ok',
          question: 'Why iterate coins outermost?',
          answer:
            'Processing each coin once per amount layer counts unordered combinations — inner amount loop accumulates ways using that coin repeatedly.',
        },
      ],
    },
  },
  'imp-66-longest-increasing-subsequence': {
    cases: {
      intro: 'Patience sorting / binary search on tails — dp[i] is length of LIS ending at i.',
      good: [
        {
          id: 'lis8',
          title: 'Classic LIS length 4',
          input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
          inputLabel: 'nums = [10,9,2,5,3,7,101,18]',
          returns: 'LIS length 4',
          tone: 'ok',
          question: 'Can greedy always pick the global minimum next?',
          answer:
            'No — the optimal subsequence may skip a larger value that enables a longer chain later (e.g. 2→5→7→101).',
        },
      ],
    },
  },
  'imp-67-longest-palindromic-subsequence': {
    cases: {
      intro:
        'Interval DP: lps[i][j] best inside s[i..j]; match ends or take max of skipping one end.',
      good: [
        {
          id: 'bbbab',
          title: 's = "bbbab"',
          input: { s: 'bbbab' },
          inputLabel: 's = bbbab',
          returns: 'LPS length 4 (bbbb)',
          tone: 'ok',
          question: 'When s[i] === s[j], what recurrence applies?',
          answer:
            'Matching outer chars add 2 to lps[i+1][j-1]; mismatches take max(lps[i+1][j], lps[i][j-1]).',
        },
      ],
    },
  },
  'imp-69-longest-valid-parentheses': {
    cases: {
      intro: 'Stack or DP tracks last unmatched index — longest gap of matched pairs.',
      good: [
        {
          id: 'closes',
          title: 's = ")()())"',
          input: { s: ')()())' },
          inputLabel: 's = )()())',
          returns: 'longest valid length 4',
          tone: 'ok',
          question: 'Why reset start after an unmatched ")"?',
          answer:
            'A closing paren without a partner breaks the current valid segment — the next candidate starts after it.',
        },
      ],
    },
  },
  'imp-76-distinct-subsequences': {
    cases: {
      intro: 'Count ways to form t from s — dp[i][j] adds ways with/without matching s[i] to t[j].',
      good: [
        {
          id: 'rabbbit',
          title: '"rabbbit" / "rabbit"',
          input: { s: 'rabbbit', t: 'rabbit' },
          inputLabel: 's=rabbbit, t=rabbit',
          returns: '3 distinct subsequences',
          tone: 'ok',
          question: 'Why does matching a char add dp[i-1][j-1]?',
          answer:
            'Using s[i] for t[j] extends every subsequence that already formed t[0..j-1] from s[0..i-1].',
        },
      ],
    },
  },
  'imp-78-decode-ways': {
    cases: {
      intro:
        'dp[i] = ways to decode s[0..i); add dp[i-1] if one digit valid, dp[i-2] if two-digit 10–26.',
      good: [
        {
          id: 'd226',
          title: 's = "226"',
          input: { s: '226' },
          inputLabel: 's = 226',
          returns: '3 decodings',
          tone: 'ok',
          question: 'What makes "26" a valid two-digit chunk?',
          answer:
            'Leading zero and values > 26 are invalid — 26 maps to "Z" so s="226" splits as 2|2|6, 22|6, or 2|26.',
        },
      ],
    },
  },
  'imp-80-race-car': {
    cases: {
      intro:
        'BFS/DP on (position, speed) — each step accelerates (speed doubles) or reverses direction.',
      good: [
        {
          id: 't3',
          title: 'target = 3',
          input: { target: 3 },
          inputLabel: 'target = 3',
          returns: '2 instructions (A,A)',
          tone: 'ok',
          question: 'Why is BFS natural here?',
          answer:
            'Each instruction sequence is a state transition; the first time position hits target gives minimum instructions.',
        },
      ],
    },
  },
  'imp-5-swim-in-rising-water': {
    cases: {
      intro:
        'Minimize the maximum elevation encountered along a path from top-left to bottom-right.',
      good: [
        {
          id: 'g1',
          title: '2×2 grid',
          input: {
            grid: [
              [0, 2],
              [1, 3],
            ],
          },
          inputLabel: '2×2 elevation grid',
          returns: 'answer 3',
          tone: 'ok',
          question: 'Why is the answer not simply max(grid)?',
          answer:
            'You must follow a path — the minimax route may avoid the global max cell if a detour lowers the required water level.',
        },
      ],
    },
  },
  'imp-8-merging-communities': {
    cases: {
      intro: 'Union-Find with path compression — M merges communities, Q reports component size.',
      good: [
        {
          id: 'm6',
          title: '6 people · merge chain',
          input: {
            n: 6,
            ops: [
              ['M', 1, 2],
              ['M', 3, 4],
              ['Q', 1],
              ['M', 2, 4],
              ['Q', 3],
              ['M', 5, 6],
              ['Q', 5],
              ['M', 4, 5],
              ['Q', 1],
            ],
            pos: circleLayout(6),
          },
          inputLabel: '6 nodes · M/Q sequence',
          returns: 'final Q reports merged size',
          tone: 'ok',
          question: 'Why does union by rank help?',
          answer:
            'Shallow trees keep find/union near O(α(n)); path compression flattens during find.',
        },
      ],
    },
  },
  'imp-23-detect-cycle': {
    cases: {
      intro: 'DFS three-coloring — a back edge to a grey node proves a cycle.',
      good: [
        {
          id: 'cyclic',
          title: 'Directed cycle 0→1→2→0',
          input: { adj: [[1], [2], [0, 3], [4], []], pos: circleLayout(5) },
          inputLabel: 'back edge 2→0',
          returns: 'cycle = true',
          tone: 'ok',
          question: 'What edge triggers cycle detection?',
          answer:
            'When exploring from node 2, neighbor 0 is still grey (on the recursion stack) — that back edge closes a cycle.',
        },
      ],
    },
  },
  'imp-45-word-search-ii': {
    cases: {
      intro: 'Trie of words + DFS on board — prune branches when trie has no matching prefix.',
      good: [
        {
          id: 'i1',
          title: '4×4 board · 4 words',
          input: {
            board: [
              ['o', 'a', 'a', 'n'],
              ['e', 't', 'a', 'e'],
              ['i', 'h', 'k', 'r'],
              ['i', 'f', 'l', 'v'],
            ],
            words: ['oath', 'pea', 'eat', 'rain'],
          },
          inputLabel: '4×4 · oath, pea, eat, rain',
          returns: 'finds oath and eat',
          tone: 'ok',
          question: 'Why build a trie instead of running Word Search per word?',
          answer:
            'Shared prefixes are explored once; the trie guides DFS and early-prunes dead branches.',
        },
      ],
    },
  },
  'imp-71-maximal-square': {
    cases: {
      intro:
        'dp[i][j] = side of largest square with bottom-right at (i,j); 1 + min of three neighbors if matrix[i][j]=1.',
      good: [
        {
          id: 'm4x5',
          title: 'Classic binary matrix',
          input: {
            matrix: [
              ['1', '0', '1', '0', '0'],
              ['1', '0', '1', '1', '1'],
              ['1', '1', '1', '1', '1'],
              ['1', '0', '0', '1', '0'],
            ],
          },
          inputLabel: '4×5 matrix',
          returns: 'max square side 2',
          tone: 'ok',
          question: 'Why take min of three diagonal/up/left neighbors?',
          answer:
            'A 1-cell extends the square only if all three supporting cells already form a square of that size.',
        },
      ],
    },
  },
  'imp-12-shortest-path-in-binary-matrix': {
    cases: {
      intro: 'BFS on 8-direction grid from (0,0) to (n-1,n-1) through 0-cells only.',
      good: [
        {
          id: 'g1',
          title: '3×3 with open path',
          input: {
            grid: [
              [0, 0, 0],
              [1, 1, 0],
              [1, 1, 0],
            ],
          },
          inputLabel: '3×3 binary matrix',
          returns: 'shortest path length 4',
          tone: 'ok',
          question: 'Why 8 directions instead of 4?',
          answer:
            'Problem allows diagonal moves through 0-cells; BFS still yields shortest hop count in that move set.',
        },
      ],
    },
  },
  'imp-11-shortest-path-in-a-grid-with-obstacles-eliminati': {
    cases: {
      intro: 'BFS state (row, col, k) — track remaining obstacle eliminations.',
      good: [
        {
          id: 'g1',
          title: '5×3 · k=1',
          input: {
            grid: [
              [0, 0, 0],
              [1, 1, 0],
              [0, 0, 0],
              [0, 1, 1],
              [0, 0, 0],
            ],
            k: 1,
          },
          inputLabel: '5×3 grid, k=1',
          returns: '6 moves',
          tone: 'ok',
          question: 'Why carry k in the BFS state?',
          answer:
            'Reaching the same cell with more eliminations left may unlock paths impossible with fewer — state is (r,c,k).',
        },
      ],
    },
  },
};
