import type { GoTopic } from '../types';

export const functionsClosures: GoTopic = {
  id: 'functions-closures',
  title: 'Functions & Closures',
  icon: 'Sigma',
  concepts: [
    {
      id: 'go-fn-multi-return',
      title: 'Multiple return values and the (result, error) idiom',
      difficulty: 'Easy',
      tags: ['functions', 'error', 'multi-return', 'idiom'],
      summary:
        'Go functions return any number of values; the canonical shape is (result, error) checked with if err != nil.',
      pattern: 'Multi-return',
      visual:
        'A function hands back a tuple; the caller destructures it into distinct variables in one := binding.',
      memorize: 'Return (value, error); check err != nil FIRST, then trust value.',
      scene:
        'A vending machine that drops both a snack AND a receipt in one push — you always inspect the receipt before eating.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\nfunc div(a, b int) (int, error) {\n\tif b == 0 {\n\t\treturn 0, errors.New("divide by zero")\n\t}\n\treturn a / b, nil\n}\n\nfunc main() {\n\tq, err := div(10, 2)\n\tif err != nil {\n\t\tfmt.Println("error:", err)\n\t\treturn\n\t}\n\tfmt.Println("quotient:", q)\n\n\t_, err = div(1, 0)\n\tfmt.Println("second:", err)\n}\n',
      keyPoints: [
        'Multiple returns are a real tuple, not a struct — you bind them positionally with := or =.',
        'By convention error is the LAST return value; nil error means the other values are valid.',
        'Use the blank identifier _ to discard returns you do not need, as with _, err := f().',
        'Always check err != nil before using the result; a non-nil error means the result is usually a zero value.',
      ],
      walkthrough: [
        {
          title: 'Declare the tuple signature',
          caption:
            'div returns (int, error) — the value first, the error last, matching the universal Go idiom.',
          focus: ['func div(a, b int) (int, error) {'],
          state: [{ k: 'returns', v: '(int, error)' }],
        },
        {
          title: 'Return an error on the bad path',
          caption:
            'When b is zero the function returns a zero value plus a real error instead of panicking.',
          focus: ['return 0, errors.New("divide by zero")'],
          state: [
            { k: 'b', v: '0' },
            { k: 'err', v: 'set' },
          ],
        },
        {
          title: 'Check err before trusting the value',
          caption: 'The caller binds both values, then guards on err != nil before touching q.',
          focus: ['if err != nil {'],
          state: [
            { k: 'err', v: 'nil' },
            { k: 'q', v: '5' },
          ],
        },
        {
          title: 'Discard the value with _',
          caption:
            'On the second call we only care about the error, so the quotient is dropped with the blank identifier.',
          focus: ['_, err = div(1, 0)'],
          state: [{ k: 'output', v: 'divide by zero' }],
        },
      ],
    },
    {
      id: 'go-fn-named-returns',
      title: 'Named return values and the naked return (and its risk)',
      difficulty: 'Medium',
      tags: ['functions', 'named-returns', 'naked-return', 'defer'],
      summary:
        'Naming return values pre-declares them as zeroed locals so a bare return sends their current state back.',
      pattern: 'Named returns',
      visual:
        'The result names live for the whole body; return with no operands ships whatever they currently hold.',
      memorize:
        'Named results = pre-zeroed vars; naked return ships them; defer can still mutate them.',
      scene:
        'Labeled outboxes at a desk: you scribble into "sum" and "err" all day, then a naked return mails whatever is in each box.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc split(sum int) (x, y int) {\n\tx = sum * 4 / 9\n\ty = sum - x\n\treturn\n}\n\nfunc inc() (n int) {\n\tdefer func() { n++ }()\n\treturn 41\n}\n\nfunc main() {\n\ta, b := split(17)\n\tfmt.Println(a, b)\n\tfmt.Println("inc:", inc())\n}\n',
      keyPoints: [
        'Named results are declared and zero-valued at function entry; a naked return sends their current values.',
        'A deferred closure can read and MODIFY named results after return runs — return 41 here yields 42.',
        'return 41 assigns 41 to n THEN runs defers, so the mutation is observable — the classic named-return gotcha.',
        'Naked returns aid tiny functions but hurt readability in long ones; the Go team advises restraint.',
      ],
      walkthrough: [
        {
          title: 'Pre-declared result names',
          caption:
            'x and y exist as zeroed ints from the first line, so the body assigns into them directly.',
          focus: ['func split(sum int) (x, y int) {'],
          state: [
            { k: 'x', v: '0' },
            { k: 'y', v: '0' },
          ],
        },
        {
          title: 'Naked return ships current state',
          caption: 'A bare return with no operands sends whatever x and y currently hold.',
          focus: ['return'],
          state: [
            { k: 'x', v: '7' },
            { k: 'y', v: '10' },
          ],
        },
        {
          title: 'return assigns the named result',
          caption: 'return 41 stores 41 into n before any deferred function runs.',
          focus: ['return 41'],
          state: [{ k: 'n', v: '41' }],
        },
        {
          title: 'defer mutates after return',
          caption:
            'The deferred closure increments n after the return value is set, so the caller observes 42.',
          focus: ['defer func() { n++ }()'],
          state: [
            { k: 'n', v: '42' },
            { k: 'output', v: 'inc: 42' },
          ],
        },
      ],
    },
    {
      id: 'go-fn-variadic',
      title: 'Variadic parameters and spreading a slice with ...',
      difficulty: 'Easy',
      tags: ['functions', 'variadic', 'slices', 'spread'],
      summary:
        'A trailing ...T parameter collects extra args into a slice, and args... spreads an existing slice back in.',
      pattern: 'Variadic',
      visual:
        'Inside the function the variadic param IS a []T; calling f(xs...) passes the slice instead of copying elements.',
      memorize: 'Define f(xs ...int); call f(1,2,3) OR f(slice...) — never mix both forms.',
      scene:
        'A checkout lane that scans any number of items into one basket; hand it a pre-filled basket with ... and it takes it whole.',
      time: 'O(n)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc sum(nums ...int) int {\n\ttotal := 0\n\tfor _, n := range nums {\n\t\ttotal += n\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Println(sum(1, 2, 3))\n\tfmt.Println(sum())\n\n\txs := []int{4, 5, 6}\n\tfmt.Println(sum(xs...))\n}\n',
      keyPoints: [
        'A variadic parameter must be last; inside the body it is an ordinary slice of type []T.',
        'Calling with no variadic args yields a nil slice, so len(nums) is 0 and ranging is safe.',
        'f(xs...) passes the existing slice header directly — no per-element copy is made.',
        'You cannot mix forms: f(1, xs...) is a compile error; pass either loose args or one spread slice.',
      ],
      walkthrough: [
        {
          title: 'The variadic parameter is a slice',
          caption:
            'nums ...int makes nums a []int inside the function, so range walks it like any slice.',
          focus: ['func sum(nums ...int) int {'],
          state: [{ k: 'nums type', v: '[]int' }],
        },
        {
          title: 'Pass loose arguments',
          caption: 'Calling sum(1, 2, 3) packs the three values into the nums slice.',
          focus: ['sum(1, 2, 3)'],
          state: [{ k: 'total', v: '6' }],
        },
        {
          title: 'Zero args means an empty slice',
          caption: 'sum() passes no values; nums is nil, the loop never runs, and total stays 0.',
          focus: ['sum()'],
          state: [
            { k: 'len(nums)', v: '0' },
            { k: 'total', v: '0' },
          ],
        },
        {
          title: 'Spread an existing slice',
          caption:
            'xs... forwards the slice header directly to the variadic parameter with no copy.',
          focus: ['sum(xs...)'],
          state: [
            { k: 'xs', v: '[4 5 6]' },
            { k: 'total', v: '15' },
          ],
        },
      ],
    },
    {
      id: 'go-fn-first-class',
      title: 'First-class functions and higher-order functions',
      difficulty: 'Easy',
      tags: ['functions', 'first-class', 'higher-order', 'func-type'],
      summary:
        'Functions are values: store them in variables, pass them as arguments, and return them from other functions.',
      pattern: 'First-class fn',
      visual:
        'A func type is just another type; a higher-order function takes or returns one to build behavior at runtime.',
      memorize:
        'func is a value; pass func(int) int as an arg to make map/filter/apply generic over behavior.',
      scene:
        'A power drill accepting swappable bits: the drill (higher-order fn) stays fixed while you snap in whichever bit (function) the job needs.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc apply(xs []int, f func(int) int) []int {\n\tout := make([]int, len(xs))\n\tfor i, x := range xs {\n\t\tout[i] = f(x)\n\t}\n\treturn out\n}\n\nfunc main() {\n\tdouble := func(n int) int { return n * 2 }\n\tfmt.Println(apply([]int{1, 2, 3}, double))\n\n\tfmt.Println(apply([]int{1, 2, 3}, func(n int) int {\n\t\treturn n * n\n\t}))\n}\n',
      keyPoints: [
        'A function value has a type like func(int) int and can be assigned, passed, and returned.',
        'A higher-order function takes or returns a function, letting callers inject behavior at runtime.',
        'Function literals (anonymous funcs) can be written inline at the call site with no name.',
        'The zero value of a func type is nil; calling a nil function value panics.',
      ],
      walkthrough: [
        {
          title: 'Accept a function as a parameter',
          caption: 'apply takes f func(int) int, making it generic over any per-element transform.',
          focus: ['func apply(xs []int, f func(int) int) []int {'],
          state: [{ k: 'f type', v: 'func(int) int' }],
        },
        {
          title: 'Invoke the passed function',
          caption: 'Each element is transformed by calling f(x); apply never knows what f does.',
          focus: ['out[i] = f(x)'],
          state: [{ k: 'out[i]', v: 'f(x)' }],
        },
        {
          title: 'Store a function in a variable',
          caption: 'double is a named function value that apply receives as an argument.',
          focus: ['double := func(n int) int { return n * 2 }'],
          state: [{ k: 'result', v: '[2 4 6]' }],
        },
        {
          title: 'Pass an inline literal',
          caption:
            'The second call passes an anonymous squaring function directly at the call site.',
          focus: ['return n * n'],
          state: [{ k: 'result', v: '[1 4 9]' }],
        },
      ],
    },
    {
      id: 'go-fn-closures',
      title: 'Closures capture variables by reference',
      difficulty: 'Medium',
      tags: ['closures', 'functions', 'capture', 'state'],
      summary:
        'A closure keeps a live reference to the outer variables it uses, so it can read and mutate them across calls.',
      pattern: 'Closures',
      visual:
        'The returned function holds the actual variable, not a snapshot; each call mutates the same persistent cell.',
      memorize:
        'Closures capture the VARIABLE, not its value — shared state persists between calls.',
      scene:
        'A tally counter you hand to a friend: they keep clicking your counter, and every click bumps the same shared number.',
      time: 'O(1)',
      space: 'O(1)',
      code: 'package main\n\nimport "fmt"\n\nfunc counter() func() int {\n\tn := 0\n\treturn func() int {\n\t\tn++\n\t\treturn n\n\t}\n}\n\nfunc main() {\n\tc := counter()\n\tfmt.Println(c(), c(), c())\n\n\td := counter()\n\tfmt.Println(d())\n}\n',
      keyPoints: [
        'A closure captures the variable itself by reference, so mutations persist across every call.',
        'Each call to counter() creates a FRESH n, so independent closures do not share state.',
        'The captured variable escapes to the heap and outlives the enclosing function call.',
        'Since Go 1.22 loop variables are per-iteration, fixing the classic bug where closures in a for loop all saw the final value.',
      ],
      walkthrough: [
        {
          title: 'Local variable to capture',
          caption:
            'n is a local of counter, initialized to 0, that the inner function will close over.',
          focus: ['n := 0'],
          state: [{ k: 'n', v: '0' }],
        },
        {
          title: 'Return a function that mutates it',
          caption: 'The returned closure increments and returns n, holding a live reference to it.',
          focus: ['return func() int {'],
          state: [{ k: 'captured', v: 'n (by ref)' }],
        },
        {
          title: 'State persists across calls',
          caption: 'Each call to c mutates the same n, so the three calls yield 1, 2, 3.',
          focus: ['fmt.Println(c(), c(), c())'],
          state: [
            { k: 'n', v: '3' },
            { k: 'output', v: '1 2 3' },
          ],
        },
        {
          title: 'A new closure gets fresh state',
          caption: 'counter() called again builds a brand-new n, so d starts counting from 1.',
          focus: ['d := counter()'],
          state: [{ k: 'd()', v: '1' }],
        },
      ],
    },
    {
      id: 'go-fn-defer',
      title: 'defer: LIFO order and argument evaluation at defer time',
      difficulty: 'Medium',
      tags: ['defer', 'functions', 'lifo', 'cleanup'],
      summary:
        'defer schedules a call to run when the function returns; deferred calls fire in last-in, first-out order.',
      pattern: 'defer',
      visual:
        'Each defer pushes onto a stack with its args snapshotted NOW; the stack unwinds top-down on return.',
      memorize: 'defer args evaluate immediately; the CALL runs last, in reverse (LIFO) order.',
      scene:
        'A stack of sticky notes: you jot each cleanup step and slap it on top, then peel from the top down as you leave the room.',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\ti := 0\n\tdefer fmt.Println("deferred i:", i)\n\ti = 99\n\n\tfor n := 1; n <= 3; n++ {\n\t\tdefer fmt.Println("cleanup", n)\n\t}\n\n\tfmt.Println("live i:", i)\n}\n',
      keyPoints: [
        'A deferred call runs when the surrounding function returns, whether normally or via panic.',
        'Arguments are evaluated at the defer statement, not when the deferred call finally runs.',
        'Multiple defers run in LIFO order — the last one scheduled runs first.',
        'defer captures i as 0 here even though i becomes 99 before the function returns.',
      ],
      walkthrough: [
        {
          title: 'Arguments snapshot at defer time',
          caption:
            "defer evaluates fmt.Println's argument now, capturing i as 0 before it changes.",
          focus: ['defer fmt.Println("deferred i:", i)'],
          state: [{ k: 'captured i', v: '0' }],
        },
        {
          title: 'Later mutation does not matter',
          caption: 'i becomes 99, but the deferred call already froze the old value.',
          focus: ['i = 99'],
          state: [{ k: 'i', v: '99' }],
        },
        {
          title: 'Each iteration pushes a defer',
          caption: 'Three cleanup defers are scheduled onto the stack in order 1, 2, 3.',
          focus: ['defer fmt.Println("cleanup", n)'],
          state: [{ k: 'stack', v: '[1 2 3]' }],
        },
        {
          title: 'LIFO unwind on return',
          caption: 'On return the stack unwinds top-down: cleanup 3, 2, 1, then deferred i: 0.',
          focus: ['fmt.Println("live i:", i)'],
          state: [{ k: 'output', v: 'live 99 / 3 2 1 / i:0' }],
        },
      ],
    },
  ],
};
