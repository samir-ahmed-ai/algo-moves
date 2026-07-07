import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'What problem category does Has Path from Source to Destination belong to?',
      choices: [
        {
          label: 'Graph — BFS reachability check',
          correct: true,
        },
        {
          label: 'Graph — DFS cycle detection',
        },
        {
          label: 'Graph — Dijkstra shortest path',
        },
        {
          label: 'Union-Find connectivity query — The code uses BFS to explore',
        },
      ],
      explain:
        'The code uses BFS to explore nodes reachable from `src` and returns true as soon as `dest` is encountered, making it a reachability check. There is no cycle detection or distance computation.',
    },
    {
      id: 'early-return',
      prompt: 'Where in the BFS loop does the function return `true`?',
      choices: [
        {
          label: 'Inside the neighbor loop — the moment nb == dest is found',
          correct: true,
        },
        {
          label: 'When dest — the front of the queue',
        },
        {
          label: 'After the outer BFS loop — completes, if dist[dest] != -1',
        },
        {
          label: 'At the top, before BFS — starts, if src == dest',
        },
      ],
      explain:
        '`if nb == dest { return true }` fires inside the inner neighbor loop as soon as dest appears as a neighbor of the current node — earlier than waiting to dequeue dest. The top-level `if src == dest` is a separate short-circuit for the trivial case.',
    },
    {
      id: 'visited-structure',
      prompt: 'What data structure tracks visited nodes in this solution?',
      choices: [
        {
          label: 'A `visited []bool` slice indexed — by node id',
          correct: true,
        },
        {
          label: 'A `map[int]bool` hash set — visited := make([]bool,',
        },
        {
          label: 'A `dist []int` slice — -1 means unvisited',
        },
        {
          label: "The queue itself; a node — is visited if it's in the queue",
        },
      ],
      explain:
        '`visited := make([]bool, len(adj))` uses a boolean slice for O(1) lookup and O(V) space. A map would work but carries higher constant overhead; using the dist slice (as in problem 0-01) is an alternative not chosen here.',
    },
    {
      id: 'src-eq-dest',
      prompt: 'What is the purpose of `if src == dest { return true }` at the top of the function?',
      choices: [
        {
          label: 'It handles the trivial case — where source and destination are the',
          correct: true,
        },
        {
          label: 'It prevents marking src as visited — which would block returning',
        },
        {
          label: 'It is required to avoid — an off-by-one error in the adjacency',
        },
        {
          label: 'It is defensive code — the BFS loop would handle correctly',
        },
      ],
      explain:
        'The BFS only checks `nb == dest` for neighbors and never re-enqueues src, so when src == dest the loop would return true only if src has a self-loop. The early return covers the case correctly for every graph.',
    },
    {
      id: 'complexity',
      prompt: 'What is the worst-case time complexity of `hasPathFromSourceToDestina`?',
      choices: [
        {
          label: 'O(V+E) — BFS visits every vertex and edge at most once',
          correct: true,
        },
        {
          label: 'O(V²) — for dense graphs the neighbor loop runs V times per vertex',
        },
        {
          label: 'O(V) — only vertices are visited, not edges',
        },
        {
          label: 'O(E) — only edges are traversed, not vertices',
        },
      ],
      explain:
        'In the worst case (dest unreachable), BFS explores all V vertices and E edges: O(V+E). The early-return optimization only helps when dest is found before full exploration.',
    },
  ],
};
