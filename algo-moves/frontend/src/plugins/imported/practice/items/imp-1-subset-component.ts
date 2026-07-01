import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "Which combination of techniques drives this solution?",
      "choices": [
        {
          "label": "Subset enumeration DFS — subsetComponentDfs branches at each",
          "correct": true
        },
        {
          "label": "BFS over subsets — visited bitset"
        },
        {
          "label": "Dynamic programming over bitmask — subsetComponentDfs branches at"
        },
        {
          "label": "Backtracking with pruning on set-bit — count"
        }
      ],
      "explain": "`subsetComponentDfs` branches at each element (include or exclude it), and when including it, unions the element's set bits in a copy of the DSU. This is subset enumeration (2^active branches) with a per-branch DSU, not DP or BFS."
    },
    {
      "id": "active-filter",
      "prompt": "Why does `findConnectedComponents` filter out numbers with fewer than 2 set bits before recursing?",
      "choices": [
        {
          "label": "A number with 0 — 1 set bits cannot connect two",
          "correct": true
        },
        {
          "label": "Numbers with fewer than 2 — set bits cause DSU path compression"
        },
        {
          "label": "The DSU array — 64 bytes and cannot store values"
        },
        {
          "label": "Such numbers always appear — the inactive set and are already"
        }
      ],
      "explain": "Union-find merges two roots only when `ra != rb`. A number with exactly one set bit has only one root to look up — it can never trigger a union. Filtering these out saves subset branches without affecting correctness; they are counted in `inactive` and factored in via the left-shift at the end."
    },
    {
      "id": "include-exclude",
      "prompt": "In `subsetComponentDfs`, the first recursive call passes the original `dsu` and `cnt` while the second passes `next` and `nc`. What do these two calls represent?",
      "choices": [
        {
          "label": "Exclude the current element (dsu — unchanged) vs. include it (dsu",
          "correct": true
        },
        {
          "label": "Left subtree vs. right subtree — of a binary search tree over the"
        },
        {
          "label": "BFS layer expansion vs. DFS — depth expansion"
        },
        {
          "label": "Processing even-indexed vs. — elements"
        }
      ],
      "explain": "The first call at `idx+1` with the unmodified `dsu`/`cnt` skips `active[idx]` — the exclude branch. The second call applies all unions from `active[idx]` into `next` and decrements `nc` for each merge, then recurses — the include branch."
    },
    {
      "id": "inactive-shift",
      "prompt": "At the end of `findConnectedComponents`, the result is `total << inactive`. Why multiply by 2^inactive?",
      "choices": [
        {
          "label": "Each inactive element — in any subset without affecting",
          "correct": true
        },
        {
          "label": "Bit-shifting corrects for the DSU — over-counting merges in overlapping"
        },
        {
          "label": "Inactive numbers contribute — An inactive number (0 or 1 set"
        },
        {
          "label": "The shift converts the answer — from bit-count space back to"
        }
      ],
      "explain": "An inactive number (0 or 1 set bits) can be freely included or excluded from any subset without changing the component structure of that subset. For each inactive element, every subset seen by the DFS appears twice (with and without it), so the total doubles — giving a factor of 2^inactive, i.e., left-shift by inactive."
    },
    {
      "id": "complexity",
      "prompt": "What is the time complexity of this solution, where `active` is the count of numbers with ≥2 set bits?",
      "choices": [
        {
          "label": "O(2^active · 64) — The DFS explores 2^active subsets",
          "correct": true
        },
        {
          "label": "O(active · 64²) — The DFS explores 2^active subsets"
        },
        {
          "label": "O(active! · 64) — The DFS explores 2^active subsets"
        },
        {
          "label": "O(2^64) — The DFS explores 2^active subsets"
        }
      ],
      "explain": "The DFS explores 2^active subsets. For each subset, merging one number's bits costs at most O(64) DSU find-operations across its set bits. The DSU itself is always a flat 64-element array, so operations on it are O(64) worst case."
    },
    {
      "id": "dsu-copy",
      "prompt": "The include branch copies `dsu` into `next` (`next := dsu`) before applying unions. What would break if the code modified `dsu` in place instead?",
      "choices": [
        {
          "label": "The exclude branch — later element would see union effects",
          "correct": true
        },
        {
          "label": "Go passes arrays by reference — so `next := dsu` and in-place"
        },
        {
          "label": "Path compression in `bitDSUFind` — overwrite `next` anyway"
        },
        {
          "label": "Nothing DSU union operations — idempotent so re-applying them is"
        }
      ],
      "explain": "Because `bitDSU` is a `[64]uint8` value type, `next := dsu` is a full copy. The exclude branch keeps the original `dsu` for its sub-tree. If unions were applied in place, backtracking to the exclude branch would see a corrupted state, producing wrong component counts."
    }
  ]
};
