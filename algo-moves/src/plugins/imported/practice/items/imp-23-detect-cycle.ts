import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithm family do both `detectCycleUndirected` and `detectCycleDirected` belong to?",
      "choices": [
        {
          "label": "DFS-based cycle detection — Both use recursive DFS helpers",
          "correct": true
        },
        {
          "label": "BFS-based cycle detection — Both use recursive DFS helpers"
        },
        {
          "label": "Union-Find cycle detection — Both use recursive DFS helpers"
        },
        {
          "label": "Topological sort (Kahn's) cycle — Both use recursive DFS helpers"
        }
      ],
      "explain": "Both use recursive DFS helpers (`btDetectCycleUndirectedDfs`, `btDetectCycleDirectedDfs`). BFS-based and Union-Find approaches are alternative techniques not used here."
    },
    {
      "id": "undirected-condition",
      "prompt": "In `btDetectCycleUndirectedDfs`, what condition signals a cycle?",
      "choices": [
        {
          "label": "A neighbor is already visited — AND it is not the parent of the",
          "correct": true
        },
        {
          "label": "A neighbor is already visited — regardless of whether it's the parent"
        },
        {
          "label": "The current node — than two neighbors"
        },
        {
          "label": "A neighbor — state as the current node"
        }
      ],
      "explain": "In an undirected graph, revisiting the node we came from (the parent) is expected and not a cycle. A cycle only exists if we reach a visited node that is NOT our parent — checked by `nb != parent`."
    },
    {
      "id": "directed-state",
      "prompt": "In `btDetectCycleDirectedDfs`, what do the state values 0, 1, and 2 represent?",
      "choices": [
        {
          "label": "0 = unvisited, 1 = — currently in the DFS call stack, 2 =",
          "correct": true
        },
        {
          "label": "0 = unvisited, 1 = — visited, 2 = has a cycle"
        },
        {
          "label": "0 = source node, 1 — = intermediate, 2 = sink node"
        },
        {
          "label": "0 = white, 1 = — black, 2 = gray (three-color DFS)"
        }
      ],
      "explain": "State 1 means the node is on the current DFS path (open). Finding a state-1 neighbor means we've found a back edge — a cycle. State 2 means fully explored with no cycle from that node."
    },
    {
      "id": "why-parent-param",
      "prompt": "Why does `btDetectCycleUndirectedDfs` need a `parent` parameter, but `btDetectCycleDirectedDfs` does not?",
      "choices": [
        {
          "label": "Undirected edges appear — directions in the adjacency list;",
          "correct": true
        },
        {
          "label": "Directed graphs cannot — In an undirected adjacency list,"
        },
        {
          "label": "The directed version uses — state array that implicitly tracks"
        },
        {
          "label": "The parent parameter — needed to print the cycle path"
        }
      ],
      "explain": "In an undirected adjacency list, edge (u,v) appears in both `adj[u]` and `adj[v]`. Without ignoring the parent, DFS from u would immediately see v as 'visited' and falsely report a cycle."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of both cycle detection functions?",
      "choices": [
        {
          "label": "Time O(V+E) — Space O(V) each node and edge is",
          "correct": true
        },
        {
          "label": "Time O(V²), Space O(V) — every pair of nodes is compared"
        },
        {
          "label": "Time O(E log V), Space O(E) — a heap is used internally"
        },
        {
          "label": "Time O(V+E), Space O(E) — edge states must be stored"
        }
      ],
      "explain": "DFS visits every node and edge once, giving O(V+E) time. The auxiliary space is the `visited`/`state` array of size V plus the recursion stack, which is O(V) in the worst case."
    },
    {
      "id": "disconnected-graph",
      "prompt": "How do `detectCycleUndirected` and `detectCycleDirected` handle disconnected graphs?",
      "choices": [
        {
          "label": "They iterate over all nodes — and start a DFS from each unvisited",
          "correct": true
        },
        {
          "label": "They only check the component — containing node 0"
        },
        {
          "label": "They return true immediately — the graph is disconnected"
        },
        {
          "label": "They require a connected graph; — disconnected input causes incorrect"
        }
      ],
      "explain": "Both outer functions loop `for i := range adj` and skip nodes already visited (or with state != 0). This ensures every connected component is explored independently."
    }
  ]
};
