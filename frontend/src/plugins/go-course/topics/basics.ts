import type { GoTopic } from '../types';

export const basics: GoTopic = {
  id: 'basics',
  title: 'Go Fundamentals',
  icon: 'ListOrdered',
  concepts: [
    {
      id: 'go-basics-program',
      title: 'Program structure: package, import, main',
      difficulty: 'Easy',
      tags: ['package', 'import', 'main', 'entry-point'],
      summary:
        'Every Go program is a package; an executable is package main with a func main() entry point.',
      pattern: 'Entry point',
      visual: 'The linker runs func main in package main; imports pull in other packages by path.',
      memorize: 'package main + import + func main() = a runnable program.',
      scene:
        'Think of package main as the front door of a house: the runtime only knocks on main(), and imports are the utilities piped in from other rooms.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\nfunc main() {\n\tgreeting := strings.ToUpper("hello")\n\tfmt.Println(greeting, "go")\n}\n',
      keyPoints: [
        'Only package main with a func main() (no params, no return) builds into an executable; every other package is a library.',
        'Imports are by path, and an imported-but-unused package is a COMPILE error, not a warning.',
        'The file-level package clause must be the first non-comment line; all files in a directory share one package name.',
        'Grouped imports use a parenthesized block; gofmt sorts and groups them for you.',
      ],
      walkthrough: [
        {
          title: 'Declare the package',
          caption:
            'package main marks this as the executable package the linker turns into a binary.',
          focus: ['package main'],
          state: [{ k: 'kind', v: 'executable' }],
        },
        {
          title: 'Import dependencies',
          caption:
            'The grouped import block pulls in fmt and strings by path; both must be used or it will not compile.',
          focus: ['import (', '"strings"'],
          state: [{ k: 'used', v: 'fmt, strings' }],
        },
        {
          title: 'Enter main',
          caption: 'Execution starts at func main; it takes no arguments and returns nothing.',
          focus: ['func main() {'],
          state: [{ k: 'entry', v: 'main' }],
        },
        {
          title: 'Produce output',
          caption: 'Calls into the imported packages compute and print the deterministic result.',
          focus: ['fmt.Println(greeting, "go")'],
          state: [{ k: 'output', v: 'HELLO go' }],
        },
      ],
    },
    {
      id: 'go-basics-vars',
      title: 'Declaring variables: var, :=, and zero values',
      difficulty: 'Easy',
      tags: ['var', 'shortdecl', 'zero-value', 'declaration'],
      summary:
        'var declares anywhere with a zero value default; := is short declaration usable only inside functions.',
      pattern: 'Declaration',
      visual:
        'var gives an explicit-or-inferred type with a zero default; := infers the type and requires a value.',
      memorize: 'var name type = val (or zero) | name := val inside funcs only.',
      scene:
        'var is the formal registration desk (works at package scope, hands you a zero-valued default); := is the fast lane that only opens inside a function and demands you bring a value.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\nvar pi = 3.14\n\nfunc main() {\n\tvar count int\n\tvar name string\n\tvar ok bool\n\n\tsum := count + 5\n\n\tfmt.Println(count, name == "", ok)\n\tfmt.Println(sum, pi)\n}\n',
      keyPoints: [
        'A declared variable with no initializer gets its type zero value: 0, "", false, or nil — never garbage.',
        ':= is short declaration and works ONLY inside a function; package-level declarations must use var.',
        ':= requires at least one NEW variable on the left; reusing all existing names is a "no new variables" error.',
        'An unused local variable is a compile error, so every := and var inside a function must be read.',
      ],
      walkthrough: [
        {
          title: 'Package-level var',
          caption:
            'var at file scope declares pi with an inferred float64 type; := is not allowed here.',
          focus: ['var pi = 3.14'],
          state: [{ k: 'pi', v: '3.14' }],
        },
        {
          title: 'Zero values',
          caption:
            'Declaring without an initializer yields the zero value for each type: 0, "", false.',
          focus: ['var count int', 'var ok bool'],
          state: [
            { k: 'count', v: '0' },
            { k: 'ok', v: 'false' },
          ],
        },
        {
          title: 'Short declaration',
          caption:
            ':= infers the type from the right-hand side and only works inside a function body.',
          focus: ['sum := count + 5'],
          state: [{ k: 'sum', v: '5' }],
        },
        {
          title: 'Observe results',
          caption: 'Printing confirms the zero values and the inferred sum.',
          focus: ['fmt.Println(sum, pi)'],
          state: [{ k: 'output', v: '0 true false / 5 3.14' }],
        },
      ],
    },
    {
      id: 'go-basics-const-iota',
      title: 'Constants and iota enumerations',
      difficulty: 'Medium',
      tags: ['const', 'iota', 'enum', 'untyped'],
      summary:
        'const values are compile-time fixed; iota auto-increments within a const block to build enumerations.',
      pattern: 'iota enum',
      visual:
        'iota starts at 0 and increments by one per ConstSpec line, letting one expression fill a whole block.',
      memorize: 'iota = line index in the const block; blank _ skips, repeated expr auto-fills.',
      scene:
        'A const block is a numbered ticket dispenser: iota prints 0 on the first line and bumps the counter each new line, so one written rule stamps every ticket below it.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype Weekday int\n\nconst (\n\tSunday Weekday = iota\n\tMonday\n\tTuesday\n)\n\nconst (\n\t_  = iota\n\tKB = 1 << (10 * iota)\n\tMB\n)\n\nfunc main() {\n\tfmt.Println(Sunday, Monday, Tuesday)\n\tfmt.Println(KB, MB)\n}\n',
      keyPoints: [
        'iota is reset to 0 at the start of each const block and increments by one for every ConstSpec line, whether or not iota appears on it.',
        "An omitted expression repeats the previous line's expression, which is how iota fills an enum without retyping it.",
        'Untyped constants have arbitrary precision and adapt to context; typed ones like Weekday iota fix the type.',
        'Use the blank identifier _ to skip the 0 value (or any slot) you do not want to name.',
      ],
      walkthrough: [
        {
          title: 'Start the enum',
          caption: 'iota is 0 on the first line, giving Sunday the value 0 with type Weekday.',
          focus: ['Sunday Weekday = iota'],
          state: [{ k: 'Sunday', v: '0' }],
        },
        {
          title: 'Auto-fill by repetition',
          caption:
            'Monday and Tuesday omit the expression, so it repeats and iota advances to 1 then 2.',
          focus: ['Monday', 'Tuesday'],
          state: [
            { k: 'Monday', v: '1' },
            { k: 'Tuesday', v: '2' },
          ],
        },
        {
          title: 'Skip with blank',
          caption:
            'A fresh const block resets iota; the blank line consumes iota 0 so KB is computed at iota 1.',
          focus: ['_  = iota', 'KB = 1 << (10 * iota)'],
          state: [{ k: 'KB', v: '1024' }],
        },
        {
          title: 'Shift powers',
          caption: 'MB repeats the shift expression with iota now 2, giving 1 << 20.',
          focus: ['MB'],
          state: [{ k: 'MB', v: '1048576' }],
        },
      ],
    },
    {
      id: 'go-basics-control-flow',
      title: 'Control flow: if with init, for, switch (no fallthrough)',
      difficulty: 'Easy',
      tags: ['if', 'switch', 'for', 'control-flow'],
      summary:
        'if and switch take an optional init statement; switch cases break implicitly and for is the only loop.',
      pattern: 'Control flow',
      visual:
        'if x := f(); cond scopes x to the branch; switch matches one case then stops unless you write fallthrough.',
      memorize:
        'if init;cond | switch auto-breaks | fallthrough to continue | for is the only loop.',
      scene:
        'A Go switch is a polite queue: each case takes its turn and leaves quietly (no accidental drop-through), and you must explicitly say fallthrough to shove the next one forward.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc classify(n int) string {\n\tif r := n % 2; r == 0 {\n\t\treturn "even"\n\t}\n\treturn "odd"\n}\n\nfunc main() {\n\tfor i := 1; i <= 3; i++ {\n\t\tfmt.Println(i, classify(i))\n\t}\n\n\tswitch x := 2; x {\n\tcase 1:\n\t\tfmt.Println("one")\n\tcase 2:\n\t\tfmt.Println("two")\n\tdefault:\n\t\tfmt.Println("many")\n\t}\n}\n',
      keyPoints: [
        'if and switch accept an init statement (init; cond) whose variables are scoped to that statement and its branches only.',
        'switch cases break automatically — there is NO implicit fall-through; use the explicit fallthrough keyword to continue.',
        'A switch with no expression (switch { }) acts like an if/else-if chain matching the first true case.',
        "for is Go's only loop keyword; parentheses around the condition are not used and braces are always required.",
      ],
      walkthrough: [
        {
          title: 'if with init',
          caption: 'The init r := n % 2 runs first and r is visible only inside this if/else.',
          focus: ['if r := n % 2; r == 0 {'],
          state: [{ k: 'scope(r)', v: 'if only' }],
        },
        {
          title: 'Loop with for',
          caption: 'The single for keyword drives the three-clause loop over 1..3.',
          focus: ['for i := 1; i <= 3; i++ {'],
          state: [{ k: 'i', v: '1..3' }],
        },
        {
          title: 'switch with init',
          caption: 'switch also takes an init; x := 2 is compared against each case.',
          focus: ['switch x := 2; x {'],
          state: [{ k: 'x', v: '2' }],
        },
        {
          title: 'Implicit break',
          caption: 'case 2 matches, prints, and stops — no fall-through into default.',
          focus: ['case 2:'],
          state: [{ k: 'output', v: 'two' }],
        },
      ],
    },
    {
      id: 'go-basics-conversions',
      title: 'Explicit numeric and string/[]byte/[]rune conversions',
      difficulty: 'Medium',
      tags: ['conversion', 'rune', 'byte', 'string'],
      summary:
        'Go never converts types implicitly; T(x) converts numerics and string<->[]byte/[]rune explicitly.',
      pattern: 'Conversion',
      visual:
        'T(x) reinterprets a value; string([]rune) decodes code points while string([]byte) copies raw bytes.',
      memorize:
        'No implicit casts: int(f) truncates | string(rune) is a char | []byte/[]rune round-trip UTF-8.',
      scene:
        'Go is a strict customs officer: nothing crosses the type border without an explicit T(x) stamp, and it warns that string([]rune) reads letters while string([]byte) reads raw bytes.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar f float64 = 9.7\n\ti := int(f)\n\n\ts := "héllo"\n\tbs := []byte(s)\n\trs := []rune(s)\n\n\tfmt.Println(i)\n\tfmt.Println(len(bs), len(rs))\n\tfmt.Println(string(rs[1]))\n\tfmt.Println(string(rune(65)))\n}\n',
      keyPoints: [
        'Go has NO implicit numeric conversion; mixing int and float64 without T(x) is a compile error.',
        'int(f) truncates toward zero (9.7 becomes 9), it does not round.',
        'len(string) counts BYTES, not characters; a multi-byte rune like é makes len([]byte) exceed len([]rune).',
        "string(rune) yields that code point's character, but string(int) for a non-rune int is a vet-flagged gotcha — use strconv.Itoa for digits.",
      ],
      walkthrough: [
        {
          title: 'Numeric truncation',
          caption: 'int(f) explicitly converts and truncates 9.7 toward zero to 9.',
          focus: ['i := int(f)'],
          state: [{ k: 'i', v: '9' }],
        },
        {
          title: 'String to bytes',
          caption: '[]byte(s) copies the raw UTF-8 bytes; the é takes two bytes.',
          focus: ['bs := []byte(s)'],
          state: [{ k: 'len(bs)', v: '6' }],
        },
        {
          title: 'String to runes',
          caption: '[]rune(s) decodes into code points, so length counts characters not bytes.',
          focus: ['rs := []rune(s)'],
          state: [{ k: 'len(rs)', v: '5' }],
        },
        {
          title: 'Rune back to string',
          caption: 'string(rune(65)) converts the code point 65 into its character "A".',
          focus: ['string(rune(65))'],
          state: [{ k: 'output', v: 'A' }],
        },
      ],
    },
    {
      id: 'go-basics-fmt',
      title: 'Formatted I/O with the fmt package (verbs, Sprintf)',
      difficulty: 'Easy',
      tags: ['fmt', 'printf', 'verbs', 'formatting'],
      summary:
        'fmt formats values with verbs: %v general, %d int, %s string, %q quoted, %T type, %+v with field names.',
      pattern: 'Verbs',
      visual:
        'Printf writes to stdout; Sprintf returns the formatted string; each % verb selects a rendering.',
      memorize:
        '%v value | %+v fields | %#v Go-syntax | %d int | %s str | %q quote | %T type | %p ptr.',
      scene:
        "The fmt verbs are a printer's tray of stamps: %v inks a plain value, %+v adds field labels, %#v recreates the Go literal, and %T stamps the type name.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype Point struct {\n\tX, Y int\n}\n\nfunc main() {\n\tp := Point{1, 2}\n\ts := fmt.Sprintf("%d-%s", 42, "go")\n\n\tfmt.Printf("%v\\n", p)\n\tfmt.Printf("%+v\\n", p)\n\tfmt.Printf("%T %q\\n", p, "hi")\n\tfmt.Println(s)\n}\n',
      keyPoints: [
        '%v is the general verb; %+v adds struct field names and %#v prints a Go-syntax representation.',
        'Sprintf returns a formatted string instead of printing, while Printf writes to stdout and Println adds spaces and a newline.',
        "%q double-quotes and escapes a string; %T prints the value's dynamic type; %p prints a pointer address.",
        'A wrong verb prints a %!verb(type=...) error string rather than panicking, so go vet flags format mismatches.',
      ],
      walkthrough: [
        {
          title: 'Build with Sprintf',
          caption: 'Sprintf formats %d and %s into a returned string without printing.',
          focus: ['s := fmt.Sprintf("%d-%s", 42, "go")'],
          state: [{ k: 's', v: '42-go' }],
        },
        {
          title: 'Plain %v',
          caption: '%v renders the struct as its bare values inside braces.',
          focus: ['fmt.Printf("%v\\n", p)'],
          state: [{ k: 'output', v: '{1 2}' }],
        },
        {
          title: 'Labeled %+v',
          caption: '%+v adds the field names to the struct output.',
          focus: ['fmt.Printf("%+v\\n", p)'],
          state: [{ k: 'output', v: '{X:1 Y:2}' }],
        },
        {
          title: 'Type and quote',
          caption: '%T prints the dynamic type and %q wraps the string in escaped quotes.',
          focus: ['fmt.Printf("%T %q\\n", p, "hi")'],
          state: [{ k: 'output', v: 'main.Point "hi"' }],
        },
      ],
    },
  ],
};
