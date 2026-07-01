import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Graph Traversal implements two traversal strategies. Which pair does the code provide?",
      "choices": [
        {
          "label": "Recursive DFS and iterative BFS",
          "correct": true
        },
        {
          "label": "Iterative DFS and iterative BFS"
        },
        {
          "label": "Recursive DFS and recursive BFS"
        },
        {
          "label": "BFS and Dijkstra's shortest path"
        }
      ],
      "explain": "`btGraphDfs` calls itself recursively for DFS, while `graphTraversalBFS` drains an explicit slice-queue iteratively. There is no recursive BFS in this code."
    },
    {
      "id": "visited-timing-bfs",
      "prompt": "In `graphTraversalBFS`, when is a node marked visited?",
      "choices": [
        {
          "label": "When it is enqueued (before being processed)",
          "correct": true
        },
        {
          "label": "When it is dequeued (as it is being processed)"
        },
        {
          "label": "After all its neighbors have been enqueued"
        },
        {
          "label": "It is not marked; the queue alone prevents duplicates"
        }
      ],
      "explain": "`visited[nb] = true` is set alongside `q = append(q, nb)`. Marking at enqueue prevents the same node from being added to the queue more than once, which would cause duplicate visits."
    },
    {
      "id": "visited-timing-dfs",
      "prompt": "In `btGraphDfs`, where does visited marking happen relative to the recursive calls?",
      "choices": [
        {
          "label": "Before recursing into neighbors (`visited[n] = true` then the neighbor loop)",
          "correct": true
        },
        {
          "label": "After returning from all recursive calls"
        },
        {
          "label": "Inside the neighbor loop, just before each recursive call"
        },
        {
          "label": "At the end of the function, after appending to order"
        }
      ],
      "explain": "`visited[n] = true` and `*order = append(*order, n.Label)` both happen before the neighbor loop. This ensures a node is marked (and recorded) immediately on first visit so cycles don't cause infinite recursion."
    },
    {
      "id": "nil-guard",
      "prompt": "Which traversal has an explicit `nil` guard for the source node, and which does not?",
      "choices": [
        {
          "label": "BFS guards `if src == nil { return nil }`; DFS checks `if n == nil || visited[n]`",
          "correct": true
        },
        {
          "label": "DFS guards `if n == nil { return }`; BFS has no nil check"
        },
        {
          "label": "Both guard against nil with a top-level check before doing anything"
        },
        {
          "label": "Neither checks for nil; a nil input would panic"
        }
      ],
      "explain": "`graphTraversalBFS` has `if src == nil { return nil }` at the top. `btGraphDfs` checks `if n == nil || visited[n]` which doubles as both the nil guard and the cycle-break condition."
    },
    {
      "id": "dfs-order-storage",
      "prompt": "How does the recursive DFS accumulate the visitation order across calls?",
      "choices": [
        {
          "label": "Through an `*order *[]int` pointer parameter that each call appends to",
          "correct": true
        },
        {
          "label": "Each call returns a slice that the caller concatenates"
        },
        {
          "label": "A package-level global slice is appended to"
        },
        {
          "label": "The order is stored as a field on each GraphNode"
        }
      ],
      "explain": "`btGraphDfs(n *GraphNode, visited map[*GraphNode]bool, order *[]int)` takes a pointer to the order slice and does `*order = append(*order, n.Label)`, so every recursive call mutates the same shared slice rather than returning and merging results."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of each traversal?",
      "choices": [
        {
          "label": "Both O(V+E) time and O(V) space",
          "correct": true
        },
        {
          "label": "DFS O(V) time, BFS O(V+E) time; both O(V) space"
        },
        {
          "label": "Both O(V+E) time and O(V+E) space"
        },
        {
          "label": "Both O(V²) time due to the visited map lookup"
        }
      ],
      "explain": "Both DFS and BFS visit every vertex and edge exactly once: O(V+E) time. The visited map, queue/stack, and output slice each hold at most V entries: O(V) auxiliary space."
    }
  ]
};
