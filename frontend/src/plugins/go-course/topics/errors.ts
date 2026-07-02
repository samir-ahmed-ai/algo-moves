import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const errors: GoTopic = {
  "id": "errors",
  "title": "Error Handling",
  "icon": "TriangleAlert",
  "concepts": [
    {
      "id": "go-err-wrapping",
      "title": "Wrapping with %w, errors.Is / As",
      "difficulty": "Hard",
      "tags": [
        "errors",
        "wrapping",
        "errors.Is",
        "errors.As",
        "fmt.Errorf"
      ],
      "summary": "Build unwrap chains with %w and interrogate them via errors.Is/As, including multi-%w trees.",
      "pattern": "Error wrapping",
      "visual": "%w links a child error; Is/As walk the tree calling Unwrap()/Unwrap()[]error until a match.",
      "memorize": "%w wraps, Is matches identity/Is(), As extracts by type via pointer-to-pointer; multi-%w makes a tree not a chain.",
      "scene": "An error is a matryoshka doll: %w nests the next doll, Is peeks for a specific face, As pops out the one carved from a given wood.",
      "time": "O(n) over chain",
      "space": "O(1) extra",
      "code": "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\nvar ErrNotFound = errors.New(\"not found\")\n\ntype QueryError struct {\n\tQuery string\n\tCode  int\n}\n\nfunc (e *QueryError) Error() string {\n\treturn fmt.Sprintf(\"query %q failed (code %d)\", e.Query, e.Code)\n}\n\nfunc lookup(id string) error {\n\tbase := &QueryError{Query: id, Code: 42}\n\treturn fmt.Errorf(\"lookup %s: %w: %w\", id, base, ErrNotFound)\n}\n\nfunc main() {\n\terr := lookup(\"user-7\")\n\tfmt.Println(err)\n\n\tfmt.Println(\"Is ErrNotFound:\", errors.Is(err, ErrNotFound))\n\n\tvar qe *QueryError\n\tif errors.As(err, &qe) {\n\t\tfmt.Printf(\"extracted: query=%s code=%d\\n\", qe.Query, qe.Code)\n\t}\n\n\twrapped := fmt.Errorf(\"handler: %w\", err)\n\tfmt.Println(\"still matches:\", errors.Is(wrapped, ErrNotFound))\n}\n",
      "quiz": [
        {
          "id": "multi-w-return-type",
          "prompt": "In Go 1.20+, what does fmt.Errorf(\"a: %w: %w\", e1, e2) return, and how do errors.Is/As traverse it?",
          "choices": [
            {
              "label": "Tree via Unwrap() []error — Is/As do a DFS over both",
              "correct": true
            },
            {
              "label": "Single chain — second %w silently overwrites first"
            },
            {
              "label": "Compile error — only one %w allowed per call"
            },
            {
              "label": "Slice of errors — caller must type-assert to []error"
            }
          ],
          "explain": "Multiple %w produce an error whose Unwrap() returns []error; errors.Is/As perform a depth-first walk visiting every wrapped error."
        },
        {
          "id": "as-target-kind",
          "prompt": "errors.As(err, target) requires target to be:",
          "choices": [
            {
              "label": "Non-nil pointer to an error type or any interface — else it panics",
              "correct": true
            },
            {
              "label": "An error value — As compares it by equality"
            },
            {
              "label": "Any interface{} — reflection figures out the type"
            },
            {
              "label": "Pointer to a matching concrete type — interfaces are rejected"
            }
          ],
          "explain": "errors.As panics if target is not a non-nil pointer to either a type implementing error or to any interface type; it sets *target to the first match. A pointer to an interface (including interface{}) is accepted, so the notion that interfaces are rejected is false."
        },
        {
          "id": "is-comparability",
          "prompt": "errors.Is walks the chain. For an error in the chain that is NOT comparable and has no Is method, what happens at that node?",
          "choices": [
            {
              "label": "Skipped for == — the walk continues to the next unwrapped error",
              "correct": true
            },
            {
              "label": "Panics — uncomparable errors are forbidden in chains"
            },
            {
              "label": "Always returns false — halts the entire walk"
            },
            {
              "label": "Compared by Error() string — fallback to message equality"
            }
          ],
          "explain": "errors.Is only performs == when the value is comparable; a non-comparable node with no Is method is silently skipped for the equality test (no panic) and the walk continues unwrapping, so a deeper node can still match."
        },
        {
          "id": "verb-w-vs-v",
          "prompt": "You use %v instead of %w to format a sentinel into fmt.Errorf. The result:",
          "choices": [
            {
              "label": "No wrap link — errors.Is against the sentinel returns false",
              "correct": true
            },
            {
              "label": "Identical to %w — both create an Unwrap link"
            },
            {
              "label": "Wraps but loses the message — Is still returns true"
            },
            {
              "label": "Panics at runtime — %v rejects error operands"
            }
          ],
          "explain": "%v formats the error's text only and creates no Unwrap link, so errors.Is/As cannot reach the sentinel; only %w records the wrapped error."
        },
        {
          "id": "custom-is-override",
          "prompt": "A custom error type defines Is(target error) bool returning true for any *NetError. Calling errors.Is(err, someNetErr) where err wraps that type:",
          "choices": [
            {
              "label": "True via the custom Is method — semantic match wins",
              "correct": true
            },
            {
              "label": "Returns false — only == is used, ignoring the Is method"
            },
            {
              "label": "Returns true only for identical pointers — no semantic Is call"
            },
            {
              "label": "Panics — Is must return (bool, error)"
            }
          ],
          "explain": "errors.Is calls a node's Is(target) bool method when present, enabling semantic matching independent of pointer identity or ==; the method signature is Is(error) bool, not (bool, error)."
        },
        {
          "id": "as-first-match",
          "prompt": "A chain contains two *QueryError values at different depths. errors.As(err, &qe) sets qe to:",
          "choices": [
            {
              "label": "First match in DFS pre-order — traversal stops immediately",
              "correct": true
            },
            {
              "label": "Deepest match — As always reaches the root cause"
            },
            {
              "label": "Last match — As overwrites until the chain ends"
            },
            {
              "label": "A slice of all matches — As collects every occurrence"
            }
          ],
          "explain": "errors.As returns on the first error in the tree that matches the target type, using depth-first pre-order traversal, and stops there."
        }
      ],
      "design": {
        "prompt": "You are designing the error strategy for a library consumed across many services. Decide what to wrap with %w versus what to keep opaque, and how to expose sentinels/typed errors as a stable API. What are the tradeoffs?",
        "answer": "Wrapping with %w makes the wrapped error part of your public API: callers can errors.Is/As against it, so anything you wrap becomes an implicit compatibility contract you must not change carelessly. The core tradeoff is transparency versus encapsulation: %w preserves rich context and lets callers branch on root causes, but it leaks internal error types (e.g. a specific driver error) that you may later want to swap out. For errors you intend callers to handle programmatically, deliberately expose a small set of exported sentinels (var ErrNotFound = errors.New) or exported typed errors and document them; wrap internal causes with %w only when you want them reachable, otherwise use %v (or a fresh error) to flatten and hide implementation detail. A robust recommendation: at package boundaries, translate low-level errors into your own documented sentinels/types, wrapping the original with %w only when the cause is genuinely useful and stable; add context at each layer with fmt.Errorf(\"doing X: %w\", err) so stack-like breadcrumbs accumulate without a real stack trace. Beware over-wrapping (message noise, accidental API exposure) and under-wrapping (loss of Is/As matchability). Multiple %w is powerful for aggregating causes (e.g. cleanup errors alongside the primary), but document that Unwrap now yields a tree so consumers know Is/As traverse all branches."
      },
      "keyPoints": [
        "%w records an Unwrap link making the wrapped error part of your API; %v only copies text and breaks Is/As matching.",
        "errors.Is walks the chain/tree using == (only for comparable values) plus any custom Is(error) bool method; non-comparable nodes are skipped for ==, not fatal.",
        "errors.As requires a non-nil pointer to an error-implementing or interface type and panics otherwise; it binds the first DFS pre-order match.",
        "Go 1.20+ allows multiple %w, producing Unwrap() []error so the error graph is a tree that Is/As traverse depth-first.",
        "Wrapping internal errors couples callers to your implementation; translate to documented sentinels/types at package boundaries."
      ]
    },
    {
      "id": "go-err-sentinel-typed",
      "title": "Sentinel vs typed errors",
      "difficulty": "Hard",
      "tags": [
        "errors",
        "errors.Is",
        "errors.As",
        "sentinel",
        "typed-errors",
        "Unwrap",
        "API-design"
      ],
      "summary": "When to expose a package-level sentinel vs a typed error, and how Is/As traverse and customize matching.",
      "pattern": "Sentinel vs typed",
      "visual": "errors.Is walks the Unwrap chain by == or calls each node's Is(target); errors.As walks it assigning the first assignable node.",
      "memorize": "Sentinel = identity match up the Unwrap chain; typed = As extracts fields; custom Is redefines equivalence.",
      "scene": "A relay race where each runner (wrapped error) either IS the baton you want or hands you a note saying 'this counts as it' — that note is a custom Is method.",
      "time": "O(depth) chain walk",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\n// ErrNotFound is an exported sentinel: part of the package's API contract.\nvar ErrNotFound = errors.New(\"not found\")\n\n// QueryError is a typed error carrying structured context.\ntype QueryError struct {\n\tQuery string\n\tCode  int\n\tErr   error\n}\n\nfunc (e *QueryError) Error() string {\n\treturn fmt.Sprintf(\"query %q failed (code %d): %v\", e.Query, e.Code, e.Err)\n}\n\n// Unwrap exposes the cause so errors.Is/As can traverse the chain.\nfunc (e *QueryError) Unwrap() error { return e.Err }\n\n// Is customizes matching: two QueryErrors are equivalent when their codes\n// match, independent of the wrapped cause.\nfunc (e *QueryError) Is(target error) bool {\n\tt, ok := target.(*QueryError)\n\tif !ok {\n\t\treturn false\n\t}\n\treturn e.Code == t.Code\n}\n\nfunc lookup(q string) error {\n\treturn &QueryError{Query: q, Code: 42, Err: ErrNotFound}\n}\n\nfunc main() {\n\terr := lookup(\"user-7\")\n\tfmt.Println(\"lookup:\", err)\n\n\t// Traverses the Unwrap chain and reaches the sentinel.\n\tfmt.Println(\"Is ErrNotFound:\", errors.Is(err, ErrNotFound))\n\n\tvar qe *QueryError\n\tif errors.As(err, &qe) {\n\t\tfmt.Printf(\"extracted: query=%s code=%d\\n\", qe.Query, qe.Code)\n\t}\n\n\t// Custom Is matches on Code even though the cause differs.\n\tprobe := &QueryError{Code: 42, Err: errors.New(\"other\")}\n\tfmt.Println(\"still matches:\", errors.Is(err, probe))\n}\n",
      "quiz": [
        {
          "id": "sentinel-identity",
          "prompt": "A library exports `var ErrClosed = errors.New(\"closed\")`. Callers across the codebase check `errors.Is(err, ErrClosed)`. Within any single running program, what makes that check reliable?",
          "choices": [
            {
              "label": "Pointer identity — one shared *errorString value",
              "correct": true
            },
            {
              "label": "String comparison — matches the \"closed\" text",
              "correct": false
            },
            {
              "label": "Type equality — both sides are *errorString",
              "correct": false
            },
            {
              "label": "Reflection — DeepEqual on the error value",
              "correct": false
            }
          ],
          "explain": "errors.New returns a distinct *errorString each call; errors.Is compares plain sentinels with ==, which compares pointers, so every caller must reference the one exported variable. Matching by text or by type is not how Is resolves a plain sentinel."
        },
        {
          "id": "custom-is-semantics",
          "prompt": "In the code, `QueryError.Is` returns true when codes match. Given `err` has Code 42 wrapping ErrNotFound, what does `errors.Is(err, &QueryError{Code: 42, Err: errors.New(\"other\")})` return and why?",
          "choices": [
            {
              "label": "true — custom Is compares Code only",
              "correct": true
            },
            {
              "label": "false — wrapped causes differ",
              "correct": false
            },
            {
              "label": "false — the two pointers are distinct",
              "correct": false
            },
            {
              "label": "true — struct values are deep-equal",
              "correct": false
            }
          ],
          "explain": "errors.Is calls the node's Is method when present; QueryError.Is ignores Err and compares only Code, so 42==42 yields true regardless of the differing wrapped cause or the distinct pointers."
        },
        {
          "id": "as-target-type",
          "prompt": "`Error()`, `Unwrap()`, and `Is()` are all declared on `*QueryError` (pointer receiver). What must the second argument to errors.As be?",
          "choices": [
            {
              "label": "&qe with qe *QueryError — a **QueryError",
              "correct": true
            },
            {
              "label": "&qe with qe QueryError — value does not satisfy error",
              "correct": false
            },
            {
              "label": "qe of type *QueryError — passed to As directly",
              "correct": false
            },
            {
              "label": "any typed nil — As infers the concrete type",
              "correct": false
            }
          ],
          "explain": "As needs a non-nil pointer whose pointee is a type implementing error. Only *QueryError implements error, so the pointee must be *QueryError and the target must be **QueryError, i.e. &qe where qe is *QueryError. A &qe over a QueryError value, or a bare *QueryError, panics at runtime because the pointee does not implement error."
        },
        {
          "id": "missing-unwrap",
          "prompt": "If `QueryError` had NO Unwrap method but still stored ErrNotFound in its Err field, what would `errors.Is(err, ErrNotFound)` return?",
          "choices": [
            {
              "label": "false — chain cannot descend past QueryError",
              "correct": true
            },
            {
              "label": "true — Is reads struct fields automatically",
              "correct": false
            },
            {
              "label": "true — the Err field is scanned by reflection",
              "correct": false
            },
            {
              "label": "panic — Is demands an Unwrap method",
              "correct": false
            }
          ],
          "explain": "errors.Is descends only via Unwrap (or a custom Is). Without Unwrap the Err field is invisible to Is; the walk stops at QueryError, whose own Is only matches another *QueryError, so ErrNotFound is never reached and Is returns false."
        },
        {
          "id": "sentinel-api-coupling",
          "prompt": "Why is exporting a sentinel like `ErrNotFound` a heavier API commitment than returning an unexported typed error checked via a helper predicate?",
          "choices": [
            {
              "label": "Callers couple to identity — sentinel becomes permanent API",
              "correct": true
            },
            {
              "label": "Sentinels allocate — one heap object per call site",
              "correct": false
            },
            {
              "label": "Sentinels break errors.Is use — wrapping is unsafe",
              "correct": false
            },
            {
              "label": "Sentinels are mutable — callers can reassign them",
              "correct": false
            }
          ],
          "explain": "Once callers write errors.Is(err, pkg.ErrNotFound), that exported symbol is a locked-in contract you cannot rename or remove without breaking them. A typed error behind a predicate such as IsNotFound(err) hides the identity and lets you evolve internals freely. Sentinels are allocated once at init, not per call, and package-level vars are not caller-reassignable across packages."
        },
        {
          "id": "double-wrap-w",
          "prompt": "Go supports `fmt.Errorf(\"...: %w: %w\", a, b)` wrapping two errors. If a QueryError is joined with ErrNotFound this way, how does errors.Is behave over the result?",
          "choices": [
            {
              "label": "Tree walk — matches either wrapped branch",
              "correct": true
            },
            {
              "label": "Matches the first %w — ignores the second",
              "correct": false
            },
            {
              "label": "Compile error — two %w verbs are rejected",
              "correct": false
            },
            {
              "label": "Matches the last %w — ignores the first",
              "correct": false
            }
          ],
          "explain": "Multiple %w verbs produce an error whose Unwrap() returns []error, and errors.Is/As do a depth-first traversal over the whole tree, so a match on any wrapped branch succeeds. Two %w verbs have been valid since Go 1.20."
        }
      ],
      "design": {
        "prompt": "You maintain a widely-used storage library. Consumers need to distinguish 'row not found', 'unique constraint violated' (with the offending column), and 'transient/retryable' failures. Design the error surface: which of these should be exported sentinels vs typed errors, how do you make matching robust across wrapping layers, and how do you keep the API evolvable?",
        "answer": "Use sentinels for conditions callers only ever branch on as a boolean with no payload — 'not found' is the classic case: `var ErrNotFound = errors.New(\"not found\")`, matched via errors.Is up the Unwrap chain. Use typed errors when callers need structured data: a `ConstraintError{Column, Constraint string; Err error}` extracted via errors.As, so the caller can report which column collided. For retryability, prefer a behavioral interface (`interface{ Temporary() bool }`) or a predicate `IsRetryable(err) bool` rather than a raw sentinel, because retryability is a property that many concrete errors may share and you don't want to couple callers to one identity. Robust matching requires every wrapper in your stack to implement Unwrap (or return []error for joins) so Is/As can traverse; wrap with %w, never %v, at boundaries where the cause matters. The key evolvability tradeoff: an exported sentinel is a permanent API commitment — callers hard-code errors.Is(err, pkg.ErrX) and you can never rename or drop it — whereas exposing predicates/interfaces lets you refactor concrete types freely. Recommendation: export sentinels sparingly for stable, payload-free conditions; use typed errors + As for anything with fields; and offer predicate functions for cross-cutting properties like retryability. Add a custom Is method only when the default identity/type match is wrong (e.g. matching on a code), and document it, since it silently changes equivalence semantics for everyone."
      },
      "keyPoints": [
        "errors.New returns a fresh *errorString each call; sentinel matching is pointer identity via ==, so callers must reference the shared exported variable, not reconstruct it.",
        "errors.Is walks the Unwrap chain comparing == and invoking any custom Is method; errors.As walks it assigning the first node assignable to the target's pointee.",
        "A typed error must implement Unwrap for Is/As to see errors it wraps in its fields — fields alone are invisible to the chain walk.",
        "Exporting a sentinel is a hard API commitment (callers couple to its identity); predicates/interfaces preserve freedom to evolve internals.",
        "A custom Is method redefines equivalence (e.g. match on a code, ignore the cause) — powerful but surprising, so document it.",
        "errors.As's target must be a pointer to a type implementing error; for pointer-receiver methods that means **T, and a wrong target panics at runtime rather than returning false."
      ]
    },
    {
      "id": "go-err-panic-recover",
      "title": "panic, recover & defer semantics",
      "difficulty": "Hard",
      "tags": [
        "error-handling",
        "panic",
        "recover",
        "defer",
        "runtime"
      ],
      "summary": "How recover intercepts panics, how deferred functions run, and the timing traps that decide return values.",
      "pattern": "Panic/Recover",
      "visual": "panic unwinds the stack running defers; recover in a running defer stops unwinding and returns the panic value.",
      "memorize": "recover works only in a deferred func called directly by the panicking frame; defer args evaluate at defer-time, body runs at return-time.",
      "scene": "A firefighter (recover) can only put out the blaze while standing inside the deferred doorway of the burning room; shouting from the hallway does nothing.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\n// safeDivide converts a panic into a named-return error, mutated inside defer.\nfunc safeDivide(a, b int) (result int, err error) {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\terr = fmt.Errorf(\"recovered: %v\", r)\n\t\t}\n\t}()\n\tresult = a / b // panics when b == 0\n\treturn result, nil\n}\n\n// deferArgTiming shows args are captured at defer-time, not at call-time.\nfunc deferArgTiming() {\n\ti := 10\n\tdefer fmt.Println(\"deferred arg captured:\", i) // prints 10\n\ti = 20\n\tfmt.Println(\"final i:\", i) // prints 20\n}\n\n// rethrow recovers, inspects, then re-panics values it will not handle.\nfunc rethrow() (err error) {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tif e, ok := r.(error); ok && errors.Is(e, errSentinel) {\n\t\t\t\terr = e // handled\n\t\t\t\treturn\n\t\t\t}\n\t\t\tpanic(r) // re-panic what we cannot handle\n\t\t}\n\t}()\n\tpanic(errSentinel)\n}\n\nvar errSentinel = errors.New(\"sentinel\")\n\nfunc main() {\n\tq, err := safeDivide(4, 0)\n\tfmt.Println(q, err)\n\tdeferArgTiming()\n\tfmt.Println(rethrow())\n}\n",
      "quiz": [
        {
          "id": "recover-scope",
          "prompt": "A goroutine calls f(), which calls a helper() that recover()s (helper is NOT deferred) and then f() panics. Does helper's recover() stop the panic?",
          "choices": [
            {
              "label": "Not recovered — recover ran outside defer",
              "correct": true
            },
            {
              "label": "Yes — any recover in the goroutine catches it"
            },
            {
              "label": "Yes — recover catches later panics in the frame"
            },
            {
              "label": "Bad signature — recover takes no arguments"
            }
          ],
          "explain": "recover only has effect when called directly by a function that was itself deferred and is running during unwinding; a plain call returns nil and never stops a panic."
        },
        {
          "id": "defer-arg-eval",
          "prompt": "For `i := 10; defer fmt.Println(i); i = 20`, what does the deferred call print?",
          "choices": [
            {
              "label": "10 — arguments evaluated at defer statement",
              "correct": true
            },
            {
              "label": "20 — arguments evaluated at return time"
            },
            {
              "label": "0 — deferred args zeroed until run"
            },
            {
              "label": "panic — capturing a mutated variable"
            }
          ],
          "explain": "Deferred call arguments are evaluated when the defer statement executes, so i's value of 10 is captured immediately; only the invocation is delayed."
        },
        {
          "id": "named-return-mutation",
          "prompt": "In safeDivide with named returns (result, err), the deferred func sets err after a panic. What does the caller observe?",
          "choices": [
            {
              "label": "err set — deferred mutation of named return wins",
              "correct": true
            },
            {
              "label": "err nil — panic discards all return values"
            },
            {
              "label": "err nil — return already committed pre-defer"
            },
            {
              "label": "runtime crash — cannot assign in a defer"
            }
          ],
          "explain": "Named return variables are addressable slots; a deferred function that recovers can assign to them, and those values become the function's actual return after unwinding stops."
        },
        {
          "id": "repanic-value",
          "prompt": "A deferred func calls recover(), decides not to handle the value, and calls panic(r). What propagates to the caller?",
          "choices": [
            {
              "label": "Original value re-raised — unwinding resumes upward",
              "correct": true
            },
            {
              "label": "A new nil panic — recover consumed the value"
            },
            {
              "label": "Nothing — recover stopped it permanently"
            },
            {
              "label": "runtime.Error wrapper — re-panic always rewraps"
            }
          ],
          "explain": "recover() stops the current unwinding, but calling panic(r) starts a fresh panic carrying that same value, so it continues propagating to callers as if re-raised."
        },
        {
          "id": "defer-order-panic",
          "prompt": "Three defers registered in a function that panics before returning. In what order do they run?",
          "choices": [
            {
              "label": "LIFO — last registered runs first during unwind",
              "correct": true
            },
            {
              "label": "FIFO — registration order during unwind"
            },
            {
              "label": "Only the last defer — panic skips earlier ones"
            },
            {
              "label": "None run — panic skips pending defers"
            }
          ],
          "explain": "Deferred calls always run in last-in-first-out order, and a panic still executes all registered defers of the frame as it unwinds."
        },
        {
          "id": "recover-return-value",
          "prompt": "If no panic is in progress, what does a call to recover() return?",
          "choices": [
            {
              "label": "nil — no active panic to recover",
              "correct": true
            },
            {
              "label": "empty error — zero-value error returned"
            },
            {
              "label": "zero value — of the last panic type"
            },
            {
              "label": "blocks — waits until a panic occurs"
            }
          ],
          "explain": "recover() returns nil when the goroutine is not panicking (or when called outside a deferred function), making `r != nil` the standard guard."
        }
      ],
      "design": {
        "prompt": "You maintain a library that runs untrusted user-supplied plugin callbacks. Design a strategy for using panic/recover at the boundary so a plugin's panic never crashes the host, while preserving debuggability. What are the tradeoffs and your recommendation?",
        "answer": "Wrap each plugin invocation in a helper whose deferred function calls recover(), converting any recovered value into an error return (e.g. fmt.Errorf(\"plugin %s panicked: %v\", name, r)) and capturing the stack via runtime/debug.Stack() before it is lost. Recover must live in a deferred func directly in the invoking frame, and you should recover per-callback (not once at the top) so one bad plugin does not abort the whole batch. Key tradeoffs: recovering hides programming bugs in your own code, so scope recovery narrowly to the plugin call and re-panic values you did not expect (e.g. runtime.Error from your own logic) rather than swallowing everything; also, a panic in a separate goroutine spawned by the plugin cannot be recovered by your frame, so document that plugins must not leak goroutines or you must wrap their goroutine entry points too. Preserve the original value with errors.As/Is checks if plugins panic with typed errors, and never recover in a way that leaves shared state half-mutated — pair recovery with rollback. Recommendation: a thin per-call boundary that recovers, records stack + plugin identity, returns a wrapped error, and re-panics on values indicating host-side corruption (like out-of-memory or your own invariant violations), giving isolation without masking real host bugs."
      },
      "keyPoints": [
        "recover() only takes effect inside a function invoked via defer in the panicking frame; elsewhere it returns nil.",
        "Deferred call arguments (and receiver) are evaluated at the defer statement; the body runs at return/unwind time.",
        "A deferred func can assign to named return values, letting recover() turn a panic into a clean error return.",
        "Calling panic(r) after recover() re-raises propagation with the same value; recovery is only permanent if you stop there.",
        "Defers run LIFO and still execute during a panic; a panic in another goroutine cannot be recovered from this stack."
      ]
    },
    {
      "id": "go-err-custom",
      "title": "Custom error types & Unwrap",
      "difficulty": "Hard",
      "tags": [
        "errors",
        "Unwrap",
        "errors.Is",
        "errors.As",
        "errors.Join",
        "wrapping"
      ],
      "summary": "Build custom error types that participate correctly in Is/As chains and joined trees.",
      "pattern": "Error chains",
      "visual": "Error() renders; Unwrap() exposes parent; Is/As walk the tree via Unwrap and Join.",
      "memorize": "Implement Error() for text, Unwrap() for the chain; %w wraps, errors.Join branches, Is/As walk both.",
      "scene": "A detective follows a chain of handcuffed suspects (Unwrap), then hits a fork where two are cuffed together (Join) and searches both branches.",
      "time": "O(n) chain walk",
      "space": "O(1) extra",
      "code": "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\ntype NotFoundError struct {\n\tKey string\n\terr error\n}\n\nfunc (e *NotFoundError) Error() string {\n\treturn fmt.Sprintf(\"key %q not found: %v\", e.Key, e.err)\n}\n\nfunc (e *NotFoundError) Unwrap() error { return e.err }\n\nvar ErrBackend = errors.New(\"backend unavailable\")\n\nfunc lookup(key string) error {\n\treturn &NotFoundError{Key: key, err: fmt.Errorf(\"query: %w\", ErrBackend)}\n}\n\nfunc main() {\n\terr := lookup(\"session\")\n\tjoined := errors.Join(err, errors.New(\"audit failed\"))\n\n\tvar nfe *NotFoundError\n\tfmt.Println(\"As NotFoundError:\", errors.As(joined, &nfe))\n\tfmt.Println(\"Is ErrBackend:\", errors.Is(joined, ErrBackend))\n\tif nfe != nil {\n\t\tfmt.Println(\"Recovered key:\", nfe.Key)\n\t}\n}\n",
      "quiz": [
        {
          "id": "unwrap-signature",
          "prompt": "For errors.Is and errors.As to walk into a custom error's wrapped cause, which method must the custom type provide (in Go 1.26)?",
          "choices": [
            {
              "label": "Unwrap() error — single-parent chain interface",
              "correct": true
            },
            {
              "label": "Cause() error — pkg/errors convention ignored by stdlib"
            },
            {
              "label": "Wrapped() error — never inspected by errors package"
            },
            {
              "label": "Unwrap() []error mandatory — required for every unwrap"
            }
          ],
          "explain": "The stdlib recognizes Unwrap() error for single-parent chains; Cause()/Wrapped() are not recognized. Unwrap() []error is only for multi-error trees (Join), not a general requirement."
        },
        {
          "id": "is-target-comparable",
          "prompt": "errors.Is(err, target) is called where target is a *NotFoundError with a filled Key. NotFoundError does NOT implement an Is method. What decides a match at each node in the chain?",
          "choices": [
            {
              "label": "Pointer identity via == — same *NotFoundError address needed",
              "correct": true
            },
            {
              "label": "Struct field equality — all fields including Key compared"
            },
            {
              "label": "Type identity alone — any *NotFoundError node matches"
            },
            {
              "label": "Always false — pointers can never compare with =="
            }
          ],
          "explain": "Without a custom Is method, errors.Is compares each node to target with ==. For *NotFoundError that == is pointer-identity, so two distinct instances never match regardless of Key. Use errors.As to extract by type instead."
        },
        {
          "id": "as-pointer-arg",
          "prompt": "var e MyError (a struct implementing error via pointer receiver). What is the correct errors.As call, and why?",
          "choices": [
            {
              "label": "errors.As(err, &ep) — &ep targets the *MyError value",
              "correct": true
            },
            {
              "label": "errors.As(err, &e) with value e — struct value satisfies error"
            },
            {
              "label": "errors.As(err, e) — As accepts the target directly"
            },
            {
              "label": "errors.As(err, MyError{}) — zero value receives the match"
            }
          ],
          "explain": "error is satisfied by *MyError (pointer receiver), so the target must be **MyError, i.e. &ep where ep is *MyError. Passing a non-pointer or a type that doesn't implement error panics or fails to match."
        },
        {
          "id": "join-preserves-type",
          "prompt": "j := errors.Join(a, b) where a is *NotFoundError. What is true of j?",
          "choices": [
            {
              "label": "Unwrap() []error — errors.As reaches a through the slice branch",
              "correct": true
            },
            {
              "label": "j is *NotFoundError — Join keeps the first error's type"
            },
            {
              "label": "Join flattens — a's own Unwrap chain gets discarded"
            },
            {
              "label": "errors.Is(j, a) is false — Join severs identity checks"
            }
          ],
          "explain": "Join returns an unexported type with Unwrap() []error; Is/As recursively descend into every branch, so a and its chain remain reachable. j itself is not a *NotFoundError."
        },
        {
          "id": "wrap-verb-vs-v",
          "prompt": "fmt.Errorf(\"ctx: %v\", cause) versus fmt.Errorf(\"ctx: %w\", cause). Difference for error inspection?",
          "choices": [
            {
              "label": "%w sets Unwrap — %v only formats text, breaking Is/As",
              "correct": true
            },
            {
              "label": "Both wrap — %v and %w behave identically for chains"
            },
            {
              "label": "%v wraps, %w formats — the two verbs are reversed"
            },
            {
              "label": "%w needs two args — a lone %w fails to compile"
            }
          ],
          "explain": "%w makes the returned wrapError expose the cause via Unwrap; %v only interpolates the string, so errors.Is/As cannot see the underlying error. Multiple %w in one Errorf produces a multi-error (Unwrap() []error)."
        },
        {
          "id": "nil-unwrap-chain",
          "prompt": "A *NotFoundError has Unwrap() returning its err field, which is nil. errors.Is(nfe, someTarget) behaves how at that node?",
          "choices": [
            {
              "label": "Chain terminates — nil Unwrap ends the walk cleanly",
              "correct": true
            },
            {
              "label": "Panics — Is dereferences the nil error"
            },
            {
              "label": "Infinite loop — nil re-enters the same node"
            },
            {
              "label": "Matches nil target — Is(nfe, nil) returns true here"
            }
          ],
          "explain": "When Unwrap returns nil, errors.Is treats the chain as ended and stops without matching further; it does not panic. errors.Is(err, nil) is only true if err itself is nil."
        }
      ],
      "design": {
        "prompt": "You are designing the error taxonomy for a shared platform library consumed by many services. Callers need to programmatically classify failures (retryable? not-found? permission denied?) while you retain freedom to evolve internal error details. How do you design your custom error types and the wrapping strategy, and what do you expose as your public contract?",
        "answer": "Prefer exposing behavior over concrete types: define a small set of exported sentinels (ErrNotFound, ErrRetryable) or exported interfaces (interface{ Retryable() bool }) as the stable contract, and keep concrete struct types unexported so you can change fields freely. Wrap with %w at each layer that adds context so callers can use errors.Is against sentinels and errors.As against interfaces without depending on your internals. Give custom types an Unwrap() error to preserve the cause chain, and consider a custom Is method when semantic equality differs from equality by == (e.g., matching any not-found regardless of key). The tradeoff: exporting concrete types is convenient for callers but freezes your struct layout into your API and encourages brittle type switches; sentinels are simplest but carry no data; interfaces are the most flexible but require discipline and are less discoverable. A key pitfall is over-wrapping — leaking internal messages or duplicating context — and forgetting that errors.Is uses == unless you implement Is, so distinct pointer instances won't match. Recommendation: publish sentinels for coarse classification and one or two behavior interfaces for richer cases, wrap with %w consistently, keep concrete types unexported, and document exactly which errors callers may match against as the versioned contract; use errors.Join at boundaries that genuinely aggregate independent failures (e.g., cleanup) rather than to fake a chain."
      },
      "keyPoints": [
        "Error() supplies the message; Unwrap() error exposes the single parent so Is/As can walk the chain.",
        "%w wraps and preserves inspectability; %v only formats text and severs Is/As reachability.",
        "errors.Is matches with == unless the type defines its own Is method; for pointer-typed errors that is pointer identity, so distinct instances never match by fields.",
        "errors.As matches by type and requires a pointer to a value of the error-implementing type (often **T for pointer receivers).",
        "errors.Join builds a tree via Unwrap() []error; Is/As recurse into every branch, but the joined value is not any child's concrete type.",
        "Returning nil from Unwrap cleanly terminates the walk without panicking."
      ]
    }
  ]
};
