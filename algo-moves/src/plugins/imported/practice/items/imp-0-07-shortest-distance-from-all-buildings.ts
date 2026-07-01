import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "How does this solution classify as a graph problem?",
      "choices": [
        {
          "label": "Multi-source BFS from each building accumulating distances to empty cells",
          "correct": true
        },
        {
          "label": "Single-source Dijkstra from the optimal empty cell outward"
        },
        {
          "label": "DFS flood-fill that marks reachable cells per building"
        },
        {
          "label": "Union-Find connecting buildings through empty cells"
        }
      ],
      "explain": "The code runs a separate BFS for each cell where grid[r][c]==1 (a building), spreading outward and summing distances into totalDist. Dijkstra is unnecessary here because all edge weights are 1; DFS and Union-Find are never used."
    },
    {
      "id": "reach-array",
      "prompt": "What is the purpose of the `reach[r][c]` array, and what condition must it satisfy before a cell is considered a candidate answer?",
      "choices": [
        {
          "label": "It counts how many buildings can reach cell (r,c); the cell must equal the total building count",
          "correct": true
        },
        {
          "label": "It stores the minimum distance seen so far; the cell must be less than the current best"
        },
        {
          "label": "It tracks whether the cell was visited in the current BFS pass; it must be false"
        },
        {
          "label": "It records the number of obstacles adjacent to the cell; it must be zero"
        }
      ],
      "explain": "reach[nr][nc]++ is incremented every time a BFS from any building reaches that empty cell. The final scan accepts only cells where reach[r][c]==buildings, guaranteeing every building can reach it. Otherwise an unreachable cell might incorrectly appear optimal."
    },
    {
      "id": "visited-per-bfs",
      "prompt": "Why does the code allocate a fresh `vis` boolean grid for every building rather than reusing a single visited array across all BFS runs?",
      "choices": [
        {
          "label": "Each BFS must independently reach every empty cell to accumulate the correct per-building distance",
          "correct": true
        },
        {
          "label": "Reusing vis would cause totalDist to overflow integer bounds"
        },
        {
          "label": "A shared vis array cannot be reset between BFS runs in Go"
        },
        {
          "label": "It avoids revisiting buildings, which have grid value 1"
        }
      ],
      "explain": "If vis were shared, cells visited during the first building's BFS would be skipped by later buildings, so totalDist would miss contributions and reach counts would be wrong. A fresh vis per building ensures each BFS travels the full grid independently."
    },
    {
      "id": "dist-increment",
      "prompt": "The variable `dist` starts at 0 and is incremented to 1 before processing the first layer of neighbors. What does `dist` represent at the moment it is added to `totalDist[nr][nc]`?",
      "choices": [
        {
          "label": "The BFS step count from the source building to cell (nr,nc)",
          "correct": true
        },
        {
          "label": "The number of buildings that have already contributed to totalDist[nr][nc]"
        },
        {
          "label": "The Manhattan distance from (0,0) to (nr,nc)"
        },
        {
          "label": "The size of the current BFS queue layer"
        }
      ],
      "explain": "dist is incremented once per level before expanding that level's nodes, so when a neighbor (nr,nc) is enqueued its BFS depth equals dist. Adding dist to totalDist accumulates the sum of shortest distances from all buildings."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity, where B = number of buildings, m = rows, n = columns?",
      "choices": [
        {
          "label": "O(B·m·n)",
          "correct": true
        },
        {
          "label": "O(m·n)"
        },
        {
          "label": "O((m·n)²)"
        },
        {
          "label": "O(B²·m·n)"
        }
      ],
      "explain": "One full BFS costs O(m·n). The outer loops run it once per building (B times), giving O(B·m·n). The final linear scan is O(m·n) and doesn't dominate."
    },
    {
      "id": "no-path",
      "prompt": "What does the function return when no empty cell can reach all buildings, and how is that sentinel detected?",
      "choices": [
        {
          "label": "Returns -1; res stays at 1<<30 because no cell satisfies reach[r][c]==buildings",
          "correct": true
        },
        {
          "label": "Returns 0; the BFS queue empties without updating totalDist"
        },
        {
          "label": "Returns -1; reach overflows and becomes negative"
        },
        {
          "label": "Returns math.MaxInt; the final scan never updates res"
        }
      ],
      "explain": "res is initialized to 1<<30 (a large sentinel). If no cell passes the reach[r][c]==buildings filter, res is never updated, so the post-scan check `if res == 1<<30` triggers and the function returns -1."
    }
  ]
};
