import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const errors: GoTopic = {
  id: 'errors',
  title: 'Error Handling',
  icon: 'TriangleAlert',
  concepts: [
    {
      id: 'go-err-wrapping',
      title: 'Wrapping with %w, errors.Is / As',
      difficulty: 'Hard',
      tags: ['errors', 'wrapping', 'errors.Is', 'errors.As', 'fmt.Errorf'],
      summary:
        'Build unwrap chains with %w and interrogate them via errors.Is/As, including multi-%w trees.',
      pattern: 'Error wrapping',
      visual:
        '%w links a child error; Is/As walk the tree calling Unwrap()/Unwrap()[]error until a match.',
      memorize:
        '%w wraps, Is matches identity/Is(), As extracts by type via pointer-to-pointer; multi-%w makes a tree not a chain.',
      scene:
        'An error is a matryoshka doll: %w nests the next doll, Is peeks for a specific face, As pops out the one carved from a given wood.',
      time: 'O(n) over chain',
      space: 'O(1) extra',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\nvar ErrNotFound = errors.New("not found")\n\ntype QueryError struct {\n\tQuery string\n\tCode  int\n}\n\nfunc (e *QueryError) Error() string {\n\treturn fmt.Sprintf("query %q failed (code %d)", e.Query, e.Code)\n}\n\nfunc lookup(id string) error {\n\tbase := &QueryError{Query: id, Code: 42}\n\treturn fmt.Errorf("lookup %s: %w: %w", id, base, ErrNotFound)\n}\n\nfunc main() {\n\terr := lookup("user-7")\n\tfmt.Println(err)\n\n\tfmt.Println("Is ErrNotFound:", errors.Is(err, ErrNotFound))\n\n\tvar qe *QueryError\n\tif errors.As(err, &qe) {\n\t\tfmt.Printf("extracted: query=%s code=%d\\n", qe.Query, qe.Code)\n\t}\n\n\twrapped := fmt.Errorf("handler: %w", err)\n\tfmt.Println("still matches:", errors.Is(wrapped, ErrNotFound))\n}\n',
      keyPoints: [
        '%w records an Unwrap link making the wrapped error part of your API; %v only copies text and breaks Is/As matching.',
        'errors.Is walks the chain/tree using == (only for comparable values) plus any custom Is(error) bool method; non-comparable nodes are skipped for ==, not fatal.',
        'errors.As requires a non-nil pointer to an error-implementing or interface type and panics otherwise; it binds the first DFS pre-order match.',
        'Go 1.20+ allows multiple %w, producing Unwrap() []error so the error graph is a tree that Is/As traverse depth-first.',
        'Wrapping internal errors couples callers to your implementation; translate to documented sentinels/types at package boundaries.',
      ],
      walkthrough: [
        {
          title: 'Build the base error',
          caption:
            'lookup constructs a concrete *QueryError value, capturing the query id and code 42.',
          focus: ['base := &QueryError{Query: id, Code: 42}'],
          state: [
            {
              k: 'id',
              v: '"user-7"',
            },
            {
              k: 'base',
              v: '*QueryError{user-7, 42}',
            },
          ],
        },
        {
          title: 'Wrap twice with %w',
          caption:
            'fmt.Errorf with two %w verbs wraps both base and ErrNotFound into one error whose Unwrap returns a []error slice — a tree, not a linear chain.',
          focus: ['fmt.Errorf("lookup %s: %w: %w", id, base, ErrNotFound)'],
          state: [
            {
              k: 'return type',
              v: '*fmt.wrapErrors',
            },
            {
              k: 'Unwrap()',
              v: '[]error{base, ErrNotFound}',
            },
            {
              k: 'shape',
              v: 'tree (2 children)',
            },
          ],
        },
        {
          title: 'Print the wrapped error',
          caption:
            "The top error's Error() renders all three layers into one string as laid out by the format string.",
          focus: ['fmt.Println(err)'],
          state: [
            {
              k: 'output',
              v: 'lookup user-7: query "user-7" failed (code 42): not found',
            },
          ],
        },
        {
          title: 'errors.Is walks the tree',
          caption:
            'errors.Is traverses both branches (depth-first, preorder) and matches ErrNotFound by identity in the second child.',
          focus: ['errors.Is(err, ErrNotFound)'],
          state: [
            {
              k: 'visit',
              v: 'root, base, ErrNotFound',
            },
            {
              k: 'match',
              v: 'ErrNotFound (identity)',
            },
            {
              k: 'result',
              v: 'true',
            },
          ],
        },
        {
          title: 'errors.As extracts by type',
          caption:
            'errors.As takes &qe (a **QueryError) and, walking the same tree, assigns the first *QueryError it finds into qe.',
          focus: ['var qe *QueryError', 'errors.As(err, &qe)'],
          state: [
            {
              k: 'target',
              v: '**QueryError',
            },
            {
              k: 'found',
              v: 'base',
            },
            {
              k: 'qe',
              v: '*QueryError{user-7, 42}',
            },
            {
              k: 'result',
              v: 'true',
            },
          ],
        },
        {
          title: 'Use the extracted fields',
          caption:
            'Because As populated qe, its concrete fields Query and Code are now readable directly.',
          focus: ['fmt.Printf("extracted: query=%s code=%d\\n", qe.Query, qe.Code)'],
          state: [
            {
              k: 'qe.Query',
              v: 'user-7',
            },
            {
              k: 'qe.Code',
              v: '42',
            },
          ],
        },
        {
          title: 'Re-wrap over the tree',
          caption:
            'Wrapping err again with a single %w adds a new root node above the existing tree, deepening but not flattening it.',
          focus: ['fmt.Errorf("handler: %w", err)'],
          state: [
            {
              k: 'wrapped.Unwrap()',
              v: 'err (single)',
            },
            {
              k: 'depth',
              v: 'root over 2-child tree',
            },
          ],
        },
        {
          title: 'Match survives re-wrapping',
          caption:
            'errors.Is on the re-wrapped error descends through the new root into the tree and still finds ErrNotFound.',
          focus: ['errors.Is(wrapped, ErrNotFound)'],
          state: [
            {
              k: 'traversal',
              v: 'wrapped -> err -> ErrNotFound',
            },
            {
              k: 'result',
              v: 'true',
            },
          ],
        },
      ],
    },
    {
      id: 'go-err-sentinel-typed',
      title: 'Sentinel vs typed errors',
      difficulty: 'Hard',
      tags: [
        'errors',
        'errors.Is',
        'errors.As',
        'sentinel',
        'typed-errors',
        'Unwrap',
        'API-design',
      ],
      summary:
        'When to expose a package-level sentinel vs a typed error, and how Is/As traverse and customize matching.',
      pattern: 'Sentinel vs typed',
      visual:
        "errors.Is walks the Unwrap chain by == or calls each node's Is(target); errors.As walks it assigning the first assignable node.",
      memorize:
        'Sentinel = identity match up the Unwrap chain; typed = As extracts fields; custom Is redefines equivalence.',
      scene:
        "A relay race where each runner (wrapped error) either IS the baton you want or hands you a note saying 'this counts as it' — that note is a custom Is method.",
      time: 'O(depth) chain walk',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\n// ErrNotFound is an exported sentinel: part of the package\'s API contract.\nvar ErrNotFound = errors.New("not found")\n\n// QueryError is a typed error carrying structured context.\ntype QueryError struct {\n\tQuery string\n\tCode  int\n\tErr   error\n}\n\nfunc (e *QueryError) Error() string {\n\treturn fmt.Sprintf("query %q failed (code %d): %v", e.Query, e.Code, e.Err)\n}\n\n// Unwrap exposes the cause so errors.Is/As can traverse the chain.\nfunc (e *QueryError) Unwrap() error { return e.Err }\n\n// Is customizes matching: two QueryErrors are equivalent when their codes\n// match, independent of the wrapped cause.\nfunc (e *QueryError) Is(target error) bool {\n\tt, ok := target.(*QueryError)\n\tif !ok {\n\t\treturn false\n\t}\n\treturn e.Code == t.Code\n}\n\nfunc lookup(q string) error {\n\treturn &QueryError{Query: q, Code: 42, Err: ErrNotFound}\n}\n\nfunc main() {\n\terr := lookup("user-7")\n\tfmt.Println("lookup:", err)\n\n\t// Traverses the Unwrap chain and reaches the sentinel.\n\tfmt.Println("Is ErrNotFound:", errors.Is(err, ErrNotFound))\n\n\tvar qe *QueryError\n\tif errors.As(err, &qe) {\n\t\tfmt.Printf("extracted: query=%s code=%d\\n", qe.Query, qe.Code)\n\t}\n\n\t// Custom Is matches on Code even though the cause differs.\n\tprobe := &QueryError{Code: 42, Err: errors.New("other")}\n\tfmt.Println("still matches:", errors.Is(err, probe))\n}\n',
      keyPoints: [
        'errors.New returns a fresh *errorString each call; sentinel matching is pointer identity via ==, so callers must reference the shared exported variable, not reconstruct it.',
        "errors.Is walks the Unwrap chain comparing == and invoking any custom Is method; errors.As walks it assigning the first node assignable to the target's pointee.",
        'A typed error must implement Unwrap for Is/As to see errors it wraps in its fields — fields alone are invisible to the chain walk.',
        'Exporting a sentinel is a hard API commitment (callers couple to its identity); predicates/interfaces preserve freedom to evolve internals.',
        'A custom Is method redefines equivalence (e.g. match on a code, ignore the cause) — powerful but surprising, so document it.',
        "errors.As's target must be a pointer to a type implementing error; for pointer-receiver methods that means **T, and a wrong target panics at runtime rather than returning false.",
      ],
      walkthrough: [
        {
          title: 'Sentinel declared',
          caption:
            "A package-level sentinel error is created once at init and becomes part of the package's public API for identity comparison.",
          focus: ['var ErrNotFound = errors.New("not found")'],
          state: [
            {
              k: 'ErrNotFound',
              v: '*errorString "not found"',
            },
            {
              k: 'kind',
              v: 'sentinel (identity)',
            },
          ],
        },
        {
          title: 'Typed error defined',
          caption:
            'QueryError is a struct carrying structured context (Query, Code) plus a wrapped cause, so callers can extract fields instead of just comparing identity.',
          focus: ['type QueryError struct {', 'Err   error'],
          state: [
            {
              k: 'fields',
              v: 'Query, Code, Err',
            },
            {
              k: 'kind',
              v: 'typed (As extracts)',
            },
          ],
        },
        {
          title: 'lookup wraps sentinel',
          caption:
            'lookup returns a *QueryError whose Err field wraps ErrNotFound, building a two-link chain: QueryError -> ErrNotFound.',
          focus: ['return &QueryError{Query: q, Code: 42, Err: ErrNotFound}'],
          state: [
            {
              k: 'err',
              v: '*QueryError',
            },
            {
              k: 'err.Code',
              v: '42',
            },
            {
              k: 'chain',
              v: 'QueryError -> ErrNotFound',
            },
          ],
        },
        {
          title: 'Is walks the chain',
          caption:
            "errors.Is compares err to ErrNotFound, then follows Unwrap: QueryError isn't ErrNotFound, but Unwrap yields ErrNotFound which matches by identity, so it returns true.",
          focus: [
            'errors.Is(err, ErrNotFound)',
            'func (e *QueryError) Unwrap() error { return e.Err }',
          ],
          state: [
            {
              k: 'compare QueryError',
              v: 'no match',
            },
            {
              k: 'Unwrap -> ErrNotFound',
              v: 'identity match',
            },
            {
              k: 'result',
              v: 'true',
            },
          ],
        },
        {
          title: 'As extracts fields',
          caption:
            'errors.As finds the first *QueryError in the chain and assigns it to qe, giving typed access to the structured Query and Code fields.',
          focus: [
            'if errors.As(err, &qe) {',
            'fmt.Printf("extracted: query=%s code=%d\\n", qe.Query, qe.Code)',
          ],
          state: [
            {
              k: 'qe',
              v: '*QueryError (err itself)',
            },
            {
              k: 'qe.Query',
              v: 'user-7',
            },
            {
              k: 'qe.Code',
              v: '42',
            },
          ],
        },
        {
          title: 'Probe with matching code',
          caption:
            'A fresh QueryError is built with the same Code 42 but a different wrapped cause, to test the custom equivalence rule.',
          focus: ['probe := &QueryError{Code: 42, Err: errors.New("other")}'],
          state: [
            {
              k: 'probe.Code',
              v: '42',
            },
            {
              k: 'probe.Err',
              v: '"other" (differs)',
            },
          ],
        },
        {
          title: 'Custom Is redefines match',
          caption:
            'Because *QueryError defines its own Is method, errors.Is calls err.Is(probe) which compares only Code (42 == 42) and returns true despite the differing causes.',
          focus: [
            'func (e *QueryError) Is(target error) bool {',
            'return e.Code == t.Code',
            'errors.Is(err, probe)',
          ],
          state: [
            {
              k: 'err.Code == probe.Code',
              v: '42 == 42',
            },
            {
              k: 'cause equality',
              v: 'ignored',
            },
            {
              k: 'result',
              v: 'true',
            },
          ],
        },
      ],
    },
    {
      id: 'go-err-panic-recover',
      title: 'panic, recover & defer semantics',
      difficulty: 'Hard',
      tags: ['error-handling', 'panic', 'recover', 'defer', 'runtime'],
      summary:
        'How recover intercepts panics, how deferred functions run, and the timing traps that decide return values.',
      pattern: 'Panic/Recover',
      visual:
        'panic unwinds the stack running defers; recover in a running defer stops unwinding and returns the panic value.',
      memorize:
        'recover works only in a deferred func called directly by the panicking frame; defer args evaluate at defer-time, body runs at return-time.',
      scene:
        'A firefighter (recover) can only put out the blaze while standing inside the deferred doorway of the burning room; shouting from the hallway does nothing.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\n// safeDivide converts a panic into a named-return error, mutated inside defer.\nfunc safeDivide(a, b int) (result int, err error) {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\terr = fmt.Errorf("recovered: %v", r)\n\t\t}\n\t}()\n\tresult = a / b // panics when b == 0\n\treturn result, nil\n}\n\n// deferArgTiming shows args are captured at defer-time, not at call-time.\nfunc deferArgTiming() {\n\ti := 10\n\tdefer fmt.Println("deferred arg captured:", i) // prints 10\n\ti = 20\n\tfmt.Println("final i:", i) // prints 20\n}\n\n// rethrow recovers, inspects, then re-panics values it will not handle.\nfunc rethrow() (err error) {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tif e, ok := r.(error); ok && errors.Is(e, errSentinel) {\n\t\t\t\terr = e // handled\n\t\t\t\treturn\n\t\t\t}\n\t\t\tpanic(r) // re-panic what we cannot handle\n\t\t}\n\t}()\n\tpanic(errSentinel)\n}\n\nvar errSentinel = errors.New("sentinel")\n\nfunc main() {\n\tq, err := safeDivide(4, 0)\n\tfmt.Println(q, err)\n\tdeferArgTiming()\n\tfmt.Println(rethrow())\n}\n',
      keyPoints: [
        'recover() only takes effect inside a function invoked via defer in the panicking frame; elsewhere it returns nil.',
        'Deferred call arguments (and receiver) are evaluated at the defer statement; the body runs at return/unwind time.',
        'A deferred func can assign to named return values, letting recover() turn a panic into a clean error return.',
        'Calling panic(r) after recover() re-raises propagation with the same value; recovery is only permanent if you stop there.',
        'Defers run LIFO and still execute during a panic; a panic in another goroutine cannot be recovered from this stack.',
      ],
      walkthrough: [
        {
          title: 'Enter safeDivide(4,0)',
          caption:
            'main calls safeDivide with b==0; the named returns result and err are zero-initialized before the body runs.',
          focus: [
            'q, err := safeDivide(4, 0)',
            'func safeDivide(a, b int) (result int, err error)',
          ],
          state: [
            {
              k: 'a',
              v: '4',
            },
            {
              k: 'b',
              v: '0',
            },
            {
              k: 'result',
              v: '0',
            },
            {
              k: 'err',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Register the deferred closure',
          caption:
            "The deferred anonymous function is pushed onto safeDivide's defer stack but does not run yet; it closes over result and err by reference.",
          focus: ['defer func() {', 'if r := recover(); r != nil {'],
          state: [
            {
              k: 'deferred',
              v: '1 pending',
            },
            {
              k: 'recover now?',
              v: 'no (not panicking)',
            },
          ],
        },
        {
          title: 'Division panics',
          caption:
            'a / b divides by zero, which triggers a runtime panic that aborts the normal flow before the return statement executes.',
          focus: ['result = a / b', 'return result, nil'],
          state: [
            {
              k: 'panic',
              v: 'runtime error: integer divide by zero',
            },
            {
              k: 'return line reached?',
              v: 'no',
            },
            {
              k: 'result',
              v: '0',
            },
          ],
        },
        {
          title: 'Deferred recover intercepts',
          caption:
            'As the frame unwinds, the deferred closure runs; recover() called directly in it returns the panic value, stopping the panic.',
          focus: ['if r := recover(); r != nil {', 'err = fmt.Errorf("recovered: %v", r)'],
          state: [
            {
              k: 'r',
              v: 'runtime error: integer divide by zero',
            },
            {
              k: 'panic',
              v: 'stopped',
            },
            {
              k: 'err (named)',
              v: 'recovered: ...divide by zero',
            },
          ],
        },
        {
          title: 'safeDivide returns recovered error',
          caption:
            'Because err is a named return mutated inside the defer, safeDivide returns result=0 and the recovered error even though the return statement never ran normally.',
          focus: ['q, err := safeDivide(4, 0)', 'fmt.Println(q, err)'],
          state: [
            {
              k: 'q',
              v: '0',
            },
            {
              k: 'err',
              v: 'recovered: ...divide by zero',
            },
          ],
        },
        {
          title: 'defer arg captured at defer-time',
          caption:
            "deferArgTiming evaluates Println's argument i now (10) and stores it; the later reassignment to 20 cannot change what was already captured.",
          focus: ['defer fmt.Println("deferred arg captured:", i)', 'i = 20'],
          state: [
            {
              k: 'i (now)',
              v: '10',
            },
            {
              k: 'captured arg',
              v: '10',
            },
            {
              k: 'i (after)',
              v: '20',
            },
          ],
        },
        {
          title: 'Deferred body runs at return',
          caption:
            'On return, the deferred Println runs using the captured 10, so it prints 10 while the inline Println already printed 20 — the classic defer-arg gotcha.',
          focus: ['fmt.Println("final i:", i)', 'defer fmt.Println("deferred arg captured:", i)'],
          state: [
            {
              k: 'prints (inline)',
              v: 'final i: 20',
            },
            {
              k: 'prints (deferred)',
              v: 'deferred arg captured: 10',
            },
          ],
        },
        {
          title: 'Recover, inspect, re-panic',
          caption:
            'rethrow panics with errSentinel; its defer recovers, matches it via errors.Is, and assigns the named err so the function returns cleanly instead of re-panicking.',
          focus: [
            'panic(errSentinel)',
            'if e, ok := r.(error); ok && errors.Is(e, errSentinel) {',
            'err = e // handled',
          ],
          state: [
            {
              k: 'r',
              v: 'errSentinel',
            },
            {
              k: 'errors.Is match',
              v: 'true',
            },
            {
              k: 're-panic?',
              v: 'no (handled)',
            },
            {
              k: 'prints',
              v: 'sentinel',
            },
          ],
        },
      ],
    },
    {
      id: 'go-err-custom',
      title: 'Custom error types & Unwrap',
      difficulty: 'Hard',
      tags: ['errors', 'Unwrap', 'errors.Is', 'errors.As', 'errors.Join', 'wrapping'],
      summary:
        'Build custom error types that participate correctly in Is/As chains and joined trees.',
      pattern: 'Error chains',
      visual: 'Error() renders; Unwrap() exposes parent; Is/As walk the tree via Unwrap and Join.',
      memorize:
        'Implement Error() for text, Unwrap() for the chain; %w wraps, errors.Join branches, Is/As walk both.',
      scene:
        'A detective follows a chain of handcuffed suspects (Unwrap), then hits a fork where two are cuffed together (Join) and searches both branches.',
      time: 'O(n) chain walk',
      space: 'O(1) extra',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\ntype NotFoundError struct {\n\tKey string\n\terr error\n}\n\nfunc (e *NotFoundError) Error() string {\n\treturn fmt.Sprintf("key %q not found: %v", e.Key, e.err)\n}\n\nfunc (e *NotFoundError) Unwrap() error { return e.err }\n\nvar ErrBackend = errors.New("backend unavailable")\n\nfunc lookup(key string) error {\n\treturn &NotFoundError{Key: key, err: fmt.Errorf("query: %w", ErrBackend)}\n}\n\nfunc main() {\n\terr := lookup("session")\n\tjoined := errors.Join(err, errors.New("audit failed"))\n\n\tvar nfe *NotFoundError\n\tfmt.Println("As NotFoundError:", errors.As(joined, &nfe))\n\tfmt.Println("Is ErrBackend:", errors.Is(joined, ErrBackend))\n\tif nfe != nil {\n\t\tfmt.Println("Recovered key:", nfe.Key)\n\t}\n}\n',
      keyPoints: [
        'Error() supplies the message; Unwrap() error exposes the single parent so Is/As can walk the chain.',
        '%w wraps and preserves inspectability; %v only formats text and severs Is/As reachability.',
        'errors.Is matches with == unless the type defines its own Is method; for pointer-typed errors that is pointer identity, so distinct instances never match by fields.',
        'errors.As matches by type and requires a pointer to a value of the error-implementing type (often **T for pointer receivers).',
        "errors.Join builds a tree via Unwrap() []error; Is/As recurse into every branch, but the joined value is not any child's concrete type.",
        'Returning nil from Unwrap cleanly terminates the walk without panicking.',
      ],
      walkthrough: [
        {
          title: 'Define the error type',
          caption:
            'NotFoundError implements Error() so *NotFoundError satisfies the error interface, wrapping an inner err field.',
          focus: ['type NotFoundError struct {', 'func (e *NotFoundError) Error() string {'],
          state: [
            {
              k: 'implements',
              v: 'error',
            },
            {
              k: 'fields',
              v: 'Key, err',
            },
          ],
        },
        {
          title: 'Wire up Unwrap',
          caption:
            'Unwrap() returns the inner err, letting errors.Is/As descend from a *NotFoundError into whatever it wraps.',
          focus: ['func (e *NotFoundError) Unwrap() error { return e.err }'],
          state: [
            {
              k: 'chain hop',
              v: 'nfe -> e.err',
            },
          ],
        },
        {
          title: 'Build the wrapped chain',
          caption:
            'lookup returns a *NotFoundError whose err is fmt.Errorf("query: %w", ErrBackend), so %w records ErrBackend as the wrapped target.',
          focus: ['return &NotFoundError{Key: key, err: fmt.Errorf("query: %w", ErrBackend)}'],
          state: [
            {
              k: 'err.Key',
              v: '"session"',
            },
            {
              k: 'linear chain',
              v: 'nfe -> *wrapError -> ErrBackend',
            },
          ],
        },
        {
          title: 'Join a second branch',
          caption:
            'errors.Join returns a multi-error whose Unwrap() []error yields both err and the "audit failed" error, branching the graph into a tree rather than a single line.',
          focus: ['joined := errors.Join(err, errors.New("audit failed"))'],
          state: [
            {
              k: 'joined children',
              v: '2',
            },
            {
              k: 'Unwrap kind',
              v: '[]error',
            },
            {
              k: 'nfe',
              v: 'nil (not yet set)',
            },
          ],
        },
        {
          title: 'errors.As walks the tree',
          caption:
            "errors.As traverses both join branches, matches the first branch's *NotFoundError, assigns it into nfe, and returns true.",
          focus: ['errors.As(joined, &nfe)'],
          state: [
            {
              k: 'As result',
              v: 'true',
            },
            {
              k: 'nfe',
              v: '&NotFoundError{session}',
            },
          ],
        },
        {
          title: 'errors.Is descends via Unwrap',
          caption:
            'errors.Is walks into the *NotFoundError branch, follows Unwrap through the %w wrapError, and finds the sentinel ErrBackend by identity.',
          focus: ['errors.Is(joined, ErrBackend)'],
          state: [
            {
              k: 'Is result',
              v: 'true',
            },
            {
              k: 'match by',
              v: '== ErrBackend',
            },
          ],
        },
        {
          title: 'Use the recovered value',
          caption:
            'Because As populated nfe with the concrete pointer, nfe is non-nil and its Key field is readable directly.',
          focus: ['if nfe != nil {', 'fmt.Println("Recovered key:", nfe.Key)'],
          state: [
            {
              k: 'nfe != nil',
              v: 'true',
            },
            {
              k: 'nfe.Key',
              v: '"session"',
            },
          ],
        },
      ],
    },
  ],
};
