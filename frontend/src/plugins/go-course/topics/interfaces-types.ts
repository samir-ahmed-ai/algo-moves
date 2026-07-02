import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const interfacesTypes: GoTopic = {
  "id": "interfaces-types",
  "title": "Interfaces & Type System",
  "icon": "Shapes",
  "concepts": [
    {
      "id": "go-iface-internals",
      "title": "Interface internals: iface, eface, itab",
      "difficulty": "Hard",
      "tags": [
        "interfaces",
        "runtime",
        "itab",
        "dynamic-dispatch",
        "memory-layout"
      ],
      "summary": "How Go represents interface values as two words and dispatches methods via the itab.",
      "pattern": "Interface internals",
      "visual": "Non-empty iface = (*itab, data); empty eface = (*_type, data); itab caches the method fn pointers.",
      "memorize": "iface=(itab,data), eface=(type,data); typed-nil in interface is non-nil; dispatch = one indirect call.",
      "scene": "Picture every interface value as a two-slot locker: left slot holds the type/itab keycard, right slot holds the pointer to the goods. Empty locker (both slots zero) is the only true nil.",
      "time": "O(1) call",
      "space": "2 words per value",
      "keyPoints": [
        "Non-empty iface = (*itab, data); empty eface = (*_type, data); both are two words with a pointer data slot.",
        "The itab bundles the type descriptor with a fun array of concrete method pointers; dispatch is one indirect call, not a name lookup.",
        "An interface is nil only when BOTH words are nil; typed-nil pointers stored in an interface are non-nil.",
        "The data word is always a pointer since Go 1.4; storing a non-pointer value boxes it (often a heap allocation).",
        "itabs are emitted by the compiler for static pairs or built once and cached by runtime.getitab for dynamic conversions.",
        "The main dispatch costs are lost inlining and boxing allocations, not the indirect call by itself; measure before de-abstracting."
      ],
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"unsafe\"\n)\n\n// Speaker is a single-method interface; a non-empty interface value is\n// represented at runtime by a two-word (itab, data) pair.\ntype Speaker interface {\n\tSpeak() string\n}\n\n// Dog has a value receiver, so both Dog and *Dog satisfy Speaker.\ntype Dog struct {\n\tname string\n}\n\nfunc (d Dog) Speak() string { return d.name + \" says woof\" }\n\n// eface mirrors runtime.eface: the empty-interface header is (type, data).\ntype eface struct {\n\ttyp  unsafe.Pointer\n\tdata unsafe.Pointer\n}\n\nfunc main() {\n\t// A non-empty interface holds an *itab (type + method table).\n\tvar s Speaker = Dog{name: \"Rex\"}\n\tfmt.Println(s.Speak())\n\n\t// any is an empty interface: its header is exactly two machine words.\n\tvar a any = Dog{name: \"Fido\"}\n\thdr := (*eface)(unsafe.Pointer(&a))\n\tfmt.Println(\"eface words:\", unsafe.Sizeof(a)/unsafe.Sizeof(uintptr(0)))\n\tfmt.Println(\"data non-nil:\", hdr.data != nil)\n\n\t// A nil concrete pointer stored in an interface makes the interface\n\t// non-nil: the type word is set even though the data word is nil.\n\tvar dp *Dog\n\tvar s2 Speaker = dpToSpeaker(dp)\n\tfmt.Println(\"interface nil:\", s2 == nil)\n}\n\nfunc dpToSpeaker(d *Dog) Speaker {\n\treturn d\n}\n\nfunc (d *Dog) SpeakPtr() string { return \"ptr\" }\n",
      "quiz": [
        {
          "id": "iface-vs-eface",
          "prompt": "How does the runtime representation of a non-empty interface (e.g. io.Reader) differ from an empty interface (any)?",
          "choices": [
            {
              "label": "First word differs — *itab vs *_type",
              "correct": true
            },
            {
              "label": "Identical layout — both store a raw *_type",
              "correct": false
            },
            {
              "label": "eface is larger — it embeds the method set inline",
              "correct": false
            },
            {
              "label": "iface is one word — data pointer only after Go 1.18",
              "correct": false
            }
          ],
          "explain": "Both are two words with a data pointer second, but a non-empty interface's first word is an *itab (which contains the type plus a method-pointer array), whereas an empty interface's first word is a bare *_type since it has no methods to dispatch."
        },
        {
          "id": "typed-nil",
          "prompt": "Given `var p *Dog; var s Speaker = p`, why does `s == nil` evaluate to false?",
          "choices": [
            {
              "label": "itab word is set — only both-words-nil is nil",
              "correct": true
            },
            {
              "label": "Go copies Dog{} — so data is non-nil",
              "correct": false
            },
            {
              "label": "Value receivers forbid nil — panic occurs instead",
              "correct": false
            },
            {
              "label": "Compares data alone — nil data yields false",
              "correct": false
            }
          ],
          "explain": "An interface is nil only when both the type/itab word and the data word are nil. Assigning a typed nil pointer sets the itab word (type *Dog is known), so the interface is non-nil even though its data word is nil."
        },
        {
          "id": "dispatch-cost",
          "prompt": "What is the primary runtime cost of an interface method call compared to a direct static call?",
          "choices": [
            {
              "label": "Indirect call via itab — blocks inlining",
              "correct": true
            },
            {
              "label": "A full type assertion — runs on every call",
              "correct": false
            },
            {
              "label": "Heap allocation — one per dispatch always",
              "correct": false
            },
            {
              "label": "A map lookup by name — hashing the method",
              "correct": false
            }
          ],
          "explain": "The method address is loaded from a fixed offset in the itab's fun array and called indirectly; there is no per-call hashing or allocation. The real cost is the extra indirection plus the loss of inlining and cross-call optimization the compiler could apply to a static call."
        },
        {
          "id": "itab-construction",
          "prompt": "When is the *itab for a (concrete type, interface) pair typically produced?",
          "choices": [
            {
              "label": "Compile time or cached at runtime — then reused",
              "correct": true
            },
            {
              "label": "On every assignment — rebuilt each conversion",
              "correct": false
            },
            {
              "label": "Only via reflect — normal code never builds one",
              "correct": false
            },
            {
              "label": "At link time exclusively — no runtime creation",
              "correct": false
            }
          ],
          "explain": "For statically known pairs the compiler emits the itab; otherwise runtime.getitab builds it once and caches it in a global hash table keyed by (interface, type), so repeated conversions of the same pair reuse the same *itab rather than reconstructing it."
        },
        {
          "id": "data-word-storage",
          "prompt": "For `var a any = int64(7)` on a 64-bit build, what does the data word hold?",
          "choices": [
            {
              "label": "Pointer to a copy — values aren't stored inline",
              "correct": true
            },
            {
              "label": "The integer 7 inline — small scalars are packed",
              "correct": false
            },
            {
              "label": "A pointer to the stack slot — of the original var",
              "correct": false
            },
            {
              "label": "Zero — with the value encoded in the type word",
              "correct": false
            }
          ],
          "explain": "Since Go 1.4 the data word is always a pointer, so non-pointer values are boxed: the runtime stores a pointer to a copy of the int64. Small integers (0-255) come from a shared static array rather than a fresh heap allocation, but the data word still holds a pointer, not the value. Inline storage was removed to keep the word unambiguously a pointer for the GC."
        },
        {
          "id": "assert-mechanics",
          "prompt": "How does a type assertion `x.(T)` where x is a non-empty interface and T is a concrete type decide success?",
          "choices": [
            {
              "label": "Compares itab type word — against T's *_type",
              "correct": true
            },
            {
              "label": "Walks the itab fun array — matching signatures",
              "correct": false
            },
            {
              "label": "Calls T's methods — checks they don't panic",
              "correct": false
            },
            {
              "label": "Hashes the type name — and compares strings",
              "correct": false
            }
          ],
          "explain": "The assertion compares the type descriptor recorded in the interface's itab against the *_type for T (a pointer/identity comparison); no signature walking or name hashing occurs. Asserting to another interface type instead triggers itab lookup/construction to verify method-set inclusion."
        }
      ],
      "design": {
        "prompt": "You maintain a hot data-processing pipeline where a core transform is invoked through a single-method interface millions of times per second, and profiling shows the interface dispatch is a measurable cost. How do you reason about whether and how to remove the abstraction, and what would you recommend?",
        "answer": "First quantify: an interface call is an indirect call through the itab's fun array plus loss of inlining and the escape/boxing that often accompanies interface conversions; the boxing allocation is frequently a bigger cost than the indirection itself, so I'd check whether values are escaping to the heap on each conversion before touching dispatch. If there are only a few concrete implementations, the cleanest fix is to make the type a generic type parameter (func Process[T Transformer](...)), which monomorphizes and lets the compiler inline the concrete method and keep values on the stack, eliminating both the itab indirection and the boxing. If the set of types is truly dynamic, a type switch on the hot path can let the compiler devirtualize the common case (Go's devirtualization already does this for some monomorphic call sites) while keeping the interface fallback. I'd avoid premature de-abstraction: the win is real only when the call is genuinely hot and the body is tiny, since for larger method bodies the dispatch cost is noise. My recommendation is generics for a bounded implementation set (best speed with retained type safety), a type switch for a dynamic set with a dominant case, and leaving the interface alone otherwise, backed by before/after benchmarks and allocation counts, not intuition."
      }
    },
    {
      "id": "go-iface-nil",
      "title": "The nil interface trap",
      "difficulty": "Hard",
      "tags": [
        "interfaces",
        "nil",
        "error-handling",
        "type-system",
        "runtime"
      ],
      "summary": "A typed nil pointer wrapped in an interface is NOT equal to nil.",
      "pattern": "Typed nil",
      "visual": "An interface value is a (type, value) pair; it equals nil only when BOTH halves are nil.",
      "memorize": "Interface == nil needs BOTH type AND value nil; a typed nil pointer fills the type slot, so it's non-nil.",
      "scene": "A gift box labeled '*T' with nothing inside: the label alone makes the guard 'if box == nil' pass right through, and downstream code opens an empty box and panics.",
      "time": "O(1)",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n)\n\ntype ValidationError struct {\n\tField string\n}\n\nfunc (e *ValidationError) Error() string {\n\treturn \"invalid field: \" + e.Field\n}\n\n// Buggy: a concrete typed pointer flows out through the error interface.\n// Even when p is nil, the returned value holds (type=*ValidationError, value=nil).\nfunc validateBuggy(ok bool) error {\n\tvar p *ValidationError\n\tif !ok {\n\t\tp = &ValidationError{Field: \"name\"}\n\t}\n\treturn p\n}\n\n// Correct: return the interface's untyped nil on the success path.\nfunc validateFixed(ok bool) error {\n\tif !ok {\n\t\treturn &ValidationError{Field: \"name\"}\n\t}\n\treturn nil\n}\n\nfunc main() {\n\tbuggy := validateBuggy(true)\n\tfmt.Printf(\"buggy: value=%v, isNil=%v\\n\", buggy, buggy == nil)\n\n\tfixed := validateFixed(true)\n\tfmt.Printf(\"fixed: value=%v, isNil=%v\\n\", fixed, fixed == nil)\n\n\tvar raw *ValidationError\n\tvar asIface error = raw\n\tfmt.Printf(\"typed-nil vs untyped nil: %v\\n\", asIface == nil)\n\tfmt.Printf(\"typed-nil vs typed nil:   %v\\n\", asIface == error(raw))\n}\n",
      "quiz": [
        {
          "id": "typed-nil-compare",
          "prompt": "Given `var p *ValidationError = nil` and `var e error = p`, what does `e == nil` evaluate to and why?",
          "choices": [
            {
              "label": "false — e holds type *ValidationError, so not nil",
              "correct": true
            },
            {
              "label": "true — the underlying pointer value is nil"
            },
            {
              "label": "true — assigning nil pointer yields nil interface"
            },
            {
              "label": "panic — comparing a nil pointer dereferences it"
            }
          ],
          "explain": "An interface equals nil only when both its type and value words are nil. Assigning a typed nil pointer sets the type word to *ValidationError, so e != nil even though the boxed value is nil. No dereference happens during comparison."
        },
        {
          "id": "named-return-leak",
          "prompt": "A function `func f() error` declares `var err *MyErr` and unconditionally `return err` on success paths. Callers doing `if err != nil` always see an error. What is the root cause?",
          "choices": [
            {
              "label": "concrete type leaks — pointer type fills interface type word",
              "correct": true
            },
            {
              "label": "nil pointer autoboxes — Go copies zero value into interface"
            },
            {
              "label": "error interface caches — last non-nil error is retained"
            },
            {
              "label": "named returns default — err initialized to sentinel"
            }
          ],
          "explain": "Returning a concrete `*MyErr` (even nil) through the `error` return type boxes it, populating the interface's type word. The fix is to return the literal `nil` (untyped) on success so both words stay nil."
        },
        {
          "id": "func-signature-fix",
          "prompt": "Which change most reliably prevents accidentally returning a non-nil error interface that wraps a nil concrete pointer?",
          "choices": [
            {
              "label": "return nil literal — never a typed concrete value",
              "correct": true
            },
            {
              "label": "return (*MyErr)(nil) — explicit conversion is safe"
            },
            {
              "label": "Compare via errors.Is helper — normalizes typed nils"
            },
            {
              "label": "use value receiver — avoids pointer boxing entirely"
            }
          ],
          "explain": "Returning the untyped `nil` literal keeps both interface words nil. `(*MyErr)(nil)` still fills the type word, `errors.Is(err, nil)` reports true only for an already-nil interface, and receiver kind does not change how a typed nil boxes."
        },
        {
          "id": "reflect-detect",
          "prompt": "You must detect a typed-nil hiding in an `any` at runtime. Which check correctly reports it as effectively nil?",
          "choices": [
            {
              "label": "reflect Kind is pointer plus IsNil — inspects boxed value",
              "correct": true
            },
            {
              "label": "v == nil — direct comparison catches typed nils"
            },
            {
              "label": "fmt %v equals <nil> — string form is reliable"
            },
            {
              "label": "errors.Is nil — treats typed nil pointers as nil"
            }
          ],
          "explain": "Only reflection can look past the type word: check that the boxed kind is a nillable kind (Ptr, Map, Chan, Func, Slice, Interface) and call reflect.Value.IsNil. Direct `== nil` returns false; `%v` prints `<nil>` for both typed and genuine nils, so it cannot distinguish them; and errors.Is does not unwrap typed nils."
        },
        {
          "id": "panic-source",
          "prompt": "Code guards `if err != nil { return err }`, the guard passes, and later `err.Error()` panics with a nil dereference. What happened?",
          "choices": [
            {
              "label": "typed nil passed guard — method deref hit nil receiver",
              "correct": true
            },
            {
              "label": "data race — err mutated to nil after the guard"
            },
            {
              "label": "interface corruption — GC moved the boxed pointer"
            },
            {
              "label": "shadowed variable — inner err shadowed outer nil"
            }
          ],
          "explain": "The interface was non-nil (type word set) so the guard was skipped, but the boxed pointer was nil. Calling a pointer-receiver method that dereferences the receiver then panics. A value receiver would tolerate it only if it never dereferences."
        },
        {
          "id": "map-typed-nil",
          "prompt": "`m := map[string]any{}; m[\"x\"] = (*int)(nil)`. What does `m[\"x\"] == nil` return?",
          "choices": [
            {
              "label": "false — stored value carries type *int",
              "correct": true
            },
            {
              "label": "true — missing keys and nil values both yield nil"
            },
            {
              "label": "true — nil pointer stored as untyped nil"
            },
            {
              "label": "false — map values are never comparable to nil"
            }
          ],
          "explain": "Storing `(*int)(nil)` boxes a typed nil into the `any`, so its type word is *int and the comparison is false. Contrast a genuinely absent key, whose zero value IS an untyped nil interface and compares true."
        }
      ],
      "design": {
        "prompt": "You maintain a widely-used Go library whose functions return `error`. Some internal helpers build a concrete `*APIError` and thread it through named error returns; downstream services occasionally report 'phantom errors' where `err != nil` is true but the error prints as `<nil>`. Design a strategy to eliminate typed-nil bugs across the codebase and at your public API boundary, and discuss the tradeoffs.",
        "answer": "The core rule is: never let a concrete pointer type flow into an `error` (or any interface) return unless you actually mean to return an error; on success paths always `return nil` (the untyped literal). Concretely, I would (1) refactor helpers so the error variable is typed as `error` at the point it is returned, or restructure to `if bad { return &APIError{...} }; return nil`, which makes the success path structurally incapable of leaking a typed nil; (2) add a vet/linter gate — `go vet`'s nilness pass plus `nilaway` or a custom analyzer — to CI to catch concrete-pointer-to-interface returns; and (3) at the public boundary, prefer returning `error` values constructed only where an error truly exists, and avoid clever named returns that make the leak invisible. For defensive detection of third-party values I'd centralize a `isNil(v any) bool` helper using reflection (Kind check + IsNil) rather than sprinkling `== nil`, but treat that as a smell to fix upstream, not a norm. The main tradeoff: reflection-based checks are correct but slow and hide the design defect, so I reserve them for boundaries with untrusted callers. Named returns improve readability for multi-return functions but are the single largest source of this bug, so my recommendation is to ban bare `return` on error-bearing functions and require explicit `return nil` on success, enforced by lint. This keeps the fix at the type-system level where it belongs and makes the failure mode impossible rather than merely detectable."
      },
      "keyPoints": [
        "An interface value is a (type, value) pair and equals nil only when BOTH words are nil.",
        "A typed nil pointer boxed into an interface sets the type word, so `== nil` is false.",
        "Returning a concrete pointer (even nil) through an `error` return leaks a typed nil; always `return nil` literally on success.",
        "The classic symptom is a passed `if err != nil` guard followed by a nil-dereference panic in a pointer-receiver method.",
        "Only reflection (Kind + IsNil) can detect a typed nil at runtime; `== nil`, `%v`, and errors.Is do not.",
        "Prefer structuring code so success paths return the untyped nil; enforce with vet/nilaway rather than defensive reflection."
      ]
    },
    {
      "id": "go-iface-method-sets",
      "title": "Method sets: pointer vs value receivers",
      "difficulty": "Hard",
      "tags": [
        "interfaces",
        "method-sets",
        "receivers",
        "addressability",
        "gotchas"
      ],
      "summary": "Why *T satisfies an interface but T often does not, and where addressability bites.",
      "pattern": "Method sets",
      "visual": "Value T's set = value-receiver methods only; *T's set = value + pointer methods. Interface satisfaction reads the method set of the exact dynamic type stored.",
      "memorize": "*T has all methods; T has only value receivers. An interface value stores a type, so its method set must be complete. Map elements are not addressable.",
      "scene": "A bouncer checks each guest's badge set at the door: the value twin carries half the badges, the pointer twin carries all of them, and the map-clone guest has no pocket to pin a badge to.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport \"fmt\"\n\ntype Counter interface {\n\tInc()\n\tValue() int\n}\n\ntype tally struct{ n int }\n\nfunc (t *tally) Inc()       { t.n++ }\nfunc (t *tally) Value() int { return t.n }\n\nfunc main() {\n\tvar c Counter = &tally{}\n\tc.Inc()\n\tc.Inc()\n\tfmt.Println(\"counter:\", c.Value())\n\n\tm := map[string]*tally{\"a\": {}}\n\tm[\"a\"].Inc()\n\tfmt.Println(\"map:\", m[\"a\"].Value())\n\n\ts := []tally{{}}\n\ts[0].Inc()\n\tfmt.Println(\"slice:\", s[0].Value())\n}\n",
      "quiz": [
        {
          "id": "value-vs-pointer-satisfy",
          "prompt": "Type T has exactly one method, declared with a pointer receiver: func (t *T) M(). Interface I requires M(). Which assignment compiles?",
          "choices": [
            {
              "label": "var i I = T{} — value has M in its set",
              "correct": false
            },
            {
              "label": "var i I = &T{} — *T's method set includes M",
              "correct": true
            },
            {
              "label": "Both compile — receiver kind is irrelevant",
              "correct": false
            },
            {
              "label": "Neither compiles — pointer receivers block interfaces",
              "correct": false
            }
          ],
          "explain": "A pointer-receiver method is in *T's method set only, not T's. So &T{} satisfies I but a plain T value does not."
        },
        {
          "id": "map-element-not-addressable",
          "prompt": "With m := map[string]T{\"k\": {}} and M declared as func (t *T) M(), why does m[\"k\"].M() fail to compile?",
          "choices": [
            {
              "label": "Read-only map values — writes are forbidden",
              "correct": false
            },
            {
              "label": "m[\"k\"] is not addressable — cannot auto-take its address",
              "correct": true
            },
            {
              "label": "Maps store copies — M runs on a temporary",
              "correct": false
            },
            {
              "label": "T lacks M entirely — only *T declares it",
              "correct": false
            }
          ],
          "explain": "Calling a pointer method on an addressable value auto-takes its address, but a map index expression is not addressable, so the compiler cannot synthesize &m[\"k\"]."
        },
        {
          "id": "slice-element-addressable",
          "prompt": "With s := []T{{}} and M declared as func (t *T) M(), what is true of s[0].M()?",
          "choices": [
            {
              "label": "Compiles — s[0] is addressable, so &s[0] is taken",
              "correct": true
            },
            {
              "label": "Fails — slice elements are not addressable",
              "correct": false
            },
            {
              "label": "Compiles but mutates a copy — index yields a value",
              "correct": false
            },
            {
              "label": "Fails — needs explicit (&s[0]).M() always",
              "correct": false
            }
          ],
          "explain": "Unlike map elements, slice elements are addressable. The compiler auto-takes &s[0], so the pointer method runs on the actual element and mutations persist."
        },
        {
          "id": "embedded-value-promotes",
          "prompt": "S embeds a value field of type T (not *T). T's method M has a pointer receiver. Is M in the method set of the value type S?",
          "choices": [
            {
              "label": "Yes — embedding always promotes every method",
              "correct": false
            },
            {
              "label": "Only *S gets M — value S does not promote it",
              "correct": true
            },
            {
              "label": "Yes — but M runs on a copy of T",
              "correct": false
            },
            {
              "label": "Never promoted — pointer methods stay hidden",
              "correct": false
            }
          ],
          "explain": "Promotion mirrors receiver rules: embedding T by value puts T's value methods in S and *S, but T's pointer methods appear only in *S's method set."
        },
        {
          "id": "nil-interface-vs-typed-nil",
          "prompt": "func f() error returns var p *myErr = nil; return p, where *myErr implements error. Caller does if f() != nil. What happens?",
          "choices": [
            {
              "label": "Branch skipped — nil pointer means nil interface",
              "correct": false
            },
            {
              "label": "Branch taken — interface holds (*myErr, nil) non-nil",
              "correct": true
            },
            {
              "label": "Panic — dereferencing a nil pointer receiver",
              "correct": false
            },
            {
              "label": "Compile error — cannot return nil pointer as error",
              "correct": false
            }
          ],
          "explain": "Storing a typed nil pointer in an interface yields an interface with a non-nil type word, so the interface itself is not nil even though the pointer is."
        },
        {
          "id": "reflect-set-addressability",
          "prompt": "You have a value v of type T (methods on *T) inside an interface{}. Why can't reflect.ValueOf(x).MethodByName(\"M\") find M and mutate the original?",
          "choices": [
            {
              "label": "Pointer methods invisible — reflect drops them silently",
              "correct": false
            },
            {
              "label": "Copy is unaddressable — *T's set is absent",
              "correct": true
            },
            {
              "label": "Only exported embedded — MethodByName sees a subset",
              "correct": false
            },
            {
              "label": "Channel required — reflect cannot reach receivers",
              "correct": false
            }
          ],
          "explain": "An interface holds an unaddressable copy of the value, so reflect sees only T's method set; to expose *T's pointer methods you must store &v so the interface's dynamic type is *T."
        }
      ],
      "design": {
        "prompt": "You are designing a Store interface for a service where implementations hold significant state and must mutate it (connection pools, caches, counters). Some teammates want value receivers 'for immutability and safety,' others want pointer receivers. Lay out how receiver choice interacts with method sets, interface satisfaction, and concurrency, and give a recommendation for the codebase convention.",
        "answer": "The core constraint is that mutating methods must use pointer receivers, and a pointer-receiver method lands only in *T's method set, so only *T (never a T value) will satisfy the interface. That single fact tends to force the whole type onto pointer receivers, because mixing receiver kinds on one type is a known footgun: a T value silently drops the pointer methods, copies of a T with an embedded mutex copy the lock, and callers get confusing 'does not implement' errors that depend on whether they passed T or &T. Value receivers do give a cheap copy-on-call and are genuinely safer for small immutable value types (time.Time-like), but for stateful stores they copy the state on every call, so 'immutability' really means 'silent loss of mutations,' which is worse than explicit shared state. Concurrency does not change the method-set rules but reinforces the recommendation: shared mutable state needs one canonical instance behind a pointer plus internal synchronization, not per-call copies. Recommendation: adopt a convention of all-pointer receivers for any type with mutable state or a mutex, always construct and pass *T (constructors return *T), and reserve value receivers for genuinely small immutable value types where every method is non-mutating. Enforce it with a lint check (e.g. a copylocks/consistent-receiver vet pass) so a stray value receiver cannot silently break interface satisfaction."
      },
      "keyPoints": [
        "Pointer-receiver methods live only in *T's method set; value-receiver methods live in both T and *T.",
        "Auto-addressing lets you call pointer methods on addressable values, but map index expressions and other non-addressable operands break this.",
        "Slice elements are addressable while map elements are not — the classic mutation gotcha.",
        "Embedding follows receiver rules: embedding T by value promotes T's pointer methods only into *S, not S.",
        "A typed nil pointer stored in an interface makes the interface non-nil (type word is set).",
        "Prefer a single consistent receiver kind per type; mixing them causes surprising interface-satisfaction and lock-copy bugs."
      ]
    },
    {
      "id": "go-iface-embedding",
      "title": "Embedding & composition",
      "difficulty": "Hard",
      "tags": [
        "interfaces",
        "embedding",
        "composition",
        "method-sets",
        "decorator"
      ],
      "summary": "How promotion, overriding, and interface embedding work — and where ambiguity bites.",
      "pattern": "Embedding",
      "visual": "Outer struct forwards to embedded field's method set unless it declares a same-named method at depth 0.",
      "memorize": "Promotion is depth-based; shallower wins, same depth ties = ambiguous; embed an interface to decorate.",
      "scene": "A manager (outer) auto-forwards mail to the intern (embedded) — until the manager stamps their own name on a letter, which then shadows the intern's.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport \"fmt\"\n\ntype Logger struct{ prefix string }\n\nfunc (l Logger) Log(msg string) string { return l.prefix + \": \" + msg }\n\ntype Service struct {\n\tLogger\n\tname string\n}\n\n// Service overrides the promoted Log method.\nfunc (s Service) Log(msg string) string {\n\treturn s.Logger.Log(\"[\" + s.name + \"] \" + msg)\n}\n\ntype Handler interface{ Log(msg string) string }\n\n// countingLogger decorates any Handler by embedding the interface.\ntype countingLogger struct {\n\tHandler\n\tcount *int\n}\n\nfunc (c countingLogger) Log(msg string) string {\n\t*c.count++\n\treturn c.Handler.Log(fmt.Sprintf(\"(#%d) %s\", *c.count, msg))\n}\n\nfunc main() {\n\tsvc := Service{Logger: Logger{prefix: \"svc\"}, name: \"auth\"}\n\tfmt.Println(svc.Log(\"start\"))\n\n\tn := 0\n\tvar h Handler = countingLogger{Handler: svc, count: &n}\n\tfmt.Println(h.Log(\"login\"))\n\tfmt.Println(h.Log(\"logout\"))\n\tfmt.Println(\"calls:\", n)\n}\n",
      "quiz": [
        {
          "id": "promotion-depth",
          "prompt": "A struct C embeds B, and B embeds A; A has method M and C also declares its own M. On a value of type C, what does c.M() call, and is it a compile error?",
          "choices": [
            {
              "label": "C.M — shallowest depth shadows deeper",
              "correct": true
            },
            {
              "label": "A.M — deepest definition always wins"
            },
            {
              "label": "compile error — two M candidates conflict"
            },
            {
              "label": "B.M — intermediate embed promotes first"
            }
          ],
          "explain": "Method promotion favors the shallowest depth. C.M is at depth 0, A.M is promoted at depth 2, so C.M unambiguously wins and shadows A.M with no error."
        },
        {
          "id": "diamond-ambiguity",
          "prompt": "Struct D embeds both X and Y (each at depth 1), and both X and Y define a method Ping. D declares no Ping of its own. What happens when you write d.Ping()?",
          "choices": [
            {
              "label": "compile error — ambiguous selector at equal depth",
              "correct": true
            },
            {
              "label": "X.Ping — first-listed embedded field wins"
            },
            {
              "label": "runtime panic — ambiguous method dispatch"
            },
            {
              "label": "both run — Go calls X then Y"
            }
          ],
          "explain": "When two promoted methods with the same name sit at the same depth, the selector is ambiguous and the program fails to compile unless D declares its own Ping or you qualify it (d.X.Ping())."
        },
        {
          "id": "iface-embed-nil",
          "prompt": "You embed an interface (not a struct) in a decorator struct and forget to set that field, then call a promoted method that your struct does not override. What happens?",
          "choices": [
            {
              "label": "nil-interface call — panics at call time",
              "correct": true
            },
            {
              "label": "compile error — embedded interface must be set"
            },
            {
              "label": "zero values returned — silent no-op default"
            },
            {
              "label": "interface default runs — built-in fallback body"
            }
          ],
          "explain": "Embedding an interface promotes its methods, but the dynamic value is nil. Calling a promoted method dispatches through a nil interface, producing a runtime panic — a classic decorator pitfall. Go interfaces have no default method bodies."
        },
        {
          "id": "satisfies-via-embed",
          "prompt": "Interface R requires Read and Close. Type T embeds an *os.File (which has both) and adds nothing. Does T satisfy R, and how?",
          "choices": [
            {
              "label": "yes — promoted methods join T's method set",
              "correct": true
            },
            {
              "label": "Only declared methods count — embedding adds none"
            },
            {
              "label": "pointer embed differs — value embed would fail"
            },
            {
              "label": "only *T qualifies — plain T stays incomplete"
            }
          ],
          "explain": "Promoted methods become part of the embedder's method set, so T satisfies R. Embedding a pointer *os.File promotes its methods to both T and *T, so the value type T already satisfies R."
        },
        {
          "id": "override-no-super",
          "prompt": "Service overrides promoted Log but its body calls s.Logger.Log(...). What does this idiom accomplish, and could you instead call s.Log inside the body?",
          "choices": [
            {
              "label": "explicit inner call — s.Log would recurse infinitely",
              "correct": true
            },
            {
              "label": "virtual dispatch — s.Log routes to Logger.Log"
            },
            {
              "label": "no difference — both reach Logger.Log"
            },
            {
              "label": "compile error — cannot name the embedded method"
            }
          ],
          "explain": "There is no super; you must qualify the embedded field (s.Logger.Log) to reach the shadowed method. Calling s.Log would re-invoke the override and recurse forever."
        },
        {
          "id": "iface-embed-composition",
          "prompt": "An interface RW embeds interfaces Reader and Writer, both of which declare Close() with identical signatures. Is the RW definition valid in Go 1.26?",
          "choices": [
            {
              "label": "valid — identical duplicate methods merge",
              "correct": true
            },
            {
              "label": "invalid — duplicate Close from two interfaces"
            },
            {
              "label": "Only when signatures differ — else a name clash",
              "correct": false
            },
            {
              "label": "invalid — interfaces cannot embed interfaces"
            }
          ],
          "explain": "Since Go 1.14, embedding interfaces with overlapping methods is allowed as long as the duplicated method has an identical signature; the method set simply unions them. Only conflicting signatures for the same name would be an error."
        }
      ],
      "design": {
        "prompt": "You are designing a middleware/decorator layer for a storage client interface (Store with Get/Put/Delete) — adding metrics, retries, and caching. Compare struct embedding of the interface versus explicit field forwarding, and recommend an approach for a large, evolving interface. Address method-set fragility, the nil-embedded-interface trap, and how interface evolution affects each.",
        "answer": "Embedding the Store interface in each decorator lets you override only the methods you care about (e.g. cache Get) while the rest auto-forward, which keeps decorators tiny and, crucially, keeps them compiling when a new method is added to Store — a big win for an evolving interface. The cost is safety: forgetting to set the embedded field yields a decorator that compiles but panics with a nil-interface call, and silent forwarding can mask the fact that a decorator failed to wrap a newly added method (metrics/retries silently skip it). Explicit field forwarding (a named inner Store field plus hand-written pass-throughs) is verbose and breaks the build every time the interface grows, but that breakage is a feature — it forces every decorator to consciously handle each method, and it eliminates the nil-embedding footgun because there is no promotion. For a large, fast-moving interface I recommend embedding for boilerplate reduction but with guardrails: always construct decorators through a constructor that rejects a nil inner Store, keep the interface small (segregate Reader/Writer so decorators only embed what they touch), and add a compile-time assertion (var _ Store = (*cacheDecorator)(nil)) plus tests that exercise every method through the full chain to catch missed wrapping. If correctness auditing matters more than churn — e.g. a security or billing wrapper where silently un-decorated methods are dangerous — prefer explicit forwarding so the compiler is your reviewer."
      },
      "keyPoints": [
        "Method promotion is resolved by depth: the shallowest same-named method wins and shadows deeper ones; two candidates at the same depth are a compile-time ambiguity, not a runtime error.",
        "Promoted methods (and fields) become part of the embedder's method set, so a type can satisfy an interface purely through what it embeds; pointer-embedding promotes pointer-receiver methods to both T and *T.",
        "Go has no super/base call — to reach a shadowed method you must qualify the embedded field (s.Logger.Log); calling the outer method name recurses.",
        "Embedding an interface enables the decorator pattern (override some methods, forward the rest), but an unset embedded interface is nil and panics when a forwarded method is called.",
        "Interface-in-interface embedding is allowed even with overlapping methods as long as signatures are identical (Go 1.14+); conflicting signatures for the same name are rejected.",
        "Embedding auto-forwards new interface methods (survives interface growth) but can silently skip wrapping them; explicit forwarding breaks the build instead, which is sometimes the safer default."
      ]
    },
    {
      "id": "go-iface-assertions",
      "title": "Type assertions & type switches",
      "difficulty": "Hard",
      "tags": [
        "interfaces",
        "type-assertions",
        "type-switch",
        "runtime",
        "comparability"
      ],
      "summary": "x.(T) forms, panic vs comma-ok, type switches, interface-to-interface assertions, and comparable dynamic types.",
      "pattern": "Type assertions",
      "visual": "x.(T) reads x's dynamic type descriptor; one-return panics on mismatch, comma-ok returns (zero,false).",
      "memorize": "One return panics; comma-ok never does; nil interface always fails an assertion; == on interfaces panics if dynamic types are uncomparable.",
      "scene": "A bouncer (the assertion) checks a partygoer's ID (dynamic type): single-door lets you in or slams your face (panic); the two-door lets you quietly walk back out (ok=false).",
      "time": "O(1)",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"io\"\n\t\"strings\"\n)\n\ntype Stringer interface {\n\tString() string\n}\n\ntype Named struct {\n\tName string\n}\n\nfunc (n Named) String() string { return n.Name }\n\nfunc describe(v any) string {\n\tswitch x := v.(type) {\n\tcase nil:\n\t\treturn \"nil interface\"\n\tcase int:\n\t\treturn fmt.Sprintf(\"int=%d\", x)\n\tcase Stringer:\n\t\treturn \"Stringer=\" + x.String()\n\tcase io.Reader:\n\t\tbuf := make([]byte, 4)\n\t\tn, _ := x.Read(buf)\n\t\treturn \"reader read \" + fmt.Sprint(n)\n\tdefault:\n\t\treturn fmt.Sprintf(\"other %T\", x)\n\t}\n}\n\nfunc main() {\n\tvar v any = Named{Name: \"go\"}\n\tif s, ok := v.(Stringer); ok {\n\t\tfmt.Println(\"asserted:\", s.String())\n\t}\n\n\tif _, ok := v.(int); !ok {\n\t\tfmt.Println(\"not an int\")\n\t}\n\n\tfmt.Println(describe(42))\n\tfmt.Println(describe(Named{Name: \"iface\"}))\n\tfmt.Println(describe(strings.NewReader(\"data\")))\n\tfmt.Println(describe(nil))\n\n\tvar a any = []int{1, 2}\n\tvar b any = []int{1, 2}\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tfmt.Println(\"recovered:\", r)\n\t\t}\n\t}()\n\tfmt.Println(\"comparing uncomparable dynamic types\")\n\tfmt.Println(a == b)\n}\n",
      "quiz": [
        {
          "id": "nil-comma-ok",
          "prompt": "For `var v any` (a nil interface), what does `s, ok := v.(io.Reader)` yield?",
          "choices": [
            {
              "label": "s=nil, ok=false — nil interface has no dynamic type",
              "correct": true
            },
            {
              "label": "s=nil, ok=true — nil satisfies every interface",
              "correct": false
            },
            {
              "label": "panic — assertion on nil interface faults",
              "correct": false
            },
            {
              "label": "compile error — cannot assert a nil value",
              "correct": false
            }
          ],
          "explain": "A nil interface holds no dynamic type, so every type assertion misses; the comma-ok form returns the zero value of T (a nil io.Reader) and ok=false rather than panicking."
        },
        {
          "id": "single-return-panic",
          "prompt": "`var v any = \"hi\"; n := v.(int)` — what happens at runtime?",
          "choices": [
            {
              "label": "panic — interface holds string not int",
              "correct": true
            },
            {
              "label": "n=0 — mismatched assertion yields zero",
              "correct": false
            },
            {
              "label": "n=0 — string coerces to int",
              "correct": false
            },
            {
              "label": "compile error — types are incompatible",
              "correct": false
            }
          ],
          "explain": "The single-return assertion panics with 'interface conversion: interface {} is string, not int' when the dynamic type does not match; only the comma-ok form is safe."
        },
        {
          "id": "iface-to-iface",
          "prompt": "With `var v any = Named{}` where `Named` has a `String() string` method, what does `v.(fmt.Stringer)` test?",
          "choices": [
            {
              "label": "method-set membership — dynamic type implements Stringer",
              "correct": true
            },
            {
              "label": "identity — dynamic type equals fmt.Stringer exactly",
              "correct": false
            },
            {
              "label": "static type — v's declared type is Stringer",
              "correct": false
            },
            {
              "label": "always fails — cannot assert to interfaces",
              "correct": false
            }
          ],
          "explain": "Asserting to an interface type succeeds iff the value's dynamic type's method set implements that interface; it is a runtime method-set check, not a concrete-type identity check."
        },
        {
          "id": "uncomparable-panic",
          "prompt": "`var a, b any = []int{1}, []int{1}; _ = a == b` — result under Go 1.26?",
          "choices": [
            {
              "label": "runtime panic — slice dynamic type not comparable",
              "correct": true
            },
            {
              "label": "false — distinct backing arrays",
              "correct": false
            },
            {
              "label": "true — element values are equal",
              "correct": false
            },
            {
              "label": "compile error — interfaces reject equality",
              "correct": false
            }
          ],
          "explain": "Interfaces are comparable at compile time, but if both hold the same non-comparable dynamic type (slice, map, func), the equality check panics at runtime with 'comparing uncomparable type []int'."
        },
        {
          "id": "switch-order",
          "prompt": "In a type switch, `int` implements no interfaces here but a `case Stringer` precedes `case int` — a value of dynamic type `int` matches which case?",
          "choices": [
            {
              "label": "case int — first matching case wins",
              "correct": true
            },
            {
              "label": "case Stringer — interface cases take priority",
              "correct": false
            },
            {
              "label": "both — fallthrough evaluates every case",
              "correct": false
            },
            {
              "label": "default — int is ambiguous across cases",
              "correct": false
            }
          ],
          "explain": "A type switch evaluates cases top to bottom and takes the first match; since int does not implement Stringer, that case is skipped and case int matches. Ordering matters when interface and concrete cases overlap. (fallthrough is illegal in a type switch.)"
        },
        {
          "id": "switch-var-type",
          "prompt": "In `switch x := v.(type)` with `case Stringer, io.Reader:`, what is the type of `x` inside that multi-type case?",
          "choices": [
            {
              "label": "any — keeps the switch guard's static type",
              "correct": true
            },
            {
              "label": "Stringer — the first listed case type",
              "correct": false
            },
            {
              "label": "union type — Stringer combined with io.Reader",
              "correct": false
            },
            {
              "label": "concrete type — v's runtime dynamic type",
              "correct": false
            }
          ],
          "explain": "When a case lists multiple types, the guard variable keeps the switch expression's original (static) type, so x is `any` here; it takes the specific listed type only in single-type cases. Go has no anonymous interface-union type for this variable."
        }
      ],
      "design": {
        "prompt": "You are designing a plugin/event system where handlers receive `any` payloads and must dispatch on payload type. Compare using a type switch, a map of `reflect.Type` to handler, and requiring payloads to satisfy a common interface. What are the tradeoffs, and what do you recommend?",
        "answer": "A type switch is the simplest and fastest option: dispatch is O(cases), fully type-checked at compile time, and the guard variable gives you the concrete type with zero reflection cost — but it is closed, so every new payload type forces editing the switch, and it centralizes logic in one place that can become a god-function. A `map[reflect.Type]handler` is open and registration-based (plugins self-register), enabling extension without touching core code, but it costs a reflect.TypeOf per dispatch, loses compile-time exhaustiveness, and handlers must type-assert the payload back themselves. Requiring payloads to implement a common interface (e.g. `Handle(ctx)` or `Kind() string`) is the most idiomatic Go: it pushes behavior onto the types, avoids central dispatch entirely, and stays open — but it requires you to own or wrap the payload types, and interface-to-interface assertions still cost a method-set lookup. My recommendation: prefer the interface approach when you control the payload types, since it is open, testable, and free of reflection; fall back to a registry map when payloads come from third parties you cannot modify; reserve the type switch for a small, stable, closed set of internal types where its clarity and speed win. Whatever you pick, always use comma-ok assertions on the boundary and beware comparing interface values whose dynamic types may be non-comparable."
      },
      "keyPoints": [
        "Single-return `x.(T)` panics on mismatch; comma-ok `x, ok := v.(T)` returns (zero, false) instead — use it at trust boundaries.",
        "A nil interface has no dynamic type, so every assertion against it misses (ok=false), never panics.",
        "Asserting to an interface type is a runtime method-set check: it succeeds iff the dynamic type implements that interface.",
        "Type switches match the first applicable case top-to-bottom; ordering matters when concrete and interface cases overlap, and `case nil` catches nil interfaces (fallthrough is illegal).",
        "In a multi-type case the guard variable keeps the switch expression's static type; it narrows to the concrete type only in single-type cases.",
        "Interface `==` is legal at compile time but panics at runtime if both operands share a non-comparable dynamic type (slice, map, func)."
      ]
    }
  ]
};
