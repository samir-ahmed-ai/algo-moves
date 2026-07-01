import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Longest Valid Parentheses is tagged both 'Stack' and 'Dynamic Programming'. Which pattern does this specific solution use?",
      "choices": [
        {
          "label": "Stack of indices — sentinel",
          "correct": true
        },
        {
          "label": "Bottom-up DP array tracking valid — length ending at each index"
        },
        {
          "label": "Two-pass left-right counter scan — The code pushes/pops indices"
        },
        {
          "label": "Memoized recursion on substring — The code pushes/pops indices"
        }
      ],
      "explain": "The code pushes/pops indices onto a `stack` seeded with a sentinel `-1`; span is computed as `i - stack[len(stack)-1]`. A DP array approach would never appear here."
    },
    {
      "id": "sentinel",
      "prompt": "The stack is initialized as `[]int{-1}` instead of an empty slice. Why is that sentinel needed?",
      "choices": [
        {
          "label": "It acts as a base — index so the span `i - stack[top]` is",
          "correct": true
        },
        {
          "label": "It prevents an index-out-of-bounds — when pushing the first '('"
        },
        {
          "label": "It marks the start — a new valid segment so overlapping"
        },
        {
          "label": "It stores the length — the longest valid segment seen so far"
        }
      ],
      "explain": "After popping a matching '(' the top of stack is the last unmatched ')' index (or -1 at the start). Subtracting it from the current index gives the length of the current valid run without any special-case code."
    },
    {
      "id": "closing-empty-stack",
      "prompt": "When a ')' is processed and the stack becomes empty after the pop, the code pushes `i`. What does this accomplish?",
      "choices": [
        {
          "label": "It resets the base index — to the position of the unmatched ')',",
          "correct": true
        },
        {
          "label": "It records the position — every unmatched ')' for a second pass"
        },
        {
          "label": "It increments the result — zero to handle the edge case cleanly"
        },
        {
          "label": "It avoids an out-of-bounds read — on the next iteration"
        }
      ],
      "explain": "An unmatched ')' can never be part of a valid substring, so `i` becomes the new left boundary (sentinel). Any subsequent valid run will be measured from `i` outward."
    },
    {
      "id": "span-formula",
      "prompt": "When a ')' matches and the stack is non-empty, the code computes `l := i - stack[len(stack)-1]`. What does `stack[len(stack)-1]` represent at that moment?",
      "choices": [
        {
          "label": "The index — current valid substring begins",
          "correct": true
        },
        {
          "label": "The index of the matching — '(' that was just popped"
        },
        {
          "label": "The length of the longest — valid segment found so far"
        },
        {
          "label": "The number of unmatched '(' — still on the stack"
        }
      ],
      "explain": "After popping the matched '(', the new top is the last 'barrier' — an unmatched ')' or the -1 sentinel. `i - barrier` gives the length of the contiguous valid substring ending at `i`."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `longestValidParentheses`?",
      "choices": [
        {
          "label": "O(n) time, O(n) space — A single pass over the string gives",
          "correct": true
        },
        {
          "label": "O(n) time, O(1) space — A single pass over the string"
        },
        {
          "label": "O(n²) time, O(n) space — A single pass over the string"
        },
        {
          "label": "O(n log n) time, O(log — n) space"
        }
      ],
      "explain": "A single pass over the string gives O(n) time. The stack holds at most n entries in the worst case (all '(' characters), giving O(n) space."
    },
    {
      "id": "edge-all-open",
      "prompt": "If the input is `\"((((\"` (all open parens), what does the function return?",
      "choices": [
        {
          "label": "0 — Every '(' is pushed and never popped",
          "correct": true
        },
        {
          "label": "4 — Every '(' is pushed and never"
        },
        {
          "label": "2 — Every '(' is pushed and never"
        },
        {
          "label": "Panic (index out of range) — Every '(' is pushed and never"
        }
      ],
      "explain": "Every '(' is pushed and never popped (no ')' to pop them). The stack grows but `res` is never updated, so it stays 0. The sentinel prevents any out-of-bounds access."
    }
  ]
};
