import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which technique does Clone Graph use to traverse and copy the graph?',
      choices: [
        {
          label: 'DFS recursion with a memoization — map',
          correct: true,
        },
        {
          label: 'BFS with a queue — a visited set',
        },
        {
          label: 'Iterative DFS with an explicit — stack',
        },
        {
          label: "Topological sort via Kahn's — btCloneGraph calls itself",
        },
      ],
      explain:
        '`btCloneGraph` calls itself recursively on each neighbor — that is DFS. The `memo` map prevents reprocessing and cycles, playing the role that a visited set does in iterative BFS.',
    },
    {
      id: 'memo-timing',
      prompt: 'In `btCloneGraph`, when is the new copy node stored in `memo`?',
      choices: [
        {
          label: 'Immediately after allocating — recursing into neighbors',
          correct: true,
        },
        {
          label: 'After all neighbors — recursively cloned',
        },
        {
          label: 'At the start of the function — before allocating the copy',
        },
        {
          label: 'Only when the node — no neighbors',
        },
      ],
      explain:
        '`memo[n] = copy` appears right after `copy := &GraphNode{Label: n.Label}` and before the neighbor loop. Storing it early is critical — it breaks cycles by returning the already-created copy when the same node is encountered again.',
    },
    {
      id: 'cycle-handling',
      prompt: 'What prevents infinite recursion on a graph with cycles?',
      choices: [
        {
          label: 'The `if c, ok := — memo[n]; ok { return c }` check at',
          correct: true,
        },
        {
          label: 'The `if src == nil — { return nil }` nil guard in',
        },
        {
          label: 'The range over `n.Neighbors` — once all neighbors are visited',
        },
        {
          label: "Go's garbage collector — reference cycles",
        },
      ],
      explain:
        'On the second visit to any node, `memo[n]` already holds its clone and is returned immediately, cutting the recursion short. Without this check, two mutually-referring nodes would recurse infinitely.',
    },
    {
      id: 'data-structure',
      prompt: 'What does the `memo` map store?',
      choices: [
        {
          label: 'A mapping from original *GraphNode — pointer to its cloned *GraphNode',
          correct: true,
        },
        {
          label: 'A mapping from node Label — (int) to its cloned *GraphNode',
        },
        {
          label: 'A set of already-visited original — node pointers',
        },
        {
          label: 'A mapping from node Label — to a boolean visited flag',
        },
      ],
      explain:
        "The map is typed `map[*GraphNode]*GraphNode`, keyed by the original pointer so two nodes with the same label are never confused. Keying by label would be wrong for graphs where labels aren't unique.",
    },
    {
      id: 'complexity',
      prompt: 'What is the space complexity of this clone solution (excluding the output graph)?',
      choices: [
        {
          label: 'O(V) — the memo map and call stack each hold at most V entries',
          correct: true,
        },
        {
          label: 'O(V+E) — edges are also stored in the map',
        },
        {
          label: 'O(E) — only edges are tracked to avoid duplicates',
        },
        {
          label: 'O(1) — the memo is freed after cloning',
        },
      ],
      explain:
        "The `memo` map stores one entry per vertex (O(V)), and the recursion depth is at most V in the worst case. Edge storage belongs to the output graph, not to the algorithm's auxiliary space.",
    },
    {
      id: 'neighbor-order',
      prompt: "How does the clone preserve each node's neighbor relationships?",
      choices: [
        {
          label: 'It appends — The loop for _, nb := range n',
          correct: true,
        },
        {
          label: 'It copies the original `Neighbors` — slice header directly into the copy',
        },
        {
          label: 'It sorts neighbors by Label — before linking them',
        },
        {
          label: 'It links neighbors — the entire graph is cloned in a',
        },
      ],
      explain:
        "The loop `for _, nb := range n.Neighbors { copy.Neighbors = append(copy.Neighbors, btCloneGraph(nb, memo)) }` builds the copy's neighbor list by recursively cloning each original neighbor in order, so the cloned graph mirrors the original's structure.",
    },
  ],
};
