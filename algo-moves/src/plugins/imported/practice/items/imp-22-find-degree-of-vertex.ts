import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What graph concept does this problem directly measure?",
      "choices": [
        {
          "label": "Vertex degree — the count of edges incident to a node",
          "correct": true
        },
        {
          "label": "Graph diameter — the longest shortest path between any two nodes"
        },
        {
          "label": "Centrality — how central a node is relative to all others"
        },
        {
          "label": "Connectivity — whether the graph is fully connected"
        }
      ],
      "explain": "Degree is simply the number of edges touching a vertex. The undirected version counts all neighbors; the directed version sums in-edges and out-edges."
    },
    {
      "id": "undirected-formula",
      "prompt": "How does `findDegreeOfVertexUndirected` compute the degree of vertex `v`?",
      "choices": [
        {
          "label": "Returns `len(adj[v])` — the number of neighbors in the adjacency list",
          "correct": true
        },
        {
          "label": "Iterates all edges and counts occurrences of v"
        },
        {
          "label": "Returns `len(adj[v]) / 2` to avoid double-counting"
        },
        {
          "label": "Sums in-degree and out-degree from two separate lists"
        }
      ],
      "explain": "In an undirected adjacency-list representation each neighbor of v appears once in `adj[v]`, so the length of that slice is exactly the degree. No division or iteration is needed."
    },
    {
      "id": "directed-formula",
      "prompt": "How does `findDegreeOfVertexDirected` define 'degree' for a directed graph?",
      "choices": [
        {
          "label": "in-degree + out-degree: `len(in[v]) + len(out[v])`",
          "correct": true
        },
        {
          "label": "Only out-degree: `len(out[v])`"
        },
        {
          "label": "Only in-degree: `len(in[v])`"
        },
        {
          "label": "The product of in-degree and out-degree"
        }
      ],
      "explain": "For directed graphs, degree is conventionally the sum of in-degree and out-degree. The code uses separate `in` and `out` adjacency lists and adds their lengths."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of both degree functions?",
      "choices": [
        {
          "label": "O(1) — `len()` on a slice is a constant-time operation in Go",
          "correct": true
        },
        {
          "label": "O(V) — the adjacency list must be scanned to count neighbors"
        },
        {
          "label": "O(E) — all edges must be checked"
        },
        {
          "label": "O(V+E) — the full graph is traversed"
        }
      ],
      "explain": "Go slices store their length as metadata, so `len(adj[v])` is O(1). No traversal of neighbors is required."
    },
    {
      "id": "edge-case",
      "prompt": "What is the degree of an isolated vertex (one with no edges) using `findDegreeOfVertexUndirected`?",
      "choices": [
        {
          "label": "0 — `adj[v]` is an empty slice, so `len(adj[v])` returns 0",
          "correct": true
        },
        {
          "label": "1 — a self-loop is implied for isolated vertices"
        },
        {
          "label": "It panics because `adj[v]` is nil"
        },
        {
          "label": "-1, indicating the vertex is disconnected"
        }
      ],
      "explain": "An isolated vertex has no neighbors, so its adjacency list is empty (length 0). In Go, `len(nil)` and `len([]int{})` both return 0, so no panic occurs."
    }
  ]
};
