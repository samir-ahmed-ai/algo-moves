import type { GoTopic } from '../types';

export const interfacesBasics: GoTopic = {
  id: 'interfaces-basics',
  title: 'Interfaces (Basics)',
  icon: 'Link',
  concepts: [
    {
      id: 'go-ib-satisfaction',
      title: 'Implicit interface satisfaction (no implements keyword)',
      difficulty: 'Easy',
      tags: ['interfaces', 'structural', 'satisfaction', 'duck-typing'],
      summary:
        'A type satisfies an interface just by having its methods — you never declare the intent.',
      pattern: 'Structural typing',
      visual:
        'The compiler checks the method set at the assignment point; the type never names the interface.',
      memorize:
        'Have the methods, satisfy the interface — no implements, no import of the interface.',
      scene:
        'A key that happens to fit the lock opens it; the key was never told which door it belongs to.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Speaker interface {\n\tSpeak() string\n}\n\ntype Dog struct{ name string }\n\nfunc (d Dog) Speak() string {\n\treturn d.name + " says woof"\n}\n\nfunc announce(s Speaker) {\n\tfmt.Println(s.Speak())\n}\n\nfunc main() {\n\td := Dog{name: "Rex"}\n\tannounce(d)\n}\n',
      keyPoints: [
        'Satisfaction is structural: any type whose method set includes Speak() string IS a Speaker, no declaration needed.',
        'Dog never imports or mentions Speaker, so the interface can be defined in a completely separate package.',
        'Idiomatic Go defines interfaces on the consumer side, not the producer — accept interfaces, return structs.',
        'The compiler verifies satisfaction at the assignment/pass point, so a missing method is a compile-time error.',
      ],
      walkthrough: [
        {
          title: 'Declare the contract',
          caption:
            'Speaker names one method; any type providing it will satisfy the interface implicitly.',
          focus: ['type Speaker interface {'],
          state: [{ k: 'requires', v: 'Speak() string' }],
        },
        {
          title: 'Implement the method',
          caption:
            'Dog gets a Speak method — it never mentions Speaker but now structurally matches it.',
          focus: ['func (d Dog) Speak() string {'],
          state: [{ k: 'Dog satisfies', v: 'Speaker' }],
        },
        {
          title: 'Pass by interface',
          caption:
            'announce takes a Speaker; passing a Dog compiles because Dog has the required method.',
          focus: ['func announce(s Speaker) {'],
          state: [{ k: 'output', v: 'Rex says woof' }],
        },
      ],
    },
    {
      id: 'go-ib-any',
      title: 'The empty interface and the any alias',
      difficulty: 'Easy',
      tags: ['interfaces', 'any', 'empty-interface', 'generics'],
      summary: 'interface{} has zero methods so every type satisfies it; any is its 1.18 alias.',
      pattern: 'any / interface{}',
      visual:
        'Zero required methods means the empty set is a subset of every method set — all types fit.',
      memorize:
        'any == interface{}; holds anything but you must assert to get the concrete value back.',
      scene:
        'A cardboard box labelled "misc" — literally anything fits, but you must open it to learn what is inside.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc describe(v any) {\n\tfmt.Printf("%v is a %T\\n", v, v)\n}\n\nfunc main() {\n\tvar box any\n\tbox = 42\n\tdescribe(box)\n\tbox = "hi"\n\tdescribe(box)\n\tbox = []int{1, 2}\n\tdescribe(box)\n}\n',
      keyPoints: [
        'interface{} has an empty method set, so every value in Go satisfies it — including other interfaces.',
        'any is a pure alias for interface{} added in Go 1.18; they are identical types, not two things.',
        'An any value carries both a type and a value word; %T prints the dynamic type at runtime.',
        'You cannot call methods or operators on an any directly — you must type-assert or type-switch first.',
      ],
      walkthrough: [
        {
          title: 'Accept anything',
          caption:
            'describe takes any, so callers may pass an int, a string, or a slice without conversion.',
          focus: ['func describe(v any) {'],
          state: [{ k: 'param type', v: 'any' }],
        },
        {
          title: 'Store an int',
          caption:
            'Assigning 42 to an any box wraps the int in an interface value carrying its type.',
          focus: ['box = 42'],
          state: [{ k: 'output', v: '42 is a int' }],
        },
        {
          title: 'Reassign a string',
          caption:
            'The same variable now holds a string; the dynamic type changes with each assignment.',
          focus: ['box = "hi"'],
          state: [{ k: 'output', v: 'hi is a string' }],
        },
        {
          title: 'Reassign a slice',
          caption: 'Even composite types fit any; %T reports the concrete []int type.',
          focus: ['box = []int{1, 2}'],
          state: [{ k: 'output', v: '[1 2] is a []int' }],
        },
      ],
    },
    {
      id: 'go-ib-assertion',
      title: 'Type assertion with the comma-ok form',
      difficulty: 'Easy',
      tags: ['interfaces', 'assertion', 'comma-ok', 'panic'],
      summary:
        'x.(T) extracts the concrete type; the two-value form returns ok instead of panicking.',
      pattern: 'Type assertion',
      visual:
        'The runtime compares the interface header type word to T and either returns it or reports failure.',
      memorize: 'v, ok := x.(T) is safe; single-value x.(T) PANICS on mismatch.',
      scene:
        'Asking the misc box "are you a string?" — the polite comma-ok form answers yes/no; the blunt form throws a tantrum if wrong.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar x any = "hello"\n\n\tif s, ok := x.(string); ok {\n\t\tfmt.Println("string of len", len(s))\n\t}\n\n\tn, ok := x.(int)\n\tfmt.Println("int?", n, ok)\n\n\ts := x.(string)\n\tfmt.Println("forced:", s)\n}\n',
      keyPoints: [
        'The comma-ok form v, ok := x.(T) never panics: ok is false and v is the zero value on mismatch.',
        'The single-value form s := x.(string) panics with an interface-conversion error if the dynamic type differs.',
        'Asserting to an interface type checks whether the dynamic type implements it, not that it equals it.',
        'Asserting on a nil interface always fails (ok=false) rather than panicking in the comma-ok form.',
      ],
      walkthrough: [
        {
          title: 'Safe match',
          caption:
            'x holds a string, so the comma-ok assertion succeeds and s is usable inside the if.',
          focus: ['if s, ok := x.(string); ok {'],
          state: [{ k: 'ok', v: 'true' }],
        },
        {
          title: 'Safe mismatch',
          caption:
            'Asserting to int fails gracefully: n is the zero value 0 and ok is false, no panic.',
          focus: ['n, ok := x.(int)'],
          state: [{ k: 'output', v: 'int? 0 false' }],
        },
        {
          title: 'Forced assertion',
          caption:
            'The single-value form works here only because x really is a string; a wrong type would panic.',
          focus: ['s := x.(string)'],
          state: [{ k: 'output', v: 'forced: hello' }],
        },
      ],
    },
    {
      id: 'go-ib-type-switch',
      title: 'The type switch',
      difficulty: 'Easy',
      tags: ['interfaces', 'type-switch', 'assertion', 'control-flow'],
      summary:
        'switch v := x.(type) branches on the dynamic type, binding v to the matched concrete type per case.',
      pattern: 'Type switch',
      visual:
        'One assertion drives many cases; the bound variable takes the specific type inside each branch.',
      memorize:
        'switch v := x.(type) { case int: ... } — v is typed per case, default catches the rest.',
      scene:
        'A sorting machine that reads each parcel’s label and drops it down the matching chute, with one chute for unknowns.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc classify(x any) string {\n\tswitch v := x.(type) {\n\tcase int:\n\t\treturn fmt.Sprintf("int doubled: %d", v*2)\n\tcase string:\n\t\treturn fmt.Sprintf("string len: %d", len(v))\n\tcase bool:\n\t\treturn fmt.Sprintf("bool: %t", v)\n\tdefault:\n\t\treturn fmt.Sprintf("unknown: %T", v)\n\t}\n}\n\nfunc main() {\n\tfmt.Println(classify(21))\n\tfmt.Println(classify("go"))\n\tfmt.Println(classify(3.14))\n}\n',
      keyPoints: [
        'In switch v := x.(type), v is re-typed to the concrete type of each single-type case, so v*2 and len(v) type-check.',
        'A case listing multiple types (case int, int64:) leaves v as the original interface type, not a single concrete type.',
        'default handles any dynamic type you did not enumerate — a common place to fall back on %T.',
        'Type switches are the idiomatic way to branch on dynamic type; prefer them over chains of comma-ok assertions.',
      ],
      walkthrough: [
        {
          title: 'Bind the dynamic type',
          caption:
            'The type switch asserts once; v will take on the concrete type of whichever case matches.',
          focus: ['switch v := x.(type) {'],
          state: [{ k: 'binds', v: 'v per case' }],
        },
        {
          title: 'Int case',
          caption: 'Passing 21 matches case int, where v is an int so arithmetic v*2 is legal.',
          focus: ['case int:'],
          state: [{ k: 'output', v: 'int doubled: 42' }],
        },
        {
          title: 'String case',
          caption: 'A string argument lands in case string, where v is a string so len(v) works.',
          focus: ['case string:'],
          state: [{ k: 'output', v: 'string len: 2' }],
        },
        {
          title: 'Default case',
          caption: 'A float64 matches no enumerated case, so default reports its type via %T.',
          focus: ['default:'],
          state: [{ k: 'output', v: 'unknown: float64' }],
        },
      ],
    },
    {
      id: 'go-ib-nil-interface',
      title: 'The typed-nil-in-an-interface trap',
      difficulty: 'Medium',
      tags: ['interfaces', 'nil', 'gotcha', 'pointers'],
      summary:
        'An interface holding a nil pointer is NOT itself nil — it carries a type, so == nil is false.',
      pattern: 'Typed nil',
      visual:
        'An interface is a (type, value) pair; nil only when BOTH halves are nil, not when the value is a nil pointer.',
      memorize: 'nil *T stored in an interface makes iface != nil — the type word is still set.',
      scene:
        'An empty envelope still has a return address on it — the envelope is not "nothing" just because it holds nothing.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype myErr struct{}\n\nfunc (e *myErr) Error() string {\n\treturn "boom"\n}\n\nfunc bad() error {\n\tvar p *myErr = nil\n\treturn p\n}\n\nfunc main() {\n\terr := bad()\n\tfmt.Println(err == nil)\n\tfmt.Printf("%T\\n", err)\n}\n',
      keyPoints: [
        'An interface value equals nil only when both its type word AND value word are nil.',
        'Returning a nil concrete pointer as an interface sets the type word, so the interface is NOT nil.',
        'The classic bug: return a typed nil error and callers checking err != nil see it as a real error.',
        'Fix by returning a literal nil (return nil) instead of a nil-valued typed variable.',
      ],
      walkthrough: [
        {
          title: 'A nil pointer',
          caption:
            'p is a nil *myErr; the pointer itself is nil but it still has the concrete type *myErr.',
          focus: ['var p *myErr = nil'],
          state: [{ k: 'p', v: 'nil *myErr' }],
        },
        {
          title: 'Return as interface',
          caption:
            'Returning p converts it to error, packing the type *myErr alongside the nil value word.',
          focus: ['return p'],
          state: [{ k: 'iface type', v: '*myErr' }],
        },
        {
          title: 'The surprising compare',
          caption:
            'err carries a non-nil type word, so err == nil is false even though the pointer is nil.',
          focus: ['fmt.Println(err == nil)'],
          state: [{ k: 'output', v: 'false' }],
        },
        {
          title: 'Proof of the type word',
          caption:
            '%T confirms the interface still holds the *myErr type — the source of the trap.',
          focus: ['fmt.Printf("%T\\n", err)'],
          state: [{ k: 'output', v: '*main.myErr' }],
        },
      ],
    },
    {
      id: 'go-ib-stringer-error',
      title: 'Implementing the Stringer and error interfaces',
      difficulty: 'Easy',
      tags: ['interfaces', 'stringer', 'error', 'fmt'],
      summary:
        'Define String() to control %v/Println output and Error() to make a type usable as an error.',
      pattern: 'Stringer / error',
      visual:
        'fmt checks at runtime whether the value implements Stringer or error and calls that method for output.',
      memorize: 'String() string => custom print; Error() string => it IS an error.',
      scene:
        'Two tiny name-tag methods: one tells fmt how to print you, the other tells Go you are a failure worth reporting.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\ntype Point struct{ x, y int }\n\nfunc (p Point) String() string {\n\treturn fmt.Sprintf("(%d,%d)", p.x, p.y)\n}\n\ntype NotFound struct{ id int }\n\nfunc (e NotFound) Error() string {\n\treturn fmt.Sprintf("id %d not found", e.id)\n}\n\nfunc main() {\n\tp := Point{1, 2}\n\tfmt.Println(p)\n\n\tvar err error = NotFound{id: 7}\n\tfmt.Println(err)\n}\n',
      keyPoints: [
        'Implementing String() string satisfies fmt.Stringer, and fmt uses it automatically for %v, %s, and Println.',
        'Implementing Error() string satisfies the built-in error interface, so the type can be returned as an error.',
        'Both interfaces are single-method contracts satisfied implicitly — no explicit registration with fmt or errors.',
        'Beware infinite recursion: calling fmt with %v on the receiver inside String() re-invokes String() forever.',
      ],
      walkthrough: [
        {
          title: 'Implement Stringer',
          caption:
            'Point gets String(), so it satisfies fmt.Stringer and controls its own printed form.',
          focus: ['func (p Point) String() string {'],
          state: [{ k: 'satisfies', v: 'fmt.Stringer' }],
        },
        {
          title: 'Println uses String',
          caption:
            'fmt.Println detects the Stringer and prints (1,2) instead of the default struct dump.',
          focus: ['fmt.Println(p)'],
          state: [{ k: 'output', v: '(1,2)' }],
        },
        {
          title: 'Implement error',
          caption:
            'NotFound gets Error(), satisfying the built-in error interface so it can be assigned to an error.',
          focus: ['func (e NotFound) Error() string {'],
          state: [{ k: 'satisfies', v: 'error' }],
        },
        {
          title: 'Print the error',
          caption: 'Assigned to an error variable, Println calls Error() to render the message.',
          focus: ['var err error = NotFound{id: 7}'],
          state: [{ k: 'output', v: 'id 7 not found' }],
        },
      ],
    },
  ],
};
