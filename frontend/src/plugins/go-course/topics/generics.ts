import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const generics: GoTopic = {
  id: 'generics',
  title: 'Generics',
  icon: 'Braces',
  concepts: [
    {
      id: 'go-gen-type-params',
      title: 'Type parameters & instantiation',
      difficulty: 'Hard',
      tags: ['generics', 'type-parameters', 'instantiation', 'gcshape', 'monomorphization'],
      summary:
        'How func/type parameters instantiate and how Go compiles them via GCShape stenciling plus dictionaries.',
      pattern: 'Type params',
      visual:
        'Compiler stencils one body per GCShape; a runtime dictionary supplies per-type info.',
      memorize: 'One stencil per GCShape; pointers share a shape; dictionaries carry the rest.',
      scene:
        'A cookie-cutter (the stencil) stamps one dough shape for all pointer types, while a recipe card (the dictionary) tells each cookie its real flavor.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"cmp"\n\t"fmt"\n)\n\n// Number constrains to the two GCShapes we care about: a pointer-free\n// integer and a floating value. Instantiations that share a GCShape\n// share one generated function body (dictionary-backed).\ntype Number interface {\n\t~int | ~float64\n}\n\n// Sum is generic over T. At compile time the caller instantiates it,\n// e.g. Sum[int], and the compiler picks a stenciled body per GCShape.\nfunc Sum[T Number](xs []T) T {\n\tvar total T\n\tfor _, x := range xs {\n\t\ttotal += x\n\t}\n\treturn total\n}\n\n// Max uses cmp.Ordered and returns the type parameter directly, so no\n// boxing occurs on the return value the way an `any` interface would.\nfunc Max[T cmp.Ordered](xs []T) T {\n\tbest := xs[0]\n\tfor _, x := range xs[1:] {\n\t\tif x > best {\n\t\t\tbest = x\n\t\t}\n\t}\n\treturn best\n}\n\n// Pair is a generic type; each distinct instantiation is a distinct type.\ntype Pair[A, B any] struct {\n\tFirst  A\n\tSecond B\n}\n\nfunc (p Pair[A, B]) Swap() Pair[B, A] {\n\treturn Pair[B, A]{First: p.Second, Second: p.First}\n}\n\nfunc main() {\n\tints := []int{3, 1, 4, 1, 5, 9}\n\tfloats := []float64{2.5, 0.5, 7.0}\n\n\tfmt.Println(Sum(ints))            // T inferred as int\n\tfmt.Println(Sum[float64](floats)) // explicit instantiation\n\n\tfmt.Println(Max(ints))\n\tfmt.Println(Max([]string{"go", "rust", "zig"}))\n\n\tp := Pair[string, int]{First: "age", Second: 30}\n\tfmt.Println(p.Swap())\n}\n',
      quiz: [
        {
          id: 'gcshape-sharing',
          prompt:
            'Given `func F[T any](x T)`, which set of instantiations is guaranteed by the current gc implementation to share a single generated function body (stencil)?',
          choices: [
            {
              label: 'All pointer-shaped types — one shape covers every pointer',
              correct: true,
            },
            {
              label: 'int and int32 — same underlying numeric family',
            },
            {
              label: 'int and float64 — both are word-sized scalars',
            },
            {
              label: 'Every instantiation — Go fully monomorphizes generics',
            },
          ],
          explain:
            'gc groups instantiations by GCShape; all pointer-shaped types (*T, and pointer-representable types) collapse to one shape and share a body, whereas distinct non-pointer scalar shapes each get their own stencil.',
        },
        {
          id: 'dictionary-role',
          prompt:
            "In gc's GCShape stenciling with dictionaries, what does the hidden dictionary argument passed to a shared generic body primarily carry?",
          choices: [
            {
              label: 'Per-instantiation type metadata — type descriptors, itabs, sub-dicts',
              correct: true,
            },
            {
              label: 'The full method machine code — one copy per call site',
            },
            {
              label: 'A vtable of user methods — resolved like C++ virtuals',
            },
            {
              label: 'The receiver value itself — boxed into an interface',
            },
          ],
          explain:
            "Because one body serves many types of the same shape, it can't hardcode type-specific facts; the dictionary supplies runtime type descriptors, itabs for constraint methods, and sub-dictionaries for nested generic calls.",
        },
        {
          id: 'vs-interface-monomorph',
          prompt:
            'Why can a generic `Max[T cmp.Ordered]` outperform an `any`-based sort helper for a slice of ints, semantically?',
          choices: [
            {
              label: 'No boxing of elements — values stay unboxed at their real type',
              correct: true,
            },
            {
              label: 'Generics are always fully inlined — interfaces never inline',
            },
            {
              label: 'Constraints skip bounds checks — the compiler trusts T',
            },
            {
              label: 'Type params disable the GC — no write barriers fire',
            },
          ],
          explain:
            'An `any` API forces each int into an interface value (boxing and indirection), while the generic keeps T as a concrete int in the stencil, avoiding boxing and the associated allocations and indirection.',
        },
        {
          id: 'instantiation-identity',
          prompt:
            'For `type Pair[A, B any] struct{...}`, what is true about `Pair[int, string]` versus `Pair[string, int]`?',
          choices: [
            {
              label: 'Distinct named types — not assignable without conversion',
              correct: true,
            },
            {
              label: 'Identical types — type args are erased at runtime',
            },
            {
              label: 'Structurally equal — field order makes them interchangeable',
            },
            {
              label: 'Same type if fields match — Go compares layouts',
            },
          ],
          explain:
            'Each instantiation of a generic type is its own distinct defined type; different type arguments yield unrelated types even when field layouts coincide, so no implicit assignment is allowed.',
        },
        {
          id: 'inference-limits',
          prompt:
            'Regarding `Sum[float64](floats)` (explicit) versus `Sum(ints)` (inferred), how does gc decide the type argument T?',
          choices: [
            {
              label: 'Inference flows from argument types — explicit args can override it',
              correct: true,
            },
            {
              label: 'Constraints with unions — always block inference entirely',
            },
            {
              label: 'Return-only type params — infer from the assignment target',
            },
            {
              label: 'Float literals — untyped constants forbid all inference',
            },
          ],
          explain:
            'Type inference derives T from the types of the passed arguments; when arguments pin the type it is inferable, and explicit instantiation is available to disambiguate, document, or drive cases inference cannot resolve (Go does not infer from the return/assignment context).',
        },
        {
          id: 'constraint-method-call',
          prompt:
            "Inside a shared (dictionary-backed) stencil, how is a call to a method required by the type parameter's constraint dispatched?",
          choices: [
            {
              label: 'Via an itab from the dictionary — indirect through supplied metadata',
              correct: true,
            },
            {
              label: 'Statically bound — the stencil hardcodes the concrete method',
            },
            {
              label: 'Through reflection — resolved by name at each call',
            },
            {
              label: 'Inlined unconditionally — constraints guarantee a single target',
            },
          ],
          explain:
            "A shared body can't know the concrete type, so constraint-method calls go through an itab (interface table) provided in the dictionary, an indirect dispatch rather than a statically bound or inlined call.",
        },
      ],
      design: {
        prompt:
          "You're designing a widely-imported container/algorithm package. Weigh generic type parameters against interface-based (any/method-set) designs for both API ergonomics and runtime cost, and recommend when to reach for each. Address code size, dispatch cost, and API evolution.",
        answer:
          'Generics keep values at their concrete type, avoiding boxing and interface indirection on hot paths, and give callers compile-time type safety and inference-driven ergonomics without type assertions. The cost is that gc uses GCShape stenciling: distinct non-pointer shapes each generate a body (code-size growth and instruction-cache pressure), and shared bodies still pay indirect dispatch through a dictionary for constraint methods, so generics are not automatically faster than a well-inlined interface call. Interface-based designs generate one body, dispatch through an itab, and evolve flexibly (any type implementing the method set works, including across package boundaries), but they box values and lose static element typing. My recommendation: use generics for element-typed containers and numeric/ordered algorithms where boxing dominates cost and type safety matters (Sum, Max, slices/maps helpers), and prefer interfaces where behavior is polymorphic across unrelated types, where a single small code footprint is important, or where the abstraction must stay open for external implementations. When unsure, prototype and measure allocations and binary size rather than assuming generics win, because the GCShape sharing and dictionary indirection can erase the expected speedup.',
      },
      keyPoints: [
        'gc compiles generics by GCShape stenciling, not full monomorphization: one body per shape, with all pointer types sharing a single shape.',
        'A hidden dictionary carries per-instantiation type descriptors and itabs; constraint-method calls dispatch indirectly through it, not statically.',
        'Generics avoid boxing by keeping T concrete, which is the main win over any-based APIs, but shared stencils still pay indirection.',
        'Each instantiation of a generic type is a distinct defined type; matching field layouts do not make them assignable.',
        "Type inference flows from argument types; explicit instantiation (F[T]) exists to disambiguate or drive cases inference can't resolve.",
        'Generics are not automatically faster than interfaces; measure code size, allocations, and dispatch before assuming a speedup.',
      ],
      walkthrough: [
        {
          title: 'Constraint defines shapes',
          caption:
            'The Number interface names a type set (~int | ~float64) that the compiler will later group into GCShapes for stenciling.',
          focus: ['~int | ~float64', 'func Sum[T Number](xs []T) T'],
          state: [
            {
              k: 'constraint',
              v: 'Number = ~int | ~float64',
            },
            {
              k: 'gcshapes',
              v: 'int-like, float64-like',
            },
          ],
        },
        {
          title: 'Instantiate Sum[int]',
          caption:
            'Sum(ints) infers T=int, so the compiler emits (or reuses) the int-GCShape stencil and passes a dictionary describing int.',
          focus: ['Sum(ints)', '// T inferred as int'],
          state: [
            {
              k: 'T',
              v: 'int (inferred)',
            },
            {
              k: 'stencil',
              v: 'Sum[int-shape]',
            },
            {
              k: 'dict',
              v: '→ int type info',
            },
            {
              k: 'result',
              v: '3+1+4+1+5+9 = 23',
            },
          ],
        },
        {
          title: 'Instantiate Sum[float64]',
          caption:
            'Sum[float64](floats) is a different GCShape, so it uses a separate stencil and dictionary from the int instantiation.',
          focus: ['Sum[float64](floats)', 'total += x'],
          state: [
            {
              k: 'T',
              v: 'float64 (explicit)',
            },
            {
              k: 'stencil',
              v: 'Sum[float64-shape]',
            },
            {
              k: 'note',
              v: 'distinct from int stencil',
            },
            {
              k: 'result',
              v: '2.5+0.5+7.0 = 10',
            },
          ],
        },
        {
          title: 'Max over ordered',
          caption:
            'Max(ints) instantiates over cmp.Ordered; returning T directly avoids boxing into an interface value.',
          focus: ['func Max[T cmp.Ordered](xs []T) T', 'Max(ints)'],
          state: [
            {
              k: 'T',
              v: 'int',
            },
            {
              k: 'return',
              v: 'unboxed int (no any)',
            },
            {
              k: 'result',
              v: '9',
            },
          ],
        },
        {
          title: 'Pointer shapes share stencil',
          caption:
            'Max on []string uses the string GCShape; if these were pointer element types they would collapse to one shared pointer-shape stencil.',
          focus: ['Max([]string{"go", "rust", "zig"})', 'if x > best {'],
          state: [
            {
              k: 'T',
              v: 'string',
            },
            {
              k: 'gotcha',
              v: 'all pointer T share 1 stencil',
            },
            {
              k: 'result',
              v: '"zig"',
            },
          ],
        },
        {
          title: 'Generic type instantiated',
          caption:
            'Pair[string, int] is a concrete, distinct type produced by instantiating the generic struct with two type arguments.',
          focus: ['type Pair[A, B any] struct {', 'Pair[string, int]{First: "age", Second: 30}'],
          state: [
            {
              k: 'A,B',
              v: 'string, int',
            },
            {
              k: 'type',
              v: 'Pair[string,int] (distinct)',
            },
            {
              k: 'p',
              v: '{"age", 30}',
            },
          ],
        },
        {
          title: 'Method returns swapped type',
          caption:
            'p.Swap() returns Pair[int, string], a different instantiation than the receiver, showing method type parameters flow through.',
          focus: [
            'func (p Pair[A, B]) Swap() Pair[B, A]',
            'Pair[B, A]{First: p.Second, Second: p.First}',
          ],
          state: [
            {
              k: 'receiver',
              v: 'Pair[string,int]',
            },
            {
              k: 'return type',
              v: 'Pair[int,string]',
            },
            {
              k: 'result',
              v: '{30, "age"}',
            },
          ],
        },
      ],
    },
    {
      id: 'go-gen-constraints',
      title: 'Constraints, ~ and comparable',
      difficulty: 'Hard',
      tags: ['generics', 'constraints', 'comparable', 'cmp.Ordered', 'tilde', 'type-sets'],
      summary:
        'Type sets, union elements, ~underlying approximation, and the two flavors of comparable.',
      pattern: 'Type sets',
      visual:
        'A constraint is an interface whose method set and type set restrict the type argument at compile time.',
      memorize:
        "~T = 'any type whose underlying type is T'; unions widen the set; comparable = spec-comparable, not strictly comparable since Go 1.20.",
      scene:
        "A bouncer (the constraint) checks each type's underlying ID card at the door; ~ lets look-alikes with the same underlying type in, | lists all guest categories.",
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"cmp"\n\t"fmt"\n)\n\ntype Celsius float64\ntype Kelvin float64\n\ntype Number interface {\n\t~int | ~int64 | ~float64\n}\n\nfunc Sum[T Number](xs []T) T {\n\tvar total T\n\tfor _, x := range xs {\n\t\ttotal += x\n\t}\n\treturn total\n}\n\nfunc Max[T cmp.Ordered](xs []T) T {\n\tm := xs[0]\n\tfor _, x := range xs[1:] {\n\t\tif x > m {\n\t\t\tm = x\n\t\t}\n\t}\n\treturn m\n}\n\nfunc Dedup[T comparable](xs []T) []T {\n\tseen := make(map[T]struct{}, len(xs))\n\tout := xs[:0]\n\tfor _, x := range xs {\n\t\tif _, ok := seen[x]; !ok {\n\t\t\tseen[x] = struct{}{}\n\t\t\tout = append(out, x)\n\t\t}\n\t}\n\treturn out\n}\n\nfunc main() {\n\ttemps := []Celsius{20.5, 19.0, 21.5}\n\tfmt.Printf("sum=%.1f max=%.1f\\n", Sum(temps), Max(temps))\n\tfmt.Println(Dedup([]Kelvin{300, 300, 301}))\n}\n',
      quiz: [
        {
          id: 'tilde-meaning',
          prompt:
            'In the constraint `~int | ~string`, what exactly does the `~int` term admit as a valid type argument?',
          choices: [
            {
              label: 'Any type with underlying int — e.g. `type ID int` qualifies',
              correct: true,
            },
            {
              label: 'Only int itself — named int types excluded',
            },
            {
              label: 'int plus every integer width — int8 through int64 included',
            },
            {
              label: 'Any type convertible to int — including float64',
            },
          ],
          explain:
            '`~int` denotes the set of all types whose underlying type is int, so both `int` and defined types like `type ID int` qualify. Other integer widths have distinct underlying types, and float is unrelated, so neither is admitted by `~int`.',
        },
        {
          id: 'tilde-defined-only',
          prompt:
            'Why must the type after `~` be an underlying type itself (e.g. `~int` is legal but `~ID` where `type ID int` is not)?',
          choices: [
            {
              label: 'Underlying-type rule — T in `~T` must equal its own underlying type',
              correct: true,
            },
            {
              label: 'Compiler limitation — slated to relax in a future release',
            },
            {
              label: 'ID is a named type — yet any named type after ~ is fine',
            },
            {
              label: '~ accepts predeclared types — user types never allowed',
            },
          ],
          explain:
            "The spec requires the type in a `~T` term to be its own underlying type. Since `ID`'s underlying type is `int`, `~ID` is rejected and `~int` is the correct spelling of that type set.",
        },
        {
          id: 'comparable-vs-any',
          prompt:
            'A generic function forms `map[K]V` from its type parameter `K`. Which constraint on `K` is both necessary and minimally sufficient in Go 1.26?',
          choices: [
            {
              label: 'comparable — exactly what map keys require',
              correct: true,
            },
            {
              label: 'any — every type supports == in generics',
            },
            {
              label: 'cmp.Ordered — ordering needed to hash keys',
            },
            {
              label: 'interface{ Equal(K) bool } — user equality suffices',
            },
          ],
          explain:
            'Map keys must support == and !=, which is precisely what `comparable` guarantees. `any` does not permit == on a type parameter, `cmp.Ordered` excludes many comparable types such as structs, and a custom Equal method is never used for map keying.',
        },
        {
          id: 'strictly-comparable',
          prompt:
            'You instantiate a `comparable`-constrained function with an interface type whose dynamic value is a slice, causing a run-time panic on ==. What changed in Go 1.20 that even allowed this instantiation?',
          choices: [
            {
              label: 'comparable now admits spec-comparable types — interfaces included',
              correct: true,
            },
            {
              label: 'comparable was always this permissive — nothing changed',
            },
            {
              label: 'Compiler inserts a recover — so == never panics',
            },
            {
              label: 'Interfaces became strictly comparable — panics now impossible',
            },
          ],
          explain:
            'Go 1.20 loosened `comparable` so ordinary interface types, which are spec-comparable but not strictly comparable, satisfy it. `==` on such values can still panic at run time when the dynamic type is uncomparable, for example a slice.',
        },
        {
          id: 'union-method-rule',
          prompt: 'Why is `interface { ~int | fmt.Stringer }` illegal as a constraint in Go 1.26?',
          choices: [
            {
              label: 'Union terms carry no methods — non-interface or method-free only',
              correct: true,
            },
            {
              label: '~int and Stringer overlap — the sets turn ambiguous',
            },
            {
              label: 'Unions cap at two terms — Stringer is a third',
            },
            {
              label: 'fmt.Stringer is not comparable — unions demand comparability',
            },
          ],
          explain:
            'A union term must be a non-interface type, a `~T` term, or an interface with no methods. `fmt.Stringer` declares a method, so it cannot appear in a union; this is a hard syntactic spec rule, not about set overlap.',
        },
        {
          id: 'ordered-vs-number',
          prompt:
            "`Max` uses `cmp.Ordered` while `Sum` uses a numeric union. Regarding `Sum`'s body `total += x`, which statement about switching `Sum` to `cmp.Ordered` is accurate?",
          choices: [
            {
              label: 'It compiles but concatenates strings — no uniform addition',
              correct: true,
            },
            {
              label: 'It fails to compile — + is undefined for cmp.Ordered',
            },
            {
              label: 'cmp.Ordered lacks == — so += cannot resolve',
            },
            {
              label: '+= needs pointer types — cmp.Ordered excludes pointers',
            },
          ],
          explain:
            '`+` is defined for every type in `cmp.Ordered` (integers, floats, and strings), so `total += x` would compile fine. The problem is semantic: `cmp.Ordered` includes string, where `+` concatenates rather than sums, so a numeric union is used to keep `+=` meaning arithmetic addition uniformly.',
        },
      ],
      design: {
        prompt:
          'You are designing a generics-heavy internal library (numeric aggregations, ordered collections, set/dedup utilities). How do you structure your constraint interfaces — inline vs named, use of `~`, `comparable`, and the `cmp`/`constraints` packages — to maximize reuse and API stability while avoiding subtle run-time pitfalls?',
        answer:
          "Prefer small, named, composable constraint interfaces (a `Number` union, `cmp.Ordered` for comparison, `comparable` for keys/sets) over inlined ad-hoc constraints, so signatures stay readable and the constraint set is a single source of truth you can evolve. Use `~` deliberately: it lets callers pass domain-defined types like `type Celsius float64`, which is almost always what a library wants — omitting `~` silently rejects those and frustrates users, but `~` also means operators must be semantically uniform across the whole set (don't lump string into a numeric union just because `+` compiles, since it concatenates rather than adds). Reach for the standard `cmp.Ordered` and `golang.org/x/exp/constraints` rather than hand-rolling, both for correctness and because the compiler and readers recognize them. The sharpest pitfall is `comparable`'s post-1.20 looseness: constraining on `comparable` now admits interface types whose dynamic value may be uncomparable, so a set or map keyed on a `comparable` type parameter can panic at run time; if you need a run-time-safe guarantee, document it, validate at boundaries, or restrict to concrete types. Also remember union terms cannot carry methods, so behavioral constraints (Stringer-like) must be a separate method-based interface, not mixed into a type union. Recommendation: expose a handful of named constraints (`Number`, reuse `cmp.Ordered`, `comparable`), always use `~` on numeric/ordered unions to accept defined types, keep operator semantics uniform within each union, and treat `comparable` as spec-comparable-not-panic-free — gating any hashing/dedup API with a clear contract about interface-valued type arguments.",
      },
      keyPoints: [
        '`~T` is the set of all types whose underlying type is T; the type after `~` must itself be an underlying type, so `~int` is legal but `~ID` is not.',
        'Union elements may be non-interface types or `~T` terms but must not have methods, so `fmt.Stringer` cannot appear in a union.',
        '`comparable` since Go 1.20 admits spec-comparable types including interfaces, so `==` on a type parameter can panic at run time when the dynamic type is uncomparable.',
        'Map keys and set membership require `comparable`, not `any` and not `cmp.Ordered`.',
        '`cmp.Ordered` is for `< > <= >=` comparisons and includes string; `+` compiles on it but concatenates strings, so use a dedicated numeric union when you need uniform arithmetic.',
        'Prefer named, composable constraints and the standard `cmp`/`constraints` packages over inlined ad-hoc constraints for reuse and stability.',
      ],
      walkthrough: [
        {
          title: 'Define named float types',
          caption:
            'Celsius and Kelvin are distinct named types, but both share the underlying type float64.',
          focus: ['type Celsius float64', 'type Kelvin float64'],
          state: [
            {
              k: 'Celsius underlying',
              v: 'float64',
            },
            {
              k: 'Kelvin underlying',
              v: 'float64',
            },
          ],
        },
        {
          title: 'Build the union type set',
          caption:
            "Number's type set is the union of three ~-approximation elements: every type whose underlying type is int, int64, or float64.",
          focus: ['~int | ~int64 | ~float64'],
          state: [
            {
              k: 'type set',
              v: '{~int, ~int64, ~float64}',
            },
            {
              k: 'includes Celsius?',
              v: 'yes (~float64)',
            },
          ],
        },
        {
          title: 'Instantiate Sum[Celsius]',
          caption:
            'Celsius satisfies Number because its underlying float64 is in the set via ~float64; T is bound to Celsius, so var total T is Celsius(0).',
          focus: ['func Sum[T Number](xs []T) T', 'var total T'],
          state: [
            {
              k: 'T',
              v: 'Celsius',
            },
            {
              k: 'total',
              v: '0.0 (Celsius)',
            },
            {
              k: 'xs',
              v: '[20.5 19.0 21.5]',
            },
          ],
        },
        {
          title: 'Accumulate the sum',
          caption:
            "The loop adds each Celsius value; += is legal because every type in Number's set supports +, and the result stays typed Celsius.",
          focus: ['total += x', 'return total'],
          state: [
            {
              k: 'total',
              v: '61.0 (Celsius)',
            },
            {
              k: 'sum output',
              v: '61.0',
            },
          ],
        },
        {
          title: 'Max needs ordering, not just membership',
          caption:
            'Max requires cmp.Ordered, whose type set uses ~ over all orderable types, so Celsius qualifies and the > comparison is legal.',
          focus: ['func Max[T cmp.Ordered](xs []T) T', 'if x > m {'],
          state: [
            {
              k: 'T',
              v: 'Celsius',
            },
            {
              k: 'm',
              v: '21.5',
            },
            {
              k: 'max output',
              v: '21.5',
            },
          ],
        },
        {
          title: 'Dedup requires comparable',
          caption:
            'Dedup[Kelvin] needs comparable so T can be a map key; Kelvin is strictly comparable, so seen := map[Kelvin]struct{} is valid.',
          focus: ['func Dedup[T comparable](xs []T) []T', 'seen := make(map[T]struct{}, len(xs))'],
          state: [
            {
              k: 'T',
              v: 'Kelvin',
            },
            {
              k: 'comparable?',
              v: 'yes (strict)',
            },
            {
              k: 'input',
              v: '[300 300 301]',
            },
          ],
        },
        {
          title: 'Gotcha: in-place backing reuse',
          caption:
            "out := xs[:0] aliases the input's backing array, and dedup writes deduped values back into it as it reads — safe only because the write index never outpaces the read index.",
          focus: ['out := xs[:0]', 'out = append(out, x)'],
          state: [
            {
              k: 'seen',
              v: '{300, 301}',
            },
            {
              k: 'out',
              v: '[300 301]',
            },
            {
              k: 'len/cap out',
              v: '2 / 3',
            },
          ],
        },
        {
          title: 'comparable is spec-comparable',
          caption:
            'Since Go 1.20 comparable means spec-comparable, so interface types satisfy it even though comparing them can panic; here Kelvin never panics.',
          focus: ['if _, ok := seen[x]; !ok {', 'return out'],
          state: [
            {
              k: 'final output',
              v: '[300 301]',
            },
            {
              k: 'program output',
              v: 'sum=61.0 max=21.5 / [300 301]',
            },
          ],
        },
      ],
    },
    {
      id: 'go-gen-inference',
      title: 'Type inference & its limits',
      difficulty: 'Hard',
      tags: ['generics', 'type-inference', 'type-parameters', 'go1.26'],
      summary:
        'How Go infers type arguments from function args, and the hard limits where you must be explicit.',
      pattern: 'Type inference',
      visual: 'Args flow into type params; return position and methods never feed inference.',
      memorize: 'Inference reads arguments, never the return; methods get no type params.',
      scene:
        'A funnel that only accepts liquid poured from the top (arguments); the spout (return type) can never push liquid back up to fill it.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\n// Map infers T and U from the slice and function arguments.\nfunc Map[T, U any](in []T, f func(T) U) []U {\n\tout := make([]U, len(in))\n\tfor i, v := range in {\n\t\tout[i] = f(v)\n\t}\n\treturn out\n}\n\n// Parse cannot infer T from context: its only type-param use is the\n// return type, so callers must supply T explicitly.\nfunc Parse[T any](s string) (T, error) {\n\tvar zero T\n\treturn zero, fmt.Errorf("cannot parse %q", s)\n}\n\nfunc main() {\n\tnums := []int{1, 2, 3}\n\t// T=int inferred from nums; U=string inferred from the func literal.\n\tstrs := Map(nums, func(n int) string { return fmt.Sprintf("#%d", n) })\n\tfmt.Println(strs)\n\n\t// No inference from return position: T must be given explicitly.\n\tv, err := Parse[int]("42")\n\tfmt.Println(v, err)\n}\n',
      quiz: [
        {
          id: 'no-return-inference',
          prompt:
            'Given `func Parse[T any](s string) (T, error)`, why does `x, _ := Parse("42")` fail to compile while `x, _ := Parse[int]("42")` succeeds?',
          choices: [
            {
              label: 'Return position ignored — inference only reads argument types',
              correct: true,
            },
            {
              label: 'string blocks inference — non-generic params disable it',
            },
            {
              label: 'Assignment target unknown — LHS var lacks a type',
            },
            {
              label: 'error return conflicts — multi-return breaks inference',
            },
          ],
          explain:
            'Go infers type arguments from the ordinary (typed) function arguments only. T appears solely in the result, and the compiler never uses the return context or the assignment target to infer type parameters, so it must be supplied explicitly.',
        },
        {
          id: 'method-type-params',
          prompt:
            "Why can't you write `func (r Repo) Fetch[T any](id int) T` on a type in Go 1.26?",
          choices: [
            {
              label: 'Methods forbid type params — a language-level restriction',
              correct: true,
            },
            {
              label: 'Receiver already generic — Repo must be Repo[T]',
            },
            {
              label: 'Return-only T — inference would be impossible',
            },
            {
              label: 'Pointer receiver needed — value receivers reject generics',
            },
          ],
          explain:
            'Go disallows type parameters on methods entirely ("method must have no type parameters"). Put the type parameter on the enclosing type, or make it a top-level generic function.',
        },
        {
          id: 'untyped-const-default',
          prompt: 'For `func Id[T any](v T) T`, what is the inferred T in `x := Id(3)`?',
          choices: [
            {
              label: 'int — untyped constant takes its default type',
              correct: true,
            },
            {
              label: 'untyped int — T stays constant-kinded',
            },
            {
              label: 'rune — numeric literals infer as rune',
            },
            {
              label: 'any — inference falls back to the constraint',
            },
          ],
          explain:
            "When a type parameter is inferred from an untyped constant argument, the constant's default type is used. The default type of the integer literal 3 is int, so T is int.",
        },
        {
          id: 'partial-inference',
          prompt: 'With `func Cast[From, To any](v From) To`, which call compiles?',
          choices: [
            {
              label: 'Cast[string, int]("x") — both args given explicitly',
              correct: true,
            },
            {
              label: 'Cast("x") — From and To both inferred',
            },
            {
              label: 'Cast[string]("x") — To inferred from usage',
            },
            {
              label: 'var y int = Cast("x") — To read from LHS',
            },
          ],
          explain:
            'To appears only in the return, so it can never be inferred; you must supply it. Supplying only From (partial) still leaves To unresolved, and Go will not read To from the assignment target, so only the fully explicit call compiles.',
        },
        {
          id: 'func-literal-inference',
          prompt:
            'In `Map(nums, func(n int) string {...})` for `Map[T,U any]([]T, func(T)U)`, how are T and U resolved?',
          choices: [
            {
              label: 'T from nums, U from literal — args drive both',
              correct: true,
            },
            {
              label: 'Both from func literal — the closure fixes T and U',
            },
            {
              label: 'T from nums, U from result assignment — LHS types U',
            },
            {
              label: 'Constraint defaults — any resolves to interface{}',
            },
          ],
          explain:
            "T unifies with the element type of nums ([]int gives T=int), and U unifies with the function literal's declared result type (string). Both come from arguments; the assignment target plays no role.",
        },
        {
          id: 'typed-nil-inference',
          prompt:
            'For `func First[T any](v T) T`, why does `First(nil)` fail but `First([]byte(nil))` compile?',
          choices: [
            {
              label: 'Untyped nil has no type — nothing to infer T from',
              correct: true,
            },
            {
              label: 'nil not comparable — any rejects nil values',
            },
            {
              label: 'T defaults missing — any lacks a zero default',
            },
            {
              label: 'Pointer required — nil needs a pointer target',
            },
          ],
          explain:
            'The untyped nil identifier carries no type, so unification cannot determine T and inference fails. Converting to a typed nil, []byte(nil), gives a concrete argument type, letting T infer as []byte.',
        },
      ],
      design: {
        prompt:
          "You're designing a generic decoding/registry package: functions like `Decode[T any](data []byte) (T, error)` and `New[T any]() *T`. Callers complain they must write the type argument at every call site. How do you design the API to minimize explicit type arguments while keeping it type-safe, and when do you accept that explicit arguments are unavoidable?",
        answer:
          'The core constraint is that Go infers type parameters only from ordinary arguments, never from the return type or the assignment target, so any function whose type parameter appears solely in the result (Decode, New) is fundamentally un-inferable and will always require an explicit argument. The cleanest fix is to move the type parameter out of the return-only position: accept a destination pointer, e.g. `Decode[T any](data []byte, out *T) error`, so T is inferred from `out` — this is exactly the shape `json.Unmarshal` uses and it eliminates the call-site annotation. Alternatively, return a concrete carrier: a `Decoder[T]` value or a registry keyed by a `TypeToken[T]` where T was fixed once at construction, so downstream calls infer from that value. The tradeoff: the pointer-out form is idiomatic and inference-friendly but forces callers to pre-declare a variable and gives up the ergonomic `x := Decode(...)` one-liner; the return-value form reads nicely but is stuck with explicit `Decode[int](...)`. My recommendation is the destination-pointer signature for hot, high-frequency APIs (matches stdlib conventions, zero annotation), and reserve the return-T form for rare or clearly-typed call sites where a single explicit argument is acceptable — never try to "fix" inference by adding phantom parameters purely to trick the inferencer, since that hurts readability more than the annotation it removes. Also remember methods cannot carry type parameters, so a fluent `registry.Decode[T]()` is impossible; put such generics on the type (`Registry[T]`) or as free functions.',
      },
      keyPoints: [
        'Type inference uses ordinary function arguments (including their element/function-signature structure), never the return type or the assignment/LHS context.',
        'A type parameter appearing only in the result is un-inferable — callers must always pass it explicitly.',
        "Go has no partial-then-infer for the remaining params from context: if a param can't be inferred from args, supplying the others doesn't help.",
        'Methods may not declare their own type parameters ("method must have no type parameters"); put the parameter on the enclosing type.',
        'Untyped constant arguments infer to their default type (3 -> int); untyped nil carries no type and cannot drive inference — use a typed nil.',
        'Idiomatic fix for return-only generics: take a destination pointer (json.Unmarshal style) so T is inferred from the argument.',
      ],
      walkthrough: [
        {
          title: 'Generic Map declared',
          caption:
            'Map is defined with two type parameters T and U that the compiler will later fill in from the call site, not from any annotation.',
          focus: ['func Map[T, U any](in []T, f func(T) U) []U'],
          state: [
            {
              k: 'T',
              v: 'unbound',
            },
            {
              k: 'U',
              v: 'unbound',
            },
          ],
        },
        {
          title: 'Parse declared (return-only T)',
          caption:
            'Parse uses its type parameter T only in the return type, so nothing at a call site can pin it down by argument inference.',
          focus: ['func Parse[T any](s string) (T, error)'],
          state: [
            {
              k: 'T uses',
              v: 'return only',
            },
            {
              k: 'inferable',
              v: 'no',
            },
          ],
        },
        {
          title: 'Build the input slice',
          caption:
            'main starts and constructs a concrete []int, which will drive inference for the Map call below.',
          focus: ['nums := []int{1, 2, 3}'],
          state: [
            {
              k: 'nums',
              v: '[1 2 3]',
            },
            {
              k: 'type(nums)',
              v: '[]int',
            },
          ],
        },
        {
          title: 'Infer T from the slice',
          caption:
            "Passing nums to Map's in []T unifies []T with []int, so the compiler infers T=int purely from the argument.",
          focus: ['Map(nums,', 'in []T'],
          state: [
            {
              k: 'T',
              v: 'int',
            },
            {
              k: 'U',
              v: 'unbound',
            },
          ],
        },
        {
          title: 'Infer U from the func literal',
          caption:
            'The func(int) string literal unifies with f func(T) U, fixing U=string; inference reads the arguments, never the []U return.',
          focus: ['func(n int) string { return fmt.Sprintf("#%d", n) }', 'f func(T) U'],
          state: [
            {
              k: 'T',
              v: 'int',
            },
            {
              k: 'U',
              v: 'string',
            },
          ],
        },
        {
          title: 'Map runs elementwise',
          caption:
            'With T and U resolved, Map allocates a []string of len 3 and applies f to each element, producing the mapped slice.',
          focus: ['out := make([]U, len(in))', 'out[i] = f(v)'],
          state: [
            {
              k: 'out',
              v: '[#1 #2 #3]',
            },
            {
              k: 'len/cap',
              v: '3/3',
            },
            {
              k: 'strs',
              v: '[#1 #2 #3]',
            },
          ],
        },
        {
          title: 'The inference limit',
          caption:
            'Calling Parse the same inference-free way would fail because T appears only in the return, so T=int must be written explicitly.',
          focus: ['Parse[int]("42")'],
          state: [
            {
              k: 'T',
              v: 'int (explicit)',
            },
            {
              k: 'inferred?',
              v: 'no',
            },
          ],
        },
        {
          title: 'Parse returns the zero value',
          caption:
            'Parse yields the zero value of the explicit T plus an error, showing why the caller had to supply the type argument.',
          focus: ['var zero T', 'return zero, fmt.Errorf("cannot parse %q", s)'],
          state: [
            {
              k: 'v',
              v: '0',
            },
            {
              k: 'err',
              v: 'cannot parse "42"',
            },
          ],
        },
      ],
    },
    {
      id: 'go-gen-pitfalls',
      title: 'Generics pitfalls & when not to use',
      difficulty: 'Hard',
      tags: ['generics', 'type-parameters', 'interfaces', 'monomorphization', 'api-design'],
      summary:
        'Know the hard limits of Go generics and when a plain interface beats a type parameter.',
      pattern: 'Generics limits',
      visual:
        'Type params are stenciled per GC shape at instantiation; pointer-shaped types share one copy plus a runtime dictionary, not one copy per named type.',
      memorize:
        'No method type params; no switch on T (route via any); prefer interface when you only dispatch, generic when you preserve type.',
      scene:
        'A carpenter reaching for a jig (generic) to cut one board, when a single handsaw (interface) would have done it — and every extra jig fills the shop with sawdust (code bloat).',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n)\n\n// Box is generic, but methods CANNOT add their own type parameters.\n// A method like func (b Box[T]) MapTo[R any](f func(T) R) R is a compile error.\ntype Box[T any] struct {\n\tval T\n}\n\nfunc (b Box[T]) Get() T { return b.val }\n\n// describe shows you cannot type-switch on a type parameter T directly.\n// You must route through an interface value (any) to inspect the dynamic type.\nfunc describe[T any](v T) string {\n\tswitch x := any(v).(type) {\n\tcase int:\n\t\treturn fmt.Sprintf("int:%d", x)\n\tcase string:\n\t\treturn fmt.Sprintf("string:%q", x)\n\tdefault:\n\t\treturn fmt.Sprintf("other:%v", x)\n\t}\n}\n\n// Adder is a plain interface: when all you need is dynamic dispatch,\n// an interface is simpler and avoids per-type code stenciling.\ntype Adder interface{ Add(int) int }\n\nfunc main() {\n\tb := Box[string]{val: "hi"}\n\tfmt.Println(b.Get())\n\tfmt.Println(describe(42))\n\tfmt.Println(describe("x"))\n\tfmt.Println(describe(3.14))\n}\n',
      quiz: [
        {
          id: 'method-type-param',
          prompt:
            'Why does Go reject `func (b Box[T]) MapTo[R any](f func(T) R) R` as a compile error?',
          choices: [
            {
              label: 'Methods cannot declare type params — only funcs and types can',
              correct: true,
            },
            {
              label: 'R shadows T — parameter names must be globally unique',
            },
            {
              label: 'Generic receivers are illegal — Box[T] cannot be a receiver',
            },
            {
              label: 'Func-typed params ban generics — closures erase type info',
            },
          ],
          explain:
            'Go disallows parameterized methods entirely; only top-level functions and type declarations may introduce type parameters, so the R on a method is rejected. Generic receivers like Box[T] are perfectly legal, and R shadowing rules are irrelevant here.',
        },
        {
          id: 'switch-on-typeparam',
          prompt:
            "Inside `func f[T any](v T)`, why can't you write `switch v.(type)` directly on `v`?",
          choices: [
            {
              label: 'T is not an interface — type switch needs an interface operand',
              correct: true,
            },
            {
              label: 'Switches are runtime — generics resolve fully at compile time',
            },
            {
              label: 'any(v) copies v — the switch sees a stale value',
            },
            {
              label: 'T lacks a method set — switches require named methods',
            },
          ],
          explain:
            'A type switch requires an interface value as its operand; a type parameter is not an interface type, so you must first convert via any(v) to obtain an interface to switch on. The copy from any(v) is real but irrelevant to why the direct switch is rejected.',
        },
        {
          id: 'interface-vs-generic',
          prompt:
            'You need a function that calls `Write([]byte)` on its argument and returns nothing type-dependent. Interface param vs generic param — which is the better default, and why?',
          choices: [
            {
              label: 'Interface param — pure dispatch needs no type preservation',
              correct: true,
            },
            {
              label: 'Generic param — avoids interface allocation per call',
            },
            {
              label: 'Generic param — enables devirtualization the interface blocks',
            },
            {
              label: 'Interface param — generics forbid method-set constraints',
            },
          ],
          explain:
            'When the function only dispatches a method and returns nothing whose type depends on the input, an interface is simpler and adds no code bloat; generics buy you nothing here, and constraints can require methods just fine, so the anti-generic method-set claim is false.',
        },
        {
          id: 'code-bloat',
          prompt:
            'Regarding the binary-size cost of generics, what does the Go 1.26 compiler actually do?',
          choices: [
            {
              label: 'Stencils per GC shape — pointer types share one instantiation',
              correct: true,
            },
            {
              label: 'Fully monomorphizes — one copy per named type argument',
            },
            {
              label: 'Fully boxes everything — one copy via type descriptors',
            },
            {
              label: 'Inlines all instantiations — no separate code emitted',
            },
          ],
          explain:
            'Go uses GC-shape stenciling: types with the same underlying memory shape (e.g. all pointer types) share a single instantiation that receives a dictionary, reducing — but not eliminating — the code duplication of full monomorphization.',
        },
        {
          id: 'dictionary-cost',
          prompt:
            'A generic function instantiated for pointer-shaped types receives a runtime dictionary. What is the practical performance consequence versus a hand-written concrete version?',
          choices: [
            {
              label: 'Extra indirection — can be slower than inlined concrete code',
              correct: true,
            },
            {
              label: 'Zero overhead — dictionaries erased before code generation',
            },
            {
              label: 'Slower than interfaces — adds vtable double-dispatch',
            },
            {
              label: 'Faster always — dictionary caches method results per call',
            },
          ],
          explain:
            'Shared (dictionary-based) instantiations add indirection for method calls and type info, so a generic function can be measurably slower than a specialized concrete implementation — a reason not to reach for generics in hot paths. It does not add interface-style double-dispatch, and dictionaries are not erased.',
        },
        {
          id: 'constraint-not-union-method',
          prompt:
            'You write a constraint `interface{ ~int | ~string }` and try to call a method on values of that type param. What happens?',
          choices: [
            {
              label: 'Compile error — union-of-types constraints expose no methods',
              correct: true,
            },
            {
              label: "Works — compiler infers the union's common method set",
            },
            {
              label: 'Works — union elements auto-promote to fmt.Stringer',
            },
            {
              label: 'Runtime panic — method dispatches on the zero element',
            },
          ],
          explain:
            'A constraint that is a union of type terms permits operators shared by those types but exposes no methods; to call a method you must add it to the interface constraint explicitly, otherwise it is a compile-time error — there is no inferred method set and no auto-promotion.',
        },
      ],
      design: {
        prompt:
          'A teammate proposes rewriting your `Repository` layer so every method is generic over the entity type, replacing a handful of interfaces like `Store` with a single `Repository[T Entity]`. Argue for or against, covering API ergonomics, the no-parameterized-methods rule, code bloat, and where the boundary between generics and interfaces should sit.',
        answer:
          "I would push back on a blanket rewrite and instead apply generics surgically. Generics shine for container and algorithm code that must preserve the caller's type without `any`-casting (a typed `Repository[T]` avoids downcasts on `Get`), so the value type flows through cleanly. But the no-parameterized-methods rule bites hard here: if a repository needs an operation that introduces its own type parameter (e.g. `MapTo[R]` projecting one entity to another), that cannot be a method on `Repository[T]` and must become a free function, fragmenting the API and surprising callers. There is also a bloat and indirection cost — each distinct GC shape stencils code plus a dictionary, so a repo instantiated for dozens of entity types grows the binary and adds indirection on hot method calls versus a concrete implementation. The right boundary is: use an interface (`Store`) when call sites only need dynamic dispatch and don't care about the concrete type, and use a generic `Repository[T]` only where the type genuinely must be preserved end-to-end or where you'd otherwise sprinkle unsafe casts. My recommendation is a hybrid: keep the interface at the seam for polymorphic consumers and pluggable backends, expose a thin generic helper for the common typed CRUD path, and keep projection/transform operations as free functions to sidestep the method-type-param limitation. Measure binary size and hot-path latency before committing to a fully generic layer, because the ergonomic win can be undone by bloat and dictionary overhead.",
      },
      keyPoints: [
        'Methods can never declare their own type parameters; operations needing a fresh type param must be free functions.',
        'You cannot type-switch or type-assert directly on a type parameter — convert to an interface (any) first.',
        'Prefer an interface when the code only dispatches a method; prefer a generic when the concrete type must be preserved without casts.',
        'Go stencils generic code per GC shape (pointer types share one instantiation via a dictionary), so bloat is reduced but not zero.',
        'Shared dictionary-based instantiations add indirection and can be slower than hand-written concrete code in hot paths.',
        'Union-of-types constraints permit shared operators but expose no methods; add methods to the constraint interface explicitly to call them.',
      ],
      walkthrough: [
        {
          title: 'Generic Box declared',
          caption:
            'Box[T] is a generic struct, but note that its methods may not introduce new type parameters of their own.',
          focus: ['type Box[T any] struct {', 'func (b Box[T]) Get() T { return b.val }'],
          state: [
            {
              k: 'Box type param',
              v: 'T',
            },
            {
              k: 'method type params',
              v: 'forbidden',
            },
          ],
        },
        {
          title: 'Instantiate Box[string]',
          caption: 'main starts and instantiates Box with T=string, storing "hi" in the val field.',
          focus: ['b := Box[string]{val: "hi"}'],
          state: [
            {
              k: 'T',
              v: 'string',
            },
            {
              k: 'b.val',
              v: '"hi"',
            },
          ],
        },
        {
          title: 'Call Get()',
          caption:
            'b.Get() returns the stored string; Get preserves the concrete type string as its return, which a plain interface could not.',
          focus: ['fmt.Println(b.Get())'],
          state: [
            {
              k: 'return type',
              v: 'string',
            },
            {
              k: 'output',
              v: 'hi',
            },
          ],
        },
        {
          title: 'describe(42): route via any',
          caption:
            'describe is called with T=int, but you cannot type-switch on T directly, so v is converted to an any before the switch.',
          focus: ['func describe[T any](v T) string {', 'switch x := any(v).(type) {'],
          state: [
            {
              k: 'T',
              v: 'int',
            },
            {
              k: 'dynamic type',
              v: 'int',
            },
          ],
        },
        {
          title: 'int case matches',
          caption:
            'The dynamic type of the any value is int, so the int arm runs and formats the value.',
          focus: ['case int:', 'return fmt.Sprintf("int:%d", x)'],
          state: [
            {
              k: 'x',
              v: '42',
            },
            {
              k: 'output',
              v: 'int:42',
            },
          ],
        },
        {
          title: 'describe("x"): string arm',
          caption:
            "With T=string the any's dynamic type is string, so the string arm returns a quoted value.",
          focus: ['case string:', 'return fmt.Sprintf("string:%q", x)'],
          state: [
            {
              k: 'T',
              v: 'string',
            },
            {
              k: 'output',
              v: 'string:"x"',
            },
          ],
        },
        {
          title: 'describe(3.14): default arm',
          caption:
            'T=float64 matches no listed case, so the default arm handles it — showing why an interface with a method would often be cleaner than switching on every type.',
          focus: ['default:', 'return fmt.Sprintf("other:%v", x)'],
          state: [
            {
              k: 'T',
              v: 'float64',
            },
            {
              k: 'output',
              v: 'other:3.14',
            },
          ],
        },
        {
          title: 'Interface vs generic',
          caption:
            'When you only need dynamic dispatch, the plain Adder interface avoids per-type stenciling; reach for generics only when you must preserve the concrete type.',
          focus: ['type Adder interface{ Add(int) int }'],
          state: [
            {
              k: 'dispatch only',
              v: 'use interface',
            },
            {
              k: 'preserve type',
              v: 'use generic',
            },
          ],
        },
      ],
    },
  ],
};
