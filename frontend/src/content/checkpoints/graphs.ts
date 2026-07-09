import type { CheckpointDef } from './types';

export const graphsCheckpoint: CheckpointDef = {
  id: 'graphs-checkpoint',
  courseId: 'graphs',
  title: 'Graphs checkpoint',
  summary: 'Prove you can pick the right traversal and spot a cycle.',
  passPct: 80,
  questions: [
    {
      id: 'gq-shortest',
      prompt: 'Which traversal gives the shortest path in an unweighted graph?',
      choices: [
        { label: 'BFS — expands nodes in distance rings', correct: true },
        { label: 'DFS — dives deep before backtracking' },
        { label: 'Either — order does not affect distance' },
      ],
      explain:
        'BFS reaches every node by the fewest edges first, so the first time it sees a node is via a shortest path.',
    },
    {
      id: 'gq-datastruct',
      prompt: 'What data structure drives BFS?',
      choices: [
        { label: 'Queue — FIFO expands the nearest frontier', correct: true },
        { label: 'Stack — LIFO dives into one branch' },
        { label: 'Priority queue — orders by weight' },
      ],
      explain:
        'A FIFO queue processes nodes in the order discovered, which is increasing distance from the source.',
    },
    {
      id: 'gq-cycle',
      prompt: 'In Kahn’s algorithm, how do you know a directed graph has a cycle?',
      choices: [
        { label: 'Emitted < total — some nodes never hit in-degree 0', correct: true },
        { label: 'The queue empties before the first node' },
        { label: 'A node has in-degree greater than 1' },
      ],
      explain:
        'Nodes inside a cycle never reach in-degree 0, so they are never emitted — the shortfall is the cycle signal.',
    },
    {
      id: 'gq-representation',
      prompt: 'For a sparse graph, which representation is the right default?',
      choices: [
        { label: 'Adjacency list — O(V+E) space', correct: true },
        { label: 'Adjacency matrix — O(V²) space' },
        { label: 'Edge list scanned per query' },
      ],
      explain:
        'An adjacency list stores only the edges that exist, so it is linear in the graph size — ideal when E ≪ V².',
    },
    {
      id: 'gq-dfs-use',
      prompt: 'Which task is DFS naturally suited to?',
      choices: [
        { label: 'Detecting connected components', correct: true },
        { label: 'Finding the single-source shortest path' },
        { label: 'Level-order processing of a tree' },
      ],
      explain:
        'DFS explores one component fully before moving on, which makes counting components and cycle detection natural.',
    },
  ],
};
