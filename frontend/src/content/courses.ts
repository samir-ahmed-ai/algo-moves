import type { CourseDef } from './types';

/**
 * Hand-authored curriculum manifest. Adding curriculum is pure data: append courses,
 * topics, and items here. A `problem` item only needs `pluginId` — its title, summary,
 * difficulty, source and base tags are pulled from the plugin's meta.
 *
 * Imported reference problems are merged in at catalog build time (see mergeCourses.ts).
 */
export const curatedCourses: CourseDef[] = [
  {
    id: 'backtracking',
    title: 'Backtracking',
    summary: 'Explore a decision tree depth-first, undoing choices that lead to dead ends.',
    icon: 'GitBranch',
    topics: [
      {
        id: 'placement',
        title: 'Constraint placement',
        summary: 'Place items subject to constraints, backtracking on conflicts.',
        items: [
          {
            id: 'n-queens',
            kind: 'problem',
            pluginId: 'n-queens',
            status: 'todo',
            estimatedMinutes: 25,
          },
        ],
      },
      {
        id: 'enumeration',
        title: 'Enumeration',
        summary: 'Generate every combination by including/excluding each choice.',
        items: [
          {
            id: 'subsets',
            kind: 'problem',
            pluginId: 'imp-26-subsets',
            status: 'todo',
            estimatedMinutes: 18,
          },
        ],
      },
    ],
  },
  {
    id: 'graphs',
    title: 'Graphs',
    summary: 'Model relationships as nodes and edges, then traverse, colour, and search them.',
    icon: 'Network',
    topics: [
      {
        id: 'traversal-coloring',
        title: 'Traversal & colouring',
        summary: 'BFS / DFS sweeps and 2-colouring.',
        items: [
          {
            id: 'is-bipartite',
            kind: 'problem',
            pluginId: 'imp-7-is-graph-bipartite',
            tags: ['queue'],
            status: 'in-progress',
            estimatedMinutes: 20,
          },
          {
            id: 'number-of-islands',
            kind: 'problem',
            pluginId: 'imp-24-number-of-islands',
            tags: ['stack'],
            status: 'todo',
            estimatedMinutes: 20,
          },
        ],
      },
      {
        id: 'ordering',
        title: 'Ordering & cycles',
        summary: 'Directed-graph dependency order and cycle detection.',
        items: [
          {
            id: 'topological-sort',
            kind: 'problem',
            pluginId: 'imp-0-08-topological-sort-with-dfs',
            title: 'Topological sort (DFS post-order)',
            summary: 'DFS finishes children before parents; reverse the post-order stack for a valid topological order.',
            tags: ['stack'],
            status: 'todo',
            estimatedMinutes: 20,
          },
          {
            id: 'course-schedule',
            kind: 'problem',
            pluginId: 'imp-20-course-schedule',
            tags: ['stack'],
            status: 'todo',
            estimatedMinutes: 20,
          },
        ],
      },
      {
        id: 'weighted',
        title: 'Weighted graphs',
        summary: 'Shortest paths and minimum spanning trees over edge weights.',
        items: [
          {
            id: 'dijkstra',
            kind: 'problem',
            pluginId: 'imp-6-find-shortest-path-with-dijkstra-s',
            status: 'todo',
            estimatedMinutes: 25,
          },
          {
            id: 'union-find',
            kind: 'problem',
            pluginId: 'union-find',
            status: 'todo',
            estimatedMinutes: 25,
          },
        ],
      },
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary search',
    summary: 'Shrink a sorted search space with a monotonic predicate.',
    icon: 'Search',
    topics: [
      {
        id: 'fundamentals',
        title: 'Fundamentals',
        summary: 'Classic binary search on a sorted array.',
        items: [
          {
            id: 'binary-search',
            kind: 'problem',
            pluginId: 'binary-search',
            status: 'todo',
            estimatedMinutes: 15,
          },
        ],
      },
    ],
  },
  {
    id: 'dynamic-programming',
    title: 'Dynamic programming',
    summary: 'Break a problem into overlapping subproblems and fill a table bottom-up.',
    icon: 'Table',
    topics: [
      {
        id: 'one-dimensional',
        title: '1-D tables',
        summary: 'A single dp array filled left to right.',
        items: [
          {
            id: 'climbing-stairs',
            kind: 'problem',
            pluginId: 'imp-58-climbing-stairs',
            status: 'todo',
            estimatedMinutes: 15,
          },
        ],
      },
      {
        id: 'two-dimensional',
        title: '2-D tables',
        summary: 'A grid dp filled row by row, then traced back.',
        items: [
          {
            id: 'edit-distance',
            kind: 'problem',
            pluginId: 'imp-61-edit-distance',
            status: 'todo',
            estimatedMinutes: 25,
            prereqs: ['climbing-stairs'],
          },
        ],
      },
    ],
  },
  {
    id: 'arrays',
    title: 'Arrays & searching',
    summary: 'Pointer-driven sweeps over linear data: search, two-pointers, and sorting.',
    icon: 'ListOrdered',
    topics: [
      {
        id: 'searching',
        title: 'Searching',
        summary: 'Shrink the search space with ordered structure.',
        items: [
          {
            id: 'two-sum-sorted',
            kind: 'problem',
            pluginId: 'two-sum-sorted',
            status: 'todo',
            estimatedMinutes: 15,
          },
        ],
      },
      {
        id: 'sliding-window',
        title: 'Sliding window',
        summary: 'Slide a contiguous window and maintain a running answer.',
        items: [
          {
            id: 'max-subarray-sum-k',
            kind: 'problem',
            pluginId: 'max-subarray-sum-k',
            status: 'todo',
            estimatedMinutes: 15,
          },
          {
            id: 'longest-substring',
            kind: 'problem',
            pluginId: 'longest-substring',
            status: 'todo',
            estimatedMinutes: 20,
          },
        ],
      },
      {
        id: 'sorting',
        title: 'Sorting',
        summary: 'Reorder a sequence and watch the invariants build.',
        items: [
          { id: 'bubble-sort', kind: 'problem', pluginId: 'bubble-sort', status: 'todo', estimatedMinutes: 12 },
          { id: 'selection-sort', kind: 'problem', pluginId: 'selection-sort', status: 'todo', estimatedMinutes: 12 },
          { id: 'insertion-sort', kind: 'problem', pluginId: 'insertion-sort', status: 'todo', estimatedMinutes: 12 },
          { id: 'merge-sort', kind: 'problem', pluginId: 'merge-sort', status: 'todo', estimatedMinutes: 18, prereqs: ['bubble-sort'] },
          { id: 'quick-sort', kind: 'problem', pluginId: 'quick-sort', status: 'todo', estimatedMinutes: 18, prereqs: ['bubble-sort'] },
          { id: 'heap-sort', kind: 'problem', pluginId: 'heap-sort', status: 'todo', estimatedMinutes: 18, prereqs: ['bubble-sort'] },
        ],
      },
    ],
  },
  {
    id: 'trees',
    title: 'Trees',
    summary: 'Recursive node structures: traverse, search, and build them.',
    icon: 'ListTree',
    topics: [
      {
        id: 'traversal',
        title: 'Traversal',
        summary: 'Depth-first and breadth-first visit orders.',
        items: [
          {
            id: 'tree-traversals',
            kind: 'problem',
            pluginId: 'tree-traversals',
            status: 'todo',
            estimatedMinutes: 18,
          },
        ],
      },
      {
        id: 'prefix-trees',
        title: 'Prefix trees',
        summary: 'Tries for word insert and search.',
        items: [
          {
            id: 'trie',
            kind: 'problem',
            pluginId: 'trie',
            status: 'todo',
            estimatedMinutes: 20,
          },
        ],
      },
    ],
  },
  {
    id: 'heaps',
    title: 'Heaps',
    summary: 'Complete binary trees that keep the min (or max) at the root.',
    icon: 'Triangle',
    topics: [
      {
        id: 'heap-ops',
        title: 'Operations',
        summary: 'Insert (sift-up) and extract (sift-down).',
        items: [
          {
            id: 'heap-operations',
            kind: 'problem',
            pluginId: 'heap-operations',
            status: 'todo',
            estimatedMinutes: 20,
          },
        ],
      },
    ],
  },
  {
    id: 'linked-lists',
    title: 'Linked lists',
    summary: 'Pointer-rewiring on chained nodes.',
    icon: 'Link',
    topics: [
      {
        id: 'rewiring',
        title: 'Rewiring',
        summary: 'Reverse and restructure by moving next-pointers.',
        items: [
          {
            id: 'reverse-linked-list',
            kind: 'problem',
            pluginId: 'reverse-linked-list',
            status: 'todo',
            estimatedMinutes: 15,
          },
        ],
      },
      {
        id: 'fast-slow',
        title: 'Fast & slow pointers',
        summary: "Floyd's cycle detection.",
        items: [
          {
            id: 'linked-list-cycle',
            kind: 'problem',
            pluginId: 'linked-list-cycle',
            status: 'todo',
            estimatedMinutes: 15,
          },
        ],
      },
    ],
  },
  {
    id: 'greedy',
    title: 'Greedy',
    summary: 'Make the locally optimal choice at each step and prove it stays optimal.',
    icon: 'TrendingUp',
    topics: [
      {
        id: 'scheduling',
        title: 'Scheduling',
        summary: 'Pick a maximal non-conflicting set.',
        items: [
          {
            id: 'interval-scheduling',
            kind: 'problem',
            pluginId: 'interval-scheduling',
            status: 'todo',
            estimatedMinutes: 18,
          },
        ],
      },
    ],
  },
];
