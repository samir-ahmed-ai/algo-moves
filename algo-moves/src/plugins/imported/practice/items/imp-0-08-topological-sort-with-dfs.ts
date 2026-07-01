import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which graph algorithm category best describes this solution?",
      "choices": [
        {
          "label": "DFS post-order topological sort",
          "correct": true
        },
        {
          "label": "BFS Kahn's algorithm (in-degree queue)"
        },
        {
          "label": "Bellman-Ford shortest path"
        },
        {
          "label": "Kosaraju's strongly connected components"
        }
      ],
      "explain": "Each node is appended to stack after all its descendants finish (post-order DFS), then the stack is reversed to yield a valid topological order. Kahn's algorithm uses in-degrees and a queue, which this code does not."
    },
    {
      "id": "post-order-push",
      "prompt": "In `btTopoSort`, a node `v` is appended to `*stack` at which point in the recursion?",
      "choices": [
        {
          "label": "After all of v's unvisited neighbors have been fully explored (post-order)",
          "correct": true
        },
        {
          "label": "Before recursing into any neighbors (pre-order)"
        },
        {
          "label": "When v is first marked visited"
        },
        {
          "label": "Only if v has no outgoing edges"
        }
      ],
      "explain": "`*stack = append(*stack, v)` is the last statement in `btTopoSort`, executing after the neighbor loop completes. This post-order placement ensures every node that v depends on is already in the stack before v."
    },
    {
      "id": "reverse-step",
      "prompt": "After all DFS calls finish, the code reverses `stack` in place. Why is this reversal necessary?",
      "choices": [
        {
          "label": "Post-order pushes dependents before their dependencies; reversing yields the dependency-first order required by topological sort",
          "correct": true
        },
        {
          "label": "It removes duplicate entries that DFS may have added"
        },
        {
          "label": "Reversing converts a DFS traversal into a BFS order"
        },
        {
          "label": "It is needed only for disconnected graphs to reconnect components"
        }
      ],
      "explain": "Because a node is pushed after its subtree, nodes with no outgoing edges appear first in the slice. Reversing puts nodes with no incoming edges at the front, which is the definition of topological order."
    },
    {
      "id": "outer-loop",
      "prompt": "Why does `topologicalSortWithDfs` loop over all nodes `i` from 0 to n-1 and call `btTopoSort` only when `!visited[i]`?",
      "choices": [
        {
          "label": "To handle disconnected graphs where some nodes are unreachable from any single starting node",
          "correct": true
        },
        {
          "label": "To visit nodes in lexicographic order so the result is deterministic"
        },
        {
          "label": "To detect back-edges and identify cycles"
        },
        {
          "label": "To avoid stack overflow by limiting recursion depth"
        }
      ],
      "explain": "A directed graph may have multiple weakly-connected components. Without the outer loop, nodes unreachable from the first entry point would never be visited. The visited guard prevents re-entering nodes already processed by an earlier call."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity for a graph with V nodes and E edges?",
      "choices": [
        {
          "label": "O(V+E)",
          "correct": true
        },
        {
          "label": "O(V·E)"
        },
        {
          "label": "O(V log V)"
        },
        {
          "label": "O(V²)"
        }
      ],
      "explain": "Each node is visited once and each edge is traversed once across all DFS calls, yielding O(V+E). The in-place reversal at the end is O(V) and does not change the overall bound."
    },
    {
      "id": "cycle-behavior",
      "prompt": "What would happen if this code were applied to a graph that contains a directed cycle?",
      "choices": [
        {
          "label": "It would still produce a node ordering, but that ordering would not be a valid topological sort",
          "correct": true
        },
        {
          "label": "It would panic with a stack overflow due to infinite recursion"
        },
        {
          "label": "It would return an empty slice"
        },
        {
          "label": "It would silently skip the cycle nodes and produce a valid sort for the rest"
        }
      ],
      "explain": "The `visited` array prevents infinite recursion — once a node is marked true it is never re-entered. However, cycle nodes still get pushed to stack in some order, so the output looks like a valid ordering but violates topological-sort requirements since a cyclic dependency exists."
    }
  ]
};
