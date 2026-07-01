import type { PracticeBundle } from '../../_shared/pluginKit';

/** Teaching content migrated from native curated plugins (now imported-canonical). */
export const MIGRATED_BUNDLES = {
  "imp-58-climbing-stairs": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func climbStairs(n int) int {",
        "role": "signature — count distinct ways to climb n stairs"
      },
      {
        "id": "base-check",
        "code": "\tif n <= 1 {",
        "role": "handle the base cases n = 0 and n = 1"
      },
      {
        "id": "base-return",
        "code": "\t\treturn 1",
        "role": "exactly one way: do nothing, or a single 1-step"
      },
      {
        "id": "base-close",
        "code": "\t}",
        "role": "close the base-case guard"
      },
      {
        "id": "init",
        "code": "\tprev, cur := 1, 1 // dp[0], dp[1]",
        "role": "two rolling variables seed the recurrence"
      },
      {
        "id": "loop",
        "code": "\tfor i := 2; i <= n; i++ {",
        "role": "build dp[i] bottom-up from i = 2 to n"
      },
      {
        "id": "roll",
        "code": "\t\tprev, cur = cur, prev+cur",
        "role": "dp[i] = dp[i-1] + dp[i-2]; slide the window forward"
      },
      {
        "id": "loop-close",
        "code": "\t}",
        "role": "close the loop"
      },
      {
        "id": "return",
        "code": "\treturn cur",
        "role": "cur now holds dp[n] — the answer"
      },
      {
        "id": "close",
        "code": "}",
        "role": "close the function"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What category of algorithm solves climbing stairs?",
        "choices": [
          {
            "label": "1-D bottom-up dynamic programming",
            "correct": true
          },
          {
            "label": "Backtracking over every step sequence"
          },
          {
            "label": "Binary search on the number of stairs"
          },
          {
            "label": "Greedy: always take the larger step"
          }
        ],
        "explain": "dp[i] depends only on the two smaller subproblems dp[i-1] and dp[i-2], so we fill a 1-D table from the base cases upward — classic bottom-up DP."
      },
      {
        "id": "recurrence",
        "prompt": "What is the recurrence for the number of ways to reach step i?",
        "choices": [
          {
            "label": "dp[i] = dp[i-1] + dp[i-2]",
            "correct": true
          },
          {
            "label": "dp[i] = dp[i-1] * dp[i-2]"
          },
          {
            "label": "dp[i] = dp[i-1] + 1"
          },
          {
            "label": "dp[i] = max(dp[i-1], dp[i-2])"
          }
        ],
        "explain": "Every way to land on step i ends with either a 1-step or a 2-step, so it counts the ways to reach step i-1 plus the ways to reach step i-2."
      },
      {
        "id": "why",
        "prompt": "Why is dp[i] the SUM of dp[i-1] and dp[i-2] (not, say, the product)?",
        "choices": [
          {
            "label": "The last move was either a 1-step or a 2-step — two disjoint groups of paths, so add them",
            "correct": true
          },
          {
            "label": "Because addition is faster than multiplication"
          },
          {
            "label": "Because the steps are independent choices that combine"
          },
          {
            "label": "Because the array is sorted"
          }
        ],
        "explain": "Paths ending in a 1-step and paths ending in a 2-step are mutually exclusive and together cover every path to step i, so the count is their sum."
      },
      {
        "id": "base",
        "prompt": "What are the base cases?",
        "choices": [
          {
            "label": "dp[0] = 1 and dp[1] = 1",
            "correct": true
          },
          {
            "label": "dp[0] = 0 and dp[1] = 1"
          },
          {
            "label": "dp[0] = 1 and dp[1] = 2"
          },
          {
            "label": "dp[1] = 1 and dp[2] = 2"
          }
        ],
        "explain": "There is one way to stand at the ground (do nothing) and one way to reach step 1 (a single 1-step). These seed the recurrence; without dp[0]=1 the count for n=2 would be wrong."
      },
      {
        "id": "fibonacci",
        "prompt": "The sequence dp[0], dp[1], dp[2], … is which famous sequence?",
        "choices": [
          {
            "label": "The Fibonacci numbers (1, 1, 2, 3, 5, 8, …)",
            "correct": true
          },
          {
            "label": "The powers of two (1, 2, 4, 8, …)"
          },
          {
            "label": "The triangular numbers (1, 3, 6, 10, …)"
          },
          {
            "label": "The factorials (1, 1, 2, 6, 24, …)"
          }
        ],
        "explain": "dp[i] = dp[i-1] + dp[i-2] with both seeds equal to 1 is exactly the Fibonacci recurrence, so climbing stairs is Fibonacci in disguise."
      },
      {
        "id": "space",
        "prompt": "How can the O(n) array be reduced to O(1) space?",
        "choices": [
          {
            "label": "Keep just two rolling variables (prev, cur); dp[i] only needs the last two values",
            "correct": true
          },
          {
            "label": "Use binary search to skip most entries"
          },
          {
            "label": "Recurse without a table"
          },
          {
            "label": "Store the whole array but compress it"
          }
        ],
        "explain": "Since dp[i] reads only dp[i-1] and dp[i-2], two variables that slide forward each iteration replace the full array — O(n) time, O(1) space."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "n1",
          "title": "One stair",
          "input": {
            "n": 1
          },
          "inputLabel": "n = 1",
          "returns": "1 way",
          "tone": "ok",
          "question": "Why is the answer for n = 1 just the base case?",
          "answer": "There is one way to reach step 1 — a single 1-step. The loop (i from 2) never runs, so the answer is dp[1] = 1 directly. This is one of the two seeds the recurrence builds on."
        },
        {
          "id": "n2",
          "title": "Two stairs",
          "input": {
            "n": 2
          },
          "inputLabel": "n = 2",
          "returns": "2 ways",
          "tone": "ok",
          "question": "What are the two ways to climb 2 stairs, and how does dp find them?",
          "answer": "1+1 or a single 2-step. dp[2] = dp[1] + dp[0] = 1 + 1 = 2: reach step 2 either from step 1 (a 1-step) or step 0 (a 2-step). Both base cases dp[0]=1 and dp[1]=1 are needed here."
        },
        {
          "id": "n3",
          "title": "Three stairs",
          "input": {
            "n": 3
          },
          "inputLabel": "n = 3",
          "returns": "3 ways",
          "tone": "ok",
          "question": "How does dp[3] reuse the smaller answers instead of recomputing them?",
          "answer": "dp[3] = dp[2] + dp[1] = 2 + 1 = 3. The last move onto step 3 was either a 1-step (from step 2) or a 2-step (from step 1), so the count is the sum of those already-solved subproblems — no recomputation."
        },
        {
          "id": "n5",
          "title": "Five stairs (Fibonacci)",
          "input": {
            "n": 5
          },
          "inputLabel": "n = 5",
          "returns": "8 ways",
          "tone": "ok",
          "question": "Why is this sequence the Fibonacci numbers?",
          "answer": "dp runs 1, 1, 2, 3, 5, 8 — each term is the sum of the previous two, exactly the Fibonacci recurrence. A naive recursion would re-solve dp[i-1] and dp[i-2] over and over (overlapping subproblems); the table solves each once, so n = 5 gives 8 ways."
        }
      ]
    },
    "simulateQuestion": "Which dp cell is filled next?"
  },
  "imp-61-edit-distance": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func minDistance(word1, word2 string) int {",
        "role": "signature — min single-character edits to turn word1 into word2"
      },
      {
        "id": "dims",
        "code": "\tm, n := len(word1), len(word2)",
        "role": "table is (m+1) × (n+1): one extra row/column for the empty prefix"
      },
      {
        "id": "alloc",
        "code": "\tdp := make([][]int, m+1)",
        "role": "allocate the dp grid of prefix distances"
      },
      {
        "id": "col-base",
        "code": "\tfor i := range dp {\n\t\tdp[i] = make([]int, n+1)\n\t\tdp[i][0] = i // delete i chars",
        "role": "base column: turning the first i chars into \"\" costs i deletions"
      },
      {
        "id": "row-base",
        "code": "\t}\n\tfor j := 0; j <= n; j++ {\n\t\tdp[0][j] = j // insert j chars\n\t}",
        "role": "base row: turning \"\" into the first j chars costs j insertions"
      },
      {
        "id": "outer",
        "code": "\tfor i := 1; i <= m; i++ {",
        "role": "walk every prefix length of word1"
      },
      {
        "id": "inner",
        "code": "\t\tfor j := 1; j <= n; j++ {",
        "role": "against every prefix length of word2"
      },
      {
        "id": "match",
        "code": "\t\t\tif word1[i-1] == word2[j-1] {\n\t\t\t\tdp[i][j] = dp[i-1][j-1] // no edit, carry diagonal",
        "role": "characters match → carry the diagonal, free"
      },
      {
        "id": "mismatch",
        "code": "\t\t\t} else {\n\t\t\t\tdp[i][j] = 1 + min(dp[i-1][j], min(dp[i][j-1], dp[i-1][j-1]))",
        "role": "differ → 1 + min(delete, insert, replace)"
      },
      {
        "id": "close",
        "code": "\t\t\t}\n\t\t}\n\t}",
        "role": "close the two loops; the table is now fully filled"
      },
      {
        "id": "return",
        "code": "\treturn dp[m][n]\n}",
        "role": "bottom-right cell is the distance between the full strings"
      },
      {
        "id": "min-helper",
        "code": "func min(a, b int) int {\n\tif a < b {\n\t\treturn a\n\t}\n\treturn b\n}",
        "role": "helper: smaller of two ints"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "Which technique does Edit Distance showcase?",
        "choices": [
          {
            "label": "2-D dynamic programming over prefixes of the two strings",
            "correct": true
          },
          {
            "label": "Backtracking with pruning"
          },
          {
            "label": "Greedy: edit the first differing character and move on"
          },
          {
            "label": "Two pointers from both ends"
          }
        ],
        "explain": "It fills an (m+1)×(n+1) table where dp[i][j] depends on already-computed neighbours — the defining shape of bottom-up 2-D DP, not a greedy or backtracking search."
      },
      {
        "id": "cell-meaning",
        "prompt": "What does dp[i][j] represent?",
        "choices": [
          {
            "label": "The min edits to turn the first i chars of word1 into the first j chars of word2",
            "correct": true
          },
          {
            "label": "Whether word1[i] equals word2[j]"
          },
          {
            "label": "The number of matching characters so far"
          },
          {
            "label": "The length of the longest common subsequence"
          }
        ],
        "explain": "Each cell is the edit distance between two prefixes: word1[:i] and word2[:j]. The full answer is the bottom-right cell dp[m][n]."
      },
      {
        "id": "match",
        "prompt": "When word1[i-1] == word2[j-1], what is dp[i][j]?",
        "choices": [
          {
            "label": "dp[i-1][j-1] — carry the diagonal, no edit needed",
            "correct": true
          },
          {
            "label": "1 + dp[i-1][j-1]"
          },
          {
            "label": "0, always"
          },
          {
            "label": "1 + min of the three neighbours"
          }
        ],
        "explain": "Matching characters cost nothing, so the prefixes are exactly as far apart as they were one character shorter: dp[i][j] = dp[i-1][j-1]."
      },
      {
        "id": "mismatch",
        "prompt": "When the characters differ, dp[i][j] = 1 + min(...). What do the three neighbours mean?",
        "choices": [
          {
            "label": "dp[i-1][j] = delete, dp[i][j-1] = insert, dp[i-1][j-1] = replace",
            "correct": true
          },
          {
            "label": "They are all replacements, just from different rows"
          },
          {
            "label": "dp[i-1][j] = insert, dp[i][j-1] = delete, dp[i-1][j-1] = match"
          },
          {
            "label": "The three are arbitrary — only the minimum matters"
          }
        ],
        "explain": "Coming from above (dp[i-1][j]) drops word1’s char (delete); from the left (dp[i][j-1]) adds word2’s char (insert); from the diagonal (dp[i-1][j-1]) swaps one for the other (replace). Add 1 for the edit just made."
      },
      {
        "id": "base",
        "prompt": "What seeds the first row and first column?",
        "choices": [
          {
            "label": "dp[i][0] = i (delete i chars), dp[0][j] = j (insert j chars)",
            "correct": true
          },
          {
            "label": "Both are filled with 0"
          },
          {
            "label": "dp[i][0] = 1 and dp[0][j] = 1"
          },
          {
            "label": "They are left as -1 and skipped"
          }
        ],
        "explain": "Transforming a prefix into the empty string needs one deletion per character; transforming the empty string into a prefix needs one insertion per character. These base cases anchor the recurrence."
      },
      {
        "id": "complexity",
        "prompt": "What is the time and space complexity of the table approach?",
        "choices": [
          {
            "label": "O(m·n) time and O(m·n) space",
            "correct": true
          },
          {
            "label": "O(m + n) time and O(1) space"
          },
          {
            "label": "O(m·n) time but O(min(m,n)) space, with no other option"
          },
          {
            "label": "O((m·n)!) — it explores every edit sequence"
          }
        ],
        "explain": "Every one of the (m+1)·(n+1) cells is computed once from O(1) neighbours. Space can be squeezed to O(min(m,n)) with a rolling row, but the straightforward table is O(m·n) for both."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "identical",
          "title": "Identical strings (distance 0)",
          "input": {
            "a": "cat",
            "b": "cat"
          },
          "inputLabel": "\"cat\" → \"cat\"",
          "returns": "distance = 0",
          "tone": "ok",
          "question": "Why is the whole diagonal of the dp table 0 here?",
          "answer": "Every character matches, so each cell carries the diagonal neighbour unchanged: dp[i][j] = dp[i-1][j-1]. No insert, delete, or replace is ever needed, and dp[m][n] stays at 0."
        },
        {
          "id": "substitute",
          "title": "One substitution",
          "input": {
            "a": "cat",
            "b": "cut"
          },
          "inputLabel": "\"cat\" → \"cut\"",
          "returns": "distance = 1",
          "tone": "ok",
          "question": "Only the middle letter differs — why does that cost exactly 1?",
          "answer": "\"c\" and \"t\" match on the diagonal, but at the differing letter we take 1 + min(insert, delete, replace). The cheapest is replace: dp[i][j] = 1 + dp[i-1][j-1], turning \"a\" into \"u\" for a total of 1."
        },
        {
          "id": "insert",
          "title": "Pure insertion (length differs by 1)",
          "input": {
            "a": "ab",
            "b": "abc"
          },
          "inputLabel": "\"ab\" → \"abc\"",
          "returns": "distance = 1",
          "tone": "ok",
          "question": "How does the recurrence model adding the trailing \"c\"?",
          "answer": "The shared prefix \"ab\" matches along the diagonal at distance 0. The extra \"c\" has no partner, so the cell takes its left neighbour + 1 (an insertion): dp[i][j] = 1 + dp[i][j-1] = 1."
        },
        {
          "id": "horse-ros",
          "title": "Classic mix (\"horse\" → \"ros\")",
          "input": {
            "a": "horse",
            "b": "ros"
          },
          "inputLabel": "\"horse\" → \"ros\"",
          "returns": "distance = 3",
          "tone": "ok",
          "question": "Why is the answer 3, and how do the base cases seed the table?",
          "answer": "Row 0 and column 0 are the base cases: dp[i][0] = i deletions (empty target), dp[0][j] = j insertions (empty source). From there the optimal path replaces \"h\"→\"r\", keeps \"o\", deletes \"r\" and \"e\" — three edits, read off dp[5][3] = 3."
        }
      ]
    },
    "simulateQuestion": "Which dp cell is filled next?"
  },
  "imp-26-subsets": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func subsets(nums []int) [][]int {",
        "role": "signature — return a list of every subset"
      },
      {
        "id": "init",
        "code": "\tres := [][]int{}\n\tcur := []int{}",
        "role": "res collects results; cur is the subset being built"
      },
      {
        "id": "helper-sig",
        "code": "\tvar helper func(start int)\n\thelper = func(start int) {",
        "role": "recursive builder; start = first index it may still add"
      },
      {
        "id": "record",
        "code": "\t\tsnapshot := make([]int, len(cur))\n\t\tcopy(snapshot, cur)\n\t\tres = append(res, snapshot)",
        "role": "record a COPY of the current subset (cur mutates later)"
      },
      {
        "id": "loop",
        "code": "\t\tfor i := start; i < len(nums); i++ {",
        "role": "extend with each later element, never going backwards"
      },
      {
        "id": "choose",
        "code": "\t\t\tcur = append(cur, nums[i]) // include",
        "role": "choose: add nums[i] to the current subset"
      },
      {
        "id": "recurse",
        "code": "\t\t\thelper(i + 1)              // recurse",
        "role": "explore all subsets that include nums[i]"
      },
      {
        "id": "undo",
        "code": "\t\t\tcur = cur[:len(cur)-1]     // exclude (backtrack)",
        "role": "undo: pop nums[i] before trying the next element"
      },
      {
        "id": "close",
        "code": "\t\t}\n\t}",
        "role": "close the loop and the helper"
      },
      {
        "id": "run",
        "code": "\thelper(0)\n\treturn res\n}",
        "role": "start from index 0 and return everything collected"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What pattern generates all subsets here?",
        "choices": [
          {
            "label": "Backtracking: at each index choose include or exclude, then recurse",
            "correct": true
          },
          {
            "label": "Dynamic programming over a 2-D table"
          },
          {
            "label": "Binary search on the array"
          },
          {
            "label": "A sliding window"
          }
        ],
        "explain": "Each element is a binary decision. The recursion explores the include branch, then backtracks (pops) to explore the exclude branch."
      },
      {
        "id": "count",
        "prompt": "How many subsets does an array of n distinct elements have?",
        "choices": [
          {
            "label": "2^n",
            "correct": true
          },
          {
            "label": "n!"
          },
          {
            "label": "n²"
          },
          {
            "label": "n · (n+1) / 2"
          }
        ],
        "explain": "Every element is independently in or out, giving 2 × 2 × … × 2 = 2^n combinations."
      },
      {
        "id": "snapshot",
        "prompt": "Why does the code copy `cur` before appending it to the results?",
        "choices": [
          {
            "label": "cur is mutated in place later; without a copy every result would alias the same slice",
            "correct": true
          },
          {
            "label": "To sort the subset"
          },
          {
            "label": "To remove duplicates"
          },
          {
            "label": "Copying is required by Go syntax"
          }
        ],
        "explain": "cur keeps growing and shrinking as the recursion proceeds. Storing a reference would leave every saved subset pointing at the final state, so a snapshot is essential."
      },
      {
        "id": "backtrack",
        "prompt": "Which line performs the backtracking step?",
        "choices": [
          {
            "label": "cur = cur[:len(cur)-1] — pop the element after recursing",
            "correct": true
          },
          {
            "label": "res = append(res, snapshot)"
          },
          {
            "label": "helper(i + 1)"
          },
          {
            "label": "for i := start; i < len(nums); i++"
          }
        ],
        "explain": "After exploring everything that includes nums[i], we remove it so the loop can move on to a branch that excludes it — that undo is the backtrack."
      },
      {
        "id": "start",
        "prompt": "Why does the loop start at `start` rather than 0 each call?",
        "choices": [
          {
            "label": "To only ever extend forward, avoiding duplicate subsets in different orders",
            "correct": true
          },
          {
            "label": "To skip the first element"
          },
          {
            "label": "For performance only; 0 would also be correct"
          },
          {
            "label": "To reverse the array"
          }
        ],
        "explain": "Starting at `start` enforces increasing index order, so {1,2} is generated but {2,1} is not — each subset appears exactly once."
      },
      {
        "id": "complexity",
        "prompt": "What is the time complexity?",
        "choices": [
          {
            "label": "O(n · 2^n) — 2^n subsets, each up to length n to copy",
            "correct": true
          },
          {
            "label": "O(2^n) exactly"
          },
          {
            "label": "O(n²)"
          },
          {
            "label": "O(n log n)"
          }
        ],
        "explain": "There are 2^n subsets and copying each into the result costs up to O(n), so the total work is O(n · 2^n)."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "empty",
          "title": "Empty set",
          "input": {
            "nums": []
          },
          "inputLabel": "nums = []",
          "returns": "1 subset",
          "tone": "ok",
          "question": "How many subsets does the empty array have?",
          "answer": "Exactly one: the empty set {} itself (2^0 = 1). The helper records it immediately and the for-loop never runs."
        },
        {
          "id": "one",
          "title": "Single element",
          "input": {
            "nums": [
              7
            ]
          },
          "inputLabel": "nums = [7]",
          "returns": "2 subsets",
          "tone": "ok",
          "question": "What are the subsets of [7]?",
          "answer": "Two: {} and {7} (2^1 = 2). One decision — include 7 or not — doubles the empty case."
        },
        {
          "id": "three",
          "title": "Three elements",
          "input": {
            "nums": [
              1,
              2,
              3
            ]
          },
          "inputLabel": "nums = [1, 2, 3]",
          "returns": "8 subsets",
          "tone": "ok",
          "question": "Why are there 8 subsets, and in what order do they appear?",
          "answer": "2^3 = 8. Because each subset is recorded on entry (before the loop), they come out in pre-order: {}, {1}, {1,2}, {1,2,3}, {1,3}, {2}, {2,3}, {3}."
        },
        {
          "id": "four",
          "title": "Doubling again",
          "input": {
            "nums": [
              1,
              2,
              3,
              4
            ]
          },
          "inputLabel": "nums = [1, 2, 3, 4]",
          "returns": "16 subsets",
          "tone": "ok",
          "question": "Add one more element — what happens to the count?",
          "answer": "It doubles to 2^4 = 16. Every existing subset spawns a twin that also contains the new element, which is exactly why the work is exponential."
        }
      ]
    },
    "simulateQuestion": "What choice does backtracking make next?"
  },
  "imp-24-number-of-islands": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func numIslands(grid [][]byte) int {",
        "role": "signature — the grid of '1'/'0' bytes, returns the island count"
      },
      {
        "id": "dims",
        "code": "\trows, cols := len(grid), len(grid[0])",
        "role": "grid dimensions used for bounds checks"
      },
      {
        "id": "dfs-decl",
        "code": "\tvar dfs func(r, c int)\n\tdfs = func(r, c int) {",
        "role": "recursive flood fill from one cell"
      },
      {
        "id": "guard",
        "code": "\t\tif r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1' {\n\t\t\treturn\n\t\t}",
        "role": "stop at the border or on water / already-sunk land"
      },
      {
        "id": "sink",
        "code": "\t\tgrid[r][c] = '0' // sink",
        "role": "mark visited so this cell is never counted again"
      },
      {
        "id": "recurse",
        "code": "\t\tdfs(r-1, c)\n\t\tdfs(r+1, c)\n\t\tdfs(r, c-1)\n\t\tdfs(r, c+1)",
        "role": "flood the four orthogonal neighbours"
      },
      {
        "id": "dfs-close",
        "code": "\t}",
        "role": "end of the flood-fill closure"
      },
      {
        "id": "count-init",
        "code": "\tcount := 0",
        "role": "number of islands found so far"
      },
      {
        "id": "scan",
        "code": "\tfor r := 0; r < rows; r++ {\n\t\tfor c := 0; c < cols; c++ {",
        "role": "scan every cell row by row"
      },
      {
        "id": "seed",
        "code": "\t\t\tif grid[r][c] == '1' {\n\t\t\t\tcount++\n\t\t\t\tdfs(r, c)\n\t\t\t}",
        "role": "fresh land → new island, then sink the whole patch"
      },
      {
        "id": "scan-close",
        "code": "\t\t}\n\t}",
        "role": "close the row/column loops"
      },
      {
        "id": "return",
        "code": "\treturn count\n}",
        "role": "report the total number of islands"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What classic problem shape is Number of Islands?",
        "choices": [
          {
            "label": "Connected components on a grid, solved with flood fill",
            "correct": true
          },
          {
            "label": "Shortest path between two cells"
          },
          {
            "label": "Dynamic programming over subgrid sums"
          },
          {
            "label": "Sorting the cells by value"
          }
        ],
        "explain": "Each island is one connected component of land cells. Counting them is exactly counting connected components, and flood fill is the standard way to collapse each component to a single count."
      },
      {
        "id": "traversal",
        "prompt": "When the scan finds an unvisited land cell, what does the flood fill do?",
        "choices": [
          {
            "label": "Runs a DFS/BFS that visits every cell reachable through land neighbours",
            "correct": true
          },
          {
            "label": "Only checks the cell directly to the right"
          },
          {
            "label": "Counts the cell and immediately moves on without exploring"
          },
          {
            "label": "Restarts the outer scan from row 0"
          }
        ],
        "explain": "The seed cell pushes its land neighbours onto a stack (DFS); the recursion/loop keeps draining the stack until the whole connected patch is sunk, so the entire island is handled in one go."
      },
      {
        "id": "mark-visited",
        "prompt": "Why does the algorithm overwrite each visited land cell (mark it sunk)?",
        "choices": [
          {
            "label": "So a cell can never seed or be counted as a second island",
            "correct": true
          },
          {
            "label": "To make the grid look nicer when printed"
          },
          {
            "label": "Because the grid must stay sorted"
          },
          {
            "label": "To free memory used by the stack"
          }
        ],
        "explain": "Sinking a cell (setting it to 0 / marking it visited) guarantees the outer scan skips it and neighbours never revisit it, preventing both double-counting and infinite loops."
      },
      {
        "id": "new-island",
        "prompt": "During the outer row-by-row scan, what triggers count++?",
        "choices": [
          {
            "label": "Reaching a cell that is still land — it has not been sunk by any prior fill",
            "correct": true
          },
          {
            "label": "Reaching any cell, land or water"
          },
          {
            "label": "Finishing a row"
          },
          {
            "label": "Reaching a water cell adjacent to land"
          }
        ],
        "explain": "Cells already swallowed by an earlier flood fill are no longer land, so they are skipped. Only a fresh, untouched land cell increments the count and seeds a new fill."
      },
      {
        "id": "adjacency",
        "prompt": "This solution uses 4-directional adjacency. What changes with 8-directional?",
        "choices": [
          {
            "label": "Diagonally touching land would merge into one island, lowering the count",
            "correct": true
          },
          {
            "label": "Nothing — diagonals never matter"
          },
          {
            "label": "The grid would need to be square"
          },
          {
            "label": "It would always report exactly one island"
          }
        ],
        "explain": "Adding the four diagonals to the neighbour set means diagonally adjacent patches become connected, so cells that are separate islands under 4-way adjacency fuse into one under 8-way."
      },
      {
        "id": "complexity",
        "prompt": "What is the time complexity for an R×C grid?",
        "choices": [
          {
            "label": "O(R·C) — each cell is visited a constant number of times",
            "correct": true
          },
          {
            "label": "O(R·C · islands)"
          },
          {
            "label": "O((R·C)²)"
          },
          {
            "label": "O(R + C)"
          }
        ],
        "explain": "The outer scan touches every cell once, and across all flood fills each land cell is sunk exactly once, so the total work is linear in the number of cells."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "three",
          "title": "Three separate islands",
          "input": {
            "grid": [
              [
                1,
                1,
                0,
                0,
                1
              ],
              [
                1,
                0,
                0,
                0,
                1
              ],
              [
                0,
                0,
                1,
                0,
                0
              ],
              [
                0,
                0,
                1,
                1,
                0
              ]
            ]
          },
          "inputLabel": "4×5 grid, three disconnected land patches",
          "returns": "3 islands",
          "tone": "ok",
          "question": "Why does this count as three islands and not five land regions?",
          "answer": "The scan hits the first unvisited land cell, then flood-fills every 4-directionally connected cell so the whole patch is sunk at once. The top-left L-shape, the right-edge vertical pair, and the bottom T each form one connected component, so the count lands on 3."
        },
        {
          "id": "one-big",
          "title": "One big island, one stray cell",
          "input": {
            "grid": [
              [
                1,
                1,
                1,
                0
              ],
              [
                0,
                1,
                0,
                0
              ],
              [
                1,
                1,
                0,
                1
              ]
            ]
          },
          "inputLabel": "3×4 grid; large connected block plus an isolated corner",
          "returns": "2 islands",
          "tone": "ok",
          "question": "Seven cells are land — why does the algorithm report two islands?",
          "answer": "The flood-fill from (0,0) walks orthogonally through the top row, down the middle column, and into the bottom-left pair, sinking six connected cells as one island. The lone cell at (2,3) touches only water in its four neighbours, so the scan reaches it later and starts a second flood-fill. Diagonal adjacency does not connect cells here."
        },
        {
          "id": "all-water",
          "title": "All water (edge case)",
          "input": {
            "grid": [
              [
                0,
                0,
                0
              ],
              [
                0,
                0,
                0
              ]
            ]
          },
          "inputLabel": "2×3 grid of all 0s",
          "returns": "0 islands",
          "tone": "ok",
          "question": "What happens when no cell is land?",
          "answer": "The double loop never finds a cell whose status is still land, so no flood-fill ever starts and the count stays at 0. This is the natural base case — connected-components of an empty set is zero."
        },
        {
          "id": "all-land",
          "title": "All land (edge case)",
          "input": {
            "grid": [
              [
                1,
                1,
                1
              ],
              [
                1,
                1,
                1
              ]
            ]
          },
          "inputLabel": "2×3 grid of all 1s",
          "returns": "1 island",
          "tone": "ok",
          "question": "If every cell is land, how many flood-fills run?",
          "answer": "Exactly one. The first cell (0,0) seeds a DFS that reaches every other cell through orthogonal moves, sinking them all. When the scan resumes, no land remains, so the count is a single island."
        }
      ]
    },
    "simulateQuestion": "Which cell does the flood fill visit next?"
  },
  "imp-20-course-schedule": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func canFinish(adj [][]int) bool {",
        "role": "signature — adjacency list of prerequisite edges, return whether all courses can finish"
      },
      {
        "id": "n",
        "code": "\tn := len(adj)",
        "role": "number of courses (nodes)"
      },
      {
        "id": "color",
        "code": "\tcolor := make([]int, n) // 0 white, 1 grey, 2 black",
        "role": "three-state marker: unvisited / on-stack / finished"
      },
      {
        "id": "dfs-decl",
        "code": "\tvar dfs func(v int) bool",
        "role": "forward-declare the recursive cycle checker"
      },
      {
        "id": "dfs-grey",
        "code": "\tdfs = func(v int) bool {\n\t\tcolor[v] = 1",
        "role": "enter v: mark it grey — now on the recursion stack"
      },
      {
        "id": "loop",
        "code": "\t\tfor _, u := range adj[v] {",
        "role": "walk every course that depends on v"
      },
      {
        "id": "back-edge",
        "code": "\t\t\tif color[u] == 1 {\n\t\t\t\treturn false // back edge -> cycle",
        "role": "u is grey (still on stack) → back edge → cycle, unschedulable"
      },
      {
        "id": "recurse",
        "code": "\t\t\t}\n\t\t\tif color[u] == 0 && !dfs(u) {\n\t\t\t\treturn false\n\t\t\t}",
        "role": "u unvisited → descend; bubble up false if a cycle is found below"
      },
      {
        "id": "black",
        "code": "\t\t}\n\t\tcolor[v] = 2",
        "role": "all of v’s edges clear → mark v black (finished, off the stack)"
      },
      {
        "id": "dfs-ok",
        "code": "\t\treturn true\n\t}",
        "role": "no back edge reachable from v"
      },
      {
        "id": "outer",
        "code": "\tfor v := 0; v < n; v++ {\n\t\tif color[v] == 0 && !dfs(v) {\n\t\t\treturn false\n\t\t}\n\t}",
        "role": "run DFS from every unvisited course to cover disconnected pieces"
      },
      {
        "id": "done",
        "code": "\treturn true\n}",
        "role": "no cycle anywhere → every course can be scheduled"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What is Course Schedule really asking, algorithmically?",
        "choices": [
          {
            "label": "Does this directed prerequisite graph contain a cycle?",
            "correct": true
          },
          {
            "label": "What is the shortest path between two courses?"
          },
          {
            "label": "How many connected components are there?"
          },
          {
            "label": "Can the courses be sorted alphabetically?"
          }
        ],
        "explain": "Each prerequisite u→v is a directed edge. You can finish every course exactly when the graph has no cycle (it is a DAG). So the task reduces to directed cycle detection."
      },
      {
        "id": "three-colors",
        "prompt": "What do the three DFS colors (white / grey / black) mean?",
        "choices": [
          {
            "label": "White = unvisited, grey = on the current recursion stack, black = fully explored",
            "correct": true
          },
          {
            "label": "White = safe, grey = warning, black = error"
          },
          {
            "label": "They mark which courses are required vs optional"
          },
          {
            "label": "They count how many times a node was visited"
          }
        ],
        "explain": "White nodes are untouched. A node turns grey when DFS enters it and stays grey until all its descendants finish; then it turns black. Only the grey set tells you what is currently on the stack."
      },
      {
        "id": "back-edge",
        "prompt": "How does the DFS detect a cycle?",
        "choices": [
          {
            "label": "An edge that points at a grey (still-on-stack) node — a back edge",
            "correct": true
          },
          {
            "label": "Any edge that points at a black node"
          },
          {
            "label": "When two nodes have the same color"
          },
          {
            "label": "When the recursion stack ever exceeds n entries"
          }
        ],
        "explain": "Reaching a grey node means you have looped back onto a node still in the active call chain — that path plus the back edge forms a cycle. Edges into black nodes are fine; they are already finished."
      },
      {
        "id": "why-unschedulable",
        "prompt": "Why does a cycle make the courses impossible to finish?",
        "choices": [
          {
            "label": "Each course in the loop waits on another, so none can ever be the first to take",
            "correct": true
          },
          {
            "label": "A cycle means duplicate courses in the list"
          },
          {
            "label": "Cycles make the graph disconnected"
          },
          {
            "label": "The recursion runs out of memory"
          }
        ],
        "explain": "In a loop A→B→C→A, A needs C done, C needs B, B needs A — a circular dependency with no valid starting point. There is no topological order, so the schedule cannot exist."
      },
      {
        "id": "dfs-vs-indegree",
        "prompt": "How does the in-degree (Kahn / BFS) approach differ from this DFS?",
        "choices": [
          {
            "label": "It repeatedly removes nodes with in-degree 0; if any remain, a cycle exists",
            "correct": true
          },
          {
            "label": "It is fundamentally slower than DFS"
          },
          {
            "label": "It cannot detect cycles, only DFS can"
          },
          {
            "label": "It requires the graph to be undirected"
          }
        ],
        "explain": "Kahn’s algorithm queues all zero-prerequisite courses, peels them off, and decrements their neighbors’ in-degrees. If fewer than n courses get processed, the leftover nodes form a cycle. Same O(V+E), different bookkeeping."
      },
      {
        "id": "complexity",
        "prompt": "What is the time complexity of the DFS cycle check?",
        "choices": [
          {
            "label": "O(V + E) — each course and each prerequisite is visited once",
            "correct": true
          },
          {
            "label": "O(V²)"
          },
          {
            "label": "O(E log V)"
          },
          {
            "label": "O(2^V)"
          }
        ],
        "explain": "The color array guarantees each node is entered once (V), and across all calls every edge is examined once (E). Total work is linear in the size of the graph."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "chain",
          "title": "Linear prerequisite chain",
          "input": {
            "adj": [
              [
                1
              ],
              [
                2
              ],
              [
                3
              ],
              []
            ],
            "pos": [
              [
                60,
                40
              ],
              [
                60,
                130
              ],
              [
                60,
                220
              ],
              [
                60,
                300
              ]
            ]
          },
          "inputLabel": "0→1→2→3 (each course unlocks the next)",
          "returns": "can finish",
          "tone": "ok",
          "question": "Each edge u→v means \"take u before v\". Can you finish a straight chain 0→1→2→3?",
          "answer": "Yes. DFS walks the chain to the end, painting each node black on the way back. No edge ever points at a grey (on-stack) node, so there is no back edge and no cycle — schedule them in order 0,1,2,3."
        },
        {
          "id": "independent",
          "title": "Independent courses",
          "input": {
            "adj": [
              [],
              [],
              [],
              []
            ],
            "pos": [
              [
                60,
                60
              ],
              [
                220,
                60
              ],
              [
                60,
                220
              ],
              [
                220,
                220
              ]
            ]
          },
          "inputLabel": "4 courses, no prerequisites",
          "returns": "can finish",
          "tone": "ok",
          "question": "Four courses with no prerequisites at all — schedulable?",
          "answer": "Trivially yes. Each DFS call has no outgoing edges, so every node goes white → grey → black immediately. With zero edges there is nothing to loop back on."
        },
        {
          "id": "diamond",
          "title": "Diamond dependency",
          "input": {
            "adj": [
              [
                1,
                2
              ],
              [
                3
              ],
              [
                3
              ],
              []
            ],
            "pos": [
              [
                140,
                40
              ],
              [
                60,
                160
              ],
              [
                220,
                160
              ],
              [
                140,
                280
              ]
            ]
          },
          "inputLabel": "0→{1,2}, 1→3, 2→3 (two paths to 3)",
          "returns": "can finish",
          "tone": "ok",
          "question": "Course 3 depends on both 1 and 2, which both depend on 0. Two paths reach 3 — is that a cycle?",
          "answer": "No. Sharing a node from two paths is fine; a cycle needs an edge back onto the current stack. When DFS reaches 3 the second time (via 2) it is already black/finished, so it is skipped, not flagged. Still a DAG."
        }
      ],
      "bad": [
        {
          "id": "two-cycle",
          "title": "Mutual prerequisites (2-cycle)",
          "input": {
            "adj": [
              [
                1
              ],
              [
                0
              ]
            ],
            "pos": [
              [
                80,
                130
              ],
              [
                240,
                130
              ]
            ]
          },
          "inputLabel": "0→1 and 1→0",
          "returns": "cycle — can't finish",
          "tone": "bad",
          "question": "Course 0 requires 1 and course 1 requires 0. Where does DFS fail?",
          "answer": "DFS enters 0 (grey), follows 0→1, enters 1 (grey), then 1→0 points at 0 — still grey on the stack. That back edge proves the two courses each wait on the other, so neither can ever be taken."
        },
        {
          "id": "three-cycle",
          "title": "Three-course cycle",
          "input": {
            "adj": [
              [
                1
              ],
              [
                2
              ],
              [
                0
              ]
            ],
            "pos": [
              [
                140,
                40
              ],
              [
                240,
                220
              ],
              [
                40,
                220
              ]
            ]
          },
          "inputLabel": "0→1→2→0",
          "returns": "cycle — can't finish",
          "tone": "bad",
          "question": "A longer loop 0→1→2→0 — does the grey-state trick still catch it?",
          "answer": "Yes. All of 0, 1, 2 sit grey on the recursion stack when DFS reaches the edge 2→0. Since 0 is grey, it is a back edge and the whole loop is unschedulable, no matter how long the cycle is."
        },
        {
          "id": "self-loop",
          "title": "Self-prerequisite (self-loop)",
          "input": {
            "adj": [
              [
                0
              ],
              []
            ],
            "pos": [
              [
                100,
                130
              ],
              [
                240,
                130
              ]
            ]
          },
          "inputLabel": "0→0 (course requires itself)",
          "returns": "cycle — can't finish",
          "tone": "bad",
          "question": "Course 0 lists itself as a prerequisite. What happens?",
          "answer": "DFS marks 0 grey, then immediately sees edge 0→0 pointing at the grey 0. The shortest possible back edge — a node depending on itself can never start, so the answer is false."
        }
      ]
    },
    "simulateQuestion": "Which course is taken off the queue next?"
  },
  "imp-7-is-graph-bipartite": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func isBipartite(adj [][]int) bool {",
        "role": "signature — takes the adjacency list, returns a bool"
      },
      {
        "id": "arr",
        "code": "    color := make([]int, len(adj))",
        "role": "0 = unpainted; one colour slot per node"
      },
      {
        "id": "comp",
        "code": "    for i := range adj {",
        "role": "outer loop so every disconnected component is covered"
      },
      {
        "id": "skip",
        "code": "        if color[i] != 0 {\n            continue\n        }",
        "role": "already painted? skip — its BFS already ran"
      },
      {
        "id": "seed",
        "code": "        q := []int{i}\n        color[i] = 1",
        "role": "seed a component: queue the node, paint it team 1"
      },
      {
        "id": "bfs",
        "code": "        for len(q) > 0 {",
        "role": "BFS while the queue still has nodes"
      },
      {
        "id": "deq",
        "code": "            v := q[0]\n            q = q[1:]",
        "role": "dequeue the front node v"
      },
      {
        "id": "nbloop",
        "code": "            for _, nb := range adj[v] {",
        "role": "scan every neighbour of v"
      },
      {
        "id": "paint",
        "code": "                if color[nb] == 0 {\n                    color[nb] = 3 - color[v]\n                    q = append(q, nb)",
        "role": "blank neighbour → paint the opposite colour, enqueue it"
      },
      {
        "id": "clash",
        "code": "                } else if color[nb] == color[v] {\n                    return false\n                }",
        "role": "same colour as v → not bipartite, return false"
      },
      {
        "id": "close",
        "code": "            }\n        }\n    }",
        "role": "close the neighbour loop, the BFS loop, and the component loop"
      },
      {
        "id": "ret",
        "code": "    return true\n}",
        "role": "no clash ever happened → bipartite"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "Which problem category does “Is graph bipartite?” fall under?",
        "choices": [
          {
            "label": "Graph — traversal & 2-colouring",
            "correct": true
          },
          {
            "label": "Dynamic programming"
          },
          {
            "label": "Backtracking / permutations"
          },
          {
            "label": "Greedy intervals"
          }
        ],
        "explain": "It is a pure graph problem: model nodes and edges, traverse, and try to 2-colour. No DP table and no backtracking are involved."
      },
      {
        "id": "traversal",
        "prompt": "What traversal does this solution use to spread colours?",
        "choices": [
          {
            "label": "BFS with an explicit queue",
            "correct": true
          },
          {
            "label": "DFS recursion"
          },
          {
            "label": "Dijkstra (priority queue)"
          },
          {
            "label": "Union-Find"
          }
        ],
        "explain": "It treats a slice as a FIFO queue (q[0], q[1:], append) — classic BFS. DFS also solves bipartite, but this code is BFS."
      },
      {
        "id": "backtrack",
        "prompt": "Does this need backtracking — undoing colour choices when stuck?",
        "choices": [
          {
            "label": "No — greedy 2-colouring; a clash is immediate and final",
            "correct": true
          },
          {
            "label": "Yes, you must undo colours when stuck"
          },
          {
            "label": "Yes, try all 2^V colourings"
          },
          {
            "label": "Only for disconnected graphs"
          }
        ],
        "explain": "Once a node’s colour is chosen, every reachable node’s colour is forced. A clash can never be repaired by retrying, so there is nothing to backtrack."
      },
      {
        "id": "flip",
        "prompt": "How does it choose a blank neighbour’s colour?",
        "choices": [
          {
            "label": "3 - color[v] — flips 1 ↔ 2",
            "correct": true
          },
          {
            "label": "color[v] + 1"
          },
          {
            "label": "a random colour"
          },
          {
            "label": "the same as color[v]"
          }
        ],
        "explain": "Colours are 1 and 2. 3 - 1 = 2 and 3 - 2 = 1, so 3 - color[v] is the opposite colour in one expression."
      },
      {
        "id": "fail",
        "prompt": "What makes the function return false?",
        "choices": [
          {
            "label": "A neighbour already has the SAME colour as the current node",
            "correct": true
          },
          {
            "label": "The queue becomes empty"
          },
          {
            "label": "A node has no neighbours"
          },
          {
            "label": "Every node gets coloured"
          }
        ],
        "explain": "Same colour across an edge means two adjacent nodes sit on the same side — impossible for a bipartite graph."
      },
      {
        "id": "components",
        "prompt": "Why the outer `for i := range adj` with `if color[i] != 0 { continue }`?",
        "choices": [
          {
            "label": "To start a fresh BFS in every disconnected component",
            "correct": true
          },
          {
            "label": "To remove duplicate edges"
          },
          {
            "label": "To sort the nodes"
          },
          {
            "label": "To count the edges"
          }
        ],
        "explain": "One BFS only reaches a single component. The outer loop re-seeds any still-unpainted node so every component is checked."
      },
      {
        "id": "complexity",
        "prompt": "What is the time complexity?",
        "choices": [
          {
            "label": "O(V + E)",
            "correct": true
          },
          {
            "label": "O(V²)"
          },
          {
            "label": "O(E log V)"
          },
          {
            "label": "O(2^V)"
          }
        ],
        "explain": "Each node is enqueued once and each edge is examined a constant number of times → O(V + E)."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "c4",
          "title": "Even cycle (C4)",
          "question": "0–1–2–3–0, a four-node loop. Bipartite?",
          "answer": "Yes. Even-length cycles 2-colour cleanly: 0 and 2 land on team 1, 1 and 3 on team 2, every edge crosses.",
          "input": {
            "adj": [
              [
                1,
                3
              ],
              [
                0,
                2
              ],
              [
                1,
                3
              ],
              [
                0,
                2
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                275,
                143
              ],
              [
                176,
                242
              ],
              [
                77,
                143
              ]
            ]
          },
          "inputLabel": "4 nodes",
          "returns": "bipartite",
          "tone": "ok"
        },
        {
          "id": "path",
          "title": "Path / tree",
          "question": "A straight chain 0–1–2–3 with no loop?",
          "answer": "Yes. Every tree or forest is bipartite — just colour nodes by the parity of their depth.",
          "input": {
            "adj": [
              [
                1
              ],
              [
                0,
                2
              ],
              [
                1,
                3
              ],
              [
                2
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                275,
                143
              ],
              [
                176,
                242
              ],
              [
                77,
                143
              ]
            ]
          },
          "inputLabel": "4 nodes",
          "returns": "bipartite",
          "tone": "ok"
        },
        {
          "id": "k23",
          "title": "Complete bipartite K(2,3)",
          "question": "Two nodes each joined to the same three nodes?",
          "answer": "Yes, bipartite by construction: {0,1} versus {2,3,4}. Every edge already crosses the split.",
          "input": {
            "adj": [
              [
                2,
                3,
                4
              ],
              [
                2,
                3,
                4
              ],
              [
                0,
                1
              ],
              [
                0,
                1
              ],
              [
                0,
                1
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                270,
                112
              ],
              [
                234,
                223
              ],
              [
                118,
                223
              ],
              [
                82,
                112
              ]
            ]
          },
          "inputLabel": "5 nodes",
          "returns": "bipartite",
          "tone": "ok"
        },
        {
          "id": "forest",
          "title": "Two separate edges",
          "question": "A disconnected graph of two components?",
          "answer": "Yes. The outer loop re-seeds each uncoloured component independently, and both 2-colour without conflict.",
          "input": {
            "adj": [
              [
                1
              ],
              [
                0
              ],
              [
                3
              ],
              [
                2
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                275,
                143
              ],
              [
                176,
                242
              ],
              [
                77,
                143
              ]
            ]
          },
          "inputLabel": "4 nodes",
          "returns": "bipartite",
          "tone": "ok"
        }
      ],
      "bad": [
        {
          "id": "c3",
          "title": "Triangle (C3)",
          "question": "Three mutually-connected nodes?",
          "answer": "No. 0 = team 1 forces 1 and 2 onto team 2, but the 1–2 edge then joins two same-team nodes. Clash.",
          "input": {
            "adj": [
              [
                1,
                2
              ],
              [
                0,
                2
              ],
              [
                0,
                1
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                262,
                193
              ],
              [
                90,
                193
              ]
            ]
          },
          "inputLabel": "3 nodes",
          "returns": "not bipartite",
          "tone": "bad"
        },
        {
          "id": "c5",
          "title": "Odd cycle (C5)",
          "question": "A five-node loop?",
          "answer": "No. Colours alternate around the ring and collide at the closing edge — every odd cycle fails.",
          "input": {
            "adj": [
              [
                1,
                4
              ],
              [
                0,
                2
              ],
              [
                1,
                3
              ],
              [
                2,
                4
              ],
              [
                0,
                3
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                270,
                112
              ],
              [
                234,
                223
              ],
              [
                118,
                223
              ],
              [
                82,
                112
              ]
            ]
          },
          "inputLabel": "5 nodes",
          "returns": "not bipartite",
          "tone": "bad"
        },
        {
          "id": "k4",
          "title": "Complete graph (K4)",
          "question": "Four nodes with every pair connected?",
          "answer": "No. Any complete graph on 3+ nodes contains a triangle, so it can never be 2-coloured.",
          "input": {
            "adj": [
              [
                1,
                2,
                3
              ],
              [
                0,
                2,
                3
              ],
              [
                0,
                1,
                3
              ],
              [
                0,
                1,
                2
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                275,
                143
              ],
              [
                176,
                242
              ],
              [
                77,
                143
              ]
            ]
          },
          "inputLabel": "4 nodes",
          "returns": "not bipartite",
          "tone": "bad"
        },
        {
          "id": "tailed",
          "title": "Triangle with a tail",
          "question": "A triangle 0–1–2 plus a dangling node 3?",
          "answer": "No. The pendant node 3 is harmless, but the embedded 0–1–2 triangle still forces a same-team edge.",
          "input": {
            "adj": [
              [
                1,
                2,
                3
              ],
              [
                0,
                2
              ],
              [
                0,
                1
              ],
              [
                0
              ]
            ],
            "pos": [
              [
                176,
                44
              ],
              [
                275,
                143
              ],
              [
                176,
                242
              ],
              [
                77,
                143
              ]
            ]
          },
          "inputLabel": "4 nodes",
          "returns": "not bipartite",
          "tone": "bad"
        }
      ]
    },
    "simulateQuestion": "Which node gets colored next?"
  },
  "imp-6-find-shortest-path-with-dijkstra-s": {
    "codePieces": [
      {
        "id": "pq-type",
        "code": "type Item struct {\n\tnode, dist int\n}\n\ntype PQ []Item",
        "role": "heap element: a node paired with its tentative distance"
      },
      {
        "id": "pq-order",
        "code": "func (p PQ) Len() int            { return len(p) }\nfunc (p PQ) Less(i, j int) bool  { return p[i].dist < p[j].dist }\nfunc (p PQ) Swap(i, j int)       { p[i], p[j] = p[j], p[i] }",
        "role": "min-heap ordering: smallest tentative distance on top"
      },
      {
        "id": "pq-pushpop",
        "code": "func (p *PQ) Push(x interface{}) { *p = append(*p, x.(Item)) }\nfunc (p *PQ) Pop() interface{} {\n\told := *p\n\tn := len(old)\n\tit := old[n-1]\n\t*p = old[:n-1]\n\treturn it\n}",
        "role": "heap.Interface plumbing for push and pop"
      },
      {
        "id": "sig",
        "code": "func dijkstra(n int, adj [][][2]int, src int) []int {",
        "role": "signature: distances from src given adjacency [to, weight] lists"
      },
      {
        "id": "init-dist",
        "code": "\tconst INF = 1 << 30\n\tdist := make([]int, n)\n\tfor i := range dist {\n\t\tdist[i] = INF\n\t}",
        "role": "every distance starts at ∞ (unreachable)"
      },
      {
        "id": "seed",
        "code": "\tdist[src] = 0\n\tpq := &PQ{{node: src, dist: 0}}",
        "role": "source distance is 0; seed the heap with it"
      },
      {
        "id": "loop",
        "code": "\tfor pq.Len() > 0 {\n\t\tcur := heap.Pop(pq).(Item)",
        "role": "pop the closest unsettled node — the greedy choice"
      },
      {
        "id": "stale",
        "code": "\t\tif cur.dist > dist[cur.node] {\n\t\t\tcontinue // stale entry\n\t\t}",
        "role": "skip outdated heap entries left by earlier relaxations"
      },
      {
        "id": "edges",
        "code": "\t\tfor _, e := range adj[cur.node] {\n\t\t\tv, w := e[0], e[1]",
        "role": "examine each outgoing edge of the settled node"
      },
      {
        "id": "relax",
        "code": "\t\t\tif nd := cur.dist + w; nd < dist[v] {\n\t\t\t\tdist[v] = nd\n\t\t\t\theap.Push(pq, Item{node: v, dist: nd})\n\t\t\t}",
        "role": "relax: if going through cur is cheaper, improve dist[v] and re-queue"
      },
      {
        "id": "close",
        "code": "\t\t}\n\t}",
        "role": "close the edge loop and the main loop"
      },
      {
        "id": "return",
        "code": "\treturn dist\n}",
        "role": "return the finalized shortest distances from src"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What problem does Dijkstra solve?",
        "choices": [
          {
            "label": "Single-source shortest paths on a weighted graph with non-negative edges",
            "correct": true
          },
          {
            "label": "Minimum spanning tree"
          },
          {
            "label": "Shortest path on an unweighted graph"
          },
          {
            "label": "Detecting a cycle in a directed graph"
          }
        ],
        "explain": "Dijkstra computes the shortest distance from one source to every other node, provided all edge weights are non-negative."
      },
      {
        "id": "greedy-choice",
        "prompt": "At each step, which node does Dijkstra settle next?",
        "choices": [
          {
            "label": "The unvisited node with the smallest tentative distance",
            "correct": true
          },
          {
            "label": "The node with the most outgoing edges"
          },
          {
            "label": "Any unvisited neighbour of the last node, in order"
          },
          {
            "label": "The node that was added to the frontier earliest"
          }
        ],
        "explain": "It greedily pops the closest unsettled node. Because weights are non-negative, that node’s tentative distance can never improve again, so it is final."
      },
      {
        "id": "relax",
        "prompt": "What does it mean to \"relax\" an edge u→v of weight w?",
        "choices": [
          {
            "label": "If dist[u] + w < dist[v], lower dist[v] to dist[u] + w",
            "correct": true
          },
          {
            "label": "Delete the edge once both endpoints are visited"
          },
          {
            "label": "Add w to every distance in the graph"
          },
          {
            "label": "Mark v as visited"
          }
        ],
        "explain": "Relaxation tests whether reaching v through u is cheaper than v’s current best, and if so improves v’s tentative distance."
      },
      {
        "id": "why-settled-final",
        "prompt": "Why is a node’s distance final the moment it is settled?",
        "choices": [
          {
            "label": "Any later path would go through an already-larger distance, and non-negative edges can only add to it",
            "correct": true
          },
          {
            "label": "Because the graph is acyclic"
          },
          {
            "label": "Because every node is visited exactly once in input order"
          },
          {
            "label": "Because the priority queue is a max-heap"
          }
        ],
        "explain": "The settled node has the smallest tentative distance among the unvisited; reaching it via any other unsettled node costs at least as much, since no edge is negative."
      },
      {
        "id": "negative",
        "prompt": "Why does Dijkstra fail on graphs with negative edge weights?",
        "choices": [
          {
            "label": "A node can be settled, then a later negative edge offers a cheaper path the algorithm never reconsiders",
            "correct": true
          },
          {
            "label": "The priority queue cannot store negative numbers"
          },
          {
            "label": "Negative weights make the graph disconnected"
          },
          {
            "label": "It does not fail; Dijkstra handles them fine"
          }
        ],
        "explain": "Dijkstra’s correctness relies on a settled distance being final. A negative edge can shrink a path after the fact, breaking that guarantee — use Bellman-Ford instead."
      },
      {
        "id": "complexity",
        "prompt": "With a binary min-heap, what is Dijkstra’s time complexity?",
        "choices": [
          {
            "label": "O((V + E) log V)",
            "correct": true
          },
          {
            "label": "O(V²) regardless of the data structure"
          },
          {
            "label": "O(E)"
          },
          {
            "label": "O(V · E)"
          }
        ],
        "explain": "Each of the E edges may push a heap entry (log V) and each of the V nodes is popped once (log V), giving O((V + E) log V). A plain array scan instead gives O(V²)."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "line",
          "title": "Straight chain",
          "input": {
            "n": 4,
            "edges": [
              [
                0,
                1,
                2
              ],
              [
                1,
                2,
                3
              ],
              [
                2,
                3,
                1
              ]
            ],
            "pos": [
              [
                40,
                150
              ],
              [
                150,
                150
              ],
              [
                260,
                150
              ],
              [
                360,
                150
              ]
            ]
          },
          "inputLabel": "0→1(2) 1→2(3) 2→3(1)",
          "returns": "dist to all",
          "tone": "ok",
          "question": "With one path out of 0, how does Dijkstra settle the nodes?",
          "answer": "Nearest-first. It settles 0 (0), relaxes to 1 (2), settles 1, relaxes to 2 (5), settles 2, relaxes to 3 (6). Each node has only one tentative value, so the final distances are [0, 2, 5, 6]."
        },
        {
          "id": "detour",
          "title": "Cheaper 2-hop beats the direct edge",
          "input": {
            "n": 3,
            "edges": [
              [
                0,
                1,
                1
              ],
              [
                0,
                2,
                5
              ],
              [
                1,
                2,
                1
              ]
            ],
            "pos": [
              [
                40,
                150
              ],
              [
                200,
                60
              ],
              [
                200,
                240
              ]
            ]
          },
          "inputLabel": "0→1(1) 0→2(5) 1→2(1)",
          "returns": "dist to all",
          "tone": "ok",
          "question": "The direct edge 0→2 costs 5. Why does Dijkstra report dist[2] = 2?",
          "answer": "This is the key insight. Dijkstra first settles 1 at distance 1 (the smallest tentative distance), then relaxes 1→2 to give 1 + 1 = 2, which beats the direct 0→2 of 5. The greedy direct edge is not the shortest route — a cheaper 2-hop detour wins."
        },
        {
          "id": "diamond",
          "title": "Two routes converge",
          "input": {
            "n": 6,
            "edges": [
              [
                0,
                1,
                2
              ],
              [
                0,
                2,
                4
              ],
              [
                1,
                2,
                1
              ],
              [
                1,
                3,
                7
              ],
              [
                2,
                4,
                3
              ],
              [
                3,
                5,
                1
              ],
              [
                4,
                3,
                2
              ],
              [
                4,
                5,
                5
              ]
            ],
            "pos": [
              [
                60,
                50
              ],
              [
                180,
                50
              ],
              [
                60,
                150
              ],
              [
                180,
                150
              ],
              [
                60,
                250
              ],
              [
                180,
                250
              ]
            ]
          },
          "inputLabel": "6 nodes, 8 edges (weighted DAG)",
          "returns": "dist to all",
          "tone": "ok",
          "question": "Node 3 can be reached via 1→3 (7) or via 2→4→3. Which wins?",
          "answer": "The detour. dist[2] settles at 3 (0→1→2), so 2→4 gives 6 and 4→3 gives 8, beating 1→3 = 2 + 7 = 9. Because each node is finalized only after its smallest tentative distance is settled, the answer [0, 2, 3, 8, 6, 9] needs no revisiting — that is why non-negative weights are required."
        },
        {
          "id": "island",
          "title": "Unreachable node stays ∞",
          "input": {
            "n": 4,
            "edges": [
              [
                0,
                1,
                2
              ],
              [
                1,
                2,
                3
              ],
              [
                3,
                0,
                1
              ]
            ],
            "pos": [
              [
                40,
                100
              ],
              [
                150,
                100
              ],
              [
                260,
                100
              ],
              [
                260,
                230
              ]
            ]
          },
          "inputLabel": "0→1(2) 1→2(3) 3→0(1)",
          "returns": "dist[3] = ∞",
          "tone": "ok",
          "question": "Every edge into node 3 is missing. What distance does it get?",
          "answer": "Infinity. Node 3 only has an outgoing edge (3→0), so no relaxation ever lowers dist[3] below its initial ∞. When the smallest unvisited distance is ∞, the loop stops and 3 is reported as unreachable: dist = [0, 2, 5, ∞]."
        }
      ]
    },
    "simulateQuestion": "Which node does Dijkstra relax next?"
  },
  "imp-0-08-topological-sort-with-dfs": {
    "codePieces": [
      {
        "id": "sig",
        "code": "func topoSort(adj [][]int) []int {",
        "role": "signature — adjacency list in, topological order out (nil on cycle)"
      },
      {
        "id": "indeg-init",
        "code": "\tn := len(adj)\n\tindeg := make([]int, n)",
        "role": "one in-degree counter per node"
      },
      {
        "id": "count",
        "code": "\tfor v := 0; v < n; v++ {\n\t\tfor _, u := range adj[v] {\n\t\t\tindeg[u]++\n\t\t}\n\t}",
        "role": "count incoming edges: every edge v→u bumps indeg[u]"
      },
      {
        "id": "seed-init",
        "code": "\tqueue := []int{}",
        "role": "queue holds the ready nodes (in-degree 0)"
      },
      {
        "id": "seed",
        "code": "\tfor v := 0; v < n; v++ {\n\t\tif indeg[v] == 0 {\n\t\t\tqueue = append(queue, v)\n\t\t}\n\t}",
        "role": "seed with every initial source — no prerequisites"
      },
      {
        "id": "order-init",
        "code": "\torder := []int{}",
        "role": "accumulates the emitted topological order"
      },
      {
        "id": "loop",
        "code": "\tfor len(queue) > 0 {",
        "role": "process ready nodes until the queue drains"
      },
      {
        "id": "pop",
        "code": "\t\tv := queue[0]\n\t\tqueue = queue[1:]\n\t\torder = append(order, v)",
        "role": "pop a source and append it to the order"
      },
      {
        "id": "relax",
        "code": "\t\tfor _, u := range adj[v] {\n\t\t\tindeg[u]--",
        "role": "relax each outgoing edge — one prerequisite cleared"
      },
      {
        "id": "ready",
        "code": "\t\t\tif indeg[u] == 0 {\n\t\t\t\tqueue = append(queue, u)\n\t\t\t}\n\t\t}\n\t}",
        "role": "newly-zero node becomes ready → enqueue it"
      },
      {
        "id": "cycle",
        "code": "\tif len(order) < n {\n\t\treturn nil // cycle\n\t}",
        "role": "not all nodes emitted → a cycle blocked them"
      },
      {
        "id": "done",
        "code": "\treturn order\n}",
        "role": "every node placed → return the valid order"
      }
    ],
    "quiz": [
      {
        "id": "category",
        "prompt": "What problem does topological sort solve?",
        "choices": [
          {
            "label": "Ordering nodes of a directed graph so every edge points forward (dependencies first)",
            "correct": true
          },
          {
            "label": "Finding the shortest path between two nodes"
          },
          {
            "label": "Sorting an array of numbers in O(n log n)"
          },
          {
            "label": "Detecting the largest connected component"
          }
        ],
        "explain": "It linearises a directed acyclic graph so that for every edge u→v, u appears before v — the canonical way to order tasks under prerequisite constraints."
      },
      {
        "id": "indegree",
        "prompt": "In Kahn's algorithm, what does a node's in-degree count?",
        "choices": [
          {
            "label": "How many edges point INTO it — i.e. how many prerequisites remain",
            "correct": true
          },
          {
            "label": "How many edges leave it"
          },
          {
            "label": "Its distance from the start node"
          },
          {
            "label": "The number of times it has been visited"
          }
        ],
        "explain": "In-degree is the number of incoming edges. While it is > 0 something still points at the node, so it cannot be output yet."
      },
      {
        "id": "source",
        "prompt": "Which nodes are safe to output at any moment?",
        "choices": [
          {
            "label": "Any node with in-degree 0 — every prerequisite is already placed",
            "correct": true
          },
          {
            "label": "The node with the most outgoing edges"
          },
          {
            "label": "The node added to the graph last"
          },
          {
            "label": "Any leaf with out-degree 0"
          }
        ],
        "explain": "A node with in-degree 0 has no unmet dependency, so it can go next. Outputting it relaxes its outgoing edges, possibly creating new sources."
      },
      {
        "id": "dag",
        "prompt": "Why does topological sort require a DAG (no cycles)?",
        "choices": [
          {
            "label": "A cycle means a set of nodes each wait on another, so none can ever be first",
            "correct": true
          },
          {
            "label": "Cycles make the graph too large to fit in memory"
          },
          {
            "label": "Undirected edges cannot be ordered"
          },
          {
            "label": "It only works when every node has the same degree"
          }
        ],
        "explain": "In a cycle 0→1→…→0 each node depends on the next, so no node ever reaches in-degree 0. A valid linear order is mathematically impossible."
      },
      {
        "id": "cycle-detect",
        "prompt": "How does Kahn detect that the graph has a cycle?",
        "choices": [
          {
            "label": "Fewer than V nodes were emitted when the queue empties",
            "correct": true
          },
          {
            "label": "A node is enqueued twice"
          },
          {
            "label": "The order array is sorted incorrectly"
          },
          {
            "label": "An edge weight is negative"
          }
        ],
        "explain": "If a cycle exists, its nodes never reach in-degree 0, so the queue drains before all V are output. order.length < V is the cycle signal."
      },
      {
        "id": "complexity",
        "prompt": "What is the time complexity of Kahn's algorithm?",
        "choices": [
          {
            "label": "O(V + E) — each node and each edge is processed once",
            "correct": true
          },
          {
            "label": "O(V²)"
          },
          {
            "label": "O(E log V)"
          },
          {
            "label": "O(V!)"
          }
        ],
        "explain": "Computing in-degrees scans every edge, and each node is enqueued/dequeued once while each edge is relaxed once — linear in vertices plus edges."
      }
    ],
    "cases": {
      "good": [
        {
          "id": "chain",
          "title": "Linear chain",
          "input": {
            "adj": [
              [
                1
              ],
              [
                2
              ],
              [
                3
              ],
              []
            ],
            "pos": [
              [
                60,
                50
              ],
              [
                200,
                50
              ],
              [
                200,
                200
              ],
              [
                60,
                200
              ]
            ]
          },
          "inputLabel": "0→1→2→3",
          "returns": "valid order",
          "tone": "ok",
          "question": "A straight chain of dependencies — what order comes out, and why is it forced?",
          "answer": "Exactly [0, 1, 2, 3]. Only node 0 starts with in-degree 0; outputting it drops 1 to 0, then 2, then 3. Each step exposes exactly one new source, so the order is unique."
        },
        {
          "id": "diamond",
          "title": "Diamond dependency",
          "input": {
            "adj": [
              [
                1,
                2
              ],
              [
                3
              ],
              [
                3
              ],
              []
            ],
            "pos": [
              [
                130,
                40
              ],
              [
                50,
                150
              ],
              [
                210,
                150
              ],
              [
                130,
                260
              ]
            ]
          },
          "inputLabel": "0→{1,2}, 1→3, 2→3",
          "returns": "valid order",
          "tone": "ok",
          "question": "Node 3 depends on both 1 and 2 — when does it become ready?",
          "answer": "Only after BOTH 1 and 2 are output: its in-degree starts at 2 and must hit 0 first. Order [0, 1, 2, 3] works; 1 and 2 are interchangeable, so [0, 2, 1, 3] is equally valid."
        },
        {
          "id": "forest",
          "title": "Two independent roots",
          "input": {
            "adj": [
              [
                2
              ],
              [
                2
              ],
              [
                3
              ],
              []
            ],
            "pos": [
              [
                50,
                50
              ],
              [
                210,
                50
              ],
              [
                130,
                160
              ],
              [
                130,
                270
              ]
            ]
          },
          "inputLabel": "0→2, 1→2, 2→3",
          "returns": "valid order",
          "tone": "ok",
          "question": "Two nodes (0 and 1) have no prerequisites — how does Kahn handle multiple sources?",
          "answer": "Both 0 and 1 enter the queue at the start. They are output in any order; node 2 only becomes ready once both are placed (in-degree drops 2→1→0), then 3 follows."
        }
      ],
      "bad": [
        {
          "id": "cycle",
          "title": "Three-node cycle",
          "input": {
            "adj": [
              [
                1
              ],
              [
                2
              ],
              [
                0
              ]
            ],
            "pos": [
              [
                130,
                40
              ],
              [
                50,
                200
              ],
              [
                210,
                200
              ]
            ]
          },
          "inputLabel": "0→1→2→0",
          "returns": "cycle — no order",
          "tone": "bad",
          "question": "Each node points to the next in a loop — why can nothing be output?",
          "answer": "Every node has in-degree 1, so the seed queue is empty from the start. With no source to pop, the loop never runs and 0 of 3 nodes are placed — a cycle has no valid order."
        },
        {
          "id": "tail-into-cycle",
          "title": "Source feeding a cycle",
          "input": {
            "adj": [
              [
                1
              ],
              [
                2
              ],
              [
                3
              ],
              [
                1
              ]
            ],
            "pos": [
              [
                60,
                50
              ],
              [
                220,
                50
              ],
              [
                220,
                200
              ],
              [
                60,
                200
              ]
            ]
          },
          "inputLabel": "0→1, 1→2→3→1",
          "returns": "cycle — no order",
          "tone": "bad",
          "question": "Node 0 has in-degree 0, so the queue is not empty — does that save us?",
          "answer": "No. 0 is output, dropping 1 to in-degree 1, but 1, 2, 3 form a loop (3→1) so none of them ever reaches 0. Only 1 of 4 nodes is placed; the leftover cycle proves no ordering exists."
        }
      ]
    },
    "simulateQuestion": "Which node is peeled off next?"
  }
} as Record<string, PracticeBundle>;
