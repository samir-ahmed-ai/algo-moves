import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const performance: GoTopic = {
  id: 'performance',
  title: 'Performance & Profiling',
  icon: 'Gauge',
  concepts: [
    {
      id: 'go-perf-benchmarks',
      title: 'Benchmarks & benchstat',
      difficulty: 'Hard',
      tags: ['performance', 'benchmarks', 'testing', 'benchstat', 'profiling'],
      summary:
        'Write trustworthy microbenchmarks with testing.B and compare them statistically with benchstat.',
      pattern: 'Benchmarks',
      visual: 'go test grows b.N until the timed body runs ~1s, reporting ns/op = elapsed / b.N.',
      memorize:
        'Reset the timer, report allocs, sink the result, run -count and let benchstat judge.',
      scene:
        'A stopwatch that keeps restarting the race until the runners have logged a full second of laps, while a statistician at the finish line refuses to call a winner until she has seen the same race ten times.',
      time: 'O(b.N) per run',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n\t"testing"\n)\n\n// sink defeats dead-code elimination: a package-level variable\n// the compiler cannot prove is unused.\nvar sink string\n\nfunc buildWithBuilder(parts []string) string {\n\tvar b strings.Builder\n\tfor _, p := range parts {\n\t\tb.WriteString(p)\n\t}\n\treturn b.String()\n}\n\nfunc benchmarkBuilder(b *testing.B) {\n\tparts := make([]string, 128)\n\tfor i := range parts {\n\t\tparts[i] = "chunk"\n\t}\n\tb.ReportAllocs()\n\tb.ResetTimer() // exclude the setup above from timing\n\tvar local string\n\tfor i := 0; i < b.N; i++ {\n\t\tlocal = buildWithBuilder(parts)\n\t}\n\tsink = local // publish so the loop body is not eliminated\n}\n\nfunc main() {\n\tres := testing.Benchmark(benchmarkBuilder)\n\tfmt.Printf("%d ns/op, %d B/op, %d allocs/op\\n",\n\t\tres.NsPerOp(), res.AllocedBytesPerOp(), res.AllocsPerOp())\n}\n',
      keyPoints: [
        'b.N is chosen by the runtime; it grows the loop until the timed body reaches ~1s, and ns/op = total/b.N.',
        'Call b.ResetTimer() after setup so fixed setup cost does not fold into and destabilize ns/op.',
        'b.ReportAllocs() enables B/op and allocs/op for that one benchmark; -benchmem does it for all.',
        "Defeat dead-code elimination by publishing results to a package-level sink, or use the Go 1.24+ 'for b.Loop()' form which keeps loop-body values alive.",
        "benchstat needs multiple samples per side (-count>=10) to judge significance; one-vs-one runs report '~'.",
        'In b.RunParallel, ResetTimer once before starting and keep per-goroutine setup outside the pb.Next() loop.',
      ],
      walkthrough: [
        {
          title: 'Setup before timing',
          caption:
            'benchmarkBuilder builds a 128-element slice of "chunk" strings as fixture data before any measurement begins.',
          focus: ['parts := make([]string, 128)', 'parts[i] = "chunk"'],
          state: [
            {
              k: 'len(parts)',
              v: '128',
            },
            {
              k: 'timer',
              v: 'running (default)',
            },
          ],
        },
        {
          title: 'Report allocations',
          caption:
            'ReportAllocs enables per-op allocation accounting so the harness also emits B/op and allocs/op alongside ns/op.',
          focus: ['b.ReportAllocs()'],
          state: [
            {
              k: 'alloc reporting',
              v: 'on',
            },
          ],
        },
        {
          title: 'Reset the timer',
          caption:
            'ResetTimer zeroes the elapsed time and memory allocation counters so the fixture setup above is excluded from the reported cost.',
          focus: ['b.ResetTimer()'],
          state: [
            {
              k: 'elapsed',
              v: '0',
            },
            {
              k: 'alloc counters',
              v: '0',
            },
            {
              k: 'setup cost',
              v: 'excluded',
            },
          ],
        },
        {
          title: 'Drive the b.N loop',
          caption:
            'The harness chooses b.N and reruns this loop, growing N until the measured wall time is long enough to be statistically stable.',
          focus: ['for i := 0; i < b.N; i++ {', 'local = buildWithBuilder(parts)'],
          state: [
            {
              k: 'b.N',
              v: 'grows (e.g. 1e6)',
            },
            {
              k: 'local',
              v: 'last result',
            },
          ],
        },
        {
          title: 'Builder grows and copies',
          caption:
            'Each call appends 128 chunks into a strings.Builder; the backing buffer grows by doubling, so it reallocates several times as it reaches 640 bytes before returning the joined string.',
          focus: ['var b strings.Builder', 'b.WriteString(p)'],
          state: [
            {
              k: 'allocs/op',
              v: 'several (grow steps)',
            },
            {
              k: 'result len',
              v: '640 bytes',
            },
          ],
        },
        {
          title: 'Sink the result',
          caption:
            "Assigning the loop's output to the package-level sink prevents dead-code elimination, so the compiler cannot delete buildWithBuilder as unused work.",
          focus: ['sink = local', 'var sink string'],
          state: [
            {
              k: 'sink',
              v: 'published',
            },
            {
              k: 'DCE',
              v: 'defeated',
            },
          ],
        },
        {
          title: 'Read the per-op metrics',
          caption:
            'testing.Benchmark returns a BenchmarkResult whose NsPerOp, AllocedBytesPerOp, and AllocsPerOp divide totals by b.N to give stable per-operation numbers.',
          focus: [
            'res := testing.Benchmark(benchmarkBuilder)',
            'res.NsPerOp(), res.AllocedBytesPerOp(), res.AllocsPerOp()',
          ],
          state: [
            {
              k: 'metrics',
              v: 'ns/op, B/op, allocs/op',
            },
          ],
        },
        {
          title: 'Compare with benchstat',
          caption:
            'Running the real benchmark with go test -bench -count=10 twice (old vs new) and feeding both outputs to benchstat yields a statistical delta with confidence rather than a single noisy number.',
          focus: ['func benchmarkBuilder(b *testing.B)'],
          state: [
            {
              k: '-count',
              v: '>= 10',
            },
            {
              k: 'benchstat',
              v: 'reports p-value & %delta',
            },
          ],
        },
      ],
    },
    {
      id: 'go-perf-pprof',
      title: 'pprof: CPU & heap profiling',
      difficulty: 'Hard',
      tags: ['performance', 'profiling', 'pprof', 'runtime', 'observability'],
      summary:
        'Capture and read CPU and heap profiles with runtime/pprof and net/http/pprof, and interpret flat/cum and inuse/alloc samples.',
      pattern: 'pprof',
      visual:
        'CPU profiler SIGPROF-samples the stack ~100x/s; heap profiler records one sample per ~512KiB allocated.',
      memorize:
        'CPU = timer sampling of stacks; heap = size-sampled allocs. flat=self, cum=self+callees; inuse=live, alloc=cumulative.',
      scene:
        "A stroboscope flashing 100 times a second onto a running goroutine's call stack, freezing which function was on top each flash — that's your CPU profile.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"log"\n\t"os"\n\t"runtime"\n\t"runtime/pprof"\n)\n\nfunc work(n int) int {\n\tsum := 0\n\tfor i := 0; i < n; i++ {\n\t\tsum += i * i\n\t}\n\treturn sum\n}\n\nfunc main() {\n\tcpu, err := os.Create("cpu.prof")\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tdefer cpu.Close()\n\n\tif err := pprof.StartCPUProfile(cpu); err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tfor i := 0; i < 2000; i++ {\n\t\t_ = work(100000)\n\t}\n\tpprof.StopCPUProfile()\n\n\tmem, err := os.Create("heap.prof")\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tdefer mem.Close()\n\n\truntime.GC()\n\tif err := pprof.WriteHeapProfile(mem); err != nil {\n\t\tlog.Fatal(err)\n\t}\n}\n',
      keyPoints: [
        'CPU profiling is SIGPROF stack sampling (~100Hz) and only sees on-CPU time; blocked/syscall time needs block/mutex profiles or the tracer.',
        'flat = time in the function itself; cum = flat plus all callees — use cum to find the subtree cost, flat to find the actual hot code.',
        'Heap profile has four sample types: inuse_space/inuse_objects (live, for leaks) and alloc_space/alloc_objects (cumulative, for GC/allocation pressure).',
        'Heap sampling is size-based (runtime.MemProfileRate, default 512KiB); call runtime.GC() before WriteHeapProfile for accurate live numbers.',
        "net/http/pprof's blank import only registers /debug/pprof handlers on DefaultServeMux; it starts no profiling and should be on an internal port only.",
        'Flame graphs stack frames by width = cum time/bytes; wide plateaus are hotspots, and diff mode reveals regressions across builds.',
      ],
      walkthrough: [
        {
          title: 'Open CPU profile file',
          caption:
            'main creates cpu.prof on disk as the destination file that pprof will write the CPU profiling data into.',
          focus: ['cpu, err := os.Create("cpu.prof")'],
          state: [
            {
              k: 'cpu.prof',
              v: 'created (empty)',
            },
            {
              k: 'profiling',
              v: 'off',
            },
          ],
        },
        {
          title: 'Start CPU profiling',
          caption:
            "StartCPUProfile enables the runtime's SIGPROF-based profiler (~100 Hz) that periodically interrupts the program and records the current call stack as a sample.",
          focus: ['pprof.StartCPUProfile(cpu)'],
          state: [
            {
              k: 'CPU sampler',
              v: 'on ~100Hz',
            },
            {
              k: 'samples',
              v: '0',
            },
            {
              k: 'unit',
              v: 'time on-CPU',
            },
          ],
        },
        {
          title: 'Run the hot loop',
          caption:
            'The 2000-iteration loop keeps work() on-CPU, so most profiler interrupts catch stacks inside work, accumulating samples there.',
          focus: ['for i := 0; i < 2000; i++ {', '_ = work(100000)'],
          state: [
            {
              k: 'top of stack',
              v: 'main → work',
            },
            {
              k: 'samples',
              v: 'growing',
            },
            {
              k: 'work flat',
              v: 'high (self CPU)',
            },
            {
              k: 'main cum',
              v: 'high (self+callees)',
            },
          ],
        },
        {
          title: 'work does the CPU labor',
          caption:
            "The arithmetic loop is where instructions actually retire, so work carries a large flat (self) time while main's flat stays near zero.",
          focus: ['sum += i * i'],
          state: [
            {
              k: 'work flat',
              v: '~all CPU',
            },
            {
              k: 'work cum',
              v: '= flat (no callees)',
            },
            {
              k: 'main flat',
              v: '~0',
            },
          ],
        },
        {
          title: 'Stop CPU profiling',
          caption:
            'StopCPUProfile disables the profiler and flushes the aggregated stack samples to cpu.prof, which now holds the complete CPU profile.',
          focus: ['pprof.StopCPUProfile()'],
          state: [
            {
              k: 'CPU sampler',
              v: 'off',
            },
            {
              k: 'cpu.prof',
              v: 'written',
            },
          ],
        },
        {
          title: 'Force a GC before heap snapshot',
          caption:
            'runtime.GC() runs a full collection so unreachable objects are freed first, making the upcoming inuse_space reflect only live memory rather than not-yet-collected garbage.',
          focus: ['runtime.GC()'],
          state: [
            {
              k: 'heap',
              v: 'swept',
            },
            {
              k: 'inuse target',
              v: 'live objects only',
            },
            {
              k: 'alloc_space',
              v: 'still cumulative',
            },
          ],
        },
        {
          title: 'Write the heap profile',
          caption:
            'WriteHeapProfile emits an allocation-sampled snapshot: inuse_space/inuse_objects (live now) plus alloc_space/alloc_objects (cumulative since start), defaulting to the inuse view.',
          focus: ['pprof.WriteHeapProfile(mem)'],
          state: [
            {
              k: 'heap.prof',
              v: 'written',
            },
            {
              k: 'sample rate',
              v: '~512KB avg',
            },
            {
              k: 'inuse',
              v: 'live',
            },
            {
              k: 'alloc',
              v: 'cumulative',
            },
          ],
        },
        {
          title: 'Files close on return',
          caption:
            'As main returns the deferred Close calls run in LIFO order (mem then cpu), closing both profile files.',
          focus: ['defer cpu.Close()', 'defer mem.Close()'],
          state: [
            {
              k: 'defer order',
              v: 'mem then cpu',
            },
            {
              k: 'cpu.prof',
              v: 'closed',
            },
            {
              k: 'heap.prof',
              v: 'closed',
            },
          ],
        },
      ],
    },
    {
      id: 'go-perf-allocations',
      title: 'Reducing allocations & inlining',
      difficulty: 'Hard',
      tags: ['performance', 'allocations', 'inlining', 'gc', 'strings'],
      summary: 'Cut heap traffic and keep hot functions inlinable to speed up Go code.',
      pattern: 'Escape analysis',
      visual: 'Preallocate + keep values on stack; small leaf funcs stay inlined and BCE fires.',
      memorize:
        'Grow to cap, keep concrete not interface, tiny leaf funcs inline, hoist len for BCE.',
      scene:
        'A bricklayer who measures the whole wall first (Grow), lays bricks without re-checking the plumb line each time (BCE), and never boxes a brick in a crate to carry it one meter (no interface{}).',
      time: 'O(n)',
      space: 'O(n)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\n// joinNaive builds the result with repeated string concatenation, forcing a\n// fresh heap allocation and full copy on every iteration: O(n^2) bytes copied.\nfunc joinNaive(parts []string) string {\n\tvar s string\n\tfor _, p := range parts {\n\t\ts += p\n\t}\n\treturn s\n}\n\n// joinFast preallocates the exact byte capacity, then writes into a\n// strings.Builder whose backing array never has to grow.\nfunc joinFast(parts []string) string {\n\ttotal := 0\n\tfor _, p := range parts {\n\t\ttotal += len(p)\n\t}\n\tvar b strings.Builder\n\tb.Grow(total)\n\tfor _, p := range parts {\n\t\tb.WriteString(p)\n\t}\n\treturn b.String()\n}\n\n// sumBCE hoists the length so the compiler can prove i is always in range and\n// eliminate the per-iteration bounds check on xs[i].\nfunc sumBCE(xs []int) int {\n\tsum := 0\n\tfor i := 0; i < len(xs); i++ {\n\t\tsum += xs[i]\n\t}\n\treturn sum\n}\n\nfunc main() {\n\tparts := []string{"algo", "-", "moves", "!"}\n\tfmt.Println(joinNaive(parts) == joinFast(parts))\n\tfmt.Println(sumBCE([]int{1, 2, 3, 4}))\n}\n',
      keyPoints: [
        'Preallocate exact capacity (make with cap, Builder.Grow) to collapse geometric regrowth into one allocation.',
        'Boxing non-pointer values into interfaces (any) can force heap allocs in hot loops; prefer concrete types or generics.',
        "Keep hot leaf functions under the inliner's node budget so inlining and downstream optimizations (like BCE) can fire.",
        'Bounds-check elimination fires when the prover can derive 0<=i and i<len(s); hoisting len and idiomatic loops help.',
        'strings.Builder writes into a single heap buffer and String() avoids a copy; copying a used Builder panics by design.',
        'Measure with -benchmem and -gcflags=-m before optimizing; reserve sync.Pool and unsafe for justified, benchmarked cases.',
      ],
      walkthrough: [
        {
          title: 'Enter joinNaive',
          caption:
            'main calls joinNaive with the 4-element slice; s starts as an empty string header pointing at no backing bytes.',
          focus: ['var s string', 'joinNaive(parts)'],
          state: [
            {
              k: 'parts',
              v: '[algo - moves !]',
            },
            {
              k: 's',
              v: '""',
            },
            {
              k: 'heap allocs',
              v: '0',
            },
          ],
        },
        {
          title: 'Concatenation reallocates',
          caption:
            'Each non-empty s += p calls runtime.concatstrings, which allocates a fresh backing array and copies all prior bytes plus p, so total bytes copied grows O(n^2).',
          focus: ['s += p'],
          state: [
            {
              k: 's',
              v: '"algo-moves!"',
            },
            {
              k: 'heap allocs',
              v: '~3 (grows each step)',
            },
            {
              k: 'bytes copied',
              v: 'O(n^2)',
            },
          ],
        },
        {
          title: 'joinFast sizes first',
          caption:
            'joinFast walks the parts once summing len(p) so it knows the exact final byte count before writing anything.',
          focus: ['total += len(p)'],
          state: [
            {
              k: 'total',
              v: '11',
            },
            {
              k: 'heap allocs',
              v: '0 so far',
            },
          ],
        },
        {
          title: 'Grow preallocates once',
          caption:
            "b.Grow(total) makes a single allocation of the exact capacity, so the Builder's backing array will never have to grow again.",
          focus: ['b.Grow(total)'],
          state: [
            {
              k: 'builder cap',
              v: '11',
            },
            {
              k: 'builder len',
              v: '0',
            },
            {
              k: 'heap allocs',
              v: '1 (final)',
            },
          ],
        },
        {
          title: 'Write without regrowth',
          caption:
            'Each b.WriteString(p) appends into the pre-sized buffer; the compiler inlines WriteString and no reallocation or copy of old data occurs.',
          focus: ['b.WriteString(p)', 'return b.String()'],
          state: [
            {
              k: 'builder len',
              v: '11',
            },
            {
              k: 'builder cap',
              v: '11',
            },
            {
              k: 'reallocs',
              v: '0',
            },
          ],
        },
        {
          title: 'sumBCE hoists len',
          caption:
            'The loop condition compares against len(xs) so the compiler can prove i is in range for every xs[i] access.',
          focus: ['i < len(xs)', 'xs[i]'],
          state: [
            {
              k: 'len(xs)',
              v: '4',
            },
            {
              k: 'bounds checks',
              v: 'eliminated',
            },
          ],
        },
        {
          title: 'Bounds check eliminated',
          caption:
            'With the range proof in place the generated code drops the per-iteration bounds check, and sumBCE (inline cost 25) is small enough to inline into main.',
          focus: ['sum += xs[i]', 'func sumBCE(xs []int) int'],
          state: [
            {
              k: 'sum',
              v: '10',
            },
            {
              k: 'sumBCE inlined',
              v: 'yes',
            },
            {
              k: 'BCE',
              v: 'applied',
            },
          ],
        },
        {
          title: 'Program prints results',
          caption:
            'main prints true (both joins produce the same string) and 10 (the sum); joinNaive and sumBCE are inlined into main while joinFast stays a real call (inline cost 134 > budget 80).',
          focus: [
            'fmt.Println(joinNaive(parts) == joinFast(parts))',
            'fmt.Println(sumBCE([]int{1, 2, 3, 4}))',
          ],
          state: [
            {
              k: 'output',
              v: 'true / 10',
            },
            {
              k: 'inlined',
              v: 'joinNaive, sumBCE',
            },
            {
              k: 'not inlined',
              v: 'joinFast (cost 134)',
            },
          ],
        },
      ],
    },
    {
      id: 'go-perf-datastructures',
      title: 'Choosing structures for performance',
      difficulty: 'Hard',
      tags: ['performance', 'memory', 'slices', 'maps', 'cache', 'structs'],
      summary: 'Pick data structures by memory layout and access pattern, not just Big-O.',
      pattern: 'Structures',
      visual:
        'Slices sit in one contiguous array; maps hash into scattered buckets; padding wastes bytes.',
      memorize:
        'Contiguous beats pointer-chasing; order fields big-to-small; comparable keys only.',
      scene:
        'A librarian sprints down one packed shelf (slice) versus zig-zagging across a warehouse of scattered bins (map/linked list).',
      time: 'slice scan O(n); map get O(1) avg',
      space: 'slice n*sizeof(T); map has bucket overhead',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"unsafe"\n)\n\n// Bad ordering: bool, int64, bool -> padding bloats the struct.\ntype Bad struct {\n\ta bool\n\tb int64\n\tc bool\n}\n\n// Good ordering: largest-to-smallest packs fields tightly.\ntype Good struct {\n\tb int64\n\ta bool\n\tc bool\n}\n\n// Point is a small value type stored contiguously in a slice.\ntype Point struct {\n\tX, Y int32\n}\n\nfunc sumX(pts []Point) int64 {\n\tvar total int64\n\tfor i := range pts {\n\t\ttotal += int64(pts[i].X)\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Printf("Bad  size=%d align=%d\\n", unsafe.Sizeof(Bad{}), unsafe.Alignof(Bad{}))\n\tfmt.Printf("Good size=%d align=%d\\n", unsafe.Sizeof(Good{}), unsafe.Alignof(Good{}))\n\n\tpts := make([]Point, 0, 4)\n\tfor i := int32(0); i < 4; i++ {\n\t\tpts = append(pts, Point{X: i, Y: i * i})\n\t}\n\tfmt.Println("sumX:", sumX(pts))\n\n\t// map keyed by a comparable struct: fast lookups, no allocation per key.\n\tseen := make(map[Point]bool, len(pts))\n\tfor _, p := range pts {\n\t\tseen[p] = true\n\t}\n\tfmt.Println("distinct points:", len(seen))\n}\n',
      keyPoints: [
        'Choose by access pattern and memory layout; Big-O hides the constant factors that dominate at scale.',
        'Slices are contiguous and cache/prefetch friendly; maps scatter across buckets and iterate in randomized order.',
        'Order struct fields largest-to-smallest to minimize alignment padding and shrink footprint.',
        'Map keys must be comparable: slices, maps, and funcs are illegal; key by string(bytes) or a comparable struct.',
        'Value struct keys dedupe by content; pointer keys dedupe by identity.',
        'Prefer an ID-to-index map over a map of full records to keep the records contiguous for scans.',
      ],
      walkthrough: [
        {
          title: 'Bad struct laid out',
          caption:
            'unsafe.Sizeof reports Bad as 24 bytes: the int64 needs 8-byte alignment, so 7 padding bytes follow field a and 7 trailing padding bytes follow field c.',
          focus: ['type Bad struct {', 'a bool'],
          state: [
            {
              k: 'Bad size',
              v: '24',
            },
            {
              k: 'Bad align',
              v: '8',
            },
            {
              k: 'padding',
              v: '14 bytes wasted',
            },
          ],
        },
        {
          title: 'Good struct laid out',
          caption:
            'Reordering fields largest-to-smallest places the two bools right after the int64, so only trailing padding remains and Good shrinks to 16 bytes.',
          focus: ['type Good struct {', 'b int64'],
          state: [
            {
              k: 'Good size',
              v: '16',
            },
            {
              k: 'Bad size',
              v: '24',
            },
            {
              k: 'savings',
              v: '8 bytes / value',
            },
          ],
        },
        {
          title: 'Print the sizes',
          caption:
            'main prints both sizes, making the 24-vs-16 difference visible — the same fields, only the declaration order changed.',
          focus: ['unsafe.Sizeof(Bad{})', 'unsafe.Sizeof(Good{})'],
          state: [
            {
              k: 'stdout',
              v: 'Bad size=24 align=8',
            },
            {
              k: 'stdout',
              v: 'Good size=16 align=8',
            },
          ],
        },
        {
          title: 'Build contiguous slice',
          caption:
            'A slice of Point values is preallocated with cap 4 and filled, so all 4 points live back-to-back in one backing array with no per-element pointers.',
          focus: ['make([]Point, 0, 4)', 'Point{X: i, Y: i * i}'],
          state: [
            {
              k: 'len(pts)',
              v: '4',
            },
            {
              k: 'cap(pts)',
              v: '4',
            },
            {
              k: 'layout',
              v: 'contiguous, 8B each',
            },
            {
              k: 'reallocs',
              v: '0',
            },
          ],
        },
        {
          title: 'Cache-friendly sum',
          caption:
            'sumX walks the slice by index; because the Point values sit contiguously in memory, the CPU streams cache lines linearly instead of chasing pointers.',
          focus: ['for i := range pts', 'total += int64(pts[i].X)'],
          state: [
            {
              k: 'total',
              v: '0+1+2+3 = 6',
            },
            {
              k: 'access',
              v: 'sequential',
            },
            {
              k: 'cache misses',
              v: 'minimal',
            },
          ],
        },
        {
          title: 'Comparable struct key',
          caption:
            'Point has only int32 fields, so it is comparable and can be used directly as a map key without allocating to build the key.',
          focus: ['make(map[Point]bool, len(pts))', 'seen[p] = true'],
          state: [
            {
              k: 'key type',
              v: 'Point (comparable)',
            },
            {
              k: 'map hint',
              v: '4',
            },
            {
              k: 'key alloc',
              v: 'none',
            },
          ],
        },
        {
          title: 'Distinct count',
          caption:
            "All four points are unique, so len(seen) is 4 — the map hashes Point's fields to determine key identity and equality.",
          focus: ['fmt.Println("distinct points:", len(seen))'],
          state: [
            {
              k: 'len(seen)',
              v: '4',
            },
            {
              k: 'stdout',
              v: 'distinct points: 4',
            },
          ],
        },
      ],
    },
  ],
};
