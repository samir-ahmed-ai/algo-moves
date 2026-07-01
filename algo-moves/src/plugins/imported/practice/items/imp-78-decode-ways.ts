import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which technique does `numberOfWaysDecodingBase26` use?",
      "choices": [
        {
          "label": "1D DP with two rolling scalars (prev, cur) tracking single- and two-digit transitions",
          "correct": true
        },
        {
          "label": "Recursive backtracking over all character splits"
        },
        {
          "label": "BFS exploring each digit position level by level"
        },
        {
          "label": "2D DP over pairs of adjacent characters"
        }
      ],
      "explain": "The code uses only two scalars (`prev` and `cur`) that roll forward through the string, capturing the O(1)-space equivalent of a 1D dp array — the classic space-optimized Decode Ways pattern."
    },
    {
      "id": "single-digit-transition",
      "prompt": "Under what condition does `next` inherit the value of `cur`?",
      "choices": [
        {
          "label": "When `s[i] != '0'` — the current character forms a valid single-digit code (1–9)",
          "correct": true
        },
        {
          "label": "When `s[i]` and `s[i-1]` together form a number in 10–26"
        },
        {
          "label": "When `i` is odd"
        },
        {
          "label": "Always — `next = cur` is unconditional"
        }
      ],
      "explain": "`if s[i] != '0' { next = cur }` sets next to the number of ways to decode up to the previous character, extending each of those decodings by one more single-digit character. A '0' cannot stand alone, so it contributes nothing as a single-digit code."
    },
    {
      "id": "two-digit-transition",
      "prompt": "The code computes `two := int(s[i-1]-'0')*10 + int(s[i]-'0')` and checks `two >= 10 && two <= 26`. Why is the lower bound 10, not 01?",
      "choices": [
        {
          "label": "Single-digit codes 1–9 are already handled separately; 10–26 are the only valid two-digit codes",
          "correct": true
        },
        {
          "label": "Codes below 10 would cause integer overflow"
        },
        {
          "label": "The check prevents reusing a character already consumed by `next = cur`"
        },
        {
          "label": "Numbers 01–09 with a leading zero are reserved as sentinels"
        }
      ],
      "explain": "Codes 1–9 are accounted for by the single-digit branch. Two-digit codes must be at least 10 (otherwise the leading digit would be 0, which is not a valid standalone code) and at most 26 (the highest letter). Hence the range [10, 26]."
    },
    {
      "id": "early-exit",
      "prompt": "Why does the function return 0 immediately when `s[0] == '0'`?",
      "choices": [
        {
          "label": "A leading '0' cannot be decoded as any letter, making the entire string undecodable",
          "correct": true
        },
        {
          "label": "It avoids an out-of-bounds access on `s[i-1]` in the loop"
        },
        {
          "label": "It handles the empty-string edge case"
        },
        {
          "label": "It prevents `prev` from being initialized to 0"
        }
      ],
      "explain": "Letters map to '1'–'26'. A string starting with '0' has no valid first character decoding, so the total number of ways is 0. The check `s[0] == '0'` catches this before the loop runs."
    },
    {
      "id": "rolling-variables",
      "prompt": "After `prev, cur = cur, next`, what do `prev` and `cur` represent?",
      "choices": [
        {
          "label": "`prev` = ways to decode s[:i] (old cur); `cur` = ways to decode s[:i+1] (new next)",
          "correct": true
        },
        {
          "label": "`prev` = the two-digit value; `cur` = the single-digit value"
        },
        {
          "label": "`prev` = ways ending with a two-digit code; `cur` = ways ending with a single-digit code"
        },
        {
          "label": "`prev` = index i-1; `cur` = index i"
        }
      ],
      "explain": "Before the swap, `prev` covered s[:i-1] and `cur` covered s[:i]. After `prev, cur = cur, next`, `prev` now covers s[:i] and `cur` covers s[:i+1]. This shift lets the next iteration reuse them correctly."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `numberOfWaysDecodingBase26`?",
      "choices": [
        {
          "label": "O(n) time, O(1) space",
          "correct": true
        },
        {
          "label": "O(n) time, O(n) space"
        },
        {
          "label": "O(2^n) time, O(n) space"
        },
        {
          "label": "O(n²) time, O(1) space"
        }
      ],
      "explain": "A single pass over n characters gives O(n) time. Only `prev`, `cur`, `next`, and `two` are maintained — constant extra space regardless of input length."
    }
  ]
};
