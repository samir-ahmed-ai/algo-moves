import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which technique does `isBipartite` use to determine if the graph is bipartite?',
      choices: [
        {
          label: 'BFS 2-coloring: paint nodes — fail if a neighbor',
          correct: true,
        },
        {
          label: 'DFS cycle detection: — code uses a BFS queue (q)',
        },
        {
          label: 'Union-Find: merge nodes that must — be in the same partition and check',
        },
        {
          label: 'Topological sort: a DAG — always bipartite',
        },
      ],
      explain:
        'The code uses a BFS queue (`q`) and a `color` array, assigning colors 1 and 2 to opposite sides. Finding two adjacent nodes with the same color (`color[nb] == color[v]`) is the failure condition. DFS 2-coloring also works but is not what this code does.',
    },
    {
      id: 'color-assignment',
      prompt: 'How does the code assign the opposite color to a BFS neighbor?',
      choices: [
        {
          label: '`color[nb] = 3 - color[v]` — which maps 1→2 and 2→1',
          correct: true,
        },
        {
          label: '`color[nb] = color[v] + 1` — incrementing the color each level',
        },
        {
          label: '`color[nb] = 1 - color[v]` — flipping between 0 and 1',
        },
        {
          label: '`color[nb] = color[v] ^ 3` — using XOR to toggle',
        },
      ],
      explain:
        "With colors 1 and 2: `3 - 1 = 2` and `3 - 2 = 1`, so the formula cleanly swaps between the two color values. The code uses 0 as 'uncolored' sentinel, so `1 - color[v]` would incorrectly map 1→0 (uncolored).",
    },
    {
      id: 'outer-loop',
      prompt:
        'Why does `isBipartite` have an outer loop `for i := range adj` that starts a new BFS from any node still uncolored (`color[i] == 0`)?',
      choices: [
        {
          label: 'The graph may be disconnected; — a BFS from one node only colors its',
          correct: true,
        },
        {
          label: 'To restart BFS — node so the coloring is recomputed',
        },
        {
          label: 'To reset the `color` array — between components so colors do not',
        },
        {
          label: 'To guarantee node 0 — always colored 1 and is processed',
        },
      ],
      explain:
        'A disconnected graph has multiple connected components, and a single BFS only colors nodes reachable from its start node. The outer loop skips already-colored nodes (`color[i] != 0`) and launches a fresh BFS from any uncolored node, ensuring all components are checked. It does not restart from every node, nor reset the shared `color` array.',
    },
    {
      id: 'failure-condition',
      prompt: 'When does `isBipartite` return `false`?',
      choices: [
        {
          label: 'When a neighbor `nb` — already colored and has the same',
          correct: true,
        },
        {
          label: 'When a neighbor `nb` — already colored with any color',
        },
        {
          label: 'When the BFS queue becomes — empty before all nodes are colored',
        },
        {
          label: 'When the graph — odd number of nodes',
        },
      ],
      explain:
        '`color[nb] == color[v]` means an edge exists between two nodes in the same partition — violating bipartiteness. A same-color neighbor (not just any colored neighbor) is the tell. A colored neighbor with the opposite color is expected and correct.',
    },
    {
      id: 'complexity',
      prompt: 'What are the time and space complexities of `isBipartite`?',
      choices: [
        {
          label: 'Time O(V+E), Space O(V) — Each vertex is enqueued and processed',
          correct: true,
        },
        {
          label: 'Time O(V·E), Space O(V) — Each vertex is enqueued and',
        },
        {
          label: 'Time O(V+E), Space O(V+E) — Each vertex is enqueued and',
        },
        {
          label: 'Time O(V²), Space O(V) — Each vertex is enqueued and',
        },
      ],
      explain:
        'Each vertex is enqueued and processed once (O(V)) and each edge is examined once per endpoint (O(E)), giving O(V+E) time. The `color` array and BFS queue use O(V) space; the adjacency list `adj` is given as input and not counted.',
    },
    {
      id: 'edge-case',
      prompt: 'What does `isBipartite` return for a graph with a single node and no edges?',
      choices: [
        {
          label: '`true` a single node — trivially bipartite; it is colored 1',
          correct: true,
        },
        {
          label: '`false` — the outer loop never finishes coloring all nodes',
        },
        {
          label: '`true` but only because — For a single node: color[0]',
        },
        {
          label: 'The code panics because `adj[0]` — is nil',
        },
      ],
      explain:
        'For a single node: `color[0]` starts at 0, so the outer loop starts a BFS, sets `color[0] = 1`, enqueues node 0, processes it with an empty neighbor list, and finishes. The function returns `true`. `adj[0]` being an empty slice (not nil) is safe to range over in Go.',
    },
  ],
};
