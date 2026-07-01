import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "pattern",
      "prompt": "What algorithmic pattern does `maximumANDSum` use?",
      "choices": [
        {
          "label": "Top-down memoized DP — base-3 bitmask state",
          "correct": true
        },
        {
          "label": "Bottom-up DP over a 2-D — table indexed by (num index, slot)"
        },
        {
          "label": "Greedy assignment: always place — current number in the slot that"
        },
        {
          "label": "BFS over assignment states — a priority queue"
        }
      ],
      "explain": "`btMaxAndSum` is a recursive function that memoizes on `state`, where `state` encodes how many numbers have been placed in each slot using base-3 digits (0, 1, or 2 per slot). This is classic top-down bitmask DP."
    },
    {
      "id": "state-encoding",
      "prompt": "How does the code extract the occupancy of slot `slot` from the `state` integer?",
      "choices": [
        {
          "label": "(state >> (2 * (slot — - 1))) & 3",
          "correct": true
        },
        {
          "label": "(state >> slot) & 1 — Each slot uses 2 bits of state"
        },
        {
          "label": "state % (slot * 3) — Each slot uses 2 bits of state"
        },
        {
          "label": "(state / (slot - 1)) — & 3"
        }
      ],
      "explain": "Each slot uses 2 bits of `state` (since occupancy is 0, 1, or 2 — fitting in 2 bits). Slot `slot` starts at bit position `2*(slot-1)`, so right-shifting by that amount and masking with 3 extracts the 2-bit occupancy value."
    },
    {
      "id": "capacity-check",
      "prompt": "The code checks `occ < 2` before assigning a number to a slot. What does this enforce?",
      "choices": [
        {
          "label": "Each slot can hold — most 2 numbers",
          "correct": true
        },
        {
          "label": "Each number can be placed — in at most 2 different slots"
        },
        {
          "label": "The AND of two numbers — placed in the same slot must be less"
        },
        {
          "label": "The slot index must — a power of 2"
        }
      ],
      "explain": "The problem states each slot has two 'holes', so at most 2 numbers can go in each slot. `occ` counts how many numbers currently occupy slot `slot`; if it's already 2, this slot is full and is skipped."
    },
    {
      "id": "memo-key",
      "prompt": "The memoization map uses `state` (not `(idx, state)`) as the key. Is this safe, and why?",
      "choices": [
        {
          "label": "Yes `idx` is fully determined — by the total number of assignments",
          "correct": true
        },
        {
          "label": "No two different (idx, state) — pairs can have the same state but"
        },
        {
          "label": "Yes — but only because nums is sorted before the recursion begins"
        },
        {
          "label": "No the memo — include the current `res` value to"
        }
      ],
      "explain": "Numbers are assigned in order (idx increments by 1 on each recursive call). The sum of all occupancies in `state` equals `idx`, so knowing `state` uniquely determines how many numbers have been assigned and which nums remain. Keying on `state` alone is correct."
    },
    {
      "id": "complexity",
      "prompt": "What are the time and space complexities of `maximumANDSum` for n numbers and numSlots slots?",
      "choices": [
        {
          "label": "O(n · 3^numSlots) time space — Each slot has 3 possible occupancy",
          "correct": true
        },
        {
          "label": "O(n · 2^numSlots) time space — Each slot has 3 possible"
        },
        {
          "label": "O(n · numSlots) time, O(n — · numSlots) space"
        },
        {
          "label": "O(numSlots^n) time, O(numSlots^n) — Each slot has 3 possible"
        }
      ],
      "explain": "Each slot has 3 possible occupancy values (0, 1, 2), and there are numSlots slots, giving 3^numSlots distinct states. For each state, the code iterates over numSlots slots. The memo table stores one entry per state, so space is O(3^numSlots)."
    },
    {
      "id": "base-case",
      "prompt": "What does `btMaxAndSum` return when `idx == len(nums)`?",
      "choices": [
        {
          "label": "0 — because there are no more numbers to",
          "correct": true
        },
        {
          "label": "The total AND sum accumulated — so far across all assignments"
        },
        {
          "label": "The value — slot processed"
        },
        {
          "label": "Negative infinity to signal — invalid assignment"
        }
      ],
      "explain": "When all numbers have been assigned (`idx == len(nums)`), no further contribution is possible, so 0 is returned. The total score is built up additively as the recursion unwinds."
    }
  ]
};
