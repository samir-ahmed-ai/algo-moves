import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Range Sum Query 2D - Immutable is best categorized as which pattern?",
      "choices": [
        {
          "label": "2D prefix sum with O(1) query",
          "correct": true
        },
        {
          "label": "2D sliding window"
        },
        {
          "label": "BFS on a grid"
        },
        {
          "label": "Segment tree over rows"
        }
      ],
      "explain": "The code builds a 2D prefix table in O(m*n) and answers each rectangle query in O(1) via inclusion-exclusion — the defining trait of the 2D prefix-sum pattern. Sliding window doesn't give O(1) arbitrary-rectangle queries."
    },
    {
      "id": "build-recurrence",
      "prompt": "What recurrence does `newRangeSumMatrix` use to fill `prefix[r+1][c+1]`?",
      "choices": [
        {
          "label": "matrix[r][c] + prefix[r][c+1] + prefix[r+1][c] - prefix[r][c]",
          "correct": true
        },
        {
          "label": "matrix[r][c] + prefix[r][c] + prefix[r-1][c]"
        },
        {
          "label": "prefix[r][c+1] + prefix[r+1][c]"
        },
        {
          "label": "matrix[r][c] + prefix[r][c+1] - prefix[r][c]"
        }
      ],
      "explain": "Each cell accumulates the element plus the row-prefix and column-prefix, then subtracts the doubly-counted top-left rectangle `prefix[r][c]`. Omitting the subtraction would double-count the overlap."
    },
    {
      "id": "query-formula",
      "prompt": "Which inclusion-exclusion formula does `rangeSumQueryInMatrix` use to answer a query (row1,col1)→(row2,col2)?",
      "choices": [
        {
          "label": "prefix[row2+1][col2+1] - prefix[row1][col2+1] - prefix[row2+1][col1] + prefix[row1][col1]",
          "correct": true
        },
        {
          "label": "prefix[row2][col2] - prefix[row1-1][col2] - prefix[row2][col1-1] + prefix[row1-1][col1-1]"
        },
        {
          "label": "prefix[row2+1][col2+1] - prefix[row1+1][col2+1] - prefix[row2+1][col1+1] + prefix[row1+1][col1+1]"
        },
        {
          "label": "prefix[row2+1][col2+1] - prefix[row1][col2+1] - prefix[row2+1][col1]"
        }
      ],
      "explain": "The prefix array is 1-indexed (size m+1 × n+1), so the bottom-right corner maps to `prefix[row2+1][col2+1]`. The missing `+prefix[row1][col1]` in option D would subtract the top-left rectangle twice."
    },
    {
      "id": "why-padded",
      "prompt": "Why does `newRangeSumMatrix` allocate `prefix` of size (m+1) × (n+1) instead of m × n?",
      "choices": [
        {
          "label": "To give all border cells a zero base case, avoiding out-of-bounds checks",
          "correct": true
        },
        {
          "label": "To store the original matrix alongside the prefix values"
        },
        {
          "label": "To handle queries that exceed the matrix dimensions"
        },
        {
          "label": "To make the query formula work with 0-indexed row1/col1"
        }
      ],
      "explain": "The extra row and column of zeros act as sentinels so `prefix[r][c+1]` and `prefix[r+1][c]` are always valid even when r=0 or c=0, eliminating boundary conditionals in the build loop."
    },
    {
      "id": "complexity",
      "prompt": "What are the build and query complexities for this 2D prefix-sum solution?",
      "choices": [
        {
          "label": "O(m*n) build, O(1) query",
          "correct": true
        },
        {
          "label": "O(m*n) build, O(min(m,n)) query"
        },
        {
          "label": "O(m*n*log(m*n)) build, O(log(m*n)) query"
        },
        {
          "label": "O(m*n) build, O(m+n) query"
        }
      ],
      "explain": "Building the prefix table visits every cell once — O(m*n). Each query is a fixed four-cell arithmetic expression on the prefix table — O(1) regardless of rectangle size."
    }
  ]
};
