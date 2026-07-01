import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What algorithmic pattern does `wordsTyping` use?",
      "choices": [
        {
          "label": "Pointer simulation on a circular joined string",
          "correct": true
        },
        {
          "label": "Binary search on the number of rows"
        },
        {
          "label": "BFS level-by-level word placement"
        },
        {
          "label": "DP table where dp[i] = words placed in row i"
        }
      ],
      "explain": "The code joins the sentence into a single circular string `s`, then advances a `start` pointer by `cols` for each row — pure simulation. No search or DP table is involved."
    },
    {
      "id": "join-trick",
      "prompt": "Why does the code join words with `\" \"` and append a trailing `\" \"` before creating the circular string?",
      "choices": [
        {
          "label": "So that landing on a space marks a clean word boundary, simplifying the advance logic",
          "correct": true
        },
        {
          "label": "To ensure the string length is always a multiple of cols"
        },
        {
          "label": "Because `strings.Join` requires a non-empty separator"
        },
        {
          "label": "To guarantee that `start % n` never equals 0"
        }
      ],
      "explain": "When `start` advances by `cols` and lands exactly on the trailing space, it means the last character of that row was the last letter of a word — a perfect fit. The single `start++` then skips that space. Without the trailing space this boundary detection would need an extra conditional."
    },
    {
      "id": "back-up-logic",
      "prompt": "When `s[start%n] != ' '` after adding `cols`, what does the code do?",
      "choices": [
        {
          "label": "Walks `start` backward until `s[(start-1)%n] == ' '`",
          "correct": true
        },
        {
          "label": "Skips forward to the next space in the string"
        },
        {
          "label": "Decrements `start` by the length of the current word"
        },
        {
          "label": "Restarts the row from the next word boundary"
        }
      ],
      "explain": "Landing in the middle of a word means the row can't fit that word. The code backs up one character at a time until the preceding character is a space, effectively trimming the partial word. This is O(maxWordLen) per row."
    },
    {
      "id": "answer-extraction",
      "prompt": "How does `wordsTyping` compute the number of complete sentence repetitions from `start`?",
      "choices": [
        {
          "label": "start / n, where n is the length of the joined circular string",
          "correct": true
        },
        {
          "label": "start % n"
        },
        {
          "label": "start / cols"
        },
        {
          "label": "start / len(sentence)"
        }
      ],
      "explain": "`start` accumulates total characters consumed across all rows. Dividing by `n` (the circular string length, which equals one full sentence) gives how many complete sentences fit. The remainder `start % n` would tell you where in the sentence you stopped."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of `wordsTyping`?",
      "choices": [
        {
          "label": "O(rows · maxWordLen)",
          "correct": true
        },
        {
          "label": "O(rows · cols)"
        },
        {
          "label": "O(rows · len(sentence))"
        },
        {
          "label": "O(rows + cols · len(sentence))"
        }
      ],
      "explain": "Each of the `rows` iterations advances `start` by `cols` and then backs up at most `maxWordLen` steps. The dominant term is O(rows · maxWordLen). The cols factor does not appear directly because the back-up loop terminates at a word boundary, not at position 0."
    }
  ]
};
