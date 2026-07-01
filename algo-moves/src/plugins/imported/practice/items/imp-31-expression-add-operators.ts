import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "What makes `addOperators` harder than a plain DFS enumeration of operator placements?",
      "choices": [
        {
          "label": "Multiplication has higher precedence than addition/subtraction, requiring a `prev` term to undo and reapply the last multiply",
          "correct": true
        },
        {
          "label": "The digit string can contain zeros, which must be handled as a special base case"
        },
        {
          "label": "The number of operators is fixed, so a simpler bitmask approach would work"
        },
        {
          "label": "The result must be sorted, requiring an extra pass after recursion"
        }
      ],
      "explain": "When a `*` is placed, the running `eval` must be corrected: `eval - prev + prev*val`. This `prev` bookkeeping is the distinctive mechanic. Leading-zero handling is present but secondary."
    },
    {
      "id": "multiplication-precedence",
      "prompt": "For the `*` branch, the new eval is `eval - prev + prev*val`. What role does `prev` play here?",
      "choices": [
        {
          "label": "`prev` is the last operand added to `eval`; subtracting it undoes the last add/subtract and multiplying restores correct precedence",
          "correct": true
        },
        {
          "label": "`prev` tracks the total product seen so far"
        },
        {
          "label": "`prev` is the count of `*` operators placed so far"
        },
        {
          "label": "`prev` stores the value of the entire left-hand sub-expression"
        }
      ],
      "explain": "Say `eval = a + b` and now we place `* c`. We stored `prev = b`. To get `a + b*c` we compute `eval - b + b*c = (eval - prev) + prev*val`. The `prev*val` also becomes the new `prev` for chained multiplications like `a * b * c`."
    },
    {
      "id": "leading-zero-prune",
      "prompt": "The code breaks out of the inner loop with `if i > idx && num[idx] == '0' { break }`. What case does this prune?",
      "choices": [
        {
          "label": "Multi-digit operands that start with '0', which would represent numbers like 05 or 012 that are invalid",
          "correct": true
        },
        {
          "label": "The operand zero itself (the single digit '0')"
        },
        {
          "label": "Negative numbers produced by preceding minus operators"
        },
        {
          "label": "Overflow when converting large digit strings to int"
        }
      ],
      "explain": "`i > idx` means we've tried `num[idx:idx+1]` (a single '0') and are now considering a longer slice starting with '0'. A leading zero on a multi-digit number is not a valid numeric literal, so the loop breaks early. The single '0' operand is still allowed."
    },
    {
      "id": "first-operand",
      "prompt": "When `idx == 0`, the code calls `btAddOperators` without prefixing an operator. Why?",
      "choices": [
        {
          "label": "The first operand has no preceding operator; it initialises both `eval` and `prev` to `val` with just the digit string",
          "correct": true
        },
        {
          "label": "Adding a `+` before the first digit would make the expression invalid"
        },
        {
          "label": "The recursion depth would overflow if an operator were placed first"
        },
        {
          "label": "It is an optimisation to avoid redundant branches"
        }
      ],
      "explain": "An expression cannot start with an operator. At `idx == 0`, `path = sub`, `eval = val`, `prev = val` initialises the state cleanly. All subsequent calls (idx > 0) prepend one of `+`, `-`, or `*`."
    },
    {
      "id": "complexity",
      "prompt": "Time complexity is O(4^n). Where does the factor of 4 come from?",
      "choices": [
        {
          "label": "At each digit boundary there are up to 4 choices: extend the current operand OR insert +, -, or *",
          "correct": true
        },
        {
          "label": "The alphabet has 4 operator symbols: +, -, *, /"
        },
        {
          "label": "Each recursion level makes 4 independent recursive calls regardless of position"
        },
        {
          "label": "The result is filtered 4 times to remove invalid expressions"
        }
      ],
      "explain": "For each position after the first digit we can either absorb it into the current operand (no split) or insert one of three operators — 4 choices total per boundary. With n digits there are n-1 boundaries, giving O(4^n) paths."
    },
    {
      "id": "space-complexity",
      "prompt": "Space complexity is O(n). What does this account for?",
      "choices": [
        {
          "label": "The recursion depth and the current `path` string, both bounded by n",
          "correct": true
        },
        {
          "label": "The result slice, which stores all valid expressions"
        },
        {
          "label": "A memo table indexed by (idx, eval)"
        },
        {
          "label": "A stack used to simulate the recursion iteratively"
        }
      ],
      "explain": "O(n) captures the call-stack depth (at most n frames) and the length of `path` at any point (n digits plus at most n-1 operators, so O(n) characters). The result slice is excluded from auxiliary-space analysis in the stated bound."
    }
  ]
};
