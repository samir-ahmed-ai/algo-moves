import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which combination of techniques does numSimilarGroups use to count groups of similar strings?",
      "choices": [
        {
          "label": "Pairwise similarity check + Union-Find to cluster similar strings",
          "correct": true
        },
        {
          "label": "BFS from each string treating similarity as edges"
        },
        {
          "label": "Sorting strings then scanning adjacent pairs"
        },
        {
          "label": "Dynamic programming over substring matches"
        }
      ],
      "explain": "The outer two loops compare every pair (i, j) character by character (the similarity check), and similarGroupsUnion merges their components when similar. BFS would also work but the code explicitly uses a parent/size array — Union-Find."
    },
    {
      "id": "similarity-condition",
      "prompt": "The code unions strings i and j when `diffs == 0 || diffs == 2`. Why are those the only two valid similarity conditions?",
      "choices": [
        {
          "label": "Two anagrams are similar if they are identical (0 diffs) or differ in exactly 2 positions (a single swap)",
          "correct": true
        },
        {
          "label": "Any even number of differing positions counts as similar because swaps come in pairs"
        },
        {
          "label": "Strings with 0 or 2 diffs are guaranteed to be anagrams of each other"
        },
        {
          "label": "The problem defines similarity as at most 2 character mismatches regardless of position"
        }
      ],
      "explain": "A swap exchanges exactly two characters, so two anagrams are similar iff they differ in 0 positions (identical) or exactly 2 positions (one swap apart). Differing in 1, 3, or more positions means no single swap can transform one into the other."
    },
    {
      "id": "early-exit",
      "prompt": "Inside the character-comparison loop, the code breaks when `diffs > 2`. What is the purpose of this early exit?",
      "choices": [
        {
          "label": "Pruning — once more than 2 differences are found the strings cannot be similar, so comparing further is wasted work",
          "correct": true
        },
        {
          "label": "Preventing an out-of-bounds access on strings of different lengths"
        },
        {
          "label": "Guaranteeing diffs never exceeds the array bounds"
        },
        {
          "label": "Ensuring path compression triggers on the next Find call"
        }
      ],
      "explain": "Since strings with diffs > 2 will never be unioned, there's no need to count all differing positions. Breaking early saves up to O(L) work per pair; across O(n²) pairs this is a meaningful constant-factor improvement."
    },
    {
      "id": "groups-counter",
      "prompt": "The variable `groups` starts at n and is decremented inside similarGroupsUnion. When does it get decremented?",
      "choices": [
        {
          "label": "Only when rx != ry — i.e., when two strings from different components are merged for the first time",
          "correct": true
        },
        {
          "label": "Every time Union is called, regardless of whether the strings are already in the same group"
        },
        {
          "label": "Once per similar pair found, including pairs already in the same component"
        },
        {
          "label": "Once per string that is similar to at least one other string"
        }
      ],
      "explain": "similarGroupsUnion returns early if rx == ry (already same component), so *groups-- only executes on a true merge. Starting at n (each string its own group) and decrementing once per merge gives the correct final group count."
    },
    {
      "id": "complexity",
      "prompt": "The time complexity is O(n²·L). What do n and L represent, and why is this the bound?",
      "choices": [
        {
          "label": "n = number of strings, L = string length; the double loop over pairs is O(n²) and each pair comparison scans up to L characters",
          "correct": true
        },
        {
          "label": "n = string length, L = alphabet size; sorting dominates at O(n² log n)"
        },
        {
          "label": "n = number of strings, L = number of unique characters; Union-Find adds an O(L) factor per operation"
        },
        {
          "label": "n = number of strings, L = string length; BFS traversal of the similarity graph is O(n²·L)"
        }
      ],
      "explain": "There are O(n²) pairs from the nested loops. For each pair the inner character loop runs at most L iterations, giving O(n²·L) total. The Union-Find operations are O(α(n)) per call and are dominated by the character comparisons."
    },
    {
      "id": "path-compression",
      "prompt": "similarGroupsFind uses recursive path compression. What would happen to correctness if path compression were removed (parent always followed one hop at a time)?",
      "choices": [
        {
          "label": "Correctness is unchanged — only performance degrades; Find would still return the correct root, just more slowly",
          "correct": true
        },
        {
          "label": "Groups could be counted incorrectly because roots would shift during traversal"
        },
        {
          "label": "The early-exit on diffs > 2 would no longer be valid"
        },
        {
          "label": "Union by size would break, causing the wrong root to be chosen"
        }
      ],
      "explain": "Path compression is a pure performance optimization. Without it, Find still returns the true root by following parent pointers all the way up — it just takes O(log n) per call instead of amortized O(α(n)). The final group count remains correct."
    }
  ]
};
