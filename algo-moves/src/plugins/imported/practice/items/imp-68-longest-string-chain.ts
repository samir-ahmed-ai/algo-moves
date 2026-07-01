import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `longestStrChain` use?",
      "choices": [
        {
          "label": "Sort by length + DP — on a hash map of predecessors",
          "correct": true
        },
        {
          "label": "BFS from each word, expanding — by one character per level"
        },
        {
          "label": "Trie-based search for words — differ by one character"
        },
        {
          "label": "Interval DP over character positions — in each word"
        }
      ],
      "explain": "Words are sorted by length so that predecessors (shorter words) are always processed before successors. A map `dp[word]` stores the longest chain ending at that word, built by checking all one-deletion predecessors — classic DP on a DAG."
    },
    {
      "id": "sort-purpose",
      "prompt": "Why does the code sort `words` by length before building the DP map?",
      "choices": [
        {
          "label": "A word's predecessor is always — one character shorter, so sorting",
          "correct": true
        },
        {
          "label": "Sorting by length groups anagrams — together, simplifying predecessor"
        },
        {
          "label": "The hash map dp requires — keys to be inserted in sorted order"
        },
        {
          "label": "Sorting reduces the number — predecessor candidates from O(L²) to"
        }
      ],
      "explain": "In a string chain, each word is derived from the previous by inserting one character. Sorting by ascending length guarantees that when we process word `w`, all possible predecessors (length `len(w)-1`) have already been assigned their `dp` values."
    },
    {
      "id": "predecessor-generation",
      "prompt": "The inner loop builds `pred := w[:i] + w[i+1:]`. What does this expression produce?",
      "choices": [
        {
          "label": "The word w with character at index i removed — one possible predecessor",
          "correct": true
        },
        {
          "label": "The word w — character inserted at index i"
        },
        {
          "label": "The substring of w — index i to the end"
        },
        {
          "label": "The word w reversed — position i"
        }
      ],
      "explain": "`w[:i]` takes everything before position `i`, `w[i+1:]` takes everything after, and concatenation skips character `i`. Iterating `i` from 0 to `len(w)-1` generates all possible length-(L-1) predecessors by trying every single deletion."
    },
    {
      "id": "complexity",
      "prompt": "The stated complexity is O(n·L²). Where does the L² factor come from?",
      "choices": [
        {
          "label": "For each word (L chars) we generate — each",
          "correct": true
        },
        {
          "label": "We compare each word — and each comparison"
        },
        {
          "label": "The sort is O(n·L·log n) — and the DP is O(n·L), making L² the"
        },
        {
          "label": "Go's map lookup — string key costs O(L²) due to hashing"
        }
      ],
      "explain": "The inner loop runs `len(w)` times (≤ L). Each iteration creates a new string via concatenation `w[:i] + w[i+1:]`, which takes O(L) time. So per word: O(L) iterations × O(L) string creation = O(L²). Over all n words: O(n·L²)."
    },
    {
      "id": "dp-init",
      "prompt": "The code sets `dp[w] = 1` before checking predecessors. What does this initialization mean?",
      "choices": [
        {
          "label": "Every word is a valid — chain of length 1 by itself, even",
          "correct": true
        },
        {
          "label": "1 is a sentinel indicating — the word has not yet been visited"
        },
        {
          "label": "The minimum chain length — 1 only if the word has exactly one"
        },
        {
          "label": "dp[w] will be overwritten — so the initial value"
        }
      ],
      "explain": "Setting `dp[w] = 1` before the predecessor loop ensures that even if no predecessor exists in the map, the word itself contributes a chain of length 1. The subsequent checks only update `dp[w]` upward when a predecessor is found."
    },
    {
      "id": "result-tracking",
      "prompt": "The code maintains a `res` variable updated inside the outer loop. Why not just return `dp[words[len(words)-1]]` after the loop?",
      "choices": [
        {
          "label": "The longest chain may end — at any word, not necessarily the last",
          "correct": true
        },
        {
          "label": "The last word might — appear in dp if it has no valid"
        },
        {
          "label": "words[len(words)-1] after Sorting — and"
        },
        {
          "label": "dp values are overwritten — so only the running max is"
        }
      ],
      "explain": "Sorting is by word length, and multiple words can share the same length. The globally longest chain can terminate at any word. Tracking the running maximum in `res` avoids a second pass and handles ties correctly."
    }
  ]
};
