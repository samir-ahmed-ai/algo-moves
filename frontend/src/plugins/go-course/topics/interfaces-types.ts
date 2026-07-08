import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const interfacesTypes: GoTopic = {
  id: 'interfaces-types',
  title: 'Interfaces & Type System',
  icon: 'Shapes',
  concepts: [
    {
      id: 'go-iface-internals',
      title: 'Interface internals: iface, eface, itab',
      difficulty: 'Hard',
      tags: ['interfaces', 'runtime', 'itab', 'dynamic-dispatch', 'memory-layout'],
      summary:
        'How Go represents interface values as two words and dispatches methods via the itab.',
      pattern: 'Interface internals',
      visual:
        'Non-empty iface = (*itab, data); empty eface = (*_type, data); itab caches the method fn pointers.',
      memorize:
        'iface=(itab,data), eface=(type,data); typed-nil in interface is non-nil; dispatch = one indirect call.',
      scene:
        'Picture every interface value as a two-slot locker: left slot holds the type/itab keycard, right slot holds the pointer to the goods. Empty locker (both slots zero) is the only true nil.',
      time: 'O(1) call',
      space: '2 words per value',
      keyPoints: [
        'Non-empty iface = (*itab, data); empty eface = (*_type, data); both are two words with a pointer data slot.',
        'The itab bundles the type descriptor with a fun array of concrete method pointers; dispatch is one indirect call, not a name lookup.',
        'An interface is nil only when BOTH words are nil; typed-nil pointers stored in an interface are non-nil.',
        'The data word is always a pointer since Go 1.4; storing a non-pointer value boxes it (often a heap allocation).',
        'itabs are emitted by the compiler for static pairs or built once and cached by runtime.getitab for dynamic conversions.',
        'The main dispatch costs are lost inlining and boxing allocations, not the indirect call by itself; measure before de-abstracting.',
      ],
      code: 'package main\n\nimport (\n\t"fmt"\n\t"unsafe"\n)\n\n// Speaker is a single-method interface; a non-empty interface value is\n// represented at runtime by a two-word (itab, data) pair.\ntype Speaker interface {\n\tSpeak() string\n}\n\n// Dog has a value receiver, so both Dog and *Dog satisfy Speaker.\ntype Dog struct {\n\tname string\n}\n\nfunc (d Dog) Speak() string { return d.name + " says woof" }\n\n// eface mirrors runtime.eface: the empty-interface header is (type, data).\ntype eface struct {\n\ttyp  unsafe.Pointer\n\tdata unsafe.Pointer\n}\n\nfunc main() {\n\t// A non-empty interface holds an *itab (type + method table).\n\tvar s Speaker = Dog{name: "Rex"}\n\tfmt.Println(s.Speak())\n\n\t// any is an empty interface: its header is exactly two machine words.\n\tvar a any = Dog{name: "Fido"}\n\thdr := (*eface)(unsafe.Pointer(&a))\n\tfmt.Println("eface words:", unsafe.Sizeof(a)/unsafe.Sizeof(uintptr(0)))\n\tfmt.Println("data non-nil:", hdr.data != nil)\n\n\t// A nil concrete pointer stored in an interface makes the interface\n\t// non-nil: the type word is set even though the data word is nil.\n\tvar dp *Dog\n\tvar s2 Speaker = dpToSpeaker(dp)\n\tfmt.Println("interface nil:", s2 == nil)\n}\n\nfunc dpToSpeaker(d *Dog) Speaker {\n\treturn d\n}\n\nfunc (d *Dog) SpeakPtr() string { return "ptr" }\n',
      walkthrough: [
        {
          title: 'Build the itab',
          caption:
            'Assigning a concrete Dog value to a Speaker builds/looks up an itab pairing the Dog type with the interface method set; s becomes two words (itab, data pointer). A Dog is larger than one word, so it is heap-boxed and the data word points to that copy.',
          focus: ['var s Speaker = Dog{name: "Rex"}'],
          state: [
            {
              k: 's.word0',
              v: '*itab(Speaker,Dog)',
            },
            {
              k: 's.word1',
              v: '&Dog{Rex} copy',
            },
            {
              k: 's == nil',
              v: 'false',
            },
          ],
        },
        {
          title: 'Dispatch via itab',
          caption:
            "Calling s.Speak() does a single indirect call: the runtime reads the Speak entry from the itab's function table and calls it with the data word as the receiver.",
          focus: ['s.Speak()'],
          state: [
            {
              k: 'lookup',
              v: 'itab.fun[0]',
            },
            {
              k: 'receiver',
              v: 'Dog{Rex} (value)',
            },
            {
              k: 'prints',
              v: 'Rex says woof',
            },
          ],
        },
        {
          title: 'Empty interface = eface',
          caption:
            'any is the empty interface, so a holds an eface header of exactly two words: a *_type pointer instead of an itab, plus the data pointer.',
          focus: ['var a any = Dog{name: "Fido"}'],
          state: [
            {
              k: 'a.type',
              v: '*_type(Dog)',
            },
            {
              k: 'a.data',
              v: '&Dog{Fido}',
            },
            {
              k: 'kind',
              v: 'eface (no itab)',
            },
          ],
        },
        {
          title: 'Reinterpret header',
          caption:
            'Casting &a through unsafe.Pointer to *eface aliases the same two machine words, letting the program inspect the raw interface header directly.',
          focus: ['hdr := (*eface)(unsafe.Pointer(&a))'],
          state: [
            {
              k: 'hdr.typ',
              v: '== a.type',
            },
            {
              k: 'hdr.data',
              v: '== a.data',
            },
          ],
        },
        {
          title: 'Two-word width',
          caption:
            'sizeof(any) divided by pointer size confirms the interface value is two machine words wide, matching the (type, data) layout.',
          focus: ['unsafe.Sizeof(a)/unsafe.Sizeof(uintptr(0))'],
          state: [
            {
              k: 'Sizeof(a)',
              v: '16 (amd64)',
            },
            {
              k: 'words',
              v: '2',
            },
            {
              k: 'prints',
              v: 'eface words: 2',
            },
          ],
        },
        {
          title: 'Data word non-nil',
          caption:
            'Because the Fido value was boxed into the interface, the data word points at a copy of the Dog, so hdr.data is non-nil.',
          focus: ['hdr.data != nil'],
          state: [
            {
              k: 'hdr.data',
              v: 'non-nil',
            },
            {
              k: 'prints',
              v: 'data non-nil: true',
            },
          ],
        },
        {
          title: 'Typed nil enters',
          caption:
            'dp is a nil *Dog; passing it through dpToSpeaker converts (*Dog)(nil) into a Speaker, setting the itab word (Speaker,*Dog) while leaving the data word nil.',
          focus: ['var dp *Dog', 'return d'],
          state: [
            {
              k: 'dp',
              v: '(*Dog)(nil)',
            },
            {
              k: 's2.itab',
              v: '*itab(Speaker,*Dog)',
            },
            {
              k: 's2.data',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Typed-nil gotcha',
          caption:
            "s2 == nil is false: an interface equals nil only when BOTH words are nil, but s2's itab word is set, so the typed nil pointer makes the interface non-nil.",
          focus: ['s2 == nil'],
          state: [
            {
              k: 'itab word',
              v: 'set',
            },
            {
              k: 'data word',
              v: 'nil',
            },
            {
              k: 'prints',
              v: 'interface nil: false',
            },
          ],
        },
      ],
    },
    {
      id: 'go-iface-nil',
      title: 'The nil interface trap',
      difficulty: 'Hard',
      tags: ['interfaces', 'nil', 'error-handling', 'type-system', 'runtime'],
      summary: 'A typed nil pointer wrapped in an interface is NOT equal to nil.',
      pattern: 'Typed nil',
      visual:
        'An interface value is a (type, value) pair; it equals nil only when BOTH halves are nil.',
      memorize:
        "Interface == nil needs BOTH type AND value nil; a typed nil pointer fills the type slot, so it's non-nil.",
      scene:
        "A gift box labeled '*T' with nothing inside: the label alone makes the guard 'if box == nil' pass right through, and downstream code opens an empty box and panics.",
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n)\n\ntype ValidationError struct {\n\tField string\n}\n\nfunc (e *ValidationError) Error() string {\n\treturn "invalid field: " + e.Field\n}\n\n// Buggy: a concrete typed pointer flows out through the error interface.\n// Even when p is nil, the returned value holds (type=*ValidationError, value=nil).\nfunc validateBuggy(ok bool) error {\n\tvar p *ValidationError\n\tif !ok {\n\t\tp = &ValidationError{Field: "name"}\n\t}\n\treturn p\n}\n\n// Correct: return the interface\'s untyped nil on the success path.\nfunc validateFixed(ok bool) error {\n\tif !ok {\n\t\treturn &ValidationError{Field: "name"}\n\t}\n\treturn nil\n}\n\nfunc main() {\n\tbuggy := validateBuggy(true)\n\tfmt.Printf("buggy: value=%v, isNil=%v\\n", buggy, buggy == nil)\n\n\tfixed := validateFixed(true)\n\tfmt.Printf("fixed: value=%v, isNil=%v\\n", fixed, fixed == nil)\n\n\tvar raw *ValidationError\n\tvar asIface error = raw\n\tfmt.Printf("typed-nil vs untyped nil: %v\\n", asIface == nil)\n\tfmt.Printf("typed-nil vs typed nil:   %v\\n", asIface == error(raw))\n}\n',
      keyPoints: [
        'An interface value is a (type, value) pair and equals nil only when BOTH words are nil.',
        'A typed nil pointer boxed into an interface sets the type word, so `== nil` is false.',
        'Returning a concrete pointer (even nil) through an `error` return leaks a typed nil; always `return nil` literally on success.',
        'The classic symptom is a passed `if err != nil` guard followed by a nil-dereference panic in a pointer-receiver method.',
        'Only reflection (Kind + IsNil) can detect a typed nil at runtime; `== nil`, `%v`, and errors.Is do not.',
        'Prefer structuring code so success paths return the untyped nil; enforce with vet/nilaway rather than defensive reflection.',
      ],
      walkthrough: [
        {
          title: 'main starts',
          caption: 'Execution enters main and calls validateBuggy with ok=true.',
          focus: ['buggy := validateBuggy(true)'],
          state: [
            {
              k: 'ok',
              v: 'true',
            },
          ],
        },
        {
          title: 'declare typed nil pointer',
          caption:
            'Inside validateBuggy, p is declared as a *ValidationError and defaults to a nil pointer.',
          focus: ['var p *ValidationError'],
          state: [
            {
              k: 'p type',
              v: '*ValidationError',
            },
            {
              k: 'p value',
              v: 'nil',
            },
          ],
        },
        {
          title: 'skip the error branch',
          caption:
            'Because ok is true, !ok is false, so the assignment is skipped and p stays a nil pointer.',
          focus: ['if !ok {', 'p = &ValidationError{Field: "name"}'],
          state: [
            {
              k: '!ok',
              v: 'false',
            },
            {
              k: 'p value',
              v: 'nil (unchanged)',
            },
          ],
        },
        {
          title: 'nil pointer boxed into interface',
          caption:
            'Returning p converts the concrete *ValidationError into the error interface, filling the type slot even though the pointer value is nil.',
          focus: ['return p'],
          state: [
            {
              k: 'iface type',
              v: '*ValidationError',
            },
            {
              k: 'iface value',
              v: 'nil',
            },
            {
              k: 'iface header',
              v: '(type set, value nil)',
            },
          ],
        },
        {
          title: 'the nil trap fires',
          caption:
            'buggy == nil is false because the interface holds a non-nil type descriptor even though the wrapped pointer is nil.',
          focus: ['buggy == nil'],
          state: [
            {
              k: 'buggy',
              v: '(*ValidationError)(nil)',
            },
            {
              k: 'buggy == nil',
              v: 'false',
            },
            {
              k: 'printed isNil',
              v: 'false',
            },
          ],
        },
        {
          title: 'the correct pattern',
          caption:
            'validateFixed returns the untyped nil literal on the success path, so no type descriptor is ever placed into the interface and fixed == nil is true.',
          focus: ['return nil'],
          state: [
            {
              k: 'fixed type',
              v: 'nil',
            },
            {
              k: 'fixed value',
              v: 'nil',
            },
            {
              k: 'fixed == nil',
              v: 'true',
            },
          ],
        },
        {
          title: 'reproduce via explicit boxing',
          caption:
            'Assigning a nil *ValidationError into an error variable produces the same typed-nil interface as the buggy path.',
          focus: ['var asIface error = raw'],
          state: [
            {
              k: 'raw',
              v: '(*ValidationError)(nil)',
            },
            {
              k: 'asIface type',
              v: '*ValidationError',
            },
            {
              k: 'asIface value',
              v: 'nil',
            },
          ],
        },
        {
          title: 'two comparisons contrasted',
          caption:
            'asIface == nil is false (untyped nil has no type), but asIface == error(raw) is true because both interfaces share the same type and nil value.',
          focus: ['asIface == nil', 'asIface == error(raw)'],
          state: [
            {
              k: 'asIface == nil',
              v: 'false',
            },
            {
              k: 'asIface == error(raw)',
              v: 'true',
            },
          ],
        },
      ],
    },
    {
      id: 'go-iface-method-sets',
      title: 'Method sets: pointer vs value receivers',
      difficulty: 'Hard',
      tags: ['interfaces', 'method-sets', 'receivers', 'addressability', 'gotchas'],
      summary:
        'Why *T satisfies an interface but T often does not, and where addressability bites.',
      pattern: 'Method sets',
      visual:
        "Value T's set = value-receiver methods only; *T's set = value + pointer methods. Interface satisfaction reads the method set of the exact dynamic type stored.",
      memorize:
        '*T has all methods; T has only value receivers. An interface value stores a type, so its method set must be complete. Map elements are not addressable.',
      scene:
        "A bouncer checks each guest's badge set at the door: the value twin carries half the badges, the pointer twin carries all of them, and the map-clone guest has no pocket to pin a badge to.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype Counter interface {\n\tInc()\n\tValue() int\n}\n\ntype tally struct{ n int }\n\nfunc (t *tally) Inc()       { t.n++ }\nfunc (t *tally) Value() int { return t.n }\n\nfunc main() {\n\tvar c Counter = &tally{}\n\tc.Inc()\n\tc.Inc()\n\tfmt.Println("counter:", c.Value())\n\n\tm := map[string]*tally{"a": {}}\n\tm["a"].Inc()\n\tfmt.Println("map:", m["a"].Value())\n\n\ts := []tally{{}}\n\ts[0].Inc()\n\tfmt.Println("slice:", s[0].Value())\n}\n',
      keyPoints: [
        "Pointer-receiver methods live only in *T's method set; value-receiver methods live in both T and *T.",
        'Auto-addressing lets you call pointer methods on addressable values, but map index expressions and other non-addressable operands break this.',
        'Slice elements are addressable while map elements are not — the classic mutation gotcha.',
        "Embedding follows receiver rules: embedding T by value promotes T's pointer methods only into *S, not S.",
        'A typed nil pointer stored in an interface makes the interface non-nil (type word is set).',
        'Prefer a single consistent receiver kind per type; mixing them causes surprising interface-satisfaction and lock-copy bugs.',
      ],
      walkthrough: [
        {
          title: 'Define method set',
          caption:
            "Both Inc and Value are declared with a pointer receiver (*tally), so they belong to *tally's method set, not tally's.",
          focus: ['func (t *tally) Inc()', 'func (t *tally) Value() int'],
          state: [
            {
              k: '*tally methods',
              v: 'Inc, Value',
            },
            {
              k: 'tally methods',
              v: '(none)',
            },
          ],
        },
        {
          title: 'Assign *tally to interface',
          caption:
            "A *tally is boxed into the Counter interface; because *tally's method set has both Inc and Value, this compiles.",
          focus: ['var c Counter = &tally{}'],
          state: [
            {
              k: 'c dynamic type',
              v: '*tally',
            },
            {
              k: 'tally.n',
              v: '0',
            },
            {
              k: 'assign tally value?',
              v: 'would NOT compile',
            },
          ],
        },
        {
          title: 'Call Inc via interface',
          caption:
            'Two interface method dispatches call the pointer-receiver Inc, mutating the pointed-to tally.',
          focus: ['c.Inc()', 'c.Inc()'],
          state: [
            {
              k: 'c dynamic type',
              v: '*tally',
            },
            {
              k: 'tally.n',
              v: '2',
            },
          ],
        },
        {
          title: 'Read value via interface',
          caption: 'Value() returns the mutated count through the interface; prints "counter: 2".',
          focus: ['c.Value()'],
          state: [
            {
              k: 'tally.n',
              v: '2',
            },
            {
              k: 'output',
              v: 'counter: 2',
            },
          ],
        },
        {
          title: 'Method call on map element',
          caption:
            'm["a"] yields a *tally (a pointer value, not the map slot), so calling the pointer method Inc is legal and mutates the pointee.',
          focus: ['m["a"].Inc()'],
          state: [
            {
              k: 'm["a"] type',
              v: '*tally',
            },
            {
              k: '(*m["a"]).n',
              v: '1',
            },
            {
              k: 'gotcha',
              v: 'map value is a pointer; addressability not needed',
            },
          ],
        },
        {
          title: 'Read from map',
          caption: 'm["a"].Value() dispatches through the pointer and prints "map: 1".',
          focus: ['m["a"].Value()'],
          state: [
            {
              k: '(*m["a"]).n',
              v: '1',
            },
            {
              k: 'output',
              v: 'map: 1',
            },
          ],
        },
        {
          title: 'Value in addressable slice',
          caption:
            's[0] is an addressable slice element, so Go auto-takes its address (&s[0]) to satisfy the pointer receiver Inc, mutating the element in place.',
          focus: ['s[0].Inc()'],
          state: [
            {
              k: 's[0] type',
              v: 'tally (value)',
            },
            {
              k: 'addressable',
              v: 'yes -> &s[0] taken',
            },
            {
              k: 's[0].n',
              v: '1',
            },
          ],
        },
        {
          title: 'The addressability gotcha',
          caption:
            's[0].Value() prints "slice: 1"; the same call on a map[string]tally would fail to compile, because map values are NOT addressable so &m["a"] can\'t be formed for the pointer method.',
          focus: ['s[0].Value()'],
          state: [
            {
              k: 's[0].n',
              v: '1',
            },
            {
              k: 'output',
              v: 'slice: 1',
            },
            {
              k: 'map[string]tally.Inc()',
              v: 'would NOT compile',
            },
          ],
        },
      ],
    },
    {
      id: 'go-iface-embedding',
      title: 'Embedding & composition',
      difficulty: 'Hard',
      tags: ['interfaces', 'embedding', 'composition', 'method-sets', 'decorator'],
      summary:
        'How promotion, overriding, and interface embedding work — and where ambiguity bites.',
      pattern: 'Embedding',
      visual:
        "Outer struct forwards to embedded field's method set unless it declares a same-named method at depth 0.",
      memorize:
        'Promotion is depth-based; shallower wins, same depth ties = ambiguous; embed an interface to decorate.',
      scene:
        "A manager (outer) auto-forwards mail to the intern (embedded) — until the manager stamps their own name on a letter, which then shadows the intern's.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype Logger struct{ prefix string }\n\nfunc (l Logger) Log(msg string) string { return l.prefix + ": " + msg }\n\ntype Service struct {\n\tLogger\n\tname string\n}\n\n// Service overrides the promoted Log method.\nfunc (s Service) Log(msg string) string {\n\treturn s.Logger.Log("[" + s.name + "] " + msg)\n}\n\ntype Handler interface{ Log(msg string) string }\n\n// countingLogger decorates any Handler by embedding the interface.\ntype countingLogger struct {\n\tHandler\n\tcount *int\n}\n\nfunc (c countingLogger) Log(msg string) string {\n\t*c.count++\n\treturn c.Handler.Log(fmt.Sprintf("(#%d) %s", *c.count, msg))\n}\n\nfunc main() {\n\tsvc := Service{Logger: Logger{prefix: "svc"}, name: "auth"}\n\tfmt.Println(svc.Log("start"))\n\n\tn := 0\n\tvar h Handler = countingLogger{Handler: svc, count: &n}\n\tfmt.Println(h.Log("login"))\n\tfmt.Println(h.Log("logout"))\n\tfmt.Println("calls:", n)\n}\n',
      keyPoints: [
        'Method promotion is resolved by depth: the shallowest same-named method wins and shadows deeper ones; two candidates at the same depth are a compile-time ambiguity, not a runtime error.',
        "Promoted methods (and fields) become part of the embedder's method set, so a type can satisfy an interface purely through what it embeds; pointer-embedding promotes pointer-receiver methods to both T and *T.",
        'Go has no super/base call — to reach a shadowed method you must qualify the embedded field (s.Logger.Log); calling the outer method name recurses.',
        'Embedding an interface enables the decorator pattern (override some methods, forward the rest), but an unset embedded interface is nil and panics when a forwarded method is called.',
        'Interface-in-interface embedding is allowed even with overlapping methods as long as signatures are identical (Go 1.14+); conflicting signatures for the same name are rejected.',
        'Embedding auto-forwards new interface methods (survives interface growth) but can silently skip wrapping them; explicit forwarding breaks the build instead, which is sometimes the safer default.',
      ],
      walkthrough: [
        {
          title: 'Embed Logger into Service',
          caption:
            "Service embeds Logger with no field name, so Logger's Log method is promoted to Service at depth 1.",
          focus: ['type Service struct {', '\tLogger'],
          state: [
            {
              k: 'Service methods',
              v: 'Log (promoted, depth 1)',
            },
            {
              k: 'Logger.Log depth',
              v: '1',
            },
          ],
        },
        {
          title: 'Service overrides Log',
          caption:
            'Service declares its own Log at depth 0, which shadows the deeper promoted Logger.Log, so there is no ambiguity when calling Log on a Service.',
          focus: [
            'func (s Service) Log(msg string) string {',
            'return s.Logger.Log("[" + s.name + "] " + msg)',
          ],
          state: [
            {
              k: 'Service.Log depth',
              v: '0 (wins)',
            },
            {
              k: 'Logger.Log depth',
              v: '1 (shadowed)',
            },
          ],
        },
        {
          title: 'Build the Service value',
          caption: 'svc is constructed with an embedded Logger{prefix:"svc"} and name "auth".',
          focus: ['svc := Service{Logger: Logger{prefix: "svc"}, name: "auth"}'],
          state: [
            {
              k: 'svc.name',
              v: 'auth',
            },
            {
              k: 'svc.Logger.prefix',
              v: 'svc',
            },
          ],
        },
        {
          title: 'Call svc.Log("start")',
          caption:
            'Service.Log runs (depth 0 wins), wraps the message as [auth] start, then calls the embedded Logger.Log which prepends the prefix, printing svc: [auth] start.',
          focus: [
            'fmt.Println(svc.Log("start"))',
            'return s.Logger.Log("[" + s.name + "] " + msg)',
          ],
          state: [
            {
              k: 'output',
              v: 'svc: [auth] start',
            },
          ],
        },
        {
          title: 'Embed the Handler interface',
          caption:
            "countingLogger embeds the Handler interface itself, so it satisfies Handler by promoting the wrapped value's Log while overriding it to add behavior — interface embedding as decoration.",
          focus: ['type countingLogger struct {', '\tHandler'],
          state: [
            {
              k: 'embeds',
              v: 'Handler (interface)',
            },
            {
              k: 'decorates',
              v: 'any Handler',
            },
          ],
        },
        {
          title: 'Wrap svc in a decorator',
          caption:
            "h holds a countingLogger whose embedded Handler is svc and whose count points at n; h's static type is the Handler interface.",
          focus: ['var h Handler = countingLogger{Handler: svc, count: &n}'],
          state: [
            {
              k: 'n',
              v: '0',
            },
            {
              k: 'h dynamic type',
              v: 'countingLogger',
            },
            {
              k: 'inner Handler',
              v: 'svc (Service)',
            },
          ],
        },
        {
          title: 'Decorated call: login',
          caption:
            'countingLogger.Log increments the shared counter to 1, then delegates to the embedded svc, whose Service.Log adds [auth] and Logger.Log adds the prefix, printing svc: [auth] (#1) login.',
          focus: ['*c.count++', 'return c.Handler.Log(fmt.Sprintf("(#%d) %s", *c.count, msg))'],
          state: [
            {
              k: 'n',
              v: '1',
            },
            {
              k: 'output',
              v: 'svc: [auth] (#1) login',
            },
          ],
        },
        {
          title: 'Second call + final count',
          caption:
            "The next h.Log bumps the pointer-shared counter to 2, and printing n confirms the decorator mutated the caller's variable.",
          focus: ['fmt.Println(h.Log("logout"))', 'fmt.Println("calls:", n)'],
          state: [
            {
              k: 'n',
              v: '2',
            },
            {
              k: 'output',
              v: 'svc: [auth] (#2) logout',
            },
            {
              k: 'final line',
              v: 'calls: 2',
            },
          ],
        },
      ],
    },
    {
      id: 'go-iface-assertions',
      title: 'Type assertions & type switches',
      difficulty: 'Hard',
      tags: ['interfaces', 'type-assertions', 'type-switch', 'runtime', 'comparability'],
      summary:
        'x.(T) forms, panic vs comma-ok, type switches, interface-to-interface assertions, and comparable dynamic types.',
      pattern: 'Type assertions',
      visual:
        "x.(T) reads x's dynamic type descriptor; one-return panics on mismatch, comma-ok returns (zero,false).",
      memorize:
        'One return panics; comma-ok never does; nil interface always fails an assertion; == on interfaces panics if dynamic types are uncomparable.',
      scene:
        "A bouncer (the assertion) checks a partygoer's ID (dynamic type): single-door lets you in or slams your face (panic); the two-door lets you quietly walk back out (ok=false).",
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"strings"\n)\n\ntype Stringer interface {\n\tString() string\n}\n\ntype Named struct {\n\tName string\n}\n\nfunc (n Named) String() string { return n.Name }\n\nfunc describe(v any) string {\n\tswitch x := v.(type) {\n\tcase nil:\n\t\treturn "nil interface"\n\tcase int:\n\t\treturn fmt.Sprintf("int=%d", x)\n\tcase Stringer:\n\t\treturn "Stringer=" + x.String()\n\tcase io.Reader:\n\t\tbuf := make([]byte, 4)\n\t\tn, _ := x.Read(buf)\n\t\treturn "reader read " + fmt.Sprint(n)\n\tdefault:\n\t\treturn fmt.Sprintf("other %T", x)\n\t}\n}\n\nfunc main() {\n\tvar v any = Named{Name: "go"}\n\tif s, ok := v.(Stringer); ok {\n\t\tfmt.Println("asserted:", s.String())\n\t}\n\n\tif _, ok := v.(int); !ok {\n\t\tfmt.Println("not an int")\n\t}\n\n\tfmt.Println(describe(42))\n\tfmt.Println(describe(Named{Name: "iface"}))\n\tfmt.Println(describe(strings.NewReader("data")))\n\tfmt.Println(describe(nil))\n\n\tvar a any = []int{1, 2}\n\tvar b any = []int{1, 2}\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tfmt.Println("recovered:", r)\n\t\t}\n\t}()\n\tfmt.Println("comparing uncomparable dynamic types")\n\tfmt.Println(a == b)\n}\n',
      keyPoints: [
        'Single-return `x.(T)` panics on mismatch; comma-ok `x, ok := v.(T)` returns (zero, false) instead — use it at trust boundaries.',
        'A nil interface has no dynamic type, so every assertion against it misses (ok=false), never panics.',
        'Asserting to an interface type is a runtime method-set check: it succeeds iff the dynamic type implements that interface.',
        'Type switches match the first applicable case top-to-bottom; ordering matters when concrete and interface cases overlap, and `case nil` catches nil interfaces (fallthrough is illegal).',
        "In a multi-type case the guard variable keeps the switch expression's static type; it narrows to the concrete type only in single-type cases.",
        'Interface `==` is legal at compile time but panics at runtime if both operands share a non-comparable dynamic type (slice, map, func).',
      ],
      walkthrough: [
        {
          title: 'Comma-ok assertion succeeds',
          caption:
            'v holds a Named value whose dynamic type implements Stringer, so the two-result assertion sets ok=true and s to the Named, printing its String().',
          focus: ['var v any = Named{Name: "go"}', 'if s, ok := v.(Stringer); ok {'],
          state: [
            {
              k: 'v dynamic type',
              v: 'main.Named',
            },
            {
              k: 'ok',
              v: 'true',
            },
            {
              k: 's.String()',
              v: '"go"',
            },
          ],
        },
        {
          title: 'Comma-ok assertion fails safely',
          caption:
            'Named is not an int, so the comma-ok form yields ok=false and the zero value for the ignored result instead of panicking.',
          focus: ['if _, ok := v.(int); !ok {', 'fmt.Println("not an int")'],
          state: [
            {
              k: 'v dynamic type',
              v: 'main.Named',
            },
            {
              k: 'assert int ok',
              v: 'false',
            },
            {
              k: 'panic?',
              v: 'no',
            },
          ],
        },
        {
          title: 'Type switch: int case',
          caption:
            'describe(42) binds x to the int 42 in the int case, formatting int=42; case order means int is tested before the broader cases.',
          focus: ['switch x := v.(type) {', 'case int:', 'return fmt.Sprintf("int=%d", x)'],
          state: [
            {
              k: 'arg',
              v: '42',
            },
            {
              k: 'matched case',
              v: 'int',
            },
            {
              k: 'x',
              v: '42',
            },
            {
              k: 'result',
              v: '"int=42"',
            },
          ],
        },
        {
          title: 'Type switch: Stringer case',
          caption:
            'describe(Named{...}) skips nil and int and matches the Stringer interface case because Named implements String(), so x is used as a Stringer.',
          focus: ['case Stringer:', 'return "Stringer=" + x.String()'],
          state: [
            {
              k: 'arg dynamic type',
              v: 'main.Named',
            },
            {
              k: 'matched case',
              v: 'Stringer',
            },
            {
              k: 'result',
              v: '"Stringer=iface"',
            },
          ],
        },
        {
          title: 'Type switch: io.Reader case',
          caption:
            'A *strings.Reader satisfies io.Reader but not Stringer, so it falls to the io.Reader case, reads up to 4 bytes from "data", and reports n=4.',
          focus: ['case io.Reader:', 'n, _ := x.Read(buf)'],
          state: [
            {
              k: 'arg dynamic type',
              v: '*strings.Reader',
            },
            {
              k: 'matched case',
              v: 'io.Reader',
            },
            {
              k: 'n',
              v: '4',
            },
            {
              k: 'result',
              v: '"reader read 4"',
            },
          ],
        },
        {
          title: 'Type switch: nil interface',
          caption:
            'describe(nil) passes an interface with no dynamic type, which matches only the explicit nil case and returns "nil interface".',
          focus: ['case nil:', 'return "nil interface"'],
          state: [
            {
              k: 'arg',
              v: 'nil interface',
            },
            {
              k: 'dynamic type',
              v: '<none>',
            },
            {
              k: 'matched case',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Deferred recover armed',
          caption:
            'a and b each hold a []int; the deferred closure installs a recover so a coming panic is caught rather than crashing the program.',
          focus: ['var a any = []int{1, 2}', 'if r := recover(); r != nil {'],
          state: [
            {
              k: 'a dynamic type',
              v: '[]int',
            },
            {
              k: 'b dynamic type',
              v: '[]int',
            },
            {
              k: 'recover armed',
              v: 'yes',
            },
          ],
        },
        {
          title: '== on uncomparable types panics',
          caption:
            'a == b compares two interfaces whose identical dynamic type ([]int) is not comparable, triggering a runtime panic that the deferred recover then reports.',
          focus: ['fmt.Println(a == b)', 'fmt.Println("recovered:", r)'],
          state: [
            {
              k: 'a == b',
              v: 'panics',
            },
            {
              k: 'reason',
              v: '[]int not comparable',
            },
            {
              k: 'recovered',
              v: 'runtime error',
            },
          ],
        },
      ],
    },
  ],
};
