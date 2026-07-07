import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const runtimeMemory: GoTopic = {
  id: 'runtime-memory',
  title: 'Runtime & Memory',
  icon: 'Cpu',
  concepts: [
    {
      id: 'go-mem-stack-heap',
      title: 'Escape analysis: stack vs heap',
      difficulty: 'Hard',
      tags: ['runtime', 'memory', 'escape-analysis', 'performance', 'gc'],
      summary: 'How the compiler decides stack vs heap, and why it drives allocation cost.',
      pattern: 'Escape analysis',
      visual:
        "Compiler proves a value's lifetime is bounded by its frame -> stack; if it can outlive the frame -> heap.",
      memorize:
        "Escapes if it can outlive the frame or the compiler can't prove otherwise; heap = GC pressure.",
      scene:
        "A value tries to leave through the return door as a pointer; the compiler stamps it 'heap' and hands it to the GC janitor.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype Point struct {\n\tX, Y int\n}\n\n// newPoint returns a pointer; the value must outlive the frame, so it escapes.\nfunc newPoint(x, y int) *Point {\n\tp := Point{X: x, Y: y}\n\treturn &p\n}\n\n// sumLocal keeps everything on the stack: no pointer leaves the frame.\nfunc sumLocal(n int) int {\n\tacc := Point{}\n\tfor i := 0; i < n; i++ {\n\t\tacc.X += i\n\t\tacc.Y -= i\n\t}\n\treturn acc.X + acc.Y\n}\n\n// leak forces a heap allocation by storing the value behind an interface.\nfunc leak(v int) fmt.Stringer {\n\treturn myInt(v)\n}\n\ntype myInt int\n\nfunc (m myInt) String() string {\n\treturn fmt.Sprintf("myInt(%d)", int(m))\n}\n\nfunc main() {\n\tp := newPoint(3, 4)\n\tfmt.Println(p.X+p.Y, sumLocal(10), leak(7))\n}\n',
      quiz: [
        {
          id: 'return-pointer-escapes',
          prompt:
            'In newPoint, a local Point is created and &p is returned. What does escape analysis decide, and why?',
          choices: [
            {
              label: 'Stays on stack — Go grows the caller frame',
              correct: false,
            },
            {
              label: 'Escapes to heap — pointer outlives the frame',
              correct: true,
            },
            {
              label: 'Stack via inlining — callee frame is reused',
              correct: false,
            },
            {
              label: 'Escapes to heap — structs never fit the stack',
              correct: false,
            },
          ],
          explain:
            'The address of p is returned, so p must remain valid after newPoint returns; the compiler moves it to the heap ("moved to heap: p"). Struct size is irrelevant to this decision, and returning &p is exactly what forces the escape.',
        },
        {
          id: 'interface-boxing',
          prompt:
            'leak returns myInt(v) as an fmt.Stringer. Why does the concrete value escape to the heap?',
          choices: [
            {
              label: 'Interface conversion boxes — value stored behind a pointer',
              correct: true,
            },
            {
              label: 'myInt is too large — exceeds a stack word',
              correct: false,
            },
            {
              label: 'String allocates — the method body forces it',
              correct: false,
            },
            {
              label: 'Return value copied — copies always heap-allocate',
              correct: false,
            },
          ],
          explain:
            "An interface holds a (type, data) pair where data is a pointer; storing a concrete value in an interface that escapes forces the value onto the heap. It is the boxing, not the value's size or the method body, that causes the escape.",
        },
        {
          id: 'gcflags-m',
          prompt:
            "Which command reveals the compiler's escape decisions without changing generated code?",
          choices: [
            {
              label: 'go build -gcflags=-m — prints escape analysis',
              correct: true,
            },
            {
              label: 'go build -race — instruments memory accesses',
              correct: false,
            },
            {
              label: 'go tool pprof — samples the running heap',
              correct: false,
            },
            {
              label: 'go vet -escape — statically flags escapes',
              correct: false,
            },
          ],
          explain:
            '-gcflags=-m emits escape-analysis and inlining diagnostics (add a second -m for more detail) at compile time without altering codegen. -race changes the binary, pprof samples at runtime, and go vet has no -escape flag.',
        },
        {
          id: 'slice-append-escape',
          prompt:
            'A function appends to a slice passed by value, then returns the (possibly reallocated) slice header. Does the backing array escape?',
          choices: [
            {
              label: 'Always heap — slices are reference types',
              correct: false,
            },
            {
              label: 'Depends — escapes only if it outlives the frame',
              correct: true,
            },
            {
              label: 'Never escapes — append reuses caller memory',
              correct: false,
            },
            {
              label: 'Escapes on growth — realloc always uses heap',
              correct: false,
            },
          ],
          explain:
            'Escape is decided by lifetime, not the word "slice." If the returned backing array can be reachable after the frame returns it escapes; a slice used and dropped locally can stay on the stack. Growth alone does not force the heap when the compiler proves the array does not outlive the frame.',
        },
        {
          id: 'why-perf',
          prompt: 'Why does reducing escapes matter for performance in a hot path?',
          choices: [
            {
              label: 'Stack frees are pointer bumps — no GC scanning',
              correct: true,
            },
            {
              label: 'Heap is slower RAM — stack lives in cache',
              correct: false,
            },
            {
              label: 'Escaped values skip inlining — calls get costlier',
              correct: false,
            },
            {
              label: 'Heap values are copied more — extra memcpy per use',
              correct: false,
            },
          ],
          explain:
            'Stack allocation and reclamation is essentially free (adjusting SP on return), while heap allocations add allocator cost and later GC mark/scan work. Heap and stack are the same physical memory, and escaping does not inherently add copies.',
        },
        {
          id: 'closure-capture',
          prompt:
            'A closure captures a local variable by reference and the closure is returned to the caller. What happens to that variable?',
          choices: [
            {
              label: 'Escapes to heap — captured var outlives the frame',
              correct: true,
            },
            {
              label: 'Stays on stack — closures copy captured vars',
              correct: false,
            },
            {
              label: 'Escapes to heap — every closure allocates',
              correct: false,
            },
            {
              label: 'Stack via inlining — the closure is inlined away',
              correct: false,
            },
          ],
          explain:
            'A returned closure keeps the captured variable reachable after the frame exits, so that variable is moved to the heap. Closures that never leave the frame can keep captures on the stack, so it is not every closure.',
        },
      ],
      design: {
        prompt:
          'You own a high-throughput JSON request pipeline in Go that shows heavy GC pressure under load. Walk through how you would use escape analysis to cut allocations, what refactors you would consider, and the tradeoffs of each.',
        answer:
          "Start by measuring, not guessing: use pprof (alloc_space/alloc_objects) to find the allocation hot spots, then compile those packages with -gcflags='-m -m' to see which values escape and why (returned pointers, interface boxing, closures, or values whose lifetime the compiler can't bound). Common wins: return values instead of pointers for small structs so they stay on the stack; avoid stuffing concrete values into interfaces (e.g. logging with any, or fmt) in the hot path, since boxing forces heap allocation; preallocate slices/maps with known capacity to avoid repeated growth; and reuse buffers via sync.Pool for large short-lived objects. Each has tradeoffs: returning large structs by value adds copy cost that can exceed a heap alloc, so measure the crossover; sync.Pool adds complexity and can hurt if objects are long-lived or pooled objects retain memory, and it interacts subtly with GC (pooled items can be reclaimed across cycles). Beware over-optimizing readability away for micro-gains, and remember escape analysis is conservative — a change that 'should' stay on the stack may still escape if the compiler can't prove it (e.g. passing to a function it can't inline). My recommendation: fix the top few pprof offenders driven by interface boxing and unbounded slice growth first (usually the biggest, lowest-risk wins), verify with -gcflags=-m and re-benchmark, and only reach for sync.Pool where a large object is provably allocated per request and the pool measurably reduces GC CPU.",
      },
      keyPoints: [
        'A value escapes when the compiler cannot prove its lifetime is bounded by the function frame — returning &local, storing in an escaping interface, or capturing in a returned closure all force the heap.',
        'Escape is about reachable lifetime, not type or size: slices, maps, and large structs can live on the stack; small values can be forced to the heap by boxing.',
        'Interface conversion boxes the concrete value behind a pointer, a classic hidden heap allocation (fmt.Println, logging with any).',
        "Inspect decisions with go build -gcflags=-m (double -m for detail); it reports 'moved to heap' and 'does not escape' at compile time without changing codegen.",
        'Stack alloc/free is a pointer bump with zero GC cost; heap allocations add allocator work and later mark/scan, so fewer escapes means less GC pressure.',
        'Optimize from pprof evidence, verify with -gcflags=-m, and re-benchmark — escape analysis is conservative and refactors can backfire (e.g. large value copies).',
      ],
      walkthrough: [
        {
          title: 'main calls newPoint',
          caption:
            'main invokes newPoint(3, 4), pushing a new frame whose result the compiler already knows must survive the call.',
          focus: ['p := newPoint(3, 4)', 'func newPoint(x, y int) *Point {'],
          state: [
            {
              k: 'frame',
              v: 'newPoint',
            },
            {
              k: 'x, y',
              v: '3, 4',
            },
          ],
        },
        {
          title: 'Point escapes to heap',
          caption:
            "p is built and its address is returned, so the value must outlive newPoint's frame and escape analysis allocates it on the heap.",
          focus: ['p := Point{X: x, Y: y}', 'return &p'],
          state: [
            {
              k: 'p',
              v: '{3, 4}',
            },
            {
              k: 'alloc',
              v: 'heap',
            },
            {
              k: 'reason',
              v: 'address outlives frame',
            },
          ],
        },
        {
          title: 'sumLocal stays on stack',
          caption:
            'sumLocal builds a local Point whose address never leaves the frame, so acc lives entirely on the stack with zero heap cost.',
          focus: ['acc := Point{}', 'func sumLocal(n int) int {'],
          state: [
            {
              k: 'frame',
              v: 'sumLocal',
            },
            {
              k: 'acc',
              v: '{0, 0}',
            },
            {
              k: 'alloc',
              v: 'stack',
            },
          ],
        },
        {
          title: 'Loop mutates stack value',
          caption:
            "The loop accumulates into acc's fields in place on the stack, needing no allocation and no GC involvement.",
          focus: ['acc.X += i', 'acc.Y -= i'],
          state: [
            {
              k: 'n',
              v: '10',
            },
            {
              k: 'acc.X',
              v: '45',
            },
            {
              k: 'acc.Y',
              v: '-45',
            },
          ],
        },
        {
          title: 'sumLocal returns scalar',
          caption:
            'Only an int is returned by value, confirming nothing pointed into the frame and the whole computation avoided the heap.',
          focus: ['return acc.X + acc.Y'],
          state: [
            {
              k: 'result',
              v: '0',
            },
            {
              k: 'heap allocs',
              v: '0',
            },
          ],
        },
        {
          title: 'leak boxes into interface',
          caption:
            'leak converts myInt to the fmt.Stringer interface; storing a value behind an interface forces it onto the heap so the interface can hold a pointer to it.',
          focus: ['return myInt(v)', 'func leak(v int) fmt.Stringer {'],
          state: [
            {
              k: 'v',
              v: '7',
            },
            {
              k: 'boxed as',
              v: 'fmt.Stringer',
            },
            {
              k: 'alloc',
              v: 'heap',
            },
            {
              k: 'reason',
              v: 'interface conversion',
            },
          ],
        },
        {
          title: 'Println consumes results',
          caption:
            "main prints the heap Point's fields, the stack-computed sum, and the boxed Stringer, whose String method fmt calls via the interface.",
          focus: ['fmt.Println(p.X+p.Y, sumLocal(10), leak(7))'],
          state: [
            {
              k: 'output',
              v: '7 0 myInt(7)',
            },
            {
              k: 'heap objects',
              v: '2 (Point, myInt)',
            },
          ],
        },
        {
          title: 'GC reclaims escaped values',
          caption:
            'After main returns, the heap-allocated Point and boxed myInt become unreachable and are eventually collected, incurring the GC pressure the stack path avoided entirely.',
          focus: ['func main() {'],
          state: [
            {
              k: 'stack path',
              v: 'no GC work',
            },
            {
              k: 'heap path',
              v: 'needs GC',
            },
          ],
        },
      ],
    },
    {
      id: 'go-mem-gc',
      title: 'The garbage collector',
      difficulty: 'Hard',
      tags: ['runtime', 'memory', 'gc', 'performance', 'concurrency'],
      summary:
        'Concurrent tricolor mark-sweep with a hybrid write barrier, tuned by GOGC and GOMEMLIMIT.',
      pattern: 'GC internals',
      visual:
        'Marker goroutines walk the object graph tricolor while a hybrid write barrier catches mutator pointer writes so reachable memory is never freed mid-cycle.',
      memorize:
        'Tricolor + hybrid write barrier = concurrent mark; GOGC sets heap growth ratio, GOMEMLIMIT sets a soft ceiling, the pacer schedules the next cycle.',
      scene:
        'Painters color a live subway map while passengers keep rerouting; a turnstile logs every reroute so no station gets erased mid-repaint.',
      time: 'O(live heap)',
      space: 'O(live pointers)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"runtime"\n\t"runtime/debug"\n)\n\nfunc main() {\n\t// GOGC=100 means: trigger the next GC when the live heap has grown\n\t// by 100% since the last mark-termination. Return value is the prior.\n\tprev := debug.SetGCPercent(100)\n\tfmt.Println("previous GOGC:", prev)\n\n\t// GOMEMLIMIT is a soft memory ceiling. The pacer runs GC more\n\t// aggressively as usage approaches it; -1 leaves it unchanged.\n\toldLimit := debug.SetMemoryLimit(-1)\n\tfmt.Println("current soft limit bytes:", oldLimit)\n\n\tvar before, after runtime.MemStats\n\truntime.ReadMemStats(&before)\n\n\tretained := make([][]byte, 0, 1024)\n\tfor i := 0; i < 1024; i++ {\n\t\tretained = append(retained, make([]byte, 4096))\n\t\t_ = make([]byte, 4096) // immediately unreachable garbage\n\t}\n\n\truntime.GC() // blocking cycle: mark then sweep\n\truntime.ReadMemStats(&after)\n\n\tfmt.Println("completed GC cycles:", after.NumGC-before.NumGC)\n\tfmt.Println("retained slices:", len(retained))\n\tfmt.Printf("heap goal bytes: %d\\n", after.NextGC)\n\truntime.KeepAlive(retained)\n}\n',
      quiz: [
        {
          id: 'tricolor-invariant',
          prompt:
            "What invariant does Go's concurrent collector conceptually preserve during the mark phase, and why does it matter?",
          choices: [
            {
              label: 'No black-to-white pointers — reachable objects stay marked',
              correct: true,
            },
            {
              label: 'Only black-to-gray — black may reference gray but never white',
            },
            {
              label: 'White isolation — white objects never reference black ones',
            },
            {
              label: 'Gray monotonicity — gray count strictly decreases each step',
            },
          ],
          explain:
            'The hybrid write barrier upholds the tricolor invariant so that no black (fully scanned) object is left holding a pointer to a white (unscanned) object, ensuring nothing reachable is missed while mutators run concurrently.',
        },
        {
          id: 'gogc-meaning',
          prompt:
            'With GOGC=100 and a live heap of 50 MB after a cycle, roughly when does the next GC trigger?',
          choices: [
            {
              label: '~100 MB heap — one live-heap increment past 50 MB',
              correct: true,
            },
            {
              label: '~150 MB heap — grows to 3x the live set',
            },
            {
              label: '100 MB fixed — GOGC is an absolute megabyte cap',
            },
            {
              label: 'Every 100 ms — GOGC is a time interval',
            },
          ],
          explain:
            'GOGC is a growth ratio: the heap goal is live_heap * (1 + GOGC/100). At GOGC=100 that is 50 MB * 2 = 100 MB, so GC targets when the heap reaches about 100 MB.',
        },
        {
          id: 'write-barrier-when',
          prompt: "When is Go's write barrier active in a running program?",
          choices: [
            {
              label: 'Only during concurrent mark — off in steady state',
              correct: true,
            },
            {
              label: 'Always enabled — every pointer write pays the cost',
            },
            {
              label: 'Only during stop-the-world — mutators are paused anyway',
            },
            {
              label: 'Only during sweep — reclaiming needs pointer tracking',
            },
          ],
          explain:
            "Go's hybrid write barrier is enabled only while marking is concurrently in progress; outside a mark phase pointer writes are plain stores, so steady-state code pays no barrier cost.",
        },
        {
          id: 'gomemlimit-behavior',
          prompt: 'How does GOMEMLIMIT interact with GOGC when memory pressure rises?',
          choices: [
            {
              label: 'Soft ceiling tightens pacing — GC runs more often near limit',
              correct: true,
            },
            {
              label: 'Hard cap — allocations fail with OOM once the limit is hit',
            },
            {
              label: 'Disables GOGC entirely — only the limit governs pacing',
            },
            {
              label: 'Ignored unless GOGC unset — GOGC always wins',
            },
          ],
          explain:
            'GOMEMLIMIT is a soft limit: as heap usage approaches it the pacer schedules GC more frequently regardless of GOGC, but it never fails allocation and can still exceed the limit under pressure, risking a GC death-spiral.',
        },
        {
          id: 'stw-phases',
          prompt: "Which work still happens during stop-the-world pauses in Go's current GC?",
          choices: [
            {
              label: 'Mark setup and mark termination — brief STW brackets',
              correct: true,
            },
            {
              label: 'The entire mark phase — all marking is stop-the-world',
            },
            {
              label: 'The entire sweep phase — reclamation freezes the world',
            },
            {
              label: "Zero STW ever — Go's GC is fully pause-free",
            },
          ],
          explain:
            'Go brackets concurrent marking with two short STW phases: mark setup (enable the write barrier and prepare roots) and mark termination (finish marking and disable the barrier). The bulk of marking and all sweeping run concurrently.',
        },
        {
          id: 'mark-assist',
          prompt: 'What is the purpose of GC mark assist charged to an allocating goroutine?',
          choices: [
            {
              label: 'Allocation debt — fast allocators help mark to keep pace',
              correct: true,
            },
            {
              label: 'Priority boost — allocators get scheduled ahead of markers',
            },
            {
              label: 'Sweep prepayment — allocators pre-clear future free spans',
            },
            {
              label: 'Barrier bypass — assisting goroutines skip the write barrier',
            },
          ],
          explain:
            'If a goroutine allocates faster than background markers can keep up, the pacer charges it mark-assist work proportional to its allocation, forcing it to do marking so the cycle finishes before the heap goal is blown.',
        },
      ],
      design: {
        prompt:
          'A latency-sensitive service periodically shows p99 spikes correlated with GC. You have GOGC and GOMEMLIMIT as knobs plus code-level options. How do you diagnose and tune the GC behavior, and what are the tradeoffs of each lever?',
        answer:
          'Start by measuring, not guessing: enable GODEBUG=gctrace=1 and inspect NextGC, PauseNs, and assist time via runtime/metrics, and check whether spikes come from actual STW pauses (now typically sub-millisecond) or from mark-assist stalling hot allocators. If assists dominate, the heap is growing faster than markers keep up, so the fix is to reduce allocation rate (pool buffers, avoid per-request heap escapes, reuse slices) rather than only turning knobs. Raising GOGC lets the heap grow larger between cycles, cutting GC frequency and CPU overhead at the cost of higher peak memory; lowering it does the reverse and can starve throughput. GOMEMLIMIT is the better lever for containerized services because it sets a soft ceiling that prevents OOM-kills while letting GOGC stay high for low-frequency collection, but if the live set approaches the limit the pacer can enter a GC death-spiral burning CPU. A common recommendation is to set GOMEMLIMIT to roughly 90-95% of the container memory, keep GOGC at its default or higher, and attack allocation hot paths with escape-analysis-driven refactoring and sync.Pool. The durable win is almost always fewer heap allocations, since that shrinks both pause work and assist pressure simultaneously.',
      },
      keyPoints: [
        'The collector is concurrent tricolor mark-sweep; a hybrid (Dijkstra insertion + Yuasa deletion) write barrier keeps reachable objects marked while mutators run.',
        'GOGC is a heap growth ratio setting the next-cycle goal at live * (1 + GOGC/100), not an absolute size or a time interval.',
        'GOMEMLIMIT is a soft ceiling: the pacer intensifies GC near it but never fails allocation, so an oversized live set can cause a GC death-spiral.',
        'STW is limited to brief mark-setup and mark-termination phases; the bulk of marking and all sweeping run concurrently.',
        'Mark assist charges allocation debt to fast-allocating goroutines so a cycle completes before the heap goal is exceeded.',
        'The write barrier is active only during the mark phase, so steady-state non-GC code pays no barrier cost.',
      ],
      walkthrough: [
        {
          title: 'Set GOGC ratio',
          caption:
            "SetGCPercent installs a 100% heap-growth target and returns the prior GOGC, which the pacer uses to compute each cycle's heap goal.",
          focus: ['prev := debug.SetGCPercent(100)'],
          state: [
            {
              k: 'GOGC',
              v: '100',
            },
            {
              k: 'prev',
              v: 'prior value (default 100)',
            },
            {
              k: 'heap goal',
              v: '~2x live heap',
            },
          ],
        },
        {
          title: 'Read soft memory limit',
          caption:
            'SetMemoryLimit(-1) leaves the soft ceiling unchanged and returns the current value; when live memory nears this limit the pacer schedules GC more aggressively than GOGC alone would.',
          focus: ['oldLimit := debug.SetMemoryLimit(-1)'],
          state: [
            {
              k: 'GOMEMLIMIT',
              v: 'unchanged (math.MaxInt64 default)',
            },
            {
              k: 'oldLimit',
              v: 'current soft limit',
            },
          ],
        },
        {
          title: 'Snapshot heap before',
          caption:
            'ReadMemStats stops the world briefly to capture a consistent baseline, recording before.NumGC so we can later count only the cycles this code triggers.',
          focus: ['runtime.ReadMemStats(&before)'],
          state: [
            {
              k: 'before.NumGC',
              v: 'cycles so far',
            },
            {
              k: 'live heap',
              v: 'baseline',
            },
          ],
        },
        {
          title: 'Allocate live + garbage',
          caption:
            "Each iteration appends a retained 4 KiB slice (reachable via retained's backing array) while a second 4 KiB slice is immediately unreachable, so roughly half the allocated bytes are dead by the next mark.",
          focus: [
            'retained = append(retained, make([]byte, 4096))',
            '_ = make([]byte, 4096) // immediately unreachable garbage',
          ],
          state: [
            {
              k: 'i',
              v: '0 to 1023',
            },
            {
              k: 'len(retained)',
              v: 'grows to 1024',
            },
            {
              k: 'cap(retained)',
              v: '1024 (no regrow)',
            },
            {
              k: 'retained bytes',
              v: '~4 MiB live',
            },
          ],
        },
        {
          title: 'Concurrent mark phase',
          caption:
            "runtime.GC starts a cycle: roots (globals and stacks, from which retained's backing array is reachable) go grey, then workers scan grey to black; the hybrid write barrier shades pointers written during marking so no reachable object stays white.",
          focus: ['runtime.GC() // blocking cycle: mark then sweep'],
          state: [
            {
              k: 'phase',
              v: 'concurrent mark',
            },
            {
              k: 'retained',
              v: 'black (reachable)',
            },
            {
              k: 'garbage slices',
              v: 'white (unreached)',
            },
            {
              k: 'write barrier',
              v: 'on (hybrid)',
            },
          ],
        },
        {
          title: 'Mark termination + sweep',
          caption:
            'After a short stop-the-world mark termination the barrier turns off; remaining white objects (the ~4 MiB of garbage) are swept, and the pacer sets the next heap goal to ~2x the surviving live heap.',
          focus: [
            'runtime.GC() // blocking cycle: mark then sweep',
            'runtime.ReadMemStats(&after)',
          ],
          state: [
            {
              k: 'phase',
              v: 'sweep',
            },
            {
              k: 'reclaimed',
              v: '~4 MiB garbage',
            },
            {
              k: 'survivors',
              v: '~4 MiB retained',
            },
            {
              k: 'after.NumGC',
              v: 'before.NumGC + 1',
            },
          ],
        },
        {
          title: 'Report cycle results',
          caption:
            "The delta after.NumGC-before.NumGC is at least 1 (the forced cycle), and after.NextGC exposes the pacer's computed heap goal for the next automatic trigger.",
          focus: ['after.NumGC-before.NumGC', 'after.NextGC'],
          state: [
            {
              k: 'completed GC cycles',
              v: '>= 1',
            },
            {
              k: 'retained slices',
              v: '1024',
            },
            {
              k: 'NextGC',
              v: '~2x live heap',
            },
          ],
        },
        {
          title: 'KeepAlive guard',
          caption:
            "runtime.KeepAlive extends retained's lifetime to this exact line, preventing the optimizer/GC from reclaiming it earlier and ensuring it was genuinely live (black) during the mark above.",
          focus: ['runtime.KeepAlive(retained)'],
          state: [
            {
              k: 'retained',
              v: 'provably live until here',
            },
            {
              k: 'reason',
              v: 'defeat premature collection',
            },
          ],
        },
      ],
    },
    {
      id: 'go-mem-model',
      title: 'The Go memory model & happens-before',
      difficulty: 'Hard',
      tags: ['concurrency', 'memory-model', 'happens-before', 'data-race', 'synchronization'],
      summary:
        'Happens-before is the only contract that makes cross-goroutine reads observe the right writes.',
      pattern: 'Happens-before',
      visual:
        "A send/Unlock in goroutine A happens-before the matching receive-completion/Lock in B, so B observes A's prior writes",
      memorize: 'No happens-before edge = no guarantee. A race is UB, not a stale read.',
      scene:
        'Two goroutines shout across a canyon; only a rope bridge (channel send/mutex unlock) lets a message cross with its cargo (prior writes) intact.',
      time: 'O(1) sync ops',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\n// config is written once, then published via the channel.\ntype config struct {\n\tversion int\n\tname    string\n}\n\nfunc main() {\n\t// Publication via an unbuffered channel establishes happens-before:\n\t// the send happens-before the corresponding receive completes, so the\n\t// receiver is guaranteed to observe the fully initialized *config.\n\tch := make(chan *config)\n\n\tgo func() {\n\t\tc := &config{version: 2, name: "prod"}\n\t\tch <- c // send happens-before the matching receive completes\n\t}()\n\n\tgot := <-ch\n\tfmt.Println(got.version, got.name)\n\n\t// Mutex also establishes happens-before: the n-th Unlock\n\t// happens-before the (n+1)-th Lock that observes it.\n\tvar mu sync.Mutex\n\tvar counter int\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < 100; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tmu.Lock()\n\t\t\tcounter++\n\t\t\tmu.Unlock()\n\t\t}()\n\t}\n\twg.Wait()\n\tfmt.Println(counter)\n}\n',
      quiz: [
        {
          id: 'race-is-ub',
          prompt:
            'A program has one goroutine writing an int variable and another reading it with no synchronization. What does the Go memory model say the reader may observe?',
          choices: [
            {
              label: 'Old or new value — but always one clean word',
              correct: false,
            },
            {
              label: 'Undefined behavior — any value including torn or fabricated',
              correct: true,
            },
            {
              label: 'Always the latest write — Go inserts implicit barriers',
              correct: false,
            },
            {
              label: 'Zero value — until the write flushes to memory',
              correct: false,
            },
          ],
          explain:
            'The current Go memory model (published with Go 1.19) makes a data race on ordinary non-atomic memory undefined behavior: the compiler is entitled to assume no race occurs, so the read is not guaranteed to yield even an old-or-new single value.',
        },
        {
          id: 'chan-hb-direction',
          prompt:
            'For a Go channel, which happens-before edge does the memory model guarantee about a send and its corresponding receive?',
          choices: [
            {
              label: 'Send is ordered first — its paired receive then completes',
              correct: true,
            },
            {
              label: 'Receive completes — happens-before the send begins',
              correct: false,
            },
            {
              label: 'Send and receive — are wholly unordered by the model',
              correct: false,
            },
            {
              label: 'Close — happens-before every prior send on that channel',
              correct: false,
            },
          ],
          explain:
            "The spec states 'a send on a channel happens-before the completion of the corresponding receive.' The receiver therefore observes every write the sender made before the send. (Unbuffered channels add a second edge in the other direction: the receive happens-before that send completes, since they rendezvous.)",
        },
        {
          id: 'buffered-hb',
          prompt:
            'For a channel with capacity C, what happens-before guarantee lets a bounded semaphore work correctly?',
          choices: [
            {
              label: 'k-th receive — happens-before the (k+C)-th send completes',
              correct: true,
            },
            {
              label: 'Every send — happens-before every receive globally',
              correct: false,
            },
            {
              label: 'k-th send — happens-before the k-th receive on all CPUs',
              correct: false,
            },
            {
              label: 'Buffered channels — provide no happens-before at all',
              correct: false,
            },
          ],
          explain:
            'The memory model states the k-th receive from a channel with capacity C happens-before the (k+C)-th send completes, which is exactly the back-pressure ordering a counting-semaphore pattern relies on.',
        },
        {
          id: 'double-checked',
          prompt:
            "A lazy singleton reads a shared *T without a lock, and only takes the mutex if it's nil (classic double-checked locking). Why is this broken in Go?",
          choices: [
            {
              label: 'Unlocked read — races with the locked write',
              correct: true,
            },
            {
              label: 'Mutexes in Go — are not reentrant',
              correct: false,
            },
            {
              label: 'Pointer writes — are never atomic on any platform',
              correct: false,
            },
            {
              label: 'It works fine — the nil check acts as a barrier',
              correct: false,
            },
          ],
          explain:
            'The lock-free read shares no happens-before edge with the write performed under the lock, so it is a data race and undefined behavior. The fix is sync.Once or atomic.Pointer, not a bare nil check.',
        },
        {
          id: 'init-vs-goroutine',
          prompt:
            'Package-level var x is set in init(), then a goroutine started in main reads x. Is the read guaranteed to see the init value?',
          choices: [
            {
              label: 'Yes — init happens-before main which starts the goroutine',
              correct: true,
            },
            {
              label: 'Not ordered — only atomics cross the init boundary',
              correct: false,
            },
            {
              label: 'Only if x — has a pointer type',
              correct: false,
            },
            {
              label: 'Unordered — init runs concurrently with main',
              correct: false,
            },
          ],
          explain:
            "The model guarantees all package initialization happens-before the start of main, and starting a goroutine happens-before the goroutine's execution, so the transitive edge makes the init value visible to the goroutine.",
        },
        {
          id: 'atomic-vs-plain',
          prompt:
            'One goroutine does atomic.StoreInt64(&flag,1) then a plain write data=42. Another spins on atomic.LoadInt64(&flag)==1 then reads data. Is reading data safe?',
          choices: [
            {
              label: 'Yes — the atomic load-acquire orders the later plain read',
              correct: true,
            },
            {
              label: 'Always a race — mixing atomic with plain access',
              correct: false,
            },
            {
              label: 'Only if data — is also accessed atomically',
              correct: false,
            },
            {
              label: "Relaxed ordering — Go atomics aren't sequentially consistent",
              correct: false,
            },
          ],
          explain:
            "Go's sync/atomic operations are sequentially consistent and create happens-before edges: the store publishes the earlier plain write, and the matching load orders the subsequent read, so there is no race on data. Note the write ordering matters — the plain write must precede the atomic store for the edge to cover it.",
        },
      ],
      design: {
        prompt:
          'You maintain a hot-reloadable configuration object read by thousands of goroutines on every request. Design a mechanism to publish a new *Config atomically without locking every reader, and explain what the memory model guarantees your design provides.',
        answer:
          "The core requirement is a happens-before edge between the writer that constructs the new immutable *Config and every reader that observes the new pointer. The idiomatic solution is atomic.Pointer[Config]: the reloader builds a fully-initialized Config and does cfg.Store(new), while readers do cfg.Load(); because Go atomics are sequentially consistent, the store publishes all the writes that built the struct and the matching load orders the reader's subsequent field accesses, so no reader ever sees a partially constructed value. The Config must be treated as immutable after publication — readers never mutate it and the writer never mutates the old one — which sidesteps any race on the fields themselves. Tradeoffs: a RWMutex is simpler and also correct but adds contention on the read path (even RLock has atomic bookkeeping and cache-line traffic), whereas atomic.Pointer gives readers a single uncontended atomic load. A naive plain pointer swap is broken: the unsynchronized read is a data race and UB, and readers may observe the new pointer before the struct's fields are visible. Recommendation: atomic.Pointer[Config] with copy-on-write immutable configs; reach for sync.Once only for one-time initialization and RWMutex only if readers must also hold state across the read. Verify the whole design under go test -race, since the race detector is the practical oracle for happens-before violations.",
      },
      keyPoints: [
        'A data race in Go is undefined behavior, not merely a stale-value read; the compiler may assume races never happen.',
        'Happens-before is established only by specific ops: channel send/receive, mutex Lock/Unlock, sync.Once, WaitGroup, and sequentially-consistent atomics.',
        'Channel: a send happens-before the corresponding receive completes; buffered: the k-th receive happens-before the (k+C)-th send completes.',
        'Publication requires a happens-before edge so readers see fully-initialized data; a bare nil-check double-checked lock does not provide one.',
        'Package init happens-before main, and starting a goroutine happens-before it runs, giving transitive visibility of pre-launch writes.',
        'go test -race is the practical verifier; correctness under it means your happens-before edges are actually present.',
      ],
      walkthrough: [
        {
          title: 'Publish via channel',
          caption:
            'main creates an unbuffered channel that will act as the synchronization point publishing the *config to the receiver.',
          focus: ['ch := make(chan *config)'],
          state: [
            {
              k: 'ch',
              v: 'unbuffered chan *config',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
        {
          title: 'Spawn producer',
          caption:
            'A new goroutine is launched; the go statement happens-before the goroutine begins executing, and it builds the config on the heap before sending.',
          focus: ['go func() {', 'c := &config{version: 2, name: "prod"}'],
          state: [
            {
              k: 'goroutines',
              v: '2',
            },
            {
              k: 'c',
              v: '&config{2, "prod"} (heap)',
            },
            {
              k: 'published?',
              v: 'no',
            },
          ],
        },
        {
          title: 'Send blocks',
          caption:
            'The unbuffered send blocks until a receiver is ready; completing the receive is ordered after this send, establishing the happens-before edge.',
          focus: ['ch <- c // send happens-before the matching receive completes'],
          state: [
            {
              k: 'send state',
              v: 'blocked, waiting for receiver',
            },
            {
              k: 'hb edge',
              v: 'send → receive',
            },
          ],
        },
        {
          title: 'Receive observes writes',
          caption:
            'The receive completes and, because send happens-before receive, main is guaranteed to see the fully initialized config rather than a zero or partially written value.',
          focus: ['got := <-ch', 'fmt.Println(got.version, got.name)'],
          state: [
            {
              k: 'got.version',
              v: '2',
            },
            {
              k: 'got.name',
              v: '"prod"',
            },
            {
              k: 'guaranteed?',
              v: 'yes (hb edge)',
            },
          ],
        },
        {
          title: 'Fan out 100 goroutines',
          caption:
            'The loop starts 100 goroutines that each increment the shared counter; without synchronization these increments would race and be undefined behavior.',
          focus: ['for i := 0; i < 100; i++ {', 'wg.Add(1)'],
          state: [
            {
              k: 'goroutines',
              v: 'up to 101',
            },
            {
              k: 'counter',
              v: '0',
            },
            {
              k: 'wg',
              v: '100',
            },
          ],
        },
        {
          title: 'Mutex orders increments',
          caption:
            'Each goroutine takes the lock before touching counter; the n-th Unlock happens-before the (n+1)-th Lock, so every increment observes the previous one.',
          focus: ['mu.Lock()', 'counter++', 'mu.Unlock()'],
          state: [
            {
              k: 'hb edge',
              v: 'Unlock(n) → Lock(n+1)',
            },
            {
              k: 'counter++',
              v: 'read-modify-write, serialized',
            },
          ],
        },
        {
          title: 'Gotcha: no edge = UB',
          caption:
            'If counter++ ran without the mutex there would be no happens-before edge, making it a data race that is undefined behavior, not merely a stale read of 99 vs 100.',
          focus: ['counter++'],
          state: [
            {
              k: 'without mutex',
              v: 'data race = UB',
            },
            {
              k: 'contract',
              v: 'hb is the only guarantee',
            },
          ],
        },
        {
          title: 'Join and read result',
          caption:
            'wg.Wait happens-after every Done, and each Done happens-after its Unlock, so main is guaranteed to observe all 100 increments as 100.',
          focus: ['wg.Wait()', 'fmt.Println(counter)'],
          state: [
            {
              k: 'counter',
              v: '100',
            },
            {
              k: 'guaranteed?',
              v: 'yes (Wait after all Done)',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
      ],
    },
    {
      id: 'go-mem-pool-alloc',
      title: 'Allocation control & sync.Pool',
      difficulty: 'Hard',
      tags: ['runtime', 'memory', 'sync.Pool', 'gc', 'performance', 'false-sharing'],
      summary:
        'Cut allocations with sync.Pool, preallocation, and cache-aware layout — and know exactly when each backfires.',
      pattern: 'Pool & alloc',
      visual:
        'Per-P private/shared free lists feed Get; each GC promotes primary to victim and drops the old victim, so a pooled object lives across at most ~2 GC cycles.',
      memorize:
        'Pool = per-P cache cleared by GC (2-cycle life); Reset before Put; store pointers not values; pad hot fields to 64B to kill false sharing.',
      scene:
        "A recycling bin behind each worker's desk that a janitor (the GC) empties every night — leave nothing valuable in it, and wipe every item clean before tossing it back.",
      time: 'O(1) Get/Put amortized',
      space: 'O(P × cached), bounded per GC',
      code: 'package main\n\nimport (\n\t"bytes"\n\t"fmt"\n\t"sync"\n)\n\nvar bufPool = sync.Pool{\n\tNew: func() any { return new(bytes.Buffer) },\n}\n\nfunc render(id int) string {\n\tb := bufPool.Get().(*bytes.Buffer)\n\tdefer func() {\n\t\tb.Reset() // clear state before returning ownership\n\t\tbufPool.Put(b)\n\t}()\n\tfmt.Fprintf(b, "item-%d", id)\n\treturn b.String() // copy out; never leak b\n}\n\n// counter is padded so concurrent updates from different Ps\n// land on distinct 64-byte cache lines (no false sharing).\ntype counter struct {\n\tn uint64\n\t_ [56]byte\n}\n\nfunc main() {\n\tstats := make([]counter, 4)\n\tvar wg sync.WaitGroup\n\tfor p := range stats {\n\t\twg.Add(1)\n\t\tgo func(p int) {\n\t\t\tdefer wg.Done()\n\t\t\tfor i := 0; i < 1000; i++ {\n\t\t\t\tstats[p].n++\n\t\t\t\t_ = render(p*1000 + i)\n\t\t\t}\n\t\t}(p)\n\t}\n\twg.Wait()\n\tvar total uint64\n\tfor i := range stats {\n\t\ttotal += stats[i].n\n\t}\n\tfmt.Println(total)\n}\n',
      quiz: [
        {
          id: 'pool-gc-lifetime',
          prompt:
            'An object is put into a sync.Pool and never retrieved again. Under Go 1.26 semantics, how long can it be expected to survive?',
          choices: [
            {
              label: 'Forever — Pool pins objects strongly',
              correct: false,
            },
            {
              label: 'About 2 GC cycles — victim cache drops survivors',
              correct: true,
            },
            {
              label: 'Until memory pressure — only OOM triggers eviction',
              correct: false,
            },
            {
              label: 'Exactly one GC cycle — cleared on next mark',
              correct: false,
            },
          ],
          explain:
            "Go's Pool keeps a primary and a victim cache; each GC promotes the primary to victim and drops the old victim, so an unused object survives at most about two GC cycles rather than indefinitely.",
        },
        {
          id: 'pool-reset',
          prompt: 'Why must you call b.Reset() before bufPool.Put(b) for a *bytes.Buffer?',
          choices: [
            {
              label: 'Reset frees the backing array — reclaims heap eagerly',
              correct: false,
            },
            {
              label: 'Get returns dirty state — stale bytes leak downstream',
              correct: true,
            },
            {
              label: 'Put panics on non-empty buffers — runtime guard',
              correct: false,
            },
            {
              label: 'Reset re-registers the object — Pool needs fresh identity',
              correct: false,
            },
          ],
          explain:
            'Pool returns objects with whatever state they had; without Reset the next Get sees leftover contents. Reset zeroes the length while retaining the backing capacity, which is exactly the reuse you want.',
        },
        {
          id: 'pool-value-vs-ptr',
          prompt:
            'Why does storing *bytes.Buffer rather than bytes.Buffer in the Pool matter for allocation control?',
          choices: [
            {
              label: 'Interface boxing of values — Put allocates each call',
              correct: true,
            },
            {
              label: 'Values are immutable — Reset cannot mutate them',
              correct: false,
            },
            {
              label: 'Pool rejects non-pointers — compile-time type error',
              correct: false,
            },
            {
              label: 'Values skip the victim cache — cleared immediately',
              correct: false,
            },
          ],
          explain:
            "Pool's Get and Put take and return any (interface{}). Boxing a non-pointer struct value into an interface generally heap-allocates on each Put, defeating the pool's purpose; a pointer boxes without a per-call heap allocation.",
        },
        {
          id: 'false-sharing-pad',
          prompt:
            'The counter struct pads to 64 bytes. What problem does this padding specifically prevent?',
          choices: [
            {
              label: 'Word tearing — non-atomic 64-bit writes split',
              correct: false,
            },
            {
              label: 'False sharing — distinct counters share cache line',
              correct: true,
            },
            {
              label: 'Heap escape — the slice moves off stack',
              correct: false,
            },
            {
              label: 'GC scanning — pointers force mark work',
              correct: false,
            },
          ],
          explain:
            'Adjacent counters would otherwise sit on one 64-byte cache line; a write by one core invalidates the line for others (false sharing), causing coherence traffic. Padding each to a full line isolates them. Note this does not make the ++ atomic — it only removes the coherence contention.',
        },
        {
          id: 'prealloc-cap',
          prompt:
            'Which preallocation choice most reduces GC pressure when building a slice whose final length you know is exactly n?',
          choices: [
            {
              label: 'make([]T, 0, n) — one alloc, no growth reslice',
              correct: true,
            },
            {
              label: 'make([]T, n) then append — grows length past n',
              correct: false,
            },
            {
              label: 'var s []T then append — amortized growth suffices',
              correct: false,
            },
            {
              label: 'make([]T, 0) plus cap hint — cap arg is advisory',
              correct: false,
            },
          ],
          explain:
            'make([]T, 0, n) reserves capacity n at length 0, so n appends never reallocate. make([]T, n) plus append leaves the first n zero elements and appends beyond n; nil-slice append reallocates repeatedly during growth. make([]T, 0) has no capacity hint at all.',
        },
        {
          id: 'pool-get-nil',
          prompt:
            'A sync.Pool is created with no New func. What does Get() return when both the primary and victim caches are empty?',
          choices: [
            {
              label: 'A zero value of the type — Pool infers type',
              correct: false,
            },
            {
              label: 'nil — caller must handle the miss',
              correct: true,
            },
            {
              label: 'It blocks — waits for a Put',
              correct: false,
            },
            {
              label: 'It panics — New is mandatory',
              correct: false,
            },
          ],
          explain:
            'Without a New function, Get returns nil on a miss; it never blocks and never panics. Providing New is the idiom precisely so Get can always yield a usable object.',
        },
      ],
      design: {
        prompt:
          'You maintain a high-QPS JSON API server. Profiling shows heavy allocation from per-request scratch buffers and decoder state. Design an allocation-reduction strategy using sync.Pool and preallocation. What are the tradeoffs, the correctness hazards, and when would you NOT reach for a Pool?',
        answer:
          'Introduce a sync.Pool of reusable per-request objects (e.g. *bytes.Buffer or a struct bundling a buffer plus a reusable decoder), Get at request entry and Put in a deferred cleanup, always Reset()-ing state before Put so no request leaks data into another. Store pointers, not values, to avoid interface-boxing allocations, and pair the pool with preallocation via make([]T, 0, expectedCap) for slices whose size is predictable. The key correctness hazards: never retain a reference to a pooled object after Put (aliasing bugs and cross-request data leaks are the classic sync.Pool footgun), and never pool objects that hold pointers to caller-visible data. The main tradeoff is that Pool is a per-P cache scavenged by the GC (objects live at most ~2 GC cycles), so it excels at high-churn, uniformly-sized, short-lived objects but is ineffective for low-frequency or wildly variably-sized objects — a giant buffer occasionally Put back can pin memory or cause the pool to hand out oversized buffers, so cap-check and drop outliers before Put. It also does nothing for allocations the escape analyzer could have kept on the stack, so first try to eliminate the escape (pass buffers down, avoid interface boxing, avoid closures that capture) before pooling. I would NOT reach for a Pool when allocations are already stack-bound, when object sizes vary by orders of magnitude, or when the added Reset/lifetime discipline outweighs a modest GC win; measure with -benchmem and pprof allocs before and after, since a misused Pool can increase latency variance without reducing steady-state allocation.',
      },
      keyPoints: [
        'sync.Pool is a per-P cache scavenged by the GC; pooled objects survive at most ~2 GC cycles (primary then victim), so it fits high-churn short-lived objects, not long-term caching.',
        'Always Reset object state before Put — Get returns dirty objects, so stale state leaks across users and can leak data between requests.',
        'Store pointers in a Pool, not values: Put/Get take any, and boxing a struct value into an interface generally allocates, defeating the pool.',
        'Preallocate with make([]T, 0, n) to avoid growth reallocations; make([]T, n)+append leaves n leading zeros and grows past n, and nil+append reallocates repeatedly.',
        'Pad hot concurrently-written fields to a 64-byte cache line to prevent false sharing between cores — this removes coherence traffic but does not make the write atomic.',
        'Eliminate heap escapes first (escape analysis) before pooling — Pool cannot help allocations the compiler could keep on the stack.',
      ],
      walkthrough: [
        {
          title: 'Pool declared, lazily empty',
          caption:
            'The package-level sync.Pool is created with only a New hook set; no buffers exist yet — the pool starts empty and allocates on demand.',
          focus: ['var bufPool = sync.Pool{', 'New: func() any { return new(bytes.Buffer) },'],
          state: [
            {
              k: 'pool objects',
              v: '0',
            },
            {
              k: 'New set',
              v: 'true',
            },
          ],
        },
        {
          title: 'Padded counters allocated',
          caption:
            'main allocates a 4-element counter slice; each counter is 64 bytes (8-byte n plus 56-byte pad) so no two counters share a cache line.',
          focus: ['stats := make([]counter, 4)', '_ [56]byte'],
          state: [
            {
              k: 'len(stats)',
              v: '4',
            },
            {
              k: 'sizeof(counter)',
              v: '64B',
            },
            {
              k: 'total bytes',
              v: '256',
            },
          ],
        },
        {
          title: 'Four goroutines launched',
          caption:
            'One goroutine per slice index is spawned, each capturing its own index p by value so writes to stats[p] target a distinct, cache-line-isolated counter.',
          focus: ['go func(p int) {', 'wg.Add(1)'],
          state: [
            {
              k: 'goroutines',
              v: '4',
            },
            {
              k: 'wg counter',
              v: '4',
            },
          ],
        },
        {
          title: 'Get from per-P cache',
          caption:
            "On the first call render does a pool miss and invokes New to allocate a fresh *bytes.Buffer; later calls tend to hit the runtime's per-P cache and reuse a buffer, avoiding an allocation.",
          focus: ['b := bufPool.Get().(*bytes.Buffer)', 'fmt.Fprintf(b, "item-%d", id)'],
          state: [
            {
              k: 'first call',
              v: 'New (miss)',
            },
            {
              k: 'reuse call',
              v: 'per-P hit',
            },
            {
              k: 'buffer',
              v: 'escapes → heap',
            },
          ],
        },
        {
          title: 'Reset then Put',
          caption:
            "The deferred cleanup clears the buffer's contents with Reset before returning it to the pool, so a later Get sees an empty buffer rather than leftover bytes.",
          focus: ['b.Reset()', 'bufPool.Put(b)'],
          state: [
            {
              k: 'buffer len',
              v: '0 after Reset',
            },
            {
              k: 'ownership',
              v: 'returned to pool',
            },
          ],
        },
        {
          title: 'Copy out, never leak',
          caption:
            'b.String() copies the bytes into a new immutable string returned to the caller, so no reference to b escapes after Put reclaims it — reusing b elsewhere would corrupt this result.',
          focus: ['return b.String() // copy out; never leak b'],
          state: [
            {
              k: 'return',
              v: 'owned string copy',
            },
            {
              k: 'b after return',
              v: 'reusable',
            },
          ],
        },
        {
          title: 'Contended updates, no false sharing',
          caption:
            "All four goroutines increment their own stats[p].n concurrently; because each counter sits on its own cache line the cores don't ping-pong ownership, so there is no false-sharing slowdown.",
          focus: ['stats[p].n++', '_ = render(p*1000 + i)'],
          state: [
            {
              k: 'iterations each',
              v: '1000',
            },
            {
              k: 'false sharing',
              v: 'none (64B pad)',
            },
            {
              k: 'data race',
              v: 'none (disjoint p)',
            },
          ],
        },
        {
          title: 'Join and sum',
          caption:
            'wg.Wait blocks until all goroutines finish, then the serial reduction sums the four independent counters to print 4000; a GC at any point may silently drain the pool.',
          focus: ['wg.Wait()', 'total += stats[i].n'],
          state: [
            {
              k: 'total',
              v: '4000',
            },
            {
              k: 'pool after GC',
              v: 'may be empty',
            },
            {
              k: 'goroutines',
              v: '0',
            },
          ],
        },
      ],
    },
  ],
};
