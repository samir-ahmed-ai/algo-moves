import type { GoTopic } from '../types';

export const typesValues: GoTopic = {
  id: 'types-values',
  title: 'Types & Value Semantics',
  icon: 'Type',
  concepts: [
    {
      id: 'go-types-basic',
      title: 'Basic types: sized numbers, bool, string, byte/rune aliases',
      difficulty: 'Easy',
      tags: ['types', 'numbers', 'string', 'rune'],
      summary:
        'Go pins integer and float widths in the type name and treats byte and rune as aliases for uint8 and int32.',
      pattern: 'Basic types',
      visual:
        'int8..int64/uint..float64 fix the bit width; byte==uint8, rune==int32; a string is immutable UTF-8 bytes.',
      memorize: 'byte=uint8, rune=int32; int is 64-bit on modern machines but is its OWN type.',
      scene:
        'A rack of labelled bins: each numeric bin states its exact width on the front; two bins wear nicknames, byte and rune, taped over uint8 and int32.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar i8 int8 = 127\n\tvar u uint8 = 255\n\tvar f float64 = 1.5\n\tvar ok bool = true\n\n\tb := byte(\'A\')\n\tr := rune(\'世\')\n\tfmt.Println(i8, u, f, ok)\n\tfmt.Println(b, r)\n\n\ts := "héllo"\n\tfmt.Println(len(s))\n\tfor i, c := range s {\n\t\tfmt.Printf("%d:%c ", i, c)\n\t}\n\tfmt.Println()\n}\n',
      keyPoints: [
        'byte is an alias for uint8 and rune is an alias for int32 — identical types, not distinct ones.',
        'int/uint width is implementation-defined (64-bit on modern platforms) yet int is a separate type from int64.',
        'len(s) counts BYTES, but range over a string yields rune values at their byte offsets — the classic multibyte gotcha.',
        'Numeric literals have no width until assigned; mixing sized types requires an explicit conversion.',
      ],
      walkthrough: [
        {
          title: 'Sized values',
          caption:
            'Each numeric variable pins an exact width — int8 tops out at 127, uint8 at 255.',
          focus: ['var i8 int8 = 127'],
          state: [
            { k: 'i8', v: '127' },
            { k: 'u', v: '255' },
          ],
        },
        {
          title: 'byte and rune',
          caption: "byte('A') is a uint8 (65) and rune('世') is an int32 code point (19990).",
          focus: ["r := rune('世')"],
          state: [
            { k: 'b', v: '65' },
            { k: 'r', v: '19990' },
          ],
        },
        {
          title: 'len counts bytes',
          caption: '"héllo" is 6 bytes because é encodes as two UTF-8 bytes, so len is 6 not 5.',
          focus: ['fmt.Println(len(s))'],
          state: [{ k: 'len(s)', v: '6' }],
        },
        {
          title: 'range yields runes',
          caption:
            'range over a string decodes UTF-8, giving each rune with its BYTE offset, so the é index jumps.',
          focus: ['for i, c := range s {'],
          state: [{ k: 'output', v: '0:h 1:é 3:l 4:l 5:o' }],
        },
      ],
    },
    {
      id: 'go-types-defined',
      title: 'Defined (named) types and their underlying type',
      difficulty: 'Easy',
      tags: ['types', 'defined', 'underlying', 'methods'],
      summary:
        'type Celsius float64 makes a distinct type that shares an underlying type but never mixes without a conversion.',
      pattern: 'Defined type',
      visual:
        'A defined type copies the underlying representation but gets its own identity, method set, and no implicit mixing.',
      memorize:
        'Named type != its underlying type; convert to mix, and methods attach only to the named type.',
      scene:
        'Two thermometers built from the same float glass — Celsius and Fahrenheit — that refuse to add to each other until you explicitly relabel one.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Celsius float64\ntype Fahrenheit float64\n\nfunc (c Celsius) ToF() Fahrenheit {\n\treturn Fahrenheit(c*9/5 + 32)\n}\n\nfunc main() {\n\tvar c Celsius = 100\n\tf := c.ToF()\n\tfmt.Println(c, f)\n\n\tvar plain float64 = 21\n\tc2 := Celsius(plain)\n\tfmt.Println(c2)\n}\n',
      keyPoints: [
        'A defined type has the SAME underlying type but a distinct identity — Celsius and Fahrenheit never combine implicitly.',
        'Methods can only be declared on a defined type from your package, which is why float64 itself can carry none.',
        'Converting between two types that share an underlying type (Celsius(plain)) is always allowed and free.',
        'Untyped constants like 100 assign to a defined numeric type without a conversion; typed values need Celsius(x).',
      ],
      walkthrough: [
        {
          title: 'Two distinct types',
          caption:
            'Celsius and Fahrenheit both wrap float64 but are separate types that cannot be added together.',
          focus: ['type Celsius float64'],
          state: [{ k: 'underlying', v: 'float64' }],
        },
        {
          title: 'Method on the named type',
          caption:
            'ToF is declared on Celsius, so the method set belongs to the named type, not to bare float64.',
          focus: ['func (c Celsius) ToF() Fahrenheit {'],
          state: [{ k: 'receiver', v: 'Celsius' }],
        },
        {
          title: 'Call and print',
          caption: 'c is 100, and c.ToF() converts it to 212 Fahrenheit.',
          focus: ['f := c.ToF()'],
          state: [
            { k: 'c', v: '100' },
            { k: 'f', v: '212' },
          ],
        },
        {
          title: 'Explicit conversion to mix',
          caption:
            'A plain float64 must be wrapped with Celsius(plain) before it counts as a Celsius.',
          focus: ['c2 := Celsius(plain)'],
          state: [{ k: 'c2', v: '21' }],
        },
      ],
    },
    {
      id: 'go-types-value-semantics',
      title: 'Value semantics: assignment and function args copy',
      difficulty: 'Easy',
      tags: ['value-semantics', 'copy', 'struct', 'pointer'],
      summary:
        'Assignment and passing to a function copy the value, so mutating a struct copy leaves the original untouched.',
      pattern: 'Value copy',
      visual:
        'Every := and every argument copies the whole value; to mutate the caller you must pass a *pointer.',
      memorize: 'Go passes copies. Struct arg = copy; want mutation? take a *T pointer.',
      scene:
        'A photocopier at the door of every function: the original document stays on the desk while the copy is what walks inside.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Point struct{ X, Y int }\n\nfunc bump(p Point) {\n\tp.X++\n}\n\nfunc bumpPtr(p *Point) {\n\tp.X++\n}\n\nfunc main() {\n\ta := Point{X: 1, Y: 2}\n\tb := a\n\tb.X = 99\n\tfmt.Println(a.X, b.X)\n\n\tbump(a)\n\tfmt.Println(a.X)\n\n\tbumpPtr(&a)\n\tfmt.Println(a.X)\n}\n',
      keyPoints: [
        'b := a copies the whole struct, so writing b.X = 99 never touches a.',
        'A function parameter is a fresh copy; bump(a) mutates its local copy and the caller sees nothing.',
        'To mutate the caller pass a pointer (bumpPtr(&a)); the pointer is copied but it still points at the original.',
        'Arrays are value types too and copy element-by-element — a common surprise for engineers coming from reference-semantics languages.',
      ],
      walkthrough: [
        {
          title: 'Assignment copies',
          caption: 'b := a duplicates the struct; setting b.X to 99 leaves a.X at 1.',
          focus: ['b := a'],
          state: [
            { k: 'a.X', v: '1' },
            { k: 'b.X', v: '99' },
          ],
        },
        {
          title: 'Value arg is a copy',
          caption: 'bump receives a copy of a, so its p.X++ is lost when the function returns.',
          focus: ['func bump(p Point) {'],
          state: [{ k: 'a.X', v: '1' }],
        },
        {
          title: 'No effect on caller',
          caption: 'After bump(a) the caller still sees a.X unchanged at 1.',
          focus: ['bump(a)'],
          state: [{ k: 'a.X', v: '1' }],
        },
        {
          title: 'Pointer to mutate',
          caption:
            'bumpPtr(&a) hands over the address, so p.X++ reaches the real a and it becomes 2.',
          focus: ['bumpPtr(&a)'],
          state: [{ k: 'a.X', v: '2' }],
        },
      ],
    },
    {
      id: 'go-types-comparability',
      title: 'Comparability and what may be a map key',
      difficulty: 'Medium',
      tags: ['comparability', 'map-key', 'equality', 'struct'],
      summary:
        'Only comparable types can be == or used as map keys; slices, maps, and functions are not comparable.',
      pattern: 'Comparability',
      visual:
        'Comparable = scalars, strings, pointers, channels, interfaces, and structs/arrays of comparable fields; slices/maps/funcs are out.',
      memorize: 'Map keys must be comparable. Slice, map, func = NOT comparable (except == nil).',
      scene:
        'A velvet rope at the map-key club: scalars, strings, and tidy structs stroll in, while slices, maps, and functions get turned away at the door.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Key struct {\n\tID   int\n\tName string\n}\n\nfunc main() {\n\tm := map[Key]int{}\n\tk1 := Key{ID: 1, Name: "a"}\n\tk2 := Key{ID: 1, Name: "a"}\n\tm[k1] = 10\n\tfmt.Println(m[k2])\n\tfmt.Println(k1 == k2)\n\n\tx := [2]int{1, 2}\n\ty := [2]int{1, 2}\n\tfmt.Println(x == y)\n\n\tvar s []int\n\tfmt.Println(s == nil)\n}\n',
      keyPoints: [
        'Comparable types (bool, numbers, strings, pointers, channels, interfaces, and structs/arrays of comparable fields) can use == and be map keys.',
        'Slices, maps, and functions are NOT comparable — the only allowed comparison is against nil.',
        'Struct equality is field-by-field, so k1 == k2 is true when every field matches; two structs are equal keys.',
        'Comparing interface values holding uncomparable dynamic types (e.g. a slice) compiles but PANICS at runtime — a sharp gotcha.',
      ],
      walkthrough: [
        {
          title: 'Struct key lookup',
          caption:
            'A struct of comparable fields is a valid map key, so k2 finds the value stored under the equal k1.',
          focus: ['m := map[Key]int{}'],
          state: [{ k: 'm[k2]', v: '10' }],
        },
        {
          title: 'Struct equality',
          caption:
            'k1 == k2 compares every field, and since ID and Name both match the result is true.',
          focus: ['fmt.Println(k1 == k2)'],
          state: [{ k: 'k1 == k2', v: 'true' }],
        },
        {
          title: 'Arrays are comparable',
          caption:
            'Fixed-size arrays of comparable elements compare element-by-element, so x == y is true.',
          focus: ['fmt.Println(x == y)'],
          state: [{ k: 'x == y', v: 'true' }],
        },
        {
          title: 'Slices only vs nil',
          caption:
            'A slice cannot be compared to another slice; the only legal comparison is s == nil.',
          focus: ['fmt.Println(s == nil)'],
          state: [{ k: 's == nil', v: 'true' }],
        },
      ],
    },
    {
      id: 'go-types-conv-vs-assert',
      title: 'Type conversion T(x) versus type assertion x.(T)',
      difficulty: 'Medium',
      tags: ['conversion', 'assertion', 'interface', 'type-switch'],
      summary:
        'T(x) reinterprets a concrete value at compile time; x.(T) extracts the dynamic type out of an interface at runtime.',
      pattern: 'Convert vs assert',
      visual:
        'T(x) changes representation between related types; x.(T) unwraps an interface, with comma-ok to avoid a panic.',
      memorize:
        'T(x) = convert concrete (compile-time). x.(T) = assert interface (runtime, use comma-ok).',
      scene:
        'Two different doors: conversion relabels a box you already hold, while assertion opens a mystery interface box and checks the contents before trusting them.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar i int = 65\n\tf := float64(i)\n\ts := string(rune(i))\n\tfmt.Println(f, s)\n\n\tvar any interface{} = "hello"\n\tif str, ok := any.(string); ok {\n\t\tfmt.Println("string:", str)\n\t}\n\n\tif n, ok := any.(int); ok {\n\t\tfmt.Println("int:", n)\n\t} else {\n\t\tfmt.Println("not an int")\n\t}\n}\n',
      keyPoints: [
        'Conversion T(x) works on concrete types with compatible representations and is fully checked at compile time.',
        'Assertion x.(T) applies only to interface values and is resolved at RUNTIME against the stored dynamic type.',
        'The single-result form x.(T) panics on mismatch; the comma-ok form v, ok := x.(T) returns false instead.',
        'string(rune(65)) yields "A", not "65" — converting an int to string reads it as a code point, a notorious trap.',
      ],
      walkthrough: [
        {
          title: 'Numeric conversion',
          caption: 'float64(i) reinterprets the int 65 as 65.0 at compile time.',
          focus: ['f := float64(i)'],
          state: [{ k: 'f', v: '65' }],
        },
        {
          title: 'int to string gotcha',
          caption:
            'string(rune(65)) treats 65 as a code point, producing "A" rather than the text "65".',
          focus: ['s := string(rune(i))'],
          state: [{ k: 's', v: 'A' }],
        },
        {
          title: 'Assert with comma-ok',
          caption: 'The interface holds a string, so any.(string) succeeds and ok is true.',
          focus: ['if str, ok := any.(string); ok {'],
          state: [
            { k: 'str', v: 'hello' },
            { k: 'ok', v: 'true' },
          ],
        },
        {
          title: 'Failed assertion',
          caption:
            'any.(int) fails because the dynamic type is string; comma-ok gives false instead of panicking.',
          focus: ['if n, ok := any.(int); ok {'],
          state: [
            { k: 'ok', v: 'false' },
            { k: 'output', v: 'not an int' },
          ],
        },
      ],
    },
    {
      id: 'go-types-composite-literals',
      title: 'Composite literals and zero values across types',
      difficulty: 'Easy',
      tags: ['composite-literal', 'zero-value', 'struct', 'slice'],
      summary:
        'Composite literals build structs, arrays, slices, and maps inline; every type has a usable zero value.',
      pattern: 'Composite literal',
      visual:
        'T{...} builds a value in place; unset fields and freshly declared vars start at the type zero, not garbage.',
      memorize:
        'Zeros: 0, false, "", nil (slice/map/ptr/iface); struct zero = all fields zeroed. No uninitialized garbage.',
      scene:
        'A vending machine that never jams: press any type and out drops a clean default — zeroed number, empty string, nil slice — with no random leftovers.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype User struct {\n\tName string\n\tAge  int\n\tTags []string\n}\n\nfunc main() {\n\tu := User{Name: "Ada"}\n\tfmt.Println(u.Name, u.Age, u.Tags == nil)\n\n\tnums := []int{1, 2, 3}\n\tgrid := [2][2]int{{1, 2}, {3, 4}}\n\tages := map[string]int{"a": 1}\n\tfmt.Println(nums, grid, ages["a"])\n\n\tvar zero User\n\tfmt.Printf("%+v\\n", zero)\n}\n',
      keyPoints: [
        'A composite literal T{...} constructs a value inline; keyed struct fields you omit take their zero value.',
        'Every type has a zero value — 0, false, "", and nil for slices/maps/pointers/interfaces — so declared vars are never garbage.',
        'A nil slice (Tags) behaves like an empty slice for len and range, which is why u.Tags == nil is true yet safe to use.',
        'var zero User zeroes every field recursively, so the struct is immediately usable without any constructor.',
      ],
      walkthrough: [
        {
          title: 'Partial struct literal',
          caption: 'User{Name: "Ada"} sets only Name; Age defaults to 0 and Tags to a nil slice.',
          focus: ['u := User{Name: "Ada"}'],
          state: [
            { k: 'u.Age', v: '0' },
            { k: 'u.Tags == nil', v: 'true' },
          ],
        },
        {
          title: 'Slice, array, map literals',
          caption:
            'Composite literals also build slices, nested arrays, and maps in a single expression.',
          focus: ['grid := [2][2]int{{1, 2}, {3, 4}}'],
          state: [
            { k: 'nums', v: '[1 2 3]' },
            { k: 'ages["a"]', v: '1' },
          ],
        },
        {
          title: 'The zero User',
          caption:
            'var zero User recursively zeroes every field, giving an empty name, 0 age, and nil tags.',
          focus: ['var zero User'],
          state: [{ k: 'zero', v: '{Name: Age:0 Tags:[]}' }],
        },
      ],
    },
  ],
};
