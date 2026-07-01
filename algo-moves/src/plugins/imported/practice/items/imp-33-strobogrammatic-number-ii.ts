import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `genStroboNums` follow?",
      "choices": [
        {
          "label": "Two-pointer backtracking filling — inward",
          "correct": true
        },
        {
          "label": "BFS expanding strings layer — layer"
        },
        {
          "label": "Dynamic programming building — into longer ones"
        },
        {
          "label": "Bitmask enumeration over valid digit — sets"
        }
      ],
      "explain": "`btStrobo` advances `low` and retreats `high` in each recursive call, placing mirror-symmetric digit pairs from the outside in. That is a classic two-pointer backtracking approach, not BFS or DP."
    },
    {
      "id": "pair-set",
      "prompt": "Which set of outer digit pairs does `btStrobo` use, and why not `{6,6}` or `{9,9}`?",
      "choices": [
        {
          "label": "{00, 11, 88, 69, 96} — only these map to themselves or each",
          "correct": true
        },
        {
          "label": "{00, 11, 66, 88, 99} — symmetric digits only"
        },
        {
          "label": "{0, 1, 6, 8, 9} — any strobogrammatic single digit"
        },
        {
          "label": "{11, 69, 96} — excluding digits that look ambiguous"
        }
      ],
      "explain": "6 rotated 180° becomes 9 and vice versa, so the pair (6,9) is valid (and (9,6) for the other direction), but (6,6) or (9,9) would not be strobogrammatic. 0, 1, and 8 each map to themselves, giving the five pairs in the code."
    },
    {
      "id": "leading-zero-guard",
      "prompt": "Why does `btStrobo` skip the pair `{'0','0'}` when `low == 0`?",
      "choices": [
        {
          "label": "It would produce numbers — which are invalid",
          "correct": true
        },
        {
          "label": "Zero is not strobogrammatic — The outermost position (low =="
        },
        {
          "label": "The slice is pre-initialized — '0' so it would double-count"
        },
        {
          "label": "It would cause an index — out-of-range panic"
        }
      ],
      "explain": "The outermost position (`low == 0`) is the most-significant digit. Placing '0' there creates strings like \"00\" or \"0110\", which have leading zeros and are not valid n-digit numbers. The guard `if low == 0 && pair[0] == '0' { continue }` skips these."
    },
    {
      "id": "middle-digits",
      "prompt": "When `low == high` (odd-length number), which digits does the code place in the middle, and why not '6' or '9'?",
      "choices": [
        {
          "label": "'0', '1', '8' — digits that rotate to themselves",
          "correct": true
        },
        {
          "label": "'0', '1', '6', '8', '9' — all strobogrammatic digits"
        },
        {
          "label": "'1' — '8' only '0' is excluded as a center"
        },
        {
          "label": "'6' and '9' — since they pair with each other at the center"
        }
      ],
      "explain": "The center digit must look the same when the whole number is rotated 180°, so it must map to itself. '6' maps to '9' and vice versa, so neither is self-mapping; only '0', '1', and '8' qualify. Note the center position is never subject to the leading-zero guard, so '0' is allowed there."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `genStroboNums(n)`?",
      "choices": [
        {
          "label": "O(n · 5^(n/2)) — At each of the ~n/2 levels of",
          "correct": true
        },
        {
          "label": "O(n · 2^n) — At each of the ~n/2 levels of"
        },
        {
          "label": "O(5^n) — At each of the ~n/2 levels of"
        },
        {
          "label": "O(n^2) — At each of the ~n/2 levels of"
        }
      ],
      "explain": "At each of the ~n/2 levels of recursion there are at most 5 pair choices (4 for outermost since '00' is excluded, 5 thereafter), giving roughly 5^(n/2) strings. Each string has length n, so total work is O(n · 5^(n/2)), which the problem states as O(n · 5^n) using a loose bound."
    },
    {
      "id": "base-case",
      "prompt": "What happens when `low > high` in `btStrobo`?",
      "choices": [
        {
          "label": "The current `path` (a complete — strobogrammatic number) is appended",
          "correct": true
        },
        {
          "label": "The function returns — recording happens only at"
        },
        {
          "label": "It signals an invalid state — and the call is discarded"
        },
        {
          "label": "The path is reversed — then appended"
        }
      ],
      "explain": "`low > high` means all positions have been filled (even-length numbers cross over; odd-length numbers hit `low == high` first for the center). At this point `path` is fully constructed and is copied into `res` via `string(path)`."
    }
  ]
};
