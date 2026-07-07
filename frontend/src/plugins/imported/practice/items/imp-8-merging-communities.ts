import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        'Which algorithmic pattern does this solution use to answer community size queries after merge operations?',
      choices: [
        {
          label: 'Union-Find (Disjoint Set Union) — The code defines a DSU struct with',
          correct: true,
        },
        {
          label: 'BFS over an adjacency list — The code defines a DSU struct',
        },
        {
          label: 'DFS with a visited array — The code defines a DSU struct',
        },
        {
          label: 'Topological sort — The code defines a DSU struct',
        },
      ],
      explain:
        'The code defines a DSU struct with parent and size slices, and implements Find/Union operations — the hallmarks of Union-Find. BFS/DFS would require traversing edges each query, which would be far slower.',
    },
    {
      id: 'data-structure',
      prompt: 'What two slices does the DSU struct maintain, and what does each track?',
      choices: [
        {
          label: 'parent (representative — and size (number of nodes',
          correct: true,
        },
        {
          label: 'parent (representative) and rank — height upper bound)',
        },
        {
          label: 'visited (whether seen) and size — (component size)',
        },
        {
          label: 'color (BFS layer) and parent — (predecessor in BFS tree)',
        },
      ],
      explain:
        "The NewDSU constructor initializes parent[i]=i and size[i]=1. Union by size (not rank) is used: the smaller component's root points to the larger one's root, and the larger root's size is updated.",
    },
    {
      id: 'path-compression',
      prompt:
        'In the Find method, the line `d.parent[x] = d.Find(d.parent[x])` performs what optimization?',
      choices: [
        {
          label: 'Path compression flattens — This is classic path compression: by',
          correct: true,
        },
        {
          label: 'Union by size — attaches the smaller tree under the larger one',
        },
        {
          label: 'Cycle detection — stops infinite recursion when a cycle is present',
        },
        {
          label: 'Memoization — caches the root to avoid recomputing it',
        },
      ],
      explain:
        'This is classic path compression: by setting parent[x] directly to the root (found recursively), all nodes along the path point straight to the root after the first Find, giving near-O(1) amortized cost. Union by size is handled separately in Union.',
    },
    {
      id: 'union-mechanic',
      prompt:
        'When Union(x, y) is called and rx != ry, the code swaps rx and ry if `size[rx] < size[ry]`. Why?',
      choices: [
        {
          label: 'To ensure the larger component — always becomes the new root, bounding',
          correct: true,
        },
        {
          label: 'To maintain lexicographic ordering — node indices',
        },
        {
          label: 'To guarantee path compression runs — in the next Find call',
        },
        {
          label: 'To avoid a stack overflow — in the recursive Find',
        },
      ],
      explain:
        "Union by size always attaches the smaller tree under the larger tree's root. After the swap, rx is guaranteed to be the larger root, so `parent[ry] = rx` and `size[rx] += size[ry]` correctly grow the larger component. This keeps the tree shallow.",
    },
    {
      id: 'query-mechanic',
      prompt:
        'When op == "Q" is read, the code calls `dsu.Size(u)`. How does Size(u) return the correct component count?',
      choices: [
        {
          label: 'It calls Find(u) to get — the root, then returns size[root]',
          correct: true,
        },
        {
          label: 'It iterates all nodes — counts those sharing the same parent',
        },
        {
          label: 'It returns size[u] — size is only maintained',
        },
        {
          label: 'It performs a BFS — u and counts reachable nodes',
        },
      ],
      explain:
        "size is only maintained accurately at the root of each component. Size(u) calls Find(u) to locate the current root, then reads size[root], which always equals the component's member count after each Union.",
    },
    {
      id: 'complexity',
      prompt: 'The stated time complexity is O(q·α(n)). What does α(n) represent here?',
      choices: [
        {
          label: 'The inverse Ackermann function — amortized cost per Find/Union with',
          correct: true,
        },
        {
          label: 'O(log n) — the height of the tree with union by size alone',
        },
        {
          label: 'O(n) — a full scan per query in the worst case',
        },
        {
          label: 'O(log log n) — the depth after path halving',
        },
      ],
      explain:
        'Combining path compression with union by size yields amortized O(α(n)) per operation, where α is the inverse Ackermann function — effectively a constant for all practical n. Union by size alone (no compression) gives O(log n) per operation.',
    },
  ],
};
