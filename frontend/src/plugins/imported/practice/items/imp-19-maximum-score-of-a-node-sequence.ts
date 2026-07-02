import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does `maximumScore` use to find the highest-scoring 4-node sequence?",
      "choices": [
        {
          "label": "Greedy enumeration over edges — per-node top-3 neighbor lists",
          "correct": true
        },
        {
          "label": "BFS shortest path across — weighted graph"
        },
        {
          "label": "Dynamic programming over node — The code builds a top-3 neighbor"
        },
        {
          "label": "Union-Find to merge high-score — The code builds a top-3 neighbor"
        }
      ],
      "explain": "The code builds a top-3 neighbor list for each node, then greedily tries every edge (u,v) as the middle pair, extending with the best-scoring distinct neighbor from each side. No BFS or DP is involved."
    },
    {
      "id": "data-structure",
      "prompt": "What does `top3` store for each node, and how is it maintained by `insertTop3`?",
      "choices": [
        {
          "label": "A sorted slice of up — to 3 neighbor indices, ordered by",
          "correct": true
        },
        {
          "label": "A max-heap of all neighbors — ordered by score"
        },
        {
          "label": "A hash set — 3 neighbors with the lowest scores"
        },
        {
          "label": "A linked list — neighbors in insertion order"
        }
      ],
      "explain": "`insertTop3` appends the new node, bubble-sorts it upward by score, then truncates to length 3 — producing a small sorted slice, not a heap or hash set."
    },
    {
      "id": "key-mechanic",
      "prompt": "Inside the nested loop over `top3[u]` and `top3[v]`, what do the `continue` conditions guard against?",
      "choices": [
        {
          "label": "Sequences where a node appears — more than once (a==v, b==u, b==a)",
          "correct": true
        },
        {
          "label": "Sequences with a total score — below zero"
        },
        {
          "label": "Revisiting edges — processed"
        },
        {
          "label": "Overflow when summing four int32 — scores"
        }
      ],
      "explain": "A valid 4-node path requires all distinct nodes. The checks `a==v`, `b==u`, and `b==a` skip any candidate that would duplicate one of the four positions in the sequence."
    },
    {
      "id": "why-top3",
      "prompt": "Why is it sufficient to keep only the top-3 neighbors per node instead of all neighbors?",
      "choices": [
        {
          "label": "At most one — Only the middle edge endpoint (v) can",
          "correct": true
        },
        {
          "label": "The graph is guaranteed — have at most 3 edges per node"
        },
        {
          "label": "Keeping more neighbors would exceed — the O(E) time bound"
        },
        {
          "label": "Scores are bounded — the 4th neighbor can never beat the"
        }
      ],
      "explain": "Only the middle edge endpoint (v) can disqualify one of u's top-3 neighbors, so among three candidates at least two remain valid. Thus the global optimum is always reachable without checking beyond the top 3."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `maximumScore`, and why?",
      "choices": [
        {
          "label": "O(E) each edge is visited — once; the inner neighbor loops are",
          "correct": true
        },
        {
          "label": "O(V·E) — DFS is run from every vertex"
        },
        {
          "label": "O(E log V) — a priority queue is used per node"
        },
        {
          "label": "O(V²) — all pairs of nodes are compared"
        }
      ],
      "explain": "Building `top3` is O(E) (each edge updates two lists of constant size). The main loop iterates over E edges with at most 9 inner iterations, giving O(E) total."
    },
    {
      "id": "edge-case",
      "prompt": "What does the function return when no valid 4-node sequence exists (e.g., the graph has fewer than 4 nodes)?",
      "choices": [
        {
          "label": "-1, because `res` is initialized — to -1 and never updated",
          "correct": true
        },
        {
          "label": "0 — the zero value for int"
        },
        {
          "label": "It panics with an index-out-of-range — error"
        },
        {
          "label": "It returns the score — the single highest-scoring edge"
        }
      ],
      "explain": "`res` starts at -1. If no four-distinct-node combination is found the inner loops simply never execute an update, so -1 is returned as specified by the problem."
    }
  ]
};
