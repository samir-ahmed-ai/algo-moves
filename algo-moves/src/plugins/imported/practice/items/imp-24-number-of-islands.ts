import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `numIslands` use to count islands?",
      "choices": [
        {
          "label": "DFS flood fill — recursively mark connected land cells as visited",
          "correct": true
        },
        {
          "label": "BFS with a distance queue — to measure island sizes"
        },
        {
          "label": "Union-Find to merge adjacent land — cells into components"
        },
        {
          "label": "Dynamic programming on row/column — counts"
        }
      ],
      "explain": "Each time a '1' is found, `btFloodFill` is called to recursively turn all reachable '1' cells to '0', erasing the island. This is classic DFS flood fill. BFS and Union-Find are valid alternatives but not what this code does."
    },
    {
      "id": "visited-strategy",
      "prompt": "How does the code mark land cells as visited to avoid counting them twice?",
      "choices": [
        {
          "label": "It overwrites `grid[r][c]` from '1' — to '0' in-place during DFS",
          "correct": true
        },
        {
          "label": "It uses a separate `visited — [][]bool` array"
        },
        {
          "label": "It stores visited coordinates — a hash set"
        },
        {
          "label": "It decrements a counter — each visited cell"
        }
      ],
      "explain": "Setting `grid[r][c] = '0'` mutates the grid itself, eliminating the need for an auxiliary visited structure. The base case `grid[r][c] != '1'` then prevents re-entry."
    },
    {
      "id": "base-case",
      "prompt": "What does `btFloodFill` check at the top of every call, and why is the order of checks important?",
      "choices": [
        {
          "label": "Bounds (r<0, r>=m, c<0, c>=n) — then content (grid[r][c]!='1');",
          "correct": true
        },
        {
          "label": "Content first (grid[r][c]!='1') — content is cheaper to check"
        },
        {
          "label": "Only bounds; content is guaranteed — '1' by the caller"
        },
        {
          "label": "Only content; the grid — padded with sentinel '0' rows/columns"
        }
      ],
      "explain": "Go evaluates `||` left-to-right with short-circuit: checking bounds before accessing `grid[r][c]` prevents an out-of-bounds panic. Reversing the order would crash on edge cells."
    },
    {
      "id": "connectivity",
      "prompt": "In what directions does `btFloodFill` propagate from cell (r, c)?",
      "choices": [
        {
          "label": "4-directional: up, down, left, right — (no diagonals)",
          "correct": true
        },
        {
          "label": "8-directional: including all 4 — The four recursive calls use"
        },
        {
          "label": "2-directional: only right and down — The four recursive calls use"
        },
        {
          "label": "1-directional: only downward (row+1) — The four recursive calls use"
        }
      ],
      "explain": "The four recursive calls use offsets (r±1, c) and (r, c±1), giving 4-connectivity. Diagonal neighbors are not checked, matching the standard grid-island problem definition."
    },
    {
      "id": "complexity",
      "prompt": "What is the time and space complexity of `numIslands` on an m×n grid?",
      "choices": [
        {
          "label": "Time O(m·n) — Space O(m·n) each cell is visited at",
          "correct": true
        },
        {
          "label": "Time O(m·n·log(m·n)), Space O(1) — a sort-based approach is used"
        },
        {
          "label": "Time O(m·n), Space O(1) — the grid is modified in-place, no extra memory"
        },
        {
          "label": "Time O((m·n)²), Space O(m·n) — every pair of cells is compared"
        }
      ],
      "explain": "Every cell is processed at most once (land cells get flipped to '0' after first visit). The recursion stack can be as deep as m·n in the worst case (a single large island), giving O(m·n) space despite the in-place modification."
    },
    {
      "id": "edge-case",
      "prompt": "What happens if the entire grid is water (all '0' cells)?",
      "choices": [
        {
          "label": "`numIslands` returns 0 no '1' — cell is ever found, so `cnt` stays 0",
          "correct": true
        },
        {
          "label": "It returns -1 to indicate — no islands"
        },
        {
          "label": "It panics because `btFloodFill` — an empty grid"
        },
        {
          "label": "It returns 1 — counting the entire water area as one"
        }
      ],
      "explain": "The outer loop only calls `btFloodFill` when `grid[r][c]=='1'`. An all-water grid never triggers that branch, so `cnt` remains 0 and is returned directly."
    }
  ]
};
