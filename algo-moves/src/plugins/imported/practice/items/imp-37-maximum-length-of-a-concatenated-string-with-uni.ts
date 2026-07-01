import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What core technique does `maxLength` use to represent each string's characters?",
      "choices": [
        {
          "label": "A 26-bit integer bitmask where each bit represents a letter",
          "correct": true
        },
        {
          "label": "A sorted character array to detect duplicates"
        },
        {
          "label": "A hash set of runes built per string"
        },
        {
          "label": "A frequency array of length 26"
        }
      ],
      "explain": "The preprocessing loop sets `bit := uint(1) << (s[i]-'a')` and ORs it into `mask`. Each of the 26 bits represents one lowercase letter — this is a bitmask encoding that makes overlap detection a single AND operation."
    },
    {
      "id": "pruning",
      "prompt": "How does `btMaxLength` decide whether to include `masks[i]` in the current combination?",
      "choices": [
        {
          "label": "`path & masks[i] == 0` — no bit overlap, meaning no shared characters",
          "correct": true
        },
        {
          "label": "`bits.OnesCount(masks[i]) > 0` — the string is non-empty"
        },
        {
          "label": "`masks[i] > path` — the new mask is strictly larger"
        },
        {
          "label": "`i > idx` — only forward indices are considered"
        }
      ],
      "explain": "`path & masks[i] == 0` checks that the current combination and the candidate string share no characters (no overlapping bits). If any bit is shared, the characters would not all be unique after concatenation, so the candidate is skipped."
    },
    {
      "id": "dedup-preprocessing",
      "prompt": "Why does `maxLength` skip strings with internal duplicate characters before backtracking?",
      "choices": [
        {
          "label": "A string with repeated letters can never be part of a valid all-unique concatenation, so it is safe to discard early",
          "correct": true
        },
        {
          "label": "Such strings cause integer overflow in the 26-bit mask"
        },
        {
          "label": "The bitmask cannot represent duplicate characters"
        },
        {
          "label": "They would cause the backtracking recursion to loop infinitely"
        }
      ],
      "explain": "If a string already has a repeated character, no concatenation including it can have all unique characters. Filtering them out before backtracking shrinks the candidate set and avoids wasted branches."
    },
    {
      "id": "result-tracking",
      "prompt": "When does `btMaxLength` update `*res`?",
      "choices": [
        {
          "label": "At every recursive call, if `bits.OnesCount(path)` exceeds the current best",
          "correct": true
        },
        {
          "label": "Only at leaf nodes when all masks have been considered"
        },
        {
          "label": "Only when `path & masks[i] == 0` is true"
        },
        {
          "label": "Only when `idx == len(masks)`"
        }
      ],
      "explain": "The first two lines of `btMaxLength` compute `cnt := bits.OnesCount(path)` and update `*res` if `cnt > *res`. This happens at every call — not just leaves — so any partial combination that beats the best is recorded immediately."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `maxLength(arr)`?",
      "choices": [
        {
          "label": "O(2^n) where n is the number of valid (non-duplicate) strings in `arr`",
          "correct": true
        },
        {
          "label": "O(n · 26)"
        },
        {
          "label": "O(n^2)"
        },
        {
          "label": "O(n · 2^26)"
        }
      ],
      "explain": "The backtracking explores subsets of the filtered mask list. In the worst case all n strings are valid, and there are 2^n subsets. The `bits.OnesCount` call is O(1), so total work is O(2^n). The O(n) space is for the recursion stack."
    },
    {
      "id": "why-onescount",
      "prompt": "Why does the code use `bits.OnesCount(path)` to measure the concatenated string length?",
      "choices": [
        {
          "label": "Each set bit represents one unique character, so the popcount equals the number of distinct characters in the concatenation",
          "correct": true
        },
        {
          "label": "It counts the number of strings combined so far"
        },
        {
          "label": "It computes the sum of ASCII values of selected characters"
        },
        {
          "label": "It checks whether the mask fits in 26 bits"
        }
      ],
      "explain": "Because each mask bit represents one unique character and the backtracking only allows non-overlapping masks, every set bit in `path` corresponds to exactly one character in the concatenated string. The popcount therefore equals the total length."
    }
  ]
};
