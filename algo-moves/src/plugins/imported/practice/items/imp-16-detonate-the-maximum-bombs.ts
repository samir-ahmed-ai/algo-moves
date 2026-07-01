import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which strategy does `maximumDetonation` use to find the most bombs triggered by one initial detonation?",
      "choices": [
        {
          "label": "Build a directed graph of chain — then DFS from each",
          "correct": true
        },
        {
          "label": "BFS from each bomb — using a min-heap ordered by distance"
        },
        {
          "label": "Union-Find to cluster mutually — bombs and return the largest cluster"
        },
        {
          "label": "Sort bombs by radius — greedily select the one with the most"
        }
      ],
      "explain": "The code pre-builds `adj` (directed: i→j if bomb i's radius reaches j), then runs `btDetonate` (a DFS) from every node, tracking the count of reachable nodes. The outer loop picks the maximum. Union-Find would miss directionality; BFS with a heap would be Dijkstra."
    },
    {
      "id": "edge-condition",
      "prompt": "An edge i→j is added when `dx*dx + dy*dy <= r*r`. Why is the squared distance used instead of `math.Sqrt(dx*dx+dy*dy) <= r`?",
      "choices": [
        {
          "label": "To avoid floating-point precision — squaring keeps all comparisons in",
          "correct": true
        },
        {
          "label": "To make the check asymmetric — so that edges are directed (i→j but"
        },
        {
          "label": "Because `math.Sqrt` is not available — in the `main` package without an"
        },
        {
          "label": "To reduce the time complexity — from O(n²) to O(n log n)"
        }
      ],
      "explain": "Square root introduces floating-point rounding that can produce wrong results near the boundary. Squaring both sides preserves the inequality exactly using only integer arithmetic. The directionality comes from using `bombs[i][2]` (i's radius) not j's."
    },
    {
      "id": "dfs-count",
      "prompt": "In `btDetonate`, `cnt` starts at 1 and adds the return value of each recursive call. What does the final `cnt` represent?",
      "choices": [
        {
          "label": "The total number of bombs — reachable (including the starting",
          "correct": true
        },
        {
          "label": "The depth of the DFS — recursion tree"
        },
        {
          "label": "The number of unique paths — from the starting bomb to any other"
        },
        {
          "label": "The number of edges traversed — during the DFS"
        }
      ],
      "explain": "Each call counts itself (cnt=1) plus all bombs reachable from its neighbors. Because `vis` prevents revisiting, each reachable bomb is counted exactly once. The root call's return is therefore the total reachable count from the starting bomb."
    },
    {
      "id": "visited-reset",
      "prompt": "A fresh `vis` slice is created inside the outer loop for each starting bomb `i`. What would go wrong if a single `vis` were reused across iterations?",
      "choices": [
        {
          "label": "Later starting bombs would skip — nodes already visited from a previous",
          "correct": true
        },
        {
          "label": "The vis slice would grow — unbounded, causing an out-of-memory"
        },
        {
          "label": "The DFS would revisit every edge — increasing time complexity to"
        },
        {
          "label": "Nothing — the vis slice is always reset by btDetonate before each DFS"
        }
      ],
      "explain": "Each DFS must explore the graph fresh from its own starting node. Reusing `vis` without clearing it would mean nodes marked visited by a previous DFS are wrongly skipped, producing incorrect (too-low) counts for subsequent starting bombs."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `maximumDetonation`?",
      "choices": [
        {
          "label": "Time O(n³), Space O(n²) — Building the adjacency list is O(n²)",
          "correct": true
        },
        {
          "label": "Time O(n² log n), Space — O(n)"
        },
        {
          "label": "Time O(n²), Space O(n²) — Building the adjacency list is"
        },
        {
          "label": "Time O(n⁴), Space O(n²) — Building the adjacency list is"
        }
      ],
      "explain": "Building the adjacency list is O(n²) (all pairs). For each of the n starting bombs, DFS can visit up to O(n) nodes and O(n²) edges in the worst case, giving O(n³) total. The adjacency list takes O(n²) space in the worst case."
    },
    {
      "id": "directed-vs-undirected",
      "prompt": "The graph is directed: an edge i→j exists only if bomb i's radius reaches j, not necessarily vice versa. What would happen if the graph were made undirected (edge added in both directions)?",
      "choices": [
        {
          "label": "The answer could be wrong — a bomb j that cannot reach i would",
          "correct": true
        },
        {
          "label": "The answer would always — the same because detonation chains"
        },
        {
          "label": "The DFS would run faster — because each edge is traversed in"
        },
        {
          "label": "The space complexity would drop — to O(n) since the adjacency list"
        }
      ],
      "explain": "If bomb i reaches bomb j but j's smaller radius does not reach i, adding a reverse edge j→i would let i's detonation chain 'use' j's reachability to extend incorrectly. The problem specifies a directed relationship (only the detonating bomb's radius matters), so directionality must be preserved."
    }
  ]
};
