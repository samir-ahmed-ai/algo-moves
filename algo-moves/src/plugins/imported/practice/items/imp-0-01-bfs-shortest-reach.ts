import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which problem category best describes BFS Shortest Reach?",
      "choices": [
        {
          "label": "Graph — BFS single-source distances",
          "correct": true
        },
        {
          "label": "Graph — Dijkstra weighted shortest path"
        },
        {
          "label": "Dynamic programming on a grid"
        },
        {
          "label": "Union-Find connected components"
        }
      ],
      "explain": "The code does a standard BFS from a start node and records the hop count multiplied by 6 as the distance to every reachable node. Dijkstra is unnecessary here because all edges have the same weight (6)."
    },
    {
      "id": "distance-formula",
      "prompt": "In the BFS loop, how is `dist[nb]` calculated for a newly discovered neighbor?",
      "choices": [
        {
          "label": "dist[cur] + 6",
          "correct": true
        },
        {
          "label": "dist[cur] + 1"
        },
        {
          "label": "dist[nb] + 6"
        },
        {
          "label": "6 * len(q)"
        }
      ],
      "explain": "`dist[nb] = dist[cur] + 6` — each edge costs exactly 6 units, so each BFS level adds 6 to the parent's distance. Using `+ 1` would give hop counts, not weighted distances."
    },
    {
      "id": "visited-check",
      "prompt": "How does the BFS avoid revisiting nodes?",
      "choices": [
        {
          "label": "It checks `dist[nb] == -1` before enqueuing",
          "correct": true
        },
        {
          "label": "It maintains a separate `visited []bool` slice"
        },
        {
          "label": "It deletes the node from `adj` after processing"
        },
        {
          "label": "It checks `dist[nb] > dist[cur] + 6`"
        }
      ],
      "explain": "Unvisited nodes are initialized to -1; the code skips any neighbor whose distance is already set, so `dist[nb] == -1` serves as both the visited guard and the discovery check in one step."
    },
    {
      "id": "result-assembly",
      "prompt": "How does the function build its return slice after BFS completes?",
      "choices": [
        {
          "label": "It appends dist[i] for every i from 1 to n, skipping i == start",
          "correct": true
        },
        {
          "label": "It appends dist[i] for every i from 0 to n-1"
        },
        {
          "label": "It returns dist directly, trimming index 0"
        },
        {
          "label": "It only appends nodes with dist[i] != -1"
        }
      ],
      "explain": "The loop runs `for i := 1; i <= n; i++` and appends `dist[i]` when `i != start`, producing distances to all other nodes including unreachable ones (which remain -1)."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of this solution?",
      "choices": [
        {
          "label": "Time O(V+E), Space O(V+E)",
          "correct": true
        },
        {
          "label": "Time O(V+E), Space O(V)"
        },
        {
          "label": "Time O(V²), Space O(V)"
        },
        {
          "label": "Time O(E log V), Space O(V+E)"
        }
      ],
      "explain": "Building the adjacency list takes O(V+E) space (each edge stored twice for an undirected graph), and BFS visits every vertex and edge once for O(V+E) time."
    },
    {
      "id": "edge-case",
      "prompt": "What does the function return when `start` is out of bounds (< 1 or > n)?",
      "choices": [
        {
          "label": "A slice of n-1 entries all set to -1",
          "correct": true
        },
        {
          "label": "nil"
        },
        {
          "label": "An empty slice"
        },
        {
          "label": "A slice of n entries all set to -1"
        }
      ],
      "explain": "The guard at the top allocates `res` of length `n-1` and fills every entry with -1 to signal that no node is reachable, matching the format of a valid (but fully unreachable) result."
    }
  ]
};
