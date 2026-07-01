import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `numberOfGoodPaths` use to count paths where both endpoints share the same maximum value?",
      "choices": [
        {
          "label": "Sort nodes by value — ascending order and use Union-Find to",
          "correct": true
        },
        {
          "label": "BFS from every node, counting — neighbours with equal values"
        },
        {
          "label": "DFS post-order enumeration — root-to-leaf paths"
        },
        {
          "label": "Dynamic programming on the tree — structure using parent arrays"
        }
      ],
      "explain": "The code sorts node ids by `vals`, processes them in ascending order, and merges edges only when the neighbour's value is ≤ the current value. After processing each value group it counts same-root nodes, applying the combination formula. BFS and DP are not used."
    },
    {
      "id": "union-condition",
      "prompt": "Inside the merge phase, the code unions u and v only when `vals[v] <= vals[u]`. Why this condition?",
      "choices": [
        {
          "label": "It ensures we only merge — along edges where the neighbour has",
          "correct": true
        },
        {
          "label": "It avoids creating cycles — preventing merges across same-value"
        },
        {
          "label": "It implements union-by-rank roots — higher-value roots"
        },
        {
          "label": "It filters out edges — are not part of the tree's critical"
        }
      ],
      "explain": "Nodes are processed in ascending value order. When handling value group v*, we only want edges connecting to nodes with values ≤ v* (already processed). Merging with a higher-value node would prematurely join future groups, inflating counts."
    },
    {
      "id": "counting-formula",
      "prompt": "After merging the current value group, the code computes `res += c * (c - 1) / 2` for each component. What does this count?",
      "choices": [
        {
          "label": "The number of unordered pairs — of nodes in the same component that",
          "correct": true
        },
        {
          "label": "The total number of edges — within the component after merging"
        },
        {
          "label": "The number of nodes — the component times their common value"
        },
        {
          "label": "The binomial coefficient for 2 — components to merge next"
        }
      ],
      "explain": "If `c` nodes with value v* all share the same Union-Find root, any pair among them forms a valid good path (the path between them on the tree has v* as its maximum, since all intermediate nodes have values ≤ v*). C(c, 2) = c*(c-1)/2 counts such pairs."
    },
    {
      "id": "initial-res",
      "prompt": "The result `res` is initialised to `n` (not 0) before the main loop. Why?",
      "choices": [
        {
          "label": "Each single node — trivial good path from itself to",
          "correct": true
        },
        {
          "label": "n accounts for the n-1 — tree edges plus one extra for the root"
        },
        {
          "label": "The Union-Find initialisation — components each counted as one path"
        },
        {
          "label": "It is an off-by-one correction — for the combination formula c*(c-1)/2"
        }
      ],
      "explain": "The problem counts paths where start == end as valid (a single-node path). There are n such trivial paths. The combination formula c*(c-1)/2 only counts pairs (c ≥ 2), so the n single-node paths must be seeded into `res` before the loop."
    },
    {
      "id": "union-by-value",
      "prompt": "In `goodPathsUnion`, when `vals[rx] < vals[ry]`, the code sets `parent[rx] = ry`. How does this differ from standard union-by-size?",
      "choices": [
        {
          "label": "The root of the component — with the higher value is chosen as",
          "correct": true
        },
        {
          "label": "It is identical to union-by-size — because higher-value components are"
        },
        {
          "label": "It attaches the root — the lower value under the"
        },
        {
          "label": "It is a path-compression step — disguised as a union operation"
        }
      ],
      "explain": "Standard union-by-size/rank picks the root of the larger/deeper tree. Here the root is chosen based on node value: the higher-value root dominates. This is necessary so that when counting same-value nodes per component, `goodPathsFind` returns a root with the correct (highest) value in the component."
    },
    {
      "id": "complexity",
      "prompt": "What drives the O(n log n) time complexity of `numberOfGoodPaths`?",
      "choices": [
        {
          "label": "Sorting the n node ids — by value; the Union-Find operations",
          "correct": true
        },
        {
          "label": "The nested loops over value — groups and adjacency list edges,"
        },
        {
          "label": "Path compression in `goodPathsFind` — requires O(log n) per call"
        },
        {
          "label": "Building the adjacency list — n-1 edges costs O(n log n)"
        }
      ],
      "explain": "The sort is O(n log n). Each of the n nodes is processed once, and each of the n-1 edges is unioned at most once; with path compression and value-based union the total Union-Find work is nearly O(n). Hence the sort dominates."
    }
  ]
};
