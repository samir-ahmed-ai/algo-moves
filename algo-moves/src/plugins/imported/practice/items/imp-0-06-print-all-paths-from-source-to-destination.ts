import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does Print All Paths from Source to Destination use?",
      "choices": [
        {
          "label": "DFS with explicit backtracking to enumerate all paths",
          "correct": true
        },
        {
          "label": "BFS level-by-level expansion to collect all paths"
        },
        {
          "label": "Dynamic programming to count reachable paths"
        },
        {
          "label": "Memoized DFS that caches partial path results"
        }
      ],
      "explain": "The code recurses (DFS) into each unvisited neighbor, appends the neighbor to `path`, recurses deeper, then removes it and resets `visited[nb] = false` — the classic backtracking pattern for enumerating all paths."
    },
    {
      "id": "snapshot",
      "prompt": "When the DFS reaches `dest`, how is the current path saved into results?",
      "choices": [
        {
          "label": "A copy is made with `append([]int(nil), *path...)` before appending to res",
          "correct": true
        },
        {
          "label": "The path slice is appended directly, without copying"
        },
        {
          "label": "The path is reversed and then appended to res"
        },
        {
          "label": "Each node label is stored individually in res"
        }
      ],
      "explain": "`cp := append([]int(nil), *path...)` creates a new independent slice. Appending `*path` directly would store a reference to the same backing array, which backtracking would later mutate, corrupting the saved result."
    },
    {
      "id": "backtrack-step",
      "prompt": "What two operations undo a step after the recursive call returns?",
      "choices": [
        {
          "label": "`*path = (*path)[:len(*path)-1]` and `visited[nb] = false`",
          "correct": true
        },
        {
          "label": "`*path = (*path)[:len(*path)-1]` only; visited is never reset"
        },
        {
          "label": "`visited[nb] = false` only; the path slice is rebuilt from scratch"
        },
        {
          "label": "`*path = nil` and `visited[nb] = false`"
        }
      ],
      "explain": "Both rollbacks are necessary: truncating the path removes the last node, and resetting `visited[nb] = false` allows `nb` to appear on future paths through different routes."
    },
    {
      "id": "why-visited",
      "prompt": "Within a single DFS path, what does resetting `visited[nb] = false` on backtrack accomplish?",
      "choices": [
        {
          "label": "It lets `nb` be reused on a different path while still blocking it from appearing twice on the path currently being built",
          "correct": true
        },
        {
          "label": "It permanently marks `nb` as fully explored so no later path can include it"
        },
        {
          "label": "It clears the path slice so the next path starts empty"
        },
        {
          "label": "It is only needed when the graph is a tree, not a general graph"
        }
      ],
      "explain": "While a path is being built, `visited[nb] = true` stops the DFS from revisiting `nb` and looping within that path. Resetting it to false on backtrack frees `nb` for other root-to-dest paths, so the per-path block is local, not global — exactly what enumerating all distinct simple paths requires."
    },
    {
      "id": "initial-state",
      "prompt": "How is `path` initialized before calling `btPrintPaths`?",
      "choices": [
        {
          "label": "`path := []int{src}` — src is included before the first recursive call",
          "correct": true
        },
        {
          "label": "`path := []int{}` — src is appended inside `btPrintPaths` on entry"
        },
        {
          "label": "`path := make([]int, n)` — pre-allocated to avoid reallocation"
        },
        {
          "label": "`path := nil` — the first node is added when dest is reached"
        }
      ],
      "explain": "`path := []int{src}` pre-seeds the path with the source so every snapshot already starts with `src`. Inside `btPrintPaths`, only neighbors (not the starting node itself) are appended."
    },
    {
      "id": "complexity",
      "prompt": "What is the space complexity of `printAllPathsFromSourceToDestin` (excluding the output)?",
      "choices": [
        {
          "label": "O(V) — the path, visited slice, and call stack are all bounded by V",
          "correct": true
        },
        {
          "label": "O(V+E) — the adjacency list size dominates"
        },
        {
          "label": "O(V²) — paths can be up to V long and there can be V of them"
        },
        {
          "label": "O(2^V) — exponential paths must all be stored simultaneously"
        }
      ],
      "explain": "At any point only one path (length ≤ V) is live on the call stack, the `visited` slice is O(V), and the `path` slice is O(V). Output paths collectively can be exponential but that belongs to the output, not auxiliary space."
    }
  ]
};
