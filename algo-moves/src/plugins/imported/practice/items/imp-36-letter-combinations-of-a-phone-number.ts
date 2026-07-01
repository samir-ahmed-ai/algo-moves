import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `letterCombinations` implement?",
      "choices": [
        {
          "label": "Backtracking over a phone-pad mapping, one digit per level",
          "correct": true
        },
        {
          "label": "BFS expanding combinations level by level"
        },
        {
          "label": "Dynamic programming building combinations iteratively"
        },
        {
          "label": "Divide-and-conquer splitting the digit string in half"
        }
      ],
      "explain": "`btLetters` recurses digit-by-digit using `idx`, branching over each letter for the current digit. This is DFS/backtracking. BFS would maintain a queue of partial strings and is not used here."
    },
    {
      "id": "data-structure",
      "prompt": "How does the code map a digit character to its letters?",
      "choices": [
        {
          "label": "Index into `phonePad` using `digits[idx]-'0'` to get the letter string",
          "correct": true
        },
        {
          "label": "Use a `map[byte]string` hash table keyed by the digit character"
        },
        {
          "label": "Use a switch statement over each digit"
        },
        {
          "label": "Convert the digit to its ASCII value and compute an offset"
        }
      ],
      "explain": "`phonePad` is a `[]string` where index 2 = \"abc\", index 3 = \"def\", etc. `digits[idx]-'0'` converts the ASCII digit character to its integer value, which directly indexes the slice — no map needed."
    },
    {
      "id": "branching-factor",
      "prompt": "Why is the worst-case branching factor 4, not 3?",
      "choices": [
        {
          "label": "Digits 7 and 9 map to four letters ('pqrs' and 'wxyz')",
          "correct": true
        },
        {
          "label": "The pad includes digit '0' which maps to four symbols"
        },
        {
          "label": "The recursion spawns an extra branch for the empty string"
        },
        {
          "label": "Each digit can also be skipped, adding a fourth branch"
        }
      ],
      "explain": "Most digits map to three letters, but '7' maps to \"pqrs\" and '9' maps to \"wxyz\" — four letters each. This gives a worst-case branching factor of 4, reflected in the O(s · 4^s) complexity."
    },
    {
      "id": "base-case",
      "prompt": "What is the base case of `btLetters`?",
      "choices": [
        {
          "label": "`idx == len(digits)` — all digits processed; append `path` to `res`",
          "correct": true
        },
        {
          "label": "`len(path) == len(digits)` — path is full; this is equivalent but not what the code checks"
        },
        {
          "label": "`idx == 0` — first call initializes the result"
        },
        {
          "label": "`path == \"\"` — empty path triggers result collection"
        }
      ],
      "explain": "The code checks `if idx == len(digits)`, meaning every digit has been assigned a letter. At that point `path` holds a complete combination and is appended. `len(path) == len(digits)` would be equivalent here but is not the guard written."
    },
    {
      "id": "edge-empty-input",
      "prompt": "What does `letterCombinations(\"\")` return?",
      "choices": [
        {
          "label": "nil",
          "correct": true
        },
        {
          "label": "A slice containing one empty string: [\"\"]"
        },
        {
          "label": "An empty non-nil slice"
        },
        {
          "label": "A panic — the function does not guard the empty case"
        }
      ],
      "explain": "The first line of `letterCombinations` checks `if len(digits) == 0 { return nil }`. This follows the LeetCode contract: no digits means no combinations, and the function returns nil (not an empty slice)."
    },
    {
      "id": "complexity",
      "prompt": "If all `s` digits map to 3 letters (worst plausible average), what is the time complexity?",
      "choices": [
        {
          "label": "O(s · 3^s)",
          "correct": true
        },
        {
          "label": "O(3^s)"
        },
        {
          "label": "O(s^2 · 3^s)"
        },
        {
          "label": "O(s · 2^s)"
        }
      ],
      "explain": "With a branching factor of 3 and depth s, there are 3^s leaf nodes (combinations). Each leaf requires copying a string of length s into the result, giving O(s · 3^s). The O(s · 4^s) bound in the problem accounts for the worst-case digit '7' or '9'."
    }
  ]
};
