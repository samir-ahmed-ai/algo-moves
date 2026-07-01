import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithmic approach does `maximalNetworkRank` use?",
      "choices": [
        {
          "label": "Precompute degree of each city — and an edge set, then check all pairs",
          "correct": true
        },
        {
          "label": "BFS/DFS to find the two — most-connected nodes"
        },
        {
          "label": "Sorting nodes by degree — then picking the top two"
        },
        {
          "label": "Union-Find to identify the two — largest components"
        }
      ],
      "explain": "The code fills `deg` and `edges` in one pass over `roads`, then iterates every pair (i, j) with i < j to compute `deg[i] + deg[j] - shared_edge`. No graph traversal or sorting is needed."
    },
    {
      "id": "shared-edge-deduction",
      "prompt": "When computing the rank of pair (i, j), the code does `rank--` if `edges[[2]int{i, j}]` is true. Why is 1 subtracted?",
      "choices": [
        {
          "label": "The direct road between i — and j is counted in both deg[i] and",
          "correct": true
        },
        {
          "label": "Direct roads are penalised — discourage selecting adjacent cities"
        },
        {
          "label": "The subtraction converts the rank — from a sum to a difference"
        },
        {
          "label": "It accounts for the road — being bidirectional (counted twice in"
        }
      ],
      "explain": "Network rank = total distinct roads connected to either i or j. The shared road is included in both `deg[i]` and `deg[j]`, so the naive sum counts it twice. Subtracting 1 gives the correct count of distinct roads."
    },
    {
      "id": "edge-normalisation",
      "prompt": "Before inserting into the `edges` map, the code swaps u and v if `u > v`. What is the purpose of this normalisation?",
      "choices": [
        {
          "label": "Ensures undirected edges — The pair-checking loop always queries",
          "correct": true
        },
        {
          "label": "Sorts the edge list — enable binary search during the"
        },
        {
          "label": "Prevents the map from storing — duplicate entries for (u, v) and (v,"
        },
        {
          "label": "Both A and C — canonical key and deduplication"
        }
      ],
      "explain": "The pair-checking loop always queries with `i < j`, so the key `[2]int{i, j}` has the smaller index first. Normalising insertions to (min, max) guarantees the key matches. Without it, an edge stored as (5, 2) would not be found by a lookup for (2, 5)."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `maximalNetworkRank`?",
      "choices": [
        {
          "label": "Time O(n² + E), Space — O(n + E)",
          "correct": true
        },
        {
          "label": "Time O(n² · E), Space — O(E)"
        },
        {
          "label": "Time O(n log n + — E), Space O(n)"
        },
        {
          "label": "Time O(n²), Space O(1) — Building deg and edges is O(E)"
        }
      ],
      "explain": "Building `deg` and `edges` is O(E). The nested pair loop is O(n²). Space is O(n) for the degree array plus O(E) for the edge set. The problem states the known complexity as O(n²) for time and O(n+E) for space, matching this breakdown."
    },
    {
      "id": "loop-bounds",
      "prompt": "The inner loop starts at `j := i + 1` rather than `j := 0`. Why?",
      "choices": [
        {
          "label": "Each unordered pair (i, j) — should be evaluated exactly once; i <",
          "correct": true
        },
        {
          "label": "Starting at i+1 skips self-loops — which would cause a divide-by-zero"
        },
        {
          "label": "The edge set only contains — edges with u < v, so querying with j"
        },
        {
          "label": "The outer loop already handles — the i == j case separately"
        }
      ],
      "explain": "Network rank is defined for a pair of distinct cities, and rank(i,j) == rank(j,i), so each pair needs one evaluation. Using i < j halves the work and avoids self-pairs. The edge-lookup correctness (point C) is a side benefit but not the primary reason for i+1."
    },
    {
      "id": "edge-case-no-roads",
      "prompt": "If `roads` is empty, what does `maximalNetworkRank` return?",
      "choices": [
        {
          "label": "0 every city has degree — 0 and no direct edges, so every pair",
          "correct": true
        },
        {
          "label": "-1 — indicating no valid pair can be formed"
        },
        {
          "label": "n — because every node is trivially its own connected component"
        },
        {
          "label": "A runtime panic because — edges map is never initialised"
        }
      ],
      "explain": "With no roads, `deg` is all zeros and `edges` is empty. The pair loop computes `0 + 0 - 0 = 0` for every pair and `res` stays 0. The map is initialised at declaration (`edges := map[[2]int]bool{}`), so no panic occurs."
    }
  ]
};
