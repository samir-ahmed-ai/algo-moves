import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does Find Shortest Path with BFS implement?",
      "choices": [
        {
          "label": "BFS shortest path — unweighted graph with path",
          "correct": true
        },
        {
          "label": "Dijkstra's algorithm for weighted — The code uses a plain BFS"
        },
        {
          "label": "DFS backtracking to collect — paths"
        },
        {
          "label": "Bidirectional BFS for faster — The code uses a plain BFS"
        }
      ],
      "explain": "The code uses a plain BFS (queue, dist array initialized to -1) on an unweighted adjacency list and reconstructs the unique shortest path using a `pred` (predecessor) array. Dijkstra would need a priority queue and is unnecessary without edge weights."
    },
    {
      "id": "pred-array",
      "prompt": "What is the purpose of the `pred` array in this solution?",
      "choices": [
        {
          "label": "It records each node's parent — in the BFS tree so the path can be",
          "correct": true
        },
        {
          "label": "It stores the BFS discovery — order for all nodes"
        },
        {
          "label": "It marks nodes as visited — to prevent re-enqueueing"
        },
        {
          "label": "It holds the distance — src to each node"
        }
      ],
      "explain": "`pred[nb] = v` stores the BFS parent of each discovered node. After BFS, the loop `for at := dest; at != -1; at = pred[at]` walks backwards through these parent links to rebuild the path."
    },
    {
      "id": "early-exit",
      "prompt": "When does the BFS loop break early?",
      "choices": [
        {
          "label": "When the dequeued vertex v — equals dest",
          "correct": true
        },
        {
          "label": "When dist[dest] is no longer — -1"
        },
        {
          "label": "When the queue becomes empty — if v == dest { break } exits as"
        },
        {
          "label": "When all neighbors of dest — are enqueued"
        }
      ],
      "explain": "`if v == dest { break }` exits as soon as the destination is dequeued, which in BFS is the moment the shortest path length is confirmed. This is an optional optimization — the path is already correct at that point."
    },
    {
      "id": "path-reconstruction",
      "prompt": "How does the path reconstruction loop build the result in correct order?",
      "choices": [
        {
          "label": "It prepends each node (`path — = append([]int{at}, path)`) while",
          "correct": true
        },
        {
          "label": "It appends each node — then reverses the slice"
        },
        {
          "label": "It appends each node — walking pred from src to dest"
        },
        {
          "label": "It uses a stack — reverse the predecessor chain"
        }
      ],
      "explain": "Prepending with `append([]int{at}, path...)` inserts at the front, so walking dest→src via `pred` naturally builds the path in src→dest order without an explicit reverse step."
    },
    {
      "id": "no-path",
      "prompt": "What does the function return when dest is unreachable from src?",
      "choices": [
        {
          "label": "nil — if dist[dest] == -1 { return nil } —",
          "correct": true
        },
        {
          "label": "An empty slice []int{} — if dist[dest] == -1 { return nil"
        },
        {
          "label": "[]int{src} — if dist[dest] == -1 { return nil"
        },
        {
          "label": "[]int{-1} — if dist[dest] == -1 { return nil"
        }
      ],
      "explain": "`if dist[dest] == -1 { return nil }` — since dist is initialized to -1 and only updated when a node is reached, a remaining -1 at dest means no path exists, and nil is returned."
    },
    {
      "id": "complexity",
      "prompt": "What is the space complexity of this solution?",
      "choices": [
        {
          "label": "O(V) — dist, pred, and the queue each hold at most V entries",
          "correct": true
        },
        {
          "label": "O(V+E) — the adjacency list is also counted"
        },
        {
          "label": "O(E) — only edges need tracking"
        },
        {
          "label": "O(V²) — for dense graphs the dist array is 2D"
        }
      ],
      "explain": "The code allocates `dist`, `pred` (both length n), the queue (at most n entries), and the output path (at most n entries) — all O(V). The adjacency list is given as input and not allocated here."
    }
  ]
};
