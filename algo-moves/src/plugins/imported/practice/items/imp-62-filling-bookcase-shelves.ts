import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What DP pattern does `minHeightShelves` use?",
      "choices": [
        {
          "label": "Bottom-up 1-D DP where dp[i] = min total height placing the first i books",
          "correct": true
        },
        {
          "label": "2-D DP where dp[i][j] = min height using books i..j on one shelf"
        },
        {
          "label": "Greedy: fill each shelf as full as possible before starting a new one"
        },
        {
          "label": "Memoized DFS over (book index, remaining shelf width)"
        }
      ],
      "explain": "The code builds a 1-D array `dp` of size n+1. `dp[i]` stores the minimum cumulative height when the first i books have been placed. Each i iterates backward over possible shelf starts j."
    },
    {
      "id": "inner-loop",
      "prompt": "What does the inner loop `for j := i; j >= 1; j--` enumerate?",
      "choices": [
        {
          "label": "All possible starting positions j for the current (last) shelf, ending at book i",
          "correct": true
        },
        {
          "label": "All books from i down to 1, placing each on a separate shelf"
        },
        {
          "label": "The sorted order of books by width to minimize wasted space"
        },
        {
          "label": "Possible book counts for a single shelf using binary search"
        }
      ],
      "explain": "By iterating j from i down to 1, the code considers every contiguous grouping books[j-1..i-1] that could share the last shelf, accumulating their widths and tracking the shelf's max height."
    },
    {
      "id": "recurrence",
      "prompt": "When books j-1 through i-1 fit on one shelf (total width ≤ shelfWidth), the recurrence is `dp[i] = min(dp[i], dp[j-1]+h)`. What does `h` represent?",
      "choices": [
        {
          "label": "The maximum book height among books j-1 through i-1 on the current shelf",
          "correct": true
        },
        {
          "label": "The sum of all book heights on the current shelf"
        },
        {
          "label": "The height of the last book added, books[i-1][1]"
        },
        {
          "label": "The remaining vertical space after placing previous shelves"
        }
      ],
      "explain": "A shelf's height is determined by its tallest book. The code updates `h` with `books[j-1][1]` whenever a taller book is encountered while scanning backward, so `h` is always the running maximum height for that shelf."
    },
    {
      "id": "break-condition",
      "prompt": "What happens when `w > shelfWidth` inside the inner loop?",
      "choices": [
        {
          "label": "The loop breaks immediately — books from j backward can't fit on the current shelf",
          "correct": true
        },
        {
          "label": "Book j-1 is placed on a new shelf and the width resets"
        },
        {
          "label": "The excess width is carried over to the next shelf"
        },
        {
          "label": "The book is skipped and the loop continues to j-1"
        }
      ],
      "explain": "Once cumulative width exceeds shelfWidth, adding more books (which only increases width) is pointless. The `break` exits early, pruning invalid shelf groupings and keeping the algorithm correct."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `minHeightShelves`?",
      "choices": [
        {
          "label": "O(n²) time and O(n) space",
          "correct": true
        },
        {
          "label": "O(n * shelfWidth) time and O(n) space"
        },
        {
          "label": "O(n log n) time and O(n) space"
        },
        {
          "label": "O(n²) time and O(n²) space"
        }
      ],
      "explain": "The outer loop runs n times; the inner loop runs up to i times for each i, giving O(n²) total. The `dp` array is size n+1, so space is O(n). shelfWidth does not appear in the complexity."
    },
    {
      "id": "base-case",
      "prompt": "Why is `dp[0] = 0` (the implicit zero-initialization) the correct base case?",
      "choices": [
        {
          "label": "Zero books placed means zero total shelf height",
          "correct": true
        },
        {
          "label": "The first book must always start a new shelf, so dp[0] is irrelevant"
        },
        {
          "label": "It prevents the inner loop from reading out-of-bounds at j=1"
        },
        {
          "label": "dp[0] represents the shelfWidth constraint before any books are placed"
        }
      ],
      "explain": "`dp[0]` is the cost before placing any book — naturally 0. The recurrence `dp[j-1]+h` with j=1 evaluates to `dp[0]+h = h`, which correctly represents a single shelf containing all books from 1 to i."
    }
  ]
};
