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
