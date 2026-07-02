import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What problem category and traversal strategy does `ladderLength` use?",
      "choices": [
        {
          "label": "Unweighted graph BFS to find — the shortest transformation sequence",
          "correct": true
        },
        {
          "label": "DFS with backtracking to enumerate — all transformation paths"
        },
        {
          "label": "Dijkstra's shortest path — weighted word graph"
        },
        {
          "label": "Dynamic programming — word pairs"
        }
      ],
      "explain": "The code uses level-by-level BFS (steps increments once per level, sz captures the layer size) to find the minimum number of transformations. Because all edges have cost 1, BFS gives the shortest path; Dijkstra is unnecessary."
    },
    {
      "id": "visited-mechanism",
      "prompt": "How does this solution prevent revisiting the same word during BFS, and why is this approach efficient?",
      "choices": [
        {
          "label": "It deletes the word — delete(wordSet, w) removes a word the",
          "correct": true
        },
        {
          "label": "It maintains a separate `visited — map[string]bool` and checks it before"
        },
        {
          "label": "It tracks visited words — a sorted slice and uses binary search"
        },
        {
          "label": "It relies on the queue — never containing duplicates because"
        }
      ],
      "explain": "`delete(wordSet, w)` removes a word the moment it is added to the queue. This reuses the existing hash map for O(1) membership checks and O(1) deletion, avoiding the overhead of a second data structure."
    },
    {
      "id": "neighbor-generation",
      "prompt": "For a word of length L, how does the code generate all valid one-edit neighbors?",
      "choices": [
        {
          "label": "For each of L positions — it tries all 26 letters (skipping the",
          "correct": true
        },
        {
          "label": "It compares the current word — against every remaining word in"
        },
        {
          "label": "It precomputes an adjacency list — of all word pairs with edit distance"
        },
        {
          "label": "It generates all anagrams — the current word and intersects them"
        }
      ],
      "explain": "The inner loops `for j := 0; j < len(buf); j++` and `for c := byte('a'); c <= 'z'; c++` systematically try every letter at every position (L·25 candidates). Checking wordSet is O(1), making this O(L·26) per word. Comparing every word pair would be O(n·L) per node, much worse."
    },
    {
      "id": "early-termination",
      "prompt": "Where in the BFS loop does the code check whether it has reached `endWord`, and why is that placement correct?",
      "choices": [
        {
          "label": "When dequeuing `cur` — if cur==endWord, return steps immediately",
          "correct": true
        },
        {
          "label": "After enqueuing a neighbor — return"
        },
        {
          "label": "After each full BFS level — completes check whether endWord is in"
        },
        {
          "label": "Before starting BFS — if beginWord==endWord, return 1"
        }
      ],
      "explain": "The check `if cur == endWord { return steps }` fires when the word is dequeued. At that point `steps` already reflects this node's level (incremented at the top of the outer loop before processing the level), so the returned value is correct."
    },
    {
      "id": "complexity",
      "prompt": "Given n words of length L in the word list, what is the time complexity?",
      "choices": [
        {
          "label": "O(n·L·26) — Each of the n words is dequeued at",
          "correct": true
        },
        {
          "label": "O(n²·L) — Each of the n words is dequeued"
        },
        {
          "label": "O(n·L²) — Each of the n words is dequeued"
        },
        {
          "label": "O(26^L) — Each of the n words is dequeued"
        }
      ],
      "explain": "Each of the n words is dequeued at most once. Generating neighbors for one word costs O(L·26) (L positions × 26 letters), with O(L) to build the string and O(1) map lookup. Total: O(n·L·26), which simplifies to O(n·L)."
    },
    {
      "id": "early-exit",
      "prompt": "What does the function return if `endWord` is not in `wordSet` at the very start, and why is this check necessary?",
      "choices": [
        {
          "label": "Returns 0 immediately; — the set it can never be reached",
          "correct": true
        },
        {
          "label": "Returns -1; the BFS — exhaust all reachable words without"
        },
        {
          "label": "Returns 1; beginWord and endWord — are treated as directly connected"
        },
        {
          "label": "Returns len(endWord); the length — the word is used as a heuristic"
        }
      ],
      "explain": "Neighbor generation only enqueues words found in wordSet. If endWord is absent from the set it can never be enqueued, so BFS would finish and fall through to `return 0`. The early check avoids unnecessary BFS work and is the contract the problem specifies."
    }
  ]
};
