import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which algorithm does `floydWarshall` implement, and what problem class does it solve?",
      "choices": [
        {
          "label": "Floyd-Warshall — all-pairs shortest paths in a weighted directed graph",
          "correct": true
        },
        {
          "label": "Dijkstra — single-source shortest paths from every node"
        },
        {
          "label": "Bellman-Ford single-source shortest — negative-weight detection"
        },
        {
          "label": "BFS — unweighted shortest paths between all pairs"
        }
      ],
      "explain": "The triple-nested loop over k, i, j with the relaxation `dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j])` is the defining structure of Floyd-Warshall. It computes shortest paths between every pair of nodes in a single pass."
    },
    {
      "id": "recurrence",
      "prompt": "What is the relaxation step inside the three nested loops?",
      "choices": [
        {
          "label": "`dist[i][j] = dist[i][k] + — when that sum is smaller than the",
          "correct": true
        },
        {
          "label": "`dist[i][j] = dist[i][k] + — unconditionally"
        },
        {
          "label": "`dist[k][j] = dist[k][i] + — when that sum is smaller"
        },
        {
          "label": "`dist[i][j] = min(dist[i][k] — of the two partial"
        }
      ],
      "explain": "The code checks `if dist[i][k]+dist[k][j] < dist[i][j]` and updates — relaxing the path from i to j through intermediate node k. Updating unconditionally would overwrite a known shorter distance whenever no path through k exists, since `dist[i][k]+dist[k][j]` would be an INF-based sum far larger than the real edge."
    },
    {
      "id": "initialization",
      "prompt": "Why is `dist[i][i]` set to 0 while all other entries start at `INF`?",
      "choices": [
        {
          "label": "The distance from any node — to itself is 0; INF represents 'no",
          "correct": true
        },
        {
          "label": "Setting the diagonal to 0 — prevents the algorithm from using"
        },
        {
          "label": "It is required — outer k loop can terminate early when"
        },
        {
          "label": "It initializes the BFS source — queue implicitly"
        }
      ],
      "explain": "Floyd-Warshall builds up shortest paths by considering intermediate nodes one by one. Starting with `dist[i][i]=0` and `dist[i][j]=INF` (no direct edge) correctly represents the initial knowledge before relaxation runs."
    },
    {
      "id": "loop-order",
      "prompt": "Why must the intermediate-node loop (over k) be the outermost loop?",
      "choices": [
        {
          "label": "To ensure that when we — relax through k, `dist[i][k]` and",
          "correct": true
        },
        {
          "label": "Because the i and j — loops are O(n) each and k must"
        },
        {
          "label": "The order doesn't matter — three loops are symmetric and can be"
        },
        {
          "label": "So that the diagonal entries — `dist[k][k]` are processed last"
        }
      ],
      "explain": "Floyd-Warshall's correctness relies on a DP invariant: after iteration k, `dist[i][j]` is the shortest path using only nodes 1..k as intermediates. Swapping the loop order breaks this invariant — you'd relax through k before knowing the best paths into or out of k."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of this Floyd-Warshall implementation?",
      "choices": [
        {
          "label": "Time O(n³), Space O(n²) — Three nested loops each of size n",
          "correct": true
        },
        {
          "label": "Time O(n² log n), Space — O(n²)"
        },
        {
          "label": "Time O(n³), Space O(n) — Three nested loops each of size"
        },
        {
          "label": "Time O(n² + E), Space — O(n²)"
        }
      ],
      "explain": "Three nested loops each of size n give O(n³) time. The `dist` matrix is (n+1)×(n+1), so space is O(n²). Space cannot be O(n) because the algorithm requires storing every pairwise distance simultaneously."
    },
    {
      "id": "query-sentinel",
      "prompt": "In the `query` helper, why does it return -1 when `dist[u][v] >= INF`?",
      "choices": [
        {
          "label": "To signal that no path — exists between u and v `dist[u][v]`",
          "correct": true
        },
        {
          "label": "To handle integer overflow — `dist[u][v]` exceeds the maximum int"
        },
        {
          "label": "Because -1 is the sentinel — for invalid node indices, consistent"
        },
        {
          "label": "To distinguish unreachable pairs — pairs with zero-weight paths"
        }
      ],
      "explain": "`INF = 1 << 30` is used as a sentinel meaning 'no path'. If the Floyd-Warshall relaxation never found a path, `dist[u][v]` stays at INF and the query returns -1 to communicate 'unreachable'. The separate bounds check in `floydWarshall` also returns -1 for out-of-range nodes."
    }
  ]
};
