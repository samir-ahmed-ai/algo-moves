import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which pattern does `longestStrChain` use?",
      "choices": [
        {
          "label": "Sort by length + DP on a hash map of predecessors",
          "correct": true
        },
        {
          "label": "BFS from each word, expanding by one character per level"
        },
        {
          "label": "Trie-based search for words that differ by one character"
        },
        {
          "label": "Interval DP over character positions in each word"
        }
      ],
      "explain": "Words are sorted by length so that predecessors (shorter words) are always processed before successors. A map `dp[word]` stores the longest chain ending at that word, built by checking all one-deletion predecessors — classic DP on a DAG."
    },
    {
      "id": "sort-purpose",
      "prompt": "Why does the code sort `words` by length before building the DP map?",
      "choices": [
        {
          "label": "A word's predecessor is always one character shorter, so sorting ensures predecessors appear before successors in the loop",
          "correct": true
        },
        {
          "label": "Sorting by length groups anagrams together, simplifying predecessor lookups"
        },
        {
          "label": "The hash map dp requires keys to be inserted in sorted order to avoid collisions"
        },
        {
          "label": "Sorting reduces the number of predecessor candidates from O(L²) to O(L)"
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
          "label": "The word w with a character inserted at index i"
        },
        {
          "label": "The substring of w from index i to the end"
        },
        {
          "label": "The word w reversed from position i"
        }
      ],
      "explain": "`w[:i]` takes everything before position `i`, `w[i+1:]` takes everything after, and concatenation skips character `i`. Iterating `i` from 0 to `len(w)-1` generates all possible length-(L-1) predecessors by trying every single deletion."
    },
    {
      "id": "complexity",
      "prompt": "The stated complexity is O(n·L²). Where does the L² factor come from?",
      "choices": [
        {
          "label": "For each word (L chars), we generate L predecessors, each costing O(L) to concatenate strings",
          "correct": true
        },
        {
          "label": "We compare each word against all other words, and each comparison is O(L)"
        },
        {
          "label": "The sort is O(n·L·log n) and the DP is O(n·L), making L² the dominant term"
        },
        {
          "label": "Go's map lookup for a string key costs O(L²) due to hashing"
        }
      ],
      "explain": "The inner loop runs `len(w)` times (≤ L). Each iteration creates a new string via concatenation `w[:i] + w[i+1:]`, which takes O(L) time. So per word: O(L) iterations × O(L) string creation = O(L²). Over all n words: O(n·L²)."
    },
    {
      "id": "dp-init",
      "prompt": "The code sets `dp[w] = 1` before checking predecessors. What does this initialization mean?",
      "choices": [
        {
          "label": "Every word is a valid chain of length 1 by itself, even with no predecessor in the list",
          "correct": true
        },
        {
          "label": "1 is a sentinel indicating the word has not yet been visited"
        },
        {
          "label": "The minimum chain length is 1 only if the word has exactly one character"
        },
        {
          "label": "dp[w] will be overwritten before it is ever read, so the initial value doesn't matter"
        }
      ],
      "explain": "Setting `dp[w] = 1` before the predecessor loop ensures that even if no predecessor exists in the map, the word itself contributes a chain of length 1. The subsequent checks only update `dp[w]` upward when a predecessor is found."
    },
    {
      "id": "result-tracking",
      "prompt": "The code maintains a `res` variable updated inside the outer loop. Why not just return `dp[words[len(words)-1]]` after the loop?",
      "choices": [
        {
          "label": "The longest chain may end at any word, not necessarily the last (longest) word in the sorted list",
          "correct": true
        },
        {
          "label": "The last word might not appear in dp if it has no valid predecessor"
        },
        {
          "label": "words[len(words)-1] after sorting may not be the lexicographically greatest word"
        },
        {
          "label": "dp values are overwritten during the loop, so only the running max is reliable"
        }
      ],
      "explain": "Sorting is by word length, and multiple words can share the same length. The globally longest chain can terminate at any word. Tracking the running maximum in `res` avoids a second pass and handles ties correctly."
    }
  ]
};
