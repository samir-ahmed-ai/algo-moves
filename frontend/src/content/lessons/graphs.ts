import type { LessonDef } from './types';

export const graphsLessons: LessonDef[] = [
  {
    id: 'graphs-modeling',
    title: 'Modeling a problem as a graph',
    summary: 'Spot the nodes and edges hiding inside a word problem.',
    estimatedMinutes: 6,
    tags: ['graphs', 'bfs', 'dfs'],
    blocks: [
      {
        kind: 'prose',
        text: 'Most "graph" problems never mention graphs. The skill is recognizing that some set of **things** are connected by some **relationship** — that is all a graph is: nodes joined by edges.',
      },
      { kind: 'heading', level: 2, text: 'Name the nodes and the edges' },
      {
        kind: 'prose',
        text: 'Before writing any code, answer two questions in plain language:',
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          'What is a **node**? (a cell, a city, a course, a person, a board state)',
          'When are two nodes joined by an **edge**? (adjacent, has-a-flight, is-a-prerequisite, differs-by-one-move)',
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Grids are graphs',
        text: 'An m×n grid is a graph with up to 4 edges per cell (its neighbors). You rarely build an explicit adjacency list — the neighbors are computed on the fly.',
      },
      { kind: 'heading', level: 2, text: 'Pick a representation' },
      {
        kind: 'list',
        items: [
          '**Adjacency list** — `map[node] -> []node`. Best default; O(V+E) space.',
          '**Adjacency matrix** — `grid[i][j]`. Only for dense graphs or O(1) edge lookups.',
          '**Implicit** — neighbors derived from the node itself (grid deltas, one-letter word changes).',
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        caption: 'Build an adjacency list from an edge list',
        code: 'adj := make(map[int][]int)\nfor _, e := range edges {\n\tadj[e[0]] = append(adj[e[0]], e[1])\n\tadj[e[1]] = append(adj[e[1]], e[0]) // omit for a directed graph\n}',
      },
      {
        kind: 'keyPoints',
        points: [
          'A graph = nodes + a rule for when two nodes are connected.',
          'Grids and state-spaces are graphs with implicit edges.',
          'Reach for an adjacency list unless the graph is dense.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'number-of-islands',
        note: 'Try modeling this grid as a graph before you read the solution.',
      },
    ],
  },
  {
    id: 'graphs-bfs-vs-dfs',
    title: 'BFS vs DFS: which to reach for',
    summary: 'Shortest paths want BFS; connectivity and ordering want DFS.',
    estimatedMinutes: 7,
    tags: ['graphs', 'bfs', 'dfs'],
    blocks: [
      {
        kind: 'prose',
        text: 'BFS and DFS explore the same graph but in a different order, and that order decides which problems they solve well.',
      },
      { kind: 'heading', level: 2, text: 'Breadth-first search' },
      {
        kind: 'prose',
        text: 'BFS expands nodes in rings of increasing distance from the source using a **queue**. Because it reaches every node by the fewest edges first, it gives the **shortest path in an unweighted graph** for free.',
      },
      {
        kind: 'code',
        lang: 'go',
        caption: 'BFS shortest distance',
        code: 'q := []int{src}\ndist := map[int]int{src: 0}\nfor len(q) > 0 {\n\tu := q[0]\n\tq = q[1:]\n\tfor _, v := range adj[u] {\n\t\tif _, seen := dist[v]; !seen {\n\t\t\tdist[v] = dist[u] + 1\n\t\t\tq = append(q, v)\n\t\t}\n\t}\n}',
      },
      { kind: 'heading', level: 2, text: 'Depth-first search' },
      {
        kind: 'prose',
        text: 'DFS dives as deep as possible before backtracking, using recursion (an implicit **stack**). It naturally exposes structure: connected components, cycles, and topological order.',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Rule of thumb',
        text: 'Fewest steps / shortest path → BFS. "Is it reachable?", counting components, cycle detection, ordering by dependency → DFS.',
      },
      {
        kind: 'keyPoints',
        points: [
          'BFS = queue = shortest path in an unweighted graph.',
          'DFS = stack/recursion = connectivity, cycles, ordering.',
          'Both are O(V+E); the choice is about what the traversal order reveals.',
        ],
      },
    ],
  },
  {
    id: 'graphs-cycles-topo',
    title: 'Cycle detection & topological order',
    summary: 'Order tasks by dependency — and detect the impossible ones.',
    estimatedMinutes: 6,
    tags: ['graphs', 'topological-sort', 'cycle'],
    blocks: [
      {
        kind: 'prose',
        text: 'A **directed acyclic graph** (DAG) can be linearized so every edge points forward — a topological order. If no such order exists, the graph has a cycle.',
      },
      { kind: 'heading', level: 2, text: "Kahn's algorithm (BFS)" },
      {
        kind: 'steps',
        steps: [
          { title: 'Count', caption: 'Compute the in-degree of every node.' },
          { title: 'Seed', caption: 'Enqueue every node with in-degree 0.' },
          {
            title: 'Peel',
            caption:
              'Pop a node, append it to the order, and decrement its neighbors’ in-degrees; enqueue any that hit 0.',
          },
          {
            title: 'Check',
            caption: 'If the order holds fewer nodes than the graph, a cycle blocked the rest.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        text: 'The count of emitted nodes IS your cycle detector — no separate pass needed.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Topological order exists iff the directed graph is acyclic.',
          "Kahn's: repeatedly remove in-degree-0 nodes.",
          'Emitted < total ⇒ a cycle.',
        ],
      },
    ],
  },
];
