import type { GoTopic } from '../types';

export const structsMethods: GoTopic = {
  id: 'structs-methods',
  title: 'Structs, Methods & Embedding',
  icon: 'Boxes',
  concepts: [
    {
      id: 'go-struct-literals',
      title: 'Struct types and keyed vs positional composite literals',
      difficulty: 'Easy',
      tags: ['structs', 'literals', 'zero-value', 'composite'],
      summary:
        'A struct is a fixed set of named fields; build one with a keyed literal (robust) or a positional literal (fragile).',
      pattern: 'Composite literal',
      visual:
        'Keyed literal names each field and skips the rest (zeroed); positional must list every field in declared order.',
      memorize:
        'Keyed = {Name: x}, order-free, omitted fields zero. Positional = {x, y} must match field order exactly.',
      scene:
        'A struct is a labeled mailbox wall: keyed literals write to boxes by name; positional literals shove letters in left-to-right and break the moment someone adds a slot.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Point struct {\n\tX, Y int\n\tName string\n}\n\nfunc main() {\n\tvar zero Point\n\tkeyed := Point{X: 1, Name: "a"}\n\tpositional := Point{2, 3, "b"}\n\n\tfmt.Println(zero)\n\tfmt.Println(keyed)\n\tfmt.Printf("%+v\\n", positional)\n}\n',
      keyPoints: [
        'The zero value of a struct has every field set to its own zero (0, "", nil) with no explicit initialization needed.',
        'A keyed literal may omit fields (they stay zero) and is immune to reordering or added fields; a positional literal must supply every field in declared order.',
        'Adding a new field breaks every positional literal at compile time, which is exactly why keyed literals are the idiomatic default.',
        'Struct values are copied on assignment and when passed to functions — the whole field block is duplicated, not shared.',
      ],
      walkthrough: [
        {
          title: 'Zero value',
          caption:
            'Declaring with var and no initializer gives every field its zero value: ints 0 and the string empty.',
          focus: ['var zero Point'],
          state: [{ k: 'zero', v: '{0 0 }' }],
        },
        {
          title: 'Keyed literal',
          caption:
            'The keyed form sets only X and Name; Y is omitted and stays 0, and field order in the literal does not matter.',
          focus: ['Point{X: 1, Name: "a"}'],
          state: [{ k: 'keyed', v: '{1 0 a}' }],
        },
        {
          title: 'Positional literal',
          caption:
            'The positional form must list all three fields in declared order X, Y, Name — omitting one is a compile error.',
          focus: ['Point{2, 3, "b"}'],
          state: [{ k: 'positional', v: '{2 3 b}' }],
        },
        {
          title: 'Verbose print',
          caption:
            '%+v prints field names alongside values, confirming which slot each positional value landed in.',
          focus: ['%+v'],
          state: [{ k: 'output', v: '{X:2 Y:3 Name:b}' }],
        },
      ],
    },
    {
      id: 'go-struct-methods',
      title: 'Methods on defined types and the receiver',
      difficulty: 'Easy',
      tags: ['methods', 'receiver', 'defined-types'],
      summary:
        'A method is a function with a receiver parameter bound to a type you defined in this package.',
      pattern: 'Method receiver',
      visual:
        'func (r Type) Name() is just func Name(r Type) with the receiver moved before the name so you can call r.Name().',
      memorize:
        'Method = receiver-first function. You can only add methods to types DEFINED in your own package.',
      scene:
        'The receiver is the "self" pinned in front of the function name; the compiler quietly turns c.Area() into Area(c).',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Celsius float64\n\nfunc (c Celsius) Fahrenheit() float64 {\n\treturn float64(c)*9/5 + 32\n}\n\ntype Rect struct{ W, H int }\n\nfunc (r Rect) Area() int {\n\treturn r.W * r.H\n}\n\nfunc main() {\n\tc := Celsius(100)\n\tfmt.Println(c.Fahrenheit())\n\n\tr := Rect{W: 3, H: 4}\n\tfmt.Println(r.Area())\n}\n',
      keyPoints: [
        'A method is a function whose receiver appears in parentheses before the name; the receiver type must be defined in the same package as the method.',
        'You cannot attach a method to a type from another package (like int or time.Time) — define your own named type over it first, as with Celsius.',
        'Receivers work on any defined type, not just structs: Celsius over float64 gets a Fahrenheit method the same way Rect does.',
        'Method dispatch in Go is static — c.Fahrenheit() is resolved at compile time from the receiver type, there is no vtable lookup for concrete types.',
      ],
      walkthrough: [
        {
          title: 'Method on a non-struct',
          caption:
            'Celsius is a defined type over float64, so it can carry a method; the receiver c is the temperature value itself.',
          focus: ['func (c Celsius) Fahrenheit() float64 {'],
          state: [{ k: 'receiver', v: 'c Celsius' }],
        },
        {
          title: 'Method on a struct',
          caption: 'Rect gets an Area method; inside it, r.W and r.H read the receiver’s fields.',
          focus: ['func (r Rect) Area() int {'],
          state: [{ k: 'body', v: 'r.W * r.H' }],
        },
        {
          title: 'Call the temperature method',
          caption: 'c.Fahrenheit() converts 100C, computing 100*9/5+32 = 212.',
          focus: ['c.Fahrenheit()'],
          state: [{ k: 'output', v: '212' }],
        },
        {
          title: 'Call the area method',
          caption: 'r.Area() multiplies the receiver fields 3*4 to give 12.',
          focus: ['r.Area()'],
          state: [{ k: 'output', v: '12' }],
        },
      ],
    },
    {
      id: 'go-struct-receivers',
      title: 'Value vs pointer receivers and method sets',
      difficulty: 'Medium',
      tags: ['receiver', 'pointer', 'method-set', 'mutation'],
      summary:
        'A value receiver operates on a copy; a pointer receiver can mutate the original and defines the pointer method set.',
      pattern: 'Pointer receiver',
      visual:
        'Value receiver copies the struct; pointer receiver shares its address so writes persist after the call returns.',
      memorize:
        'Mutate or big struct -> pointer receiver. Addressable value auto-takes &v; method set of T excludes pointer methods.',
      scene:
        'A value receiver is a photocopy you scribble on and throw away; a pointer receiver is the original document you edit in place.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Counter struct{ n int }\n\nfunc (c Counter) IncCopy() {\n\tc.n++\n}\n\nfunc (c *Counter) Inc() {\n\tc.n++\n}\n\nfunc main() {\n\tc := Counter{}\n\tc.IncCopy()\n\tfmt.Println(c.n)\n\n\tc.Inc()\n\tc.Inc()\n\tfmt.Println(c.n)\n}\n',
      keyPoints: [
        'A value receiver gets a copy, so mutations inside it are lost; a pointer receiver shares the address, so mutations persist — IncCopy is a no-op while Inc sticks.',
        'On an addressable value, Go auto-takes the address: c.Inc() is rewritten to (&c).Inc(), which is why calling a pointer method on a variable just works.',
        'The method set of T contains only value-receiver methods, but the method set of *T contains both — this is what decides which type satisfies an interface.',
        'The classic gotcha: a pointer method is NOT in a value’s method set for interface satisfaction, so a Counter value cannot satisfy an interface whose method has a pointer receiver.',
        'Pick one receiver kind per type for consistency; use pointers when you mutate or when copying the struct is expensive.',
      ],
      walkthrough: [
        {
          title: 'Value receiver mutates a copy',
          caption:
            'IncCopy increments c.n on a copy of the struct; the caller’s value is untouched.',
          focus: ['func (c Counter) IncCopy() {'],
          state: [{ k: 'c.n after IncCopy', v: '0' }],
        },
        {
          title: 'Pointer receiver mutates the original',
          caption:
            'Inc has a *Counter receiver, so c.n++ writes through the pointer to the caller’s struct.',
          focus: ['func (c *Counter) Inc() {'],
          state: [{ k: 'receiver', v: '*Counter' }],
        },
        {
          title: 'Auto-address on call',
          caption:
            'c is addressable, so c.Inc() is sugar for (&c).Inc(); two calls raise n from 0 to 2.',
          focus: ['c.Inc()'],
          state: [{ k: 'c.n after 2x Inc', v: '2' }],
        },
        {
          title: 'Observe the difference',
          caption:
            'The two prints show 0 then 2 — proof that only the pointer receiver’s writes survived.',
          focus: ['fmt.Println(c.n)'],
          state: [{ k: 'output', v: '0 then 2' }],
        },
      ],
    },
    {
      id: 'go-struct-embedding',
      title: 'Embedding: promoted fields and methods, composition over inheritance',
      difficulty: 'Medium',
      tags: ['embedding', 'composition', 'promotion', 'methods'],
      summary:
        'Embed a type by declaring it without a field name; its fields and methods are promoted onto the outer struct.',
      pattern: 'Embedding',
      visual:
        'An anonymous field forwards field/method access one level up, but the inner value is still reachable by its type name.',
      memorize:
        'Embed = anonymous field. Fields/methods promote up. It is composition, NOT inheritance: no override, no polymorphism.',
      scene:
        'Embedding staples a component into a bigger machine: you can press the inner buttons from the outside, but you can also open the panel and reach the component directly by name.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Engine struct{ HP int }\n\nfunc (e Engine) Start() string {\n\treturn fmt.Sprintf("vroom %d", e.HP)\n}\n\ntype Car struct {\n\tEngine\n\tName string\n}\n\nfunc main() {\n\tc := Car{Engine: Engine{HP: 200}, Name: "GT"}\n\n\tfmt.Println(c.HP)\n\tfmt.Println(c.Start())\n\tfmt.Println(c.Engine.HP)\n}\n',
      keyPoints: [
        'An embedded field is written as just a type name with no field name; Car embeds Engine, so Engine’s HP field and Start method are promoted onto Car.',
        'Promotion is a forwarding convenience, not inheritance: c.Start() really calls Engine.Start with the embedded Engine as receiver — there is no virtual dispatch or override.',
        'The inner value is still addressable by its type name, so c.Engine.HP reaches it explicitly and a shallower outer field of the same name would shadow the promoted one.',
        'If the outer type declares its own method with the same name, it wins over the promoted one — this is shadowing, not overriding, and only affects name resolution.',
      ],
      walkthrough: [
        {
          title: 'Declare the embedded field',
          caption:
            'Car embeds Engine by naming the type with no field name, so Engine’s members become promoted candidates.',
          focus: ['type Car struct {'],
          state: [{ k: 'embedded', v: 'Engine' }],
        },
        {
          title: 'Access a promoted field',
          caption: 'c.HP resolves to the embedded Engine’s HP without naming Engine, printing 200.',
          focus: ['fmt.Println(c.HP)'],
          state: [{ k: 'c.HP', v: '200' }],
        },
        {
          title: 'Call a promoted method',
          caption:
            'c.Start() forwards to Engine.Start with the embedded Engine as receiver, printing "vroom 200".',
          focus: ['c.Start()'],
          state: [{ k: 'output', v: 'vroom 200' }],
        },
        {
          title: 'Reach the inner value explicitly',
          caption:
            'The embedded value is still named by its type, so c.Engine.HP reads it directly.',
          focus: ['c.Engine.HP'],
          state: [{ k: 'c.Engine.HP', v: '200' }],
        },
      ],
    },
    {
      id: 'go-struct-tags',
      title: 'Struct tags and encoding/json field control',
      difficulty: 'Medium',
      tags: ['tags', 'json', 'encoding', 'reflection'],
      summary:
        'A struct tag is a string of metadata read via reflection; encoding/json uses it to rename, omit, and skip fields.',
      pattern: 'Struct tags',
      visual:
        'json:"name,omitempty" renames the JSON key, drops the field when empty, and json:"-" skips it entirely.',
      memorize:
        'Backtick tag `json:"key,omitempty"`. omitempty drops zero values; "-" excludes; only EXPORTED fields marshal.',
      scene:
        'Tags are sticky notes on each field that only the json librarian reads: one says "call me id", one says "hide me if empty", one says "do not file me at all".',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"encoding/json"\n\t"fmt"\n)\n\ntype User struct {\n\tID    int    `json:"id"`\n\tName  string `json:"name,omitempty"`\n\tToken string `json:"-"`\n}\n\nfunc main() {\n\tu := User{ID: 7, Token: "secret"}\n\tb, _ := json.Marshal(u)\n\tfmt.Println(string(b))\n}\n',
      keyPoints: [
        'A struct tag is a raw string literal after the field type; encoding/json reads the json key to control marshaling — the compiler itself ignores tags.',
        'json:"id" renames the output key; omitempty drops the field when it holds its zero value, so an empty Name disappears from the JSON.',
        'json:"-" excludes a field entirely — the standard way to keep secrets like Token out of serialized output.',
        'Only EXPORTED (capitalized) fields are marshaled at all; a lowercase field is invisible to encoding/json regardless of any tag, which is a frequent gotcha.',
        'Tags must use back-quoted raw strings with the exact `key:"value"` grammar; a stray space or wrong quote silently makes the tag unparseable.',
      ],
      walkthrough: [
        {
          title: 'Tag the fields',
          caption:
            'Each field carries a json tag: id renames, name adds omitempty, and Token is excluded with "-".',
          focus: ['`json:"name,omitempty"`'],
          state: [{ k: 'Name tag', v: 'name,omitempty' }],
        },
        {
          title: 'omitempty drops the empty Name',
          caption:
            'u leaves Name at its zero value "", so omitempty removes the name key from the output.',
          focus: ['User{ID: 7, Token: "secret"}'],
          state: [{ k: 'Name', v: 'omitted' }],
        },
        {
          title: 'Token is skipped',
          caption:
            'Despite holding "secret", Token has json:"-" so it never appears in the marshaled bytes.',
          focus: ['`json:"-"`'],
          state: [{ k: 'Token', v: 'excluded' }],
        },
        {
          title: 'Marshal the result',
          caption: 'json.Marshal produces only the renamed id key, printing {"id":7}.',
          focus: ['json.Marshal(u)'],
          state: [{ k: 'output', v: '{"id":7}' }],
        },
      ],
    },
    {
      id: 'go-struct-method-values',
      title: 'Method values versus method expressions',
      difficulty: 'Medium',
      tags: ['methods', 'closures', 'first-class', 'binding'],
      summary:
        'A method value binds the receiver now into a closure; a method expression leaves the receiver as the first argument.',
      pattern: 'Method value',
      visual:
        'r.Method yields a func with r captured; Type.Method yields a func whose first parameter IS the receiver.',
      memorize:
        'Method VALUE r.M -> receiver baked in. Method EXPRESSION T.M -> receiver becomes arg 0. Value snapshots r at bind time.',
      scene:
        'A method value is a pre-loaded slingshot with the receiver already in the pouch; a method expression is the bare slingshot that still expects you to hand it the receiver each shot.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Adder struct{ base int }\n\nfunc (a Adder) Add(x int) int {\n\treturn a.base + x\n}\n\nfunc main() {\n\ta := Adder{base: 10}\n\n\tvalue := a.Add\n\tfmt.Println(value(5))\n\n\texpr := Adder.Add\n\tfmt.Println(expr(a, 5))\n\n\ta.base = 100\n\tfmt.Println(value(5))\n}\n',
      keyPoints: [
        'A method value like a.Add binds the receiver into a closure at the moment of expression, giving a func(int) int with a already captured.',
        'A method expression like Adder.Add is unbound: it yields a func(Adder, int) int whose first argument is the receiver you must pass explicitly.',
        'The gotcha: a value receiver is snapshotted at bind time, so mutating a.base after taking value does NOT change what value sees — it still holds base 10.',
        'With a pointer receiver the method value would capture the pointer, so later mutations WOULD be visible — the copy-vs-share distinction carries over to method values.',
        'Both forms make methods first-class, letting you pass them where a plain func is expected without wrapping them in a lambda.',
      ],
      walkthrough: [
        {
          title: 'Bind a method value',
          caption:
            'a.Add captures the receiver a into a closure, producing value with signature func(int) int.',
          focus: ['value := a.Add'],
          state: [{ k: 'value(5)', v: '15' }],
        },
        {
          title: 'Take a method expression',
          caption:
            'Adder.Add is unbound; expr has signature func(Adder, int) int and needs the receiver as arg 0.',
          focus: ['expr := Adder.Add'],
          state: [{ k: 'expr(a, 5)', v: '15' }],
        },
        {
          title: 'Mutate the original receiver',
          caption:
            'Setting a.base to 100 changes the variable, but value already snapshotted a copy with base 10.',
          focus: ['a.base = 100'],
          state: [{ k: 'a.base', v: '100' }],
        },
        {
          title: 'Snapshot proves the copy',
          caption:
            'value(5) still returns 15 because the value receiver was captured by copy at bind time, not re-read.',
          focus: ['fmt.Println(value(5))'],
          state: [{ k: 'output', v: '15' }],
        },
      ],
    },
  ],
};
