import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which algorithmic pattern does `earliestAcq` use to find the earliest timestamp?',
      choices: [
        {
          label: 'Sort logs by timestamp — then process with Union-Find until one',
          correct: true,
        },
        {
          label: 'BFS over a social graph — expanding friendships level by level',
        },
        {
          label: 'Binary search on the timestamp — combined with a connectivity check',
        },
        {
          label: 'DFS to detect — graph becomes fully connected',
        },
      ],
      explain:
        'The code sorts `logs` using the custom `logsByTimestamp` comparator, then unions each friendship pair and returns the first timestamp at which `groups == 1`. Binary search or BFS are not used anywhere in the implementation.',
    },
    {
      id: 'termination',
      prompt:
        'After each union operation, the code checks `if groups == 1 { return l[0] }`. What does `groups` track and why is 1 the target?',
      choices: [
        {
          label: 'The number of disjoint friend — components; 1 means everyone is in',
          correct: true,
        },
        {
          label: 'The number of friendship events — processed so far; 1 means only one',
        },
        {
          label: 'The size of the largest — component; 1 means only one friend',
        },
        {
          label: 'The number of nodes — yet unioned; 1 means all but one',
        },
      ],
      explain:
        '`groups` starts at `n` and decrements by 1 each time two previously-separate components are merged. When `groups == 1` there is a single connected component containing all `n` people, which is precisely when everyone has become acquainted.',
    },
    {
      id: 'path-compression',
      prompt:
        'The `earliestAcqFind` function sets `parent[x] = earliestAcqFind(parent, parent[x])` before returning. What optimization is this?',
      choices: [
        {
          label: 'Path compression — flattens the tree so future finds are nearly O(1)',
          correct: true,
        },
        {
          label: 'Union by rank — merges the smaller tree under the larger one',
        },
        {
          label: 'Cycle detection — ensures no node is its own ancestor',
        },
        {
          label: 'Memoization — caches the result to avoid re-sorting the logs',
        },
      ],
      explain:
        'This is path compression: on the way back up the recursion, every node on the path is pointed directly to the root. Combined with union by size (done in `earliestAcqUnion`), it gives nearly O(α(n)) amortized per operation.',
    },
    {
      id: 'union-by-size',
      prompt:
        'In `earliestAcqUnion`, the code swaps `rx` and `ry` when `size[rx] < size[ry]`. What is the effect?',
      choices: [
        {
          label: "Ensures the larger component's root — becomes the new root, keeping the",
          correct: true,
        },
        {
          label: 'Ensures the component — lower-numbered root always wins',
        },
        {
          label: 'Handles the edge case — both nodes are already in the same',
        },
        {
          label: 'Prevents the `groups` counter — going below 0',
        },
      ],
      explain:
        'By attaching the smaller tree under the larger one, tree height grows slowly (union by size). Without this the tree could degenerate to a linked list, making finds O(n). The same-component case is handled by the `rx == ry` check before the swap.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of `earliestAcq` and what drives it?',
      choices: [
        {
          label: 'O(m log m) dominated — sorting the m logs',
          correct: true,
        },
        {
          label: 'O(m · n) because — log triggers an O(n) BFS check',
        },
        {
          label: 'O(n²) because Union-Find requires — all pairs',
        },
        {
          label: 'O(m · α(n)) — with the union-find work dominating',
        },
      ],
      explain:
        'Sorting `m` logs costs O(m log m). The union-find operations total only O(m · α(n)), which is effectively linear and is asymptotically smaller than the sort — so it does NOT dominate. The sort is the bottleneck, giving overall O(m log m).',
    },
    {
      id: 'no-full-connection',
      prompt:
        'If `groups` never reaches 1 after all logs are processed, `earliestAcq` returns -1. When does this occur?',
      choices: [
        {
          label: 'When the logs do — connect all n people into a single',
          correct: true,
        },
        {
          label: 'When two people become friends — at exactly the same timestamp',
        },
        {
          label: 'When the logs array is empty — causing the sort to panic',
        },
        {
          label: 'When n equals 1, because — a single person cannot have',
        },
      ],
      explain:
        'If the friendship events never reduce the component count all the way to 1 — meaning some people remain in separate components — the loop ends without returning and the function returns -1 as specified by the problem.',
    },
  ],
};
