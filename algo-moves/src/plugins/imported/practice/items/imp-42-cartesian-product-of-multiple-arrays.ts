import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  "quiz": [
    {
      "id": "category",
      "prompt": "How does `btPermLists` traverse the space of combinations?",
      "choices": [
        {
          "label": "DFS: recurse into `lists[1:]` for each element of `lists[0]`, building a path depth-first",
          "correct": true
        },
        {
          "label": "BFS: enqueue partial combinations and expand one list at a time"
        },
        {
          "label": "Iterative nested loops — one loop per input list"
        },
        {
          "label": "Divide-and-conquer: split the list-of-lists in half and merge results"
        }
      ],
      "explain": "Each call picks one element `s` from `lists[0]` and recurses with `lists[1:]` and the extended `path` — that is depth-first, consuming one list per recursion level until `lists` is empty."
    },
    {
      "id": "base-case",
      "prompt": "When does `btPermLists` record a complete combination?",
      "choices": [
        {
          "label": "When `len(lists) == 0` — all lists have been consumed and a full tuple is in `path`",
          "correct": true
        },
        {
          "label": "When `len(path) == len(original lists)` — path length equals input depth"
        },
        {
          "label": "When `lists[0]` is empty — no more elements to pick from the current list"
        },
        {
          "label": "When `path` matches a previously unseen key in `seen`"
        }
      ],
      "explain": "`lists` is passed as `lists[1:]` at each level; when it becomes empty, every list has contributed exactly one element to `path`, making it a complete Cartesian tuple. The code branches on `len(lists) == 0`, not on `path` length."
    },
    {
      "id": "dedup-mechanism",
      "prompt": "The code uses a `seen map[string]bool` keyed on the joined path. When would two different recursion paths produce the same key?",
      "choices": [
        {
          "label": "When different input lists contain identical strings, causing the same tuple to be reachable via multiple routes",
          "correct": true
        },
        {
          "label": "Never — each list position is independent so duplicates cannot occur"
        },
        {
          "label": "When a list has zero elements, causing the same path to be visited twice"
        },
        {
          "label": "When the separator ',' appears in one of the strings themselves"
        }
      ],
      "explain": "If two different lists both contain the string `\"a\"`, a tuple like `[\"a\", \"a\"]` can be produced from multiple list pairs. The `seen` map deduplicates by comparing the joined string representation of the completed tuple."
    },
    {
      "id": "key-collision-edge",
      "prompt": "The join key uses `\",\"` as a separator. What edge case could cause a false duplicate in `seen`?",
      "choices": [
        {
          "label": "If any input string itself contains a comma, two distinct tuples could produce the same joined key",
          "correct": true
        },
        {
          "label": "If the path slice is empty, the key is an empty string matching other empty keys"
        },
        {
          "label": "If two lists are identical, their cross-product keys always collide"
        },
        {
          "label": "There is no edge case; the key is always unique because path length is fixed"
        }
      ],
      "explain": "A string `\"a,b\"` in one list and separate strings `\"a\"` and `\"b\"` in two lists can produce the same joined key `\"a,b\"`, falsely treating two distinct tuples as duplicates. It is a latent bug that fixed problem constraints may hide."
    },
    {
      "id": "list-mutation-bug",
      "prompt": "The recursive call is `btPermLists(lists[1:], append(path, s), ...)`. Why can reusing `append(path, s)` across loop iterations of `lists[0]` be dangerous in Go?",
      "choices": [
        {
          "label": "`append` may write into a shared backing array, so a later iteration's `append` can overwrite the element a deeper recursion already stored before it copies",
          "correct": true
        },
        {
          "label": "`append` always allocates a brand-new array, so each iteration leaks memory"
        },
        {
          "label": "`lists[1:]` aliases `lists[0]`, so popping the first list corrupts the loop variable `s`"
        },
        {
          "label": "`append` panics when `path` has spare capacity, requiring a manual `make` first"
        }
      ],
      "explain": "If `path` has spare capacity, `append(path, s)` reuses the same backing array each iteration, so successive iterations write `s` to the same slot. The deeper recursion guards against this by doing `copy(row, path)` before storing — that explicit copy is what makes each recorded tuple independent of later mutations."
    },
    {
      "id": "path-copy",
      "prompt": "Before appending to `res`, the code does `copy(row, path)`. Why is this copy necessary?",
      "choices": [
        {
          "label": "`path` is built with `append` and its underlying array may be shared across recursive calls; copying captures the current state",
          "correct": true
        },
        {
          "label": "Go requires all slice elements in a `[][]string` to be distinct allocations"
        },
        {
          "label": "The copy sorts `path` alphabetically before storing it"
        },
        {
          "label": "Without the copy, appending to `res` would overwrite `path` in the caller"
        }
      ],
      "explain": "`append(path, s)` may return a slice still backed by an array shared with sibling iterations and deeper calls. Explicitly copying into a freshly allocated `row` guarantees each result tuple is independent of later mutations to that backing array."
    }
  ]
};
