import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which traversal strategy does `depthSum` use?",
      "choices": [
        {
          "label": "DFS recursion — increasing depth at each nested list",
          "correct": true
        },
        {
          "label": "BFS with a queue, processing — one depth level per iteration"
        },
        {
          "label": "Iterative stack-based DFS — btDepthSum calls itself"
        },
        {
          "label": "Dynamic programming on depth levels — btDepthSum calls itself"
        }
      ],
      "explain": "`btDepthSum` calls itself recursively with `depth+1` when it encounters a nested list. This is DFS — the call stack encodes the nesting depth. BFS would require an explicit queue and process all items at one depth before moving deeper."
    },
    {
      "id": "key-mechanic",
      "prompt": "How does `btDepthSum` contribute an integer element to the sum?",
      "choices": [
        {
          "label": "`sum += item.Val * depth` — the value is multiplied by its nesting depth",
          "correct": true
        },
        {
          "label": "`sum += item.Val + depth` — depth is added, not multiplied"
        },
        {
          "label": "`sum += item.Val` — depth is tracked separately"
        },
        {
          "label": "`sum += item.Val / depth` — deeper integers are weighted less"
        }
      ],
      "explain": "The problem defines weight as the depth level, so an integer at depth d contributes d times its value. The code does `item.Val * depth` exactly."
    },
    {
      "id": "base-case",
      "prompt": "What stops the recursion in `btDepthSum`?",
      "choices": [
        {
          "label": "When `item.Integer` is true — function does not recurse it",
          "correct": true
        },
        {
          "label": "When `depth > maxDepth` — sentinel value is returned"
        },
        {
          "label": "When the list slice — nil"
        },
        {
          "label": "When `item.Val == 0` — There is no explicit depth-limit"
        }
      ],
      "explain": "There is no explicit depth-limit base case. Recursion stops naturally when every element in a list is an integer (not a nested list), because the `else` branch (which recurses) is never taken. An empty list also terminates the loop immediately."
    },
    {
      "id": "initial-depth",
      "prompt": "Why does `depthSum` call `btDepthSum(list, 1)` with depth 1, not 0?",
      "choices": [
        {
          "label": "The outermost list — depth 1 per the problem definition;",
          "correct": true
        },
        {
          "label": "Depth 0 would cause integer — overflow"
        },
        {
          "label": "The recursion decrements — LeetCode #339 defines the"
        },
        {
          "label": "Starting at 0 would skip — the first element"
        }
      ],
      "explain": "LeetCode #339 defines the outermost list as depth 1. If depth started at 0, top-level integers would be multiplied by 0 and contribute nothing to the sum, giving a wrong answer."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `depthSum`?",
      "choices": [
        {
          "label": "Time O(N) — Space O(N) where N is the total",
          "correct": true
        },
        {
          "label": "Time O(N · D), Space — O(D) where D is the maximum depth"
        },
        {
          "label": "Time O(N^2), Space O(N) — Every NestedInteger node is"
        },
        {
          "label": "Time O(N), Space O(1) — Every NestedInteger node is"
        }
      ],
      "explain": "Every NestedInteger node is visited exactly once, giving O(N) time. Space is O(N) in the worst case because the recursion stack can be as deep as N (a fully nested structure like `[[[[[1]]]]]` has depth N)."
    },
    {
      "id": "edge-empty",
      "prompt": "What does `depthSum([])` return?",
      "choices": [
        {
          "label": "0 — the for loop in `btDepthSum` over an empty slice adds nothing",
          "correct": true
        },
        {
          "label": "1 — the initial depth value"
        },
        {
          "label": "A panic due to nil — dereference"
        },
        {
          "label": "-1 — a sentinel for empty input"
        }
      ],
      "explain": "`btDepthSum` initializes `sum := 0` and loops over `list`. An empty slice means zero iterations, so `sum` stays 0 and is returned. No panic occurs."
    }
  ]
};
