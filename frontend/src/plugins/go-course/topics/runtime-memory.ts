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
