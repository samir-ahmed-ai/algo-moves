import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic pattern does `criticalConnections` use to find bridges?",
      "choices": [
        {
          "label": "Tarjan's DFS with discovery — low-link arrays",
          "correct": true
        },
        {
          "label": "BFS level-order traversal to detect — back edges"
        },
        {
          "label": "Union-Find with edge removal queries — The code initializes disc[] and"
        },
        {
          "label": "Floyd-Warshall all-pairs — The code initializes disc[] and"
        }
      ],
      "explain": "The code initializes `disc[]` and `low[]` arrays and calls `btTarjan` (a DFS) — that is Tarjan's bridge-finding algorithm. BFS cannot naturally compute low-link values because it doesn't produce DFS trees."
    },
    {
      "id": "data-structure",
      "prompt": "How does `btTarjan` propagate low-link values back up the DFS tree?",
      "choices": [
        {
          "label": "After recursing into a child — v, sets `low[u] = min(low[u], low[v])`",
          "correct": true
        },
        {
          "label": "After recursing into a child — v, sets `low[u] = min(low[u],"
        },
        {
          "label": "It stores low-link values — a separate stack and pops them"
        },
        {
          "label": "It does not propagate; — node computes its own low from"
        }
      ],
      "explain": "The code does `if low[v] < low[u] { low[u] = low[v] }` after the recursive call — the child's lowest reachable discovery time is pulled up to the parent. Taking `disc[v]` instead (second choice) would not propagate through multi-hop back edges."
    },
    {
      "id": "bridge-condition",
      "prompt": "Which condition in `btTarjan` identifies the edge (u, v) as a bridge (critical connection)?",
      "choices": [
        {
          "label": "`low[v] > disc[u]` — low[v] > disc[u] means v cannot reach",
          "correct": true
        },
        {
          "label": "`low[v] >= disc[u]` — low[v] > disc[u] means v cannot"
        },
        {
          "label": "`disc[v] > disc[u]` — low[v] > disc[u] means v cannot"
        },
        {
          "label": "`low[u] > disc[v]` — low[v] > disc[u] means v cannot"
        }
      ],
      "explain": "`low[v] > disc[u]` means v cannot reach u or any ancestor of u through back edges — removing (u,v) disconnects the graph. Using `>=` would also flag articulation-point edges that are not bridges (applicable to biconnected components, not bridges)."
    },
    {
      "id": "parent-skip",
      "prompt": "Why does `btTarjan` skip neighbor `v` when `v == parent`?",
      "choices": [
        {
          "label": "To avoid treating the tree — edge back to the parent as a back",
          "correct": true
        },
        {
          "label": "To avoid infinite recursion — the graph is directed"
        },
        {
          "label": "Because the parent — so `disc[parent] !="
        },
        {
          "label": "To ensure the timer increments — only once per edge"
        }
      ],
      "explain": "The graph is undirected, so every tree edge appears in both directions. Without the `v == parent` skip, the code would use `disc[parent]` to lower `low[u]`, masking real bridges. Note that `disc[parent] != -1` alone is not sufficient — it would still update `low[u]`."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `criticalConnections`?",
      "choices": [
        {
          "label": "Time O(V+E), Space O(V+E) — Each vertex and edge is visited",
          "correct": true
        },
        {
          "label": "Time O(V·E), Space O(V) — Each vertex and edge is visited"
        },
        {
          "label": "Time O(E log V), Space — O(V)"
        },
        {
          "label": "Time O(V²), Space O(V²) — Each vertex and edge is visited"
        }
      ],
      "explain": "Each vertex and edge is visited exactly once in the DFS; `disc` and `low` arrays are O(V) and the adjacency list is O(V+E), giving O(V+E) time and space overall."
    },
    {
      "id": "edge-case",
      "prompt": "What happens if the graph is disconnected (some nodes unreachable from node 0)?",
      "choices": [
        {
          "label": "Those nodes are never visited; — their bridges are silently missed",
          "correct": true
        },
        {
          "label": "The code iterates over all nodes — so"
        },
        {
          "label": "The code returns an empty — slice because connectivity is a"
        },
        {
          "label": "The code panics because `disc[v] — == -1` is never set for unreachable"
        }
      ],
      "explain": "The outer function calls `btTarjan(adj, 0, -1, ...)` starting only from node 0 — there is no outer loop over all unvisited nodes. Unreachable components are never visited, so their bridges are not reported. A correct general-graph implementation would loop over all nodes and start DFS wherever `disc[i] == -1`."
    }
  ]
};
