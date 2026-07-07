import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        "Which variant of Dijkstra's algorithm does `findShortestPathWithDijkstras` implement?",
      choices: [
        {
          label: 'The naive O(V²) array-based — The inner loop for v := 0',
          correct: true,
        },
        {
          label: 'The O(E log V) binary-min-heap — variant using a priority queue',
        },
        {
          label: 'The Bellman-Ford variant — edges V-1 times',
        },
        {
          label: 'A BFS-based variant that works — only for unit-weight graphs',
        },
      ],
      explain:
        'The inner loop `for v := 0; v < n; v++ { if !used[v] && dist[v] < best }` is a linear scan to find the minimum-distance unvisited vertex — characteristic of the O(V²) array-based Dijkstra. There is no heap here.',
    },
    {
      id: 'used-array',
      prompt: 'What does the `used` array track, and why is it necessary?',
      choices: [
        {
          label: 'Vertices whose shortest distance — a',
          correct: true,
        },
        {
          label: 'Vertices that have been discovered — but not yet relaxed',
        },
        {
          label: 'Vertices adjacent to the current — shortest-path tree',
        },
        {
          label: 'Vertices for which all outgoing — edges have been relaxed',
        },
      ],
      explain:
        "Dijkstra's greedy invariant: once a vertex u is chosen as the minimum-distance unvisited vertex, `dist[u]` is optimal and won't change. The `used` array prevents re-selecting finalized vertices, ensuring each is processed exactly once.",
    },
    {
      id: 'relaxation',
      prompt: 'When does the code update `dist[e.Next]`?',
      choices: [
        {
          label: 'When `dist[u] + e.Weight < — dist[e.Next]`, i.e., going through u',
          correct: true,
        },
        {
          label: 'Always, to ensure the latest — distance is recorded',
        },
        {
          label: 'Only when `e.Next` — in `used`',
        },
        {
          label: 'When `e.Weight < dist[e.Next]` — accumulated distance to u',
        },
      ],
      explain:
        'The code computes `nd := dist[u] + e.Weight` and sets `dist[e.Next] = nd` only if `nd < dist[e.Next]`. This is the classic edge relaxation step. Using `e.Weight` alone (fourth option) would ignore the cost to reach u, giving wrong answers.',
    },
    {
      id: 'early-termination',
      prompt: 'The outer loop breaks when `u == -1`. When does this occur?',
      choices: [
        {
          label: 'When all remaining unvisited — have `dist[v] == INF`, meaning they',
          correct: true,
        },
        {
          label: 'When the destination vertex — reached',
        },
        {
          label: 'When count reaches n, meaning — all vertices are processed',
        },
        {
          label: 'When the adjacency list — the current vertex is empty',
        },
      ],
      explain:
        '`u` stays -1 if no unvisited vertex has `dist[v] < best` (where best starts at MaxInt). This means all remaining vertices are unreachable (still at INF). The loop then exits early rather than running all n iterations.',
    },
    {
      id: 'complexity',
      prompt: 'What is the time complexity of this Dijkstra implementation?',
      choices: [
        {
          label: 'O(V²) — The outer loop runs V times',
          correct: true,
        },
        {
          label: 'O(E log V) — The outer loop runs V times',
        },
        {
          label: 'O(V + E) — The outer loop runs V times',
        },
        {
          label: 'O(V·E) — The outer loop runs V times',
        },
      ],
      explain:
        'The outer loop runs V times; the inner scan to find the minimum is O(V); the relaxation loop is O(degree(u)), summing to O(E) across all iterations. The dominant cost is O(V²) from the linear minimum scan. A heap-based version reduces this to O(E log V).',
    },
    {
      id: 'edge-case',
      prompt: 'What does `dist[src]` equal at the end of `findShortestPathWithDijkstras`?',
      choices: [
        {
          label: '0, because it is explicitly — set to 0 before the loop and is never',
          correct: true,
        },
        {
          label: 'The sum of all edge — weights from src back to itself',
        },
        {
          label: 'INF — because the source is marked used',
        },
        {
          label: 'The minimum edge weight adjacent — to src',
        },
      ],
      explain:
        'The code sets `dist[src] = 0` before any relaxation. Since no path from src to itself can be shorter than 0 (assuming non-negative weights), it remains 0 throughout.',
    },
  ],
};
