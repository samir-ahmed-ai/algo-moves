import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What problem type and algorithm does `coursesOrder` implement?",
      "choices": [
        {
          "label": "Topological sort — Kahn's BFS peeling of zero-in-degree nodes",
          "correct": true
        },
        {
          "label": "Shortest path — Dijkstra's algorithm on a prerequisite graph"
        },
        {
          "label": "Cycle detection — DFS with a color array"
        },
        {
          "label": "Connected components — Union-Find"
        }
      ],
      "explain": "The code maintains an `indeg` array and a BFS queue of zero-in-degree courses, appending each to `order` as it's dequeued — Kahn's topological sort. Dijkstra and Union-Find are not used."
    },
    {
      "id": "adjacency-direction",
      "prompt": "In `coursesOrder`, how is the adjacency list `adj` built from the `prerequisites` input `[course, pre]`?",
      "choices": [
        {
          "label": "`adj[pre]` appends `course` — an edge from prerequisite to the course that depends on it",
          "correct": true
        },
        {
          "label": "`adj[course]` appends `pre` — an edge from each course to its prerequisite"
        },
        {
          "label": "Both directions are stored to make the graph undirected"
        },
        {
          "label": "`adj[course]` appends `course` to track self-loops"
        }
      ],
      "explain": "The edge direction must go from `pre` to `course` so that decrementing `indeg[course]` when `pre` is processed is correct. Reversing it would give wrong in-degrees."
    },
    {
      "id": "key-mechanic",
      "prompt": "What happens inside the BFS loop when `indeg[nb]` is decremented to 0?",
      "choices": [
        {
          "label": "`nb` is appended to `q`, making it ready to process in a future iteration",
          "correct": true
        },
        {
          "label": "`nb` is immediately appended to `order` without being enqueued"
        },
        {
          "label": "A cycle is reported and the function returns nil"
        },
        {
          "label": "All neighbors of `nb` have their in-degrees reset to 0"
        }
      ],
      "explain": "When removing a node from the graph eliminates a prerequisite, its dependent courses may reach in-degree 0. Enqueuing them ensures they are eventually processed in topological order."
    },
    {
      "id": "cycle-check",
      "prompt": "How does the code detect an impossible schedule (cycle in prerequisite graph)?",
      "choices": [
        {
          "label": "`len(order) != numCourses` — courses in a cycle never reach in-degree 0, so they're never added to `order`",
          "correct": true
        },
        {
          "label": "It checks whether `q` is non-empty after the loop ends"
        },
        {
          "label": "It explicitly tracks back edges using a `visiting` boolean array"
        },
        {
          "label": "It returns nil when `indeg` still contains values greater than 1"
        }
      ],
      "explain": "Nodes stuck in a cycle keep non-zero in-degrees throughout BFS and never enter the queue. If `order` ends up shorter than `numCourses`, a cycle must exist."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `coursesOrder`?",
      "choices": [
        {
          "label": "Time O(V+E), Space O(V) — each node and edge is visited once; adj and indeg are size V",
          "correct": true
        },
        {
          "label": "Time O(V²), Space O(V²) — all pairs of courses are compared"
        },
        {
          "label": "Time O(E log V), Space O(E) — a priority queue is used for ordering"
        },
        {
          "label": "Time O(V·E), Space O(V) — BFS restarts from every node"
        }
      ],
      "explain": "BFS visits every node and edge exactly once: O(V+E) time. The adjacency list is O(V+E) but the problem reports O(V) space, referring to the auxiliary structures (`indeg`, `order`, `q`) that are all size V. There is no priority queue and no per-node restart, so the O(E log V) and O(V·E) options are wrong."
    },
    {
      "id": "edge-case",
      "prompt": "What does `coursesOrder` return if there are no prerequisites (empty `prerequisites` slice)?",
      "choices": [
        {
          "label": "A slice containing all courses 0..numCourses-1 in arbitrary order",
          "correct": true
        },
        {
          "label": "nil, because no ordering can be determined"
        },
        {
          "label": "An empty slice, because no edges exist"
        },
        {
          "label": "It panics due to an empty adjacency list"
        }
      ],
      "explain": "With no prerequisites every course starts at in-degree 0 and is immediately enqueued. The BFS processes all of them, so `order` ends up containing every course and `len(order)==numCourses` passes."
    }
  ]
};
