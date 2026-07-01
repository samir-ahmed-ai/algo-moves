import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What graph traversal pattern is used and why is it appropriate here?",
      "choices": [
        {
          "label": "Level-by-level BFS, because it guarantees the first time the destination is reached the path is shortest",
          "correct": true
        },
        {
          "label": "DFS with backtracking to enumerate all paths and pick the minimum"
        },
        {
          "label": "Dijkstra with weight 1 per step to handle non-uniform costs"
        },
        {
          "label": "A* search using Manhattan distance as the heuristic"
        }
      ],
      "explain": "All moves cost 1, so BFS finds the shortest path optimally. DFS could find A path but not necessarily the shortest without exhaustive search. Dijkstra and A* are correct but overkill when all edges are equal."
    },
    {
      "id": "visited-mechanism",
      "prompt": "How does the code mark cells as visited, and what advantage does this approach have?",
      "choices": [
        {
          "label": "It sets grid[nr][nc]=1 when enqueuing the cell, reusing the input grid as the visited set",
          "correct": true
        },
        {
          "label": "It maintains a separate boolean matrix vis[][] initialized to false"
        },
        {
          "label": "It stores visited cells in a hash set of (r,c) pairs"
        },
        {
          "label": "It relies on queue FIFO ordering to ensure each cell is processed once"
        }
      ],
      "explain": "Since cells that are passable have value 0 and obstacles have value 1, setting grid[nr][nc]=1 immediately upon enqueue permanently marks the cell as visited without allocating a separate structure. This is both space-efficient and prevents duplicate enqueue."
    },
    {
      "id": "eight-directions",
      "prompt": "The `dirs` array contains 8 direction vectors instead of the usual 4. What does this enable?",
      "choices": [
        {
          "label": "Diagonal movement — allowing paths through corner-touching cells, which the problem permits",
          "correct": true
        },
        {
          "label": "Reaching cells that are separated by exactly one obstacle via jumping"
        },
        {
          "label": "Handling grid wrap-around at the edges"
        },
        {
          "label": "Processing the 4 cardinal directions twice for priority ordering"
        }
      ],
      "explain": "The problem asks for the shortest clear path in an n×n binary grid where movement is 8-directional (horizontal, vertical, and diagonal). The 8 vectors `{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}` cover all valid neighbors."
    },
    {
      "id": "steps-init",
      "prompt": "The variable `steps` is initialized to 1 (not 0) before BFS begins. What does this starting value represent?",
      "choices": [
        {
          "label": "The path length includes the starting cell (0,0) itself, which counts as 1 step",
          "correct": true
        },
        {
          "label": "The BFS always makes at least one incorrect move before finding the path"
        },
        {
          "label": "steps is incremented after each level so it starts 1 to account for the off-by-one"
        },
        {
          "label": "1 is a sentinel meaning 'BFS not yet started'"
        }
      ],
      "explain": "The problem defines path length as the number of cells visited (including start and end). The starting cell (0,0) is enqueued with steps=1. Each time the destination is reached, steps already includes the start and end, matching the expected output."
    },
    {
      "id": "base-case",
      "prompt": "Before BFS starts the code checks `if grid[0][0] != 0 || grid[n-1][n-1] != 0`. What does this guard handle?",
      "choices": [
        {
          "label": "If the start or end cell is an obstacle (value 1), no path exists, so return -1 immediately",
          "correct": true
        },
        {
          "label": "It ensures the grid is square before accessing grid[n-1][n-1]"
        },
        {
          "label": "It handles the n=1 edge case where start equals end"
        },
        {
          "label": "It validates that grid values are only 0 or 1 before processing"
        }
      ],
      "explain": "A blocked start or blocked destination makes any path impossible regardless of what lies in between. Checking both early avoids pointless BFS and prevents inadvertently marking (0,0) visited when it is already 1."
    },
    {
      "id": "complexity",
      "prompt": "For an n×n grid, what is the time and space complexity?",
      "choices": [
        {
          "label": "O(n²) time and O(n²) space",
          "correct": true
        },
        {
          "label": "O(n) time and O(n) space"
        },
        {
          "label": "O(n² log n) time and O(n²) space"
        },
        {
          "label": "O(8·n²) time and O(1) space"
        }
      ],
      "explain": "There are n² cells; each is enqueued and dequeued at most once, and each dequeue inspects up to 8 neighbors — all O(1). Total work is O(8·n²) = O(n²). The queue can hold up to O(n²) elements, giving O(n²) space."
    }
  ]
};
