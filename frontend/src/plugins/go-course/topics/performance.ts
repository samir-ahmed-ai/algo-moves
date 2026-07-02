import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const performance: GoTopic = {
  "id": "performance",
  "title": "Performance & Profiling",
  "icon": "Gauge",
  "concepts": [
    {
      "id": "go-perf-benchmarks",
      "title": "Benchmarks & benchstat",
      "difficulty": "Hard",
      "tags": [
        "performance",
        "benchmarks",
        "testing",
        "benchstat",
        "profiling"
      ],
      "summary": "Write trustworthy microbenchmarks with testing.B and compare them statistically with benchstat.",
      "pattern": "Benchmarks",
      "visual": "go test grows b.N until the timed body runs ~1s, reporting ns/op = elapsed / b.N.",
      "memorize": "Reset the timer, report allocs, sink the result, run -count and let benchstat judge.",
      "scene": "A stopwatch that keeps restarting the race until the runners have logged a full second of laps, while a statistician at the finish line refuses to call a winner until she has seen the same race ten times.",
      "time": "O(b.N) per run",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n\t\"testing\"\n)\n\n// sink defeats dead-code elimination: a package-level variable\n// the compiler cannot prove is unused.\nvar sink string\n\nfunc buildWithBuilder(parts []string) string {\n\tvar b strings.Builder\n\tfor _, p := range parts {\n\t\tb.WriteString(p)\n\t}\n\treturn b.String()\n}\n\nfunc benchmarkBuilder(b *testing.B) {\n\tparts := make([]string, 128)\n\tfor i := range parts {\n\t\tparts[i] = \"chunk\"\n\t}\n\tb.ReportAllocs()\n\tb.ResetTimer() // exclude the setup above from timing\n\tvar local string\n\tfor i := 0; i < b.N; i++ {\n\t\tlocal = buildWithBuilder(parts)\n\t}\n\tsink = local // publish so the loop body is not eliminated\n}\n\nfunc main() {\n\tres := testing.Benchmark(benchmarkBuilder)\n\tfmt.Printf(\"%d ns/op, %d B/op, %d allocs/op\\n\",\n\t\tres.NsPerOp(), res.AllocedBytesPerOp(), res.AllocsPerOp())\n}\n",
      "quiz": [
        {
          "id": "what-is-bn",
          "prompt": "What determines the value of b.N inside a benchmark function, and why must the body be a loop over it?",
          "choices": [
            {
              "label": "chosen by the runtime — grows until the body runs long enough",
              "correct": true
            },
            {
              "label": "fixed at 1000 — standard iteration count for all benchmarks"
            },
            {
              "label": "set by -count — that flag controls b.N directly"
            },
            {
              "label": "equal to GOMAXPROCS — one iteration per logical CPU"
            }
          ],
          "explain": "The testing framework calls the function repeatedly with increasing b.N until the timed body accumulates roughly the benchmark time (default ~1s), then reports ns/op = total time / b.N. The loop lets it amortize a stable per-op cost. -count controls how many times each benchmark is re-run, not b.N."
        },
        {
          "id": "resettimer-purpose",
          "prompt": "A benchmark does expensive setup (loading a file) before its loop but does NOT call b.ResetTimer(). What is the concrete consequence?",
          "choices": [
            {
              "label": "setup folds into ns/op — inflated and N-dependent numbers",
              "correct": true
            },
            {
              "label": "no effect — setup before the loop is never timed"
            },
            {
              "label": "the benchmark panics — timer must be reset first"
            },
            {
              "label": "allocs/op doubles — setup allocations counted twice"
            }
          ],
          "explain": "The timer starts when the function is entered, so pre-loop work is included in the measured elapsed time. Since ns/op divides by b.N, the fixed setup cost is amortized differently at each b.N, producing unstable, inflated results unless ResetTimer clears it."
        },
        {
          "id": "sink-elimination",
          "prompt": "Why can a benchmark that computes a pure result and ignores it report an absurdly low or zero ns/op?",
          "choices": [
            {
              "label": "dead-code elimination — compiler drops the unused computation",
              "correct": true
            },
            {
              "label": "b.N stays 1 — runtime skips loops with no side effects"
            },
            {
              "label": "the timer never starts — pure functions are not instrumented"
            },
            {
              "label": "inlining caches the result — later iterations run free"
            }
          ],
          "explain": "If the result never escapes or is observed, the optimizer may prove the call has no effect and eliminate it entirely, timing an empty loop. Assigning to a package-level sink forces the compiler to treat the result as observed; alternatively the Go 1.24+ 'for b.Loop() { ... }' form keeps loop-body values alive (via a runtime.KeepAlive intrinsic) so the body cannot be optimized away."
        },
        {
          "id": "reportallocs-scope",
          "prompt": "You call b.ReportAllocs() in one benchmark but run the package with -benchmem absent. What is reported for allocations?",
          "choices": [
            {
              "label": "only that benchmark shows B/op — ReportAllocs is per-benchmark",
              "correct": true
            },
            {
              "label": "nothing — allocation stats require the -benchmem flag"
            },
            {
              "label": "all benchmarks show B/op — one call enables it package-wide"
            },
            {
              "label": "a compile error — ReportAllocs conflicts with missing -benchmem"
            }
          ],
          "explain": "b.ReportAllocs() enables allocation reporting for just the benchmark that calls it, independent of the global -benchmem flag. -benchmem enables the same columns for every benchmark in the run; the two are complementary, not mutually required."
        },
        {
          "id": "benchstat-count",
          "prompt": "You run 'go test -bench=.' once into old.txt, change code, run once into new.txt, and benchstat reports '~' (no significant difference). Why is this expected regardless of the real change?",
          "choices": [
            {
              "label": "n=1 per side — benchstat cannot establish significance",
              "correct": true
            },
            {
              "label": "benchstat needs identical b.N — differing N voids the test"
            },
            {
              "label": "'~' means improvement — benchstat's success marker"
            },
            {
              "label": "single files are averaged — the delta is discarded"
            }
          ],
          "explain": "benchstat performs a statistical test (Mann-Whitney U under its default AssumeNothing model) and needs multiple samples per side to estimate variance. With one measurement each it lacks the samples to reject the null hypothesis, so it prints '~'. Use -count=10 (or more) on both runs."
        },
        {
          "id": "parallel-timer",
          "prompt": "In a b.RunParallel benchmark, where should b.ResetTimer() and per-goroutine setup live to produce correct ns/op?",
          "choices": [
            {
              "label": "ResetTimer before RunParallel — per-goroutine setup outside pb loop",
              "correct": true
            },
            {
              "label": "ResetTimer inside each pb.Next() call — reset every op"
            },
            {
              "label": "ResetTimer inside the closure — after pb is created"
            },
            {
              "label": "no reset needed — RunParallel auto-excludes setup"
            }
          ],
          "explain": "Timing is global to the benchmark, so ResetTimer must be called once on the *testing.B before RunParallel starts. Cheap per-goroutine state should be initialized inside the closure but outside the for pb.Next() loop so it is not remeasured each iteration."
        }
      ],
      "design": {
        "prompt": "Your team wants CI to fail a PR when it introduces a performance regression in a hot path. Design a benchmark-based regression gate: what you measure, how you make the numbers trustworthy, how you decide 'this is a real regression,' and what pitfalls will make the gate flaky or useless.",
        "answer": "Start by writing benchmarks that isolate the hot path with realistic inputs, calling b.ResetTimer() after setup, b.ReportAllocs() to track allocations (often a more stable leading indicator than ns/op), and routing results into a package-level sink to defeat dead-code elimination. The core trust problem is variance: a single run is meaningless, so collect multiple samples with -count=10 or more, pin the machine (dedicated runner, disabled turbo/frequency scaling, fixed GOMAXPROCS, no noisy neighbors), and warm caches consistently. For the decision, save a baseline from the merge base and compare with benchstat, which runs a Mann-Whitney U test and reports a delta with a confidence interval and p-value rather than a naive percentage, so gate on statistically significant regressions above a threshold (e.g. >3-5% with p<0.05) so noise does not fail builds. The main pitfalls: shared CI runners inject enormous variance and cause false positives, so many teams run the gate as advisory or on dedicated bare-metal hardware; microbenchmarks can diverge from production behavior (inlining, cache effects, GC pressure at scale) so pair them with allocation counts and occasional profiling; and comparing benchmarks built from different Go versions or flags is invalid. My recommendation is a dedicated isolated runner, benchstat with -count>=10 on both sides, gating primarily on allocs/op plus a generous ns/op band, and treating ns/op alone as a signal to investigate rather than an automatic hard failure."
      },
      "keyPoints": [
        "b.N is chosen by the runtime; it grows the loop until the timed body reaches ~1s, and ns/op = total/b.N.",
        "Call b.ResetTimer() after setup so fixed setup cost does not fold into and destabilize ns/op.",
        "b.ReportAllocs() enables B/op and allocs/op for that one benchmark; -benchmem does it for all.",
        "Defeat dead-code elimination by publishing results to a package-level sink, or use the Go 1.24+ 'for b.Loop()' form which keeps loop-body values alive.",
        "benchstat needs multiple samples per side (-count>=10) to judge significance; one-vs-one runs report '~'.",
        "In b.RunParallel, ResetTimer once before starting and keep per-goroutine setup outside the pb.Next() loop."
      ],
      "walkthrough": [
        {
          "title": "Setup before timing",
          "caption": "benchmarkBuilder builds a 128-element slice of \"chunk\" strings as fixture data before any measurement begins.",
          "focus": [
            "parts := make([]string, 128)",
            "parts[i] = \"chunk\""
          ],
          "state": [
            {
              "k": "len(parts)",
              "v": "128"
            },
            {
              "k": "timer",
              "v": "running (default)"
            }
          ]
        },
        {
          "title": "Report allocations",
          "caption": "ReportAllocs enables per-op allocation accounting so the harness also emits B/op and allocs/op alongside ns/op.",
          "focus": [
            "b.ReportAllocs()"
          ],
          "state": [
            {
              "k": "alloc reporting",
              "v": "on"
            }
          ]
        },
        {
          "title": "Reset the timer",
          "caption": "ResetTimer zeroes the elapsed time and memory allocation counters so the fixture setup above is excluded from the reported cost.",
          "focus": [
            "b.ResetTimer()"
          ],
          "state": [
            {
              "k": "elapsed",
              "v": "0"
            },
            {
              "k": "alloc counters",
              "v": "0"
            },
            {
              "k": "setup cost",
              "v": "excluded"
            }
          ]
        },
        {
          "title": "Drive the b.N loop",
          "caption": "The harness chooses b.N and reruns this loop, growing N until the measured wall time is long enough to be statistically stable.",
          "focus": [
            "for i := 0; i < b.N; i++ {",
            "local = buildWithBuilder(parts)"
          ],
          "state": [
            {
              "k": "b.N",
              "v": "grows (e.g. 1e6)"
            },
            {
              "k": "local",
              "v": "last result"
            }
          ]
        },
        {
          "title": "Builder grows and copies",
          "caption": "Each call appends 128 chunks into a strings.Builder; the backing buffer grows by doubling, so it reallocates several times as it reaches 640 bytes before returning the joined string.",
          "focus": [
            "var b strings.Builder",
            "b.WriteString(p)"
          ],
          "state": [
            {
              "k": "allocs/op",
              "v": "several (grow steps)"
            },
            {
              "k": "result len",
              "v": "640 bytes"
            }
          ]
        },
        {
          "title": "Sink the result",
          "caption": "Assigning the loop's output to the package-level sink prevents dead-code elimination, so the compiler cannot delete buildWithBuilder as unused work.",
          "focus": [
            "sink = local",
            "var sink string"
          ],
          "state": [
            {
              "k": "sink",
              "v": "published"
            },
            {
              "k": "DCE",
              "v": "defeated"
            }
          ]
        },
        {
          "title": "Read the per-op metrics",
          "caption": "testing.Benchmark returns a BenchmarkResult whose NsPerOp, AllocedBytesPerOp, and AllocsPerOp divide totals by b.N to give stable per-operation numbers.",
          "focus": [
            "res := testing.Benchmark(benchmarkBuilder)",
            "res.NsPerOp(), res.AllocedBytesPerOp(), res.AllocsPerOp()"
          ],
          "state": [
            {
              "k": "metrics",
              "v": "ns/op, B/op, allocs/op"
            }
          ]
        },
        {
          "title": "Compare with benchstat",
          "caption": "Running the real benchmark with go test -bench -count=10 twice (old vs new) and feeding both outputs to benchstat yields a statistical delta with confidence rather than a single noisy number.",
          "focus": [
            "func benchmarkBuilder(b *testing.B)"
          ],
          "state": [
            {
              "k": "-count",
              "v": ">= 10"
            },
            {
              "k": "benchstat",
              "v": "reports p-value & %delta"
            }
          ]
        }
      ]
    },
    {
      "id": "go-perf-pprof",
      "title": "pprof: CPU & heap profiling",
      "difficulty": "Hard",
      "tags": [
        "performance",
        "profiling",
        "pprof",
        "runtime",
        "observability"
      ],
      "summary": "Capture and read CPU and heap profiles with runtime/pprof and net/http/pprof, and interpret flat/cum and inuse/alloc samples.",
      "pattern": "pprof",
      "visual": "CPU profiler SIGPROF-samples the stack ~100x/s; heap profiler records one sample per ~512KiB allocated.",
      "memorize": "CPU = timer sampling of stacks; heap = size-sampled allocs. flat=self, cum=self+callees; inuse=live, alloc=cumulative.",
      "scene": "A stroboscope flashing 100 times a second onto a running goroutine's call stack, freezing which function was on top each flash — that's your CPU profile.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"log\"\n\t\"os\"\n\t\"runtime\"\n\t\"runtime/pprof\"\n)\n\nfunc work(n int) int {\n\tsum := 0\n\tfor i := 0; i < n; i++ {\n\t\tsum += i * i\n\t}\n\treturn sum\n}\n\nfunc main() {\n\tcpu, err := os.Create(\"cpu.prof\")\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tdefer cpu.Close()\n\n\tif err := pprof.StartCPUProfile(cpu); err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tfor i := 0; i < 2000; i++ {\n\t\t_ = work(100000)\n\t}\n\tpprof.StopCPUProfile()\n\n\tmem, err := os.Create(\"heap.prof\")\n\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n\tdefer mem.Close()\n\n\truntime.GC()\n\tif err := pprof.WriteHeapProfile(mem); err != nil {\n\t\tlog.Fatal(err)\n\t}\n}\n",
      "quiz": [
        {
          "id": "cpu-sampling",
          "prompt": "How does Go's CPU profiler decide which function to attribute a sample to?",
          "choices": [
            {
              "label": "SIGPROF timer — records the on-CPU stack ~100Hz",
              "correct": true
            },
            {
              "label": "Function entry hooks — instruments every call site"
            },
            {
              "label": "GC assist accounting — charges pauses to callers"
            },
            {
              "label": "Wall-clock tracing — logs every goroutine transition"
            }
          ],
          "explain": "The runtime arms a SIGPROF timer (default 100Hz); each signal records the currently executing stack, so samples reflect on-CPU time, not blocked/off-CPU time."
        },
        {
          "id": "flat-vs-cum",
          "prompt": "A function shows flat=2ms but cum=800ms in a CPU profile. What does this mean?",
          "choices": [
            {
              "label": "Callees dominate — self time is tiny, children heavy",
              "correct": true
            },
            {
              "label": "Body is hot — spends 800ms in its own code"
            },
            {
              "label": "Profile is corrupt — flat must equal cum"
            },
            {
              "label": "Inlining bug — cum double-counts the frame"
            }
          ],
          "explain": "Flat is time in the function's own instructions; cum includes time in everything it calls. Low flat with high cum means the cost is in its callees, so optimizing this function's body won't help."
        },
        {
          "id": "inuse-vs-alloc",
          "prompt": "You have a suspected memory leak. Which heap profile sample type should you inspect?",
          "choices": [
            {
              "label": "inuse_space — live bytes not yet freed",
              "correct": true
            },
            {
              "label": "alloc_space — total bytes ever allocated"
            },
            {
              "label": "alloc_objects — cumulative allocation count"
            },
            {
              "label": "cpu samples — time spent in mallocgc"
            }
          ],
          "explain": "inuse_space/inuse_objects report live (unfreed) memory, which is what grows in a leak. alloc_space/alloc_objects are cumulative since start and stay high even for short-lived garbage."
        },
        {
          "id": "heap-sampling-rate",
          "prompt": "Why might a small but frequently-allocated struct be underrepresented in a default heap profile?",
          "choices": [
            {
              "label": "Size-based sampling — one sample per ~512KiB allocated",
              "correct": true
            },
            {
              "label": "Stack values skipped — profiler tracks only heap objects"
            },
            {
              "label": "GC races WriteHeapProfile — collected before it is seen"
            },
            {
              "label": "Escape analysis filter — small structs dropped from profiles"
            }
          ],
          "explain": "The heap profiler samples on a byte interval (runtime.MemProfileRate, default 512KiB). Rare allocations of small objects may fall between sample points; results are statistically scaled but individual small hotspots can be under-sampled unless the rate is lowered."
        },
        {
          "id": "http-pprof-import",
          "prompt": "What is the effect of `import _ \"net/http/pprof\"` in a server with a default mux?",
          "choices": [
            {
              "label": "Registers /debug/pprof handlers — via package init",
              "correct": true
            },
            {
              "label": "Starts CPU profiling — automatically at startup"
            },
            {
              "label": "Enables block profiler — with zero configuration"
            },
            {
              "label": "Streams profiles — to stdout continuously"
            }
          ],
          "explain": "The blank import runs the package's init, which registers /debug/pprof/* handlers on http.DefaultServeMux. It does not start any profiling; profiles are captured on demand when those endpoints are hit."
        },
        {
          "id": "cpu-vs-blocked",
          "prompt": "A goroutine spends most of its time blocked on a channel receive. Where does it show up in a CPU profile?",
          "choices": [
            {
              "label": "Nearly invisible — CPU profile misses off-CPU waits",
              "correct": true
            },
            {
              "label": "Top hotspot — blocking counts as CPU time"
            },
            {
              "label": "Under runtime.gopark — with full wait duration"
            },
            {
              "label": "In alloc_space — blocking allocates wait records"
            }
          ],
          "explain": "CPU profiling only samples goroutines actually running on a CPU. Time blocked on channels, mutexes, syscalls, or I/O is invisible there; you need the block or mutex profile (or execution tracer) to see off-CPU waits."
        }
      ],
      "design": {
        "prompt": "You need continuous profiling for a fleet of latency-sensitive Go services in production. Design an approach covering which profiles to collect, how to capture them safely, overhead considerations, and how you'd surface regressions.",
        "answer": "Expose net/http/pprof on an internal-only admin port (never the public listener) and have a central collector periodically scrape /debug/pprof/profile (CPU, e.g. 10-30s windows at a low duty cycle), /heap, /goroutine, and optionally /block and /mutex with conservative sampling rates. CPU profiling has modest overhead (~a few percent during the sampling window) and heap profiling's cost is governed by MemProfileRate — lowering it improves fidelity but adds allocation-path overhead, so keep the default (512KiB) in prod unless investigating a specific leak. Block and mutex profiling are off by default and are relatively expensive, so enable them at reduced rates and only where contention is suspected. Stagger scrapes across instances so you never profile the whole fleet at once, and label profiles with build/version so you can diff across releases. For regression detection, store profiles in a system like Pyroscope/Parca/Cloud Profiler that aggregates flame graphs over time and lets you diff a new deploy against baseline on both CPU cum time and inuse_space. The recommendation: always-on lightweight CPU + heap + goroutine scraping with fleet-wide sampling and version labels, block/mutex enabled surgically, and automated flame-graph diffing gated in CI/CD or alerting — this catches gradual leaks (rising inuse_space) and CPU regressions (shifting cum) without the coordination cost of ad-hoc manual capture."
      },
      "keyPoints": [
        "CPU profiling is SIGPROF stack sampling (~100Hz) and only sees on-CPU time; blocked/syscall time needs block/mutex profiles or the tracer.",
        "flat = time in the function itself; cum = flat plus all callees — use cum to find the subtree cost, flat to find the actual hot code.",
        "Heap profile has four sample types: inuse_space/inuse_objects (live, for leaks) and alloc_space/alloc_objects (cumulative, for GC/allocation pressure).",
        "Heap sampling is size-based (runtime.MemProfileRate, default 512KiB); call runtime.GC() before WriteHeapProfile for accurate live numbers.",
        "net/http/pprof's blank import only registers /debug/pprof handlers on DefaultServeMux; it starts no profiling and should be on an internal port only.",
        "Flame graphs stack frames by width = cum time/bytes; wide plateaus are hotspots, and diff mode reveals regressions across builds."
      ],
      "walkthrough": [
        {
          "title": "Open CPU profile file",
          "caption": "main creates cpu.prof on disk as the destination file that pprof will write the CPU profiling data into.",
          "focus": [
            "cpu, err := os.Create(\"cpu.prof\")"
          ],
          "state": [
            {
              "k": "cpu.prof",
              "v": "created (empty)"
            },
            {
              "k": "profiling",
              "v": "off"
            }
          ]
        },
        {
          "title": "Start CPU profiling",
          "caption": "StartCPUProfile enables the runtime's SIGPROF-based profiler (~100 Hz) that periodically interrupts the program and records the current call stack as a sample.",
          "focus": [
            "pprof.StartCPUProfile(cpu)"
          ],
          "state": [
            {
              "k": "CPU sampler",
              "v": "on ~100Hz"
            },
            {
              "k": "samples",
              "v": "0"
            },
            {
              "k": "unit",
              "v": "time on-CPU"
            }
          ]
        },
        {
          "title": "Run the hot loop",
          "caption": "The 2000-iteration loop keeps work() on-CPU, so most profiler interrupts catch stacks inside work, accumulating samples there.",
          "focus": [
            "for i := 0; i < 2000; i++ {",
            "_ = work(100000)"
          ],
          "state": [
            {
              "k": "top of stack",
              "v": "main → work"
            },
            {
              "k": "samples",
              "v": "growing"
            },
            {
              "k": "work flat",
              "v": "high (self CPU)"
            },
            {
              "k": "main cum",
              "v": "high (self+callees)"
            }
          ]
        },
        {
          "title": "work does the CPU labor",
          "caption": "The arithmetic loop is where instructions actually retire, so work carries a large flat (self) time while main's flat stays near zero.",
          "focus": [
            "sum += i * i"
          ],
          "state": [
            {
              "k": "work flat",
              "v": "~all CPU"
            },
            {
              "k": "work cum",
              "v": "= flat (no callees)"
            },
            {
              "k": "main flat",
              "v": "~0"
            }
          ]
        },
        {
          "title": "Stop CPU profiling",
          "caption": "StopCPUProfile disables the profiler and flushes the aggregated stack samples to cpu.prof, which now holds the complete CPU profile.",
          "focus": [
            "pprof.StopCPUProfile()"
          ],
          "state": [
            {
              "k": "CPU sampler",
              "v": "off"
            },
            {
              "k": "cpu.prof",
              "v": "written"
            }
          ]
        },
        {
          "title": "Force a GC before heap snapshot",
          "caption": "runtime.GC() runs a full collection so unreachable objects are freed first, making the upcoming inuse_space reflect only live memory rather than not-yet-collected garbage.",
          "focus": [
            "runtime.GC()"
          ],
          "state": [
            {
              "k": "heap",
              "v": "swept"
            },
            {
              "k": "inuse target",
              "v": "live objects only"
            },
            {
              "k": "alloc_space",
              "v": "still cumulative"
            }
          ]
        },
        {
          "title": "Write the heap profile",
          "caption": "WriteHeapProfile emits an allocation-sampled snapshot: inuse_space/inuse_objects (live now) plus alloc_space/alloc_objects (cumulative since start), defaulting to the inuse view.",
          "focus": [
            "pprof.WriteHeapProfile(mem)"
          ],
          "state": [
            {
              "k": "heap.prof",
              "v": "written"
            },
            {
              "k": "sample rate",
              "v": "~512KB avg"
            },
            {
              "k": "inuse",
              "v": "live"
            },
            {
              "k": "alloc",
              "v": "cumulative"
            }
          ]
        },
        {
          "title": "Files close on return",
          "caption": "As main returns the deferred Close calls run in LIFO order (mem then cpu), closing both profile files.",
          "focus": [
            "defer cpu.Close()",
            "defer mem.Close()"
          ],
          "state": [
            {
              "k": "defer order",
              "v": "mem then cpu"
            },
            {
              "k": "cpu.prof",
              "v": "closed"
            },
            {
              "k": "heap.prof",
              "v": "closed"
            }
          ]
        }
      ]
    },
    {
      "id": "go-perf-allocations",
      "title": "Reducing allocations & inlining",
      "difficulty": "Hard",
      "tags": [
        "performance",
        "allocations",
        "inlining",
        "gc",
        "strings"
      ],
      "summary": "Cut heap traffic and keep hot functions inlinable to speed up Go code.",
      "pattern": "Escape analysis",
      "visual": "Preallocate + keep values on stack; small leaf funcs stay inlined and BCE fires.",
      "memorize": "Grow to cap, keep concrete not interface, tiny leaf funcs inline, hoist len for BCE.",
      "scene": "A bricklayer who measures the whole wall first (Grow), lays bricks without re-checking the plumb line each time (BCE), and never boxes a brick in a crate to carry it one meter (no interface{}).",
      "time": "O(n)",
      "space": "O(n)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n)\n\n// joinNaive builds the result with repeated string concatenation, forcing a\n// fresh heap allocation and full copy on every iteration: O(n^2) bytes copied.\nfunc joinNaive(parts []string) string {\n\tvar s string\n\tfor _, p := range parts {\n\t\ts += p\n\t}\n\treturn s\n}\n\n// joinFast preallocates the exact byte capacity, then writes into a\n// strings.Builder whose backing array never has to grow.\nfunc joinFast(parts []string) string {\n\ttotal := 0\n\tfor _, p := range parts {\n\t\ttotal += len(p)\n\t}\n\tvar b strings.Builder\n\tb.Grow(total)\n\tfor _, p := range parts {\n\t\tb.WriteString(p)\n\t}\n\treturn b.String()\n}\n\n// sumBCE hoists the length so the compiler can prove i is always in range and\n// eliminate the per-iteration bounds check on xs[i].\nfunc sumBCE(xs []int) int {\n\tsum := 0\n\tfor i := 0; i < len(xs); i++ {\n\t\tsum += xs[i]\n\t}\n\treturn sum\n}\n\nfunc main() {\n\tparts := []string{\"algo\", \"-\", \"moves\", \"!\"}\n\tfmt.Println(joinNaive(parts) == joinFast(parts))\n\tfmt.Println(sumBCE([]int{1, 2, 3, 4}))\n}\n",
      "quiz": [
        {
          "id": "builder-grow",
          "prompt": "You call b.Grow(n) on a strings.Builder before writing exactly n bytes with WriteString, then call b.String(). How many heap allocations does the write phase incur, and does String() copy?",
          "choices": [
            {
              "label": "One buffer alloc — String reuses it with no copy",
              "correct": true
            },
            {
              "label": "n allocations — one growth per WriteString call"
            },
            {
              "label": "Two allocs — Grow plus a copy inside String"
            },
            {
              "label": "Zero allocs — Builder writes into stack storage"
            }
          ],
          "explain": "Grow reserves the backing []byte once; writing n bytes never re-grows. Builder.String() does an unsafe []byte-to-string conversion of that same buffer, so no copy occurs, though the buffer itself was heap-allocated once."
        },
        {
          "id": "iface-box",
          "prompt": "Why can passing an int to a func(v any) parameter in a hot loop cause a heap allocation, whereas passing it to func(v int) does not?",
          "choices": [
            {
              "label": "Boxing into any — value escapes via the interface",
              "correct": true
            },
            {
              "label": "any is larger — it copies 24 bytes not 8"
            },
            {
              "label": "any triggers reflection — which always allocates"
            },
            {
              "label": "int is immutable — so it must be duplicated"
            }
          ],
          "explain": "An interface value is two words: a type word plus a data word. A non-pointer like int must be boxed, and the runtime allocates to hold it unless the compiler proves it does not escape (small-int values 0-255 use a static cache). The concrete int parameter stays on the stack. The interface header is 16 bytes, not 24, so that distractor is wrong."
        },
        {
          "id": "inline-budget",
          "prompt": "Go's mid-stack inliner assigns each function a cost budget (~80 nodes) it must fit under. Which construct historically makes a function non-inlinable and thus prevents inlining into its callers' hot path?",
          "choices": [
            {
              "label": "Defining a closure — closures inflate node cost",
              "correct": true
            },
            {
              "label": "A single return statement — return nodes are expensive"
            },
            {
              "label": "Any use of a named result — names blow the budget"
            },
            {
              "label": "Reading a package-level var — globals block inlining"
            }
          ],
          "explain": "Constructs like closures (and, in older toolchains, certain range/for loops) inflate the node cost or were outright disallowed, pushing a function over budget. A named result or a plain return is cheap, and reading a global does not block inlining."
        },
        {
          "id": "bce-hoist",
          "prompt": "In `for i := 0; i < len(s); i++ { _ = s[i] }`, when can the compiler eliminate the bounds check on s[i]?",
          "choices": [
            {
              "label": "Always here — i<len(s) proves i in range",
              "correct": true
            },
            {
              "label": "Only with -gcflags=-B — a build flag required"
            },
            {
              "label": "Never on slices — only on fixed-size arrays"
            },
            {
              "label": "Reassignment matters — only if s stays fixed"
            }
          ],
          "explain": "The prover sees 0<=i (from the init) and i<len(s) (from the condition), so s[i] is provably in range and the check is removed. BCE works on slices and needs no flag; -gcflags=-B disables all bounds checks globally and is unsafe."
        },
        {
          "id": "prealloc-cap",
          "prompt": "You do `out := make([]T, 0, n)` then append n elements. Compared to `var out []T` + n appends, what is the concrete benefit?",
          "choices": [
            {
              "label": "One allocation — no repeated grow-and-copy",
              "correct": true
            },
            {
              "label": "Zero allocations — cap makes the slice stack-only"
            },
            {
              "label": "Faster GC scan — capacity is not scanned"
            },
            {
              "label": "Append becomes O(1) — versus O(n) per call"
            }
          ],
          "explain": "Preallocating capacity avoids geometric regrowth (each growth allocates a new array and copies), collapsing many allocations into one. It does not force the slice onto the stack, unused capacity in a pointer-typed backing array is still scanned, and append is already amortized O(1) either way."
        },
        {
          "id": "builder-copy",
          "prompt": "What runtime check makes copying a strings.Builder value after it has been written to a dangerous bug the API guards against?",
          "choices": [
            {
              "label": "Copy check panics — Builder stores a self pointer",
              "correct": true
            },
            {
              "label": "No guard exists — copies silently share the buffer"
            },
            {
              "label": "Copies deep-clone — so it is always safe"
            },
            {
              "label": "Copy after String() is fine — buf was zeroed"
            }
          ],
          "explain": "strings.Builder keeps an addr *Builder field pointing at itself; after a write, a copied Builder's addr no longer matches, and the next method call panics with \"strings: illegal use of non-zero Builder copied by value\". This prevents two Builders from unsafely aliasing one buffer."
        }
      ],
      "design": {
        "prompt": "A JSON-serialization hot path in your service shows high alloc/op in pprof. Walk through how you would systematically reduce allocations, and discuss where over-optimizing (e.g., aggressive pooling, unsafe string conversions) becomes a liability.",
        "answer": "Start by measuring, not guessing: run `-benchmem` benchmarks and a memory profile to find the top allocation sites, then attack them in order. The cheap, safe wins come first: preallocate slices/maps with `make(..., 0, n)` when the size is known, use strings.Builder with Grow instead of `+=`, and avoid boxing concrete values into `any`/`interface{}` in tight loops (a common hidden cost in reflective encoders). Next, use escape-analysis output (`-gcflags=-m`) to see which values escape and restructure so short-lived values stay on the stack, and keep hot leaf functions small enough to stay under the inlining budget so the compiler can also apply bounds-check elimination. sync.Pool is a strong tool for large, reusable buffers (e.g., per-request encode buffers), but it adds complexity, can pin memory, interacts subtly with GC pacing, and is easy to misuse (retaining references, pooling tiny objects where the pool overhead exceeds the alloc it saves). unsafe string/[]byte conversions eliminate copies but create aliasing hazards and can violate immutability guarantees, so they belong only behind a well-tested, narrowly-scoped helper. My recommendation: exhaust the safe compiler-friendly techniques first, introduce pooling only for measurably hot large buffers with clear ownership, and treat unsafe as a last resort that must be justified by a benchmark and covered by tests; always re-profile after each change so you optimize the real bottleneck rather than a guessed one."
      },
      "keyPoints": [
        "Preallocate exact capacity (make with cap, Builder.Grow) to collapse geometric regrowth into one allocation.",
        "Boxing non-pointer values into interfaces (any) can force heap allocs in hot loops; prefer concrete types or generics.",
        "Keep hot leaf functions under the inliner's node budget so inlining and downstream optimizations (like BCE) can fire.",
        "Bounds-check elimination fires when the prover can derive 0<=i and i<len(s); hoisting len and idiomatic loops help.",
        "strings.Builder writes into a single heap buffer and String() avoids a copy; copying a used Builder panics by design.",
        "Measure with -benchmem and -gcflags=-m before optimizing; reserve sync.Pool and unsafe for justified, benchmarked cases."
      ],
      "walkthrough": [
        {
          "title": "Enter joinNaive",
          "caption": "main calls joinNaive with the 4-element slice; s starts as an empty string header pointing at no backing bytes.",
          "focus": [
            "var s string",
            "joinNaive(parts)"
          ],
          "state": [
            {
              "k": "parts",
              "v": "[algo - moves !]"
            },
            {
              "k": "s",
              "v": "\"\""
            },
            {
              "k": "heap allocs",
              "v": "0"
            }
          ]
        },
        {
          "title": "Concatenation reallocates",
          "caption": "Each non-empty s += p calls runtime.concatstrings, which allocates a fresh backing array and copies all prior bytes plus p, so total bytes copied grows O(n^2).",
          "focus": [
            "s += p"
          ],
          "state": [
            {
              "k": "s",
              "v": "\"algo-moves!\""
            },
            {
              "k": "heap allocs",
              "v": "~3 (grows each step)"
            },
            {
              "k": "bytes copied",
              "v": "O(n^2)"
            }
          ]
        },
        {
          "title": "joinFast sizes first",
          "caption": "joinFast walks the parts once summing len(p) so it knows the exact final byte count before writing anything.",
          "focus": [
            "total += len(p)"
          ],
          "state": [
            {
              "k": "total",
              "v": "11"
            },
            {
              "k": "heap allocs",
              "v": "0 so far"
            }
          ]
        },
        {
          "title": "Grow preallocates once",
          "caption": "b.Grow(total) makes a single allocation of the exact capacity, so the Builder's backing array will never have to grow again.",
          "focus": [
            "b.Grow(total)"
          ],
          "state": [
            {
              "k": "builder cap",
              "v": "11"
            },
            {
              "k": "builder len",
              "v": "0"
            },
            {
              "k": "heap allocs",
              "v": "1 (final)"
            }
          ]
        },
        {
          "title": "Write without regrowth",
          "caption": "Each b.WriteString(p) appends into the pre-sized buffer; the compiler inlines WriteString and no reallocation or copy of old data occurs.",
          "focus": [
            "b.WriteString(p)",
            "return b.String()"
          ],
          "state": [
            {
              "k": "builder len",
              "v": "11"
            },
            {
              "k": "builder cap",
              "v": "11"
            },
            {
              "k": "reallocs",
              "v": "0"
            }
          ]
        },
        {
          "title": "sumBCE hoists len",
          "caption": "The loop condition compares against len(xs) so the compiler can prove i is in range for every xs[i] access.",
          "focus": [
            "i < len(xs)",
            "xs[i]"
          ],
          "state": [
            {
              "k": "len(xs)",
              "v": "4"
            },
            {
              "k": "bounds checks",
              "v": "eliminated"
            }
          ]
        },
        {
          "title": "Bounds check eliminated",
          "caption": "With the range proof in place the generated code drops the per-iteration bounds check, and sumBCE (inline cost 25) is small enough to inline into main.",
          "focus": [
            "sum += xs[i]",
            "func sumBCE(xs []int) int"
          ],
          "state": [
            {
              "k": "sum",
              "v": "10"
            },
            {
              "k": "sumBCE inlined",
              "v": "yes"
            },
            {
              "k": "BCE",
              "v": "applied"
            }
          ]
        },
        {
          "title": "Program prints results",
          "caption": "main prints true (both joins produce the same string) and 10 (the sum); joinNaive and sumBCE are inlined into main while joinFast stays a real call (inline cost 134 > budget 80).",
          "focus": [
            "fmt.Println(joinNaive(parts) == joinFast(parts))",
            "fmt.Println(sumBCE([]int{1, 2, 3, 4}))"
          ],
          "state": [
            {
              "k": "output",
              "v": "true / 10"
            },
            {
              "k": "inlined",
              "v": "joinNaive, sumBCE"
            },
            {
              "k": "not inlined",
              "v": "joinFast (cost 134)"
            }
          ]
        }
      ]
    },
    {
      "id": "go-perf-datastructures",
      "title": "Choosing structures for performance",
      "difficulty": "Hard",
      "tags": [
        "performance",
        "memory",
        "slices",
        "maps",
        "cache",
        "structs"
      ],
      "summary": "Pick data structures by memory layout and access pattern, not just Big-O.",
      "pattern": "Structures",
      "visual": "Slices sit in one contiguous array; maps hash into scattered buckets; padding wastes bytes.",
      "memorize": "Contiguous beats pointer-chasing; order fields big-to-small; comparable keys only.",
      "scene": "A librarian sprints down one packed shelf (slice) versus zig-zagging across a warehouse of scattered bins (map/linked list).",
      "time": "slice scan O(n); map get O(1) avg",
      "space": "slice n*sizeof(T); map has bucket overhead",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"unsafe\"\n)\n\n// Bad ordering: bool, int64, bool -> padding bloats the struct.\ntype Bad struct {\n\ta bool\n\tb int64\n\tc bool\n}\n\n// Good ordering: largest-to-smallest packs fields tightly.\ntype Good struct {\n\tb int64\n\ta bool\n\tc bool\n}\n\n// Point is a small value type stored contiguously in a slice.\ntype Point struct {\n\tX, Y int32\n}\n\nfunc sumX(pts []Point) int64 {\n\tvar total int64\n\tfor i := range pts {\n\t\ttotal += int64(pts[i].X)\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Printf(\"Bad  size=%d align=%d\\n\", unsafe.Sizeof(Bad{}), unsafe.Alignof(Bad{}))\n\tfmt.Printf(\"Good size=%d align=%d\\n\", unsafe.Sizeof(Good{}), unsafe.Alignof(Good{}))\n\n\tpts := make([]Point, 0, 4)\n\tfor i := int32(0); i < 4; i++ {\n\t\tpts = append(pts, Point{X: i, Y: i * i})\n\t}\n\tfmt.Println(\"sumX:\", sumX(pts))\n\n\t// map keyed by a comparable struct: fast lookups, no allocation per key.\n\tseen := make(map[Point]bool, len(pts))\n\tfor _, p := range pts {\n\t\tseen[p] = true\n\t}\n\tfmt.Println(\"distinct points:\", len(seen))\n}\n",
      "quiz": [
        {
          "id": "field-padding-size",
          "prompt": "On a 64-bit platform, why is `struct{a bool; b int64; c bool}` 24 bytes while reordering to `struct{b int64; a bool; c bool}` is 16 bytes?",
          "choices": [
            {
              "label": "Alignment padding — int64 forces gaps around the bools",
              "correct": true
            },
            {
              "label": "Extra header — Go adds a type word per struct"
            },
            {
              "label": "bool is 8 bytes — three fields make 24"
            },
            {
              "label": "Escape analysis — the larger one heap-allocates"
            }
          ],
          "explain": "int64 requires 8-byte alignment. In the bad layout a leading bool is followed by 7 padding bytes so the int64 lands on an 8-byte boundary, then the trailing bool needs 7 more tail padding bytes to keep the whole struct a multiple of 8, giving 24. Reordering puts the int64 first and packs both bools into the next 8-byte word, dropping the size to 16."
        },
        {
          "id": "slice-cache-locality",
          "prompt": "You iterate a large collection of small structs summing one field. Why does `[]T` typically outperform a hand-rolled linked list of `*T` for this scan?",
          "choices": [
            {
              "label": "Contiguous memory — sequential access prefetches cache lines",
              "correct": true
            },
            {
              "label": "Lower Big-O — slice traversal is O(log n)"
            },
            {
              "label": "No bounds checks — slices skip them in loops"
            },
            {
              "label": "Fewer GC roots — slices are never scanned by GC"
            }
          ],
          "explain": "A slice stores elements in one contiguous backing array, so a linear scan streams through cache lines with hardware prefetching; a pointer-linked list chases scattered heap addresses, causing cache misses that dominate the constant factor even though both are O(n)."
        },
        {
          "id": "map-key-slice",
          "prompt": "What happens when you try to use a `[]byte` value directly as a Go map key?",
          "choices": [
            {
              "label": "Compile error — slices are not comparable",
              "correct": true
            },
            {
              "label": "Runtime panic — only on the second insert"
            },
            {
              "label": "Compiles — Go hashes the backing array contents"
            },
            {
              "label": "Compiles — Go hashes the slice header pointer"
            }
          ],
          "explain": "Map keys must be comparable, and slices (like maps and funcs) are not comparable, so the program fails to compile; the idiomatic workaround is to key by `string(b)`, which Go can hash and compare by content."
        },
        {
          "id": "map-iteration-memory",
          "prompt": "A senior claims `map[int]V` gives cache-friendly sequential iteration like a slice. What is the correct rebuttal?",
          "choices": [
            {
              "label": "Scattered buckets — map layout is not contiguous or ordered",
              "correct": true
            },
            {
              "label": "Correct — maps store entries in insertion order"
            },
            {
              "label": "Correct — maps are backed by one flat array like slices"
            },
            {
              "label": "No difference — int keys iterate in sorted key order"
            }
          ],
          "explain": "A Go map is a hash table of buckets whose in-memory arrangement is neither contiguous in key order nor stable; iteration order is randomized and jumps across buckets, so it lacks the sequential locality of a slice regardless of key type, including integer keys."
        },
        {
          "id": "struct-key-vs-pointer",
          "prompt": "You want to dedupe (x,y) coordinates. Comparing `map[Point]bool` (Point is a comparable struct) with `map[*Point]bool`, which statement is accurate?",
          "choices": [
            {
              "label": "Value key — dedupes by content, pointer key by identity",
              "correct": true
            },
            {
              "label": "Both dedupe by content — pointers are auto-dereferenced"
            },
            {
              "label": "Pointer key — is faster because keys are 8 bytes"
            },
            {
              "label": "Value key — fails to compile for multi-field structs"
            }
          ],
          "explain": "A comparable struct key hashes and compares its field values, so equal coordinates collapse to one entry; a `*Point` key compares pointer identity, so two distinct allocations holding the same coordinates are treated as different keys and dedup fails."
        },
        {
          "id": "aos-vs-soa",
          "prompt": "For a hot loop that only reads one field from each element of a huge collection, why can struct-of-arrays (separate `[]field`) beat array-of-structs (`[]T`)?",
          "choices": [
            {
              "label": "Denser cache lines — only the used field is loaded",
              "correct": true
            },
            {
              "label": "Lower Big-O — SoA turns the scan into O(1)"
            },
            {
              "label": "No padding ever — SoA removes all alignment rules"
            },
            {
              "label": "Avoids GC — parallel arrays are stack-allocated"
            }
          ],
          "explain": "With array-of-structs, each fetched cache line also drags in the unused fields, wasting bandwidth; storing that one field in its own contiguous slice packs only relevant data per cache line, raising effective throughput for field-selective scans."
        }
      ],
      "design": {
        "prompt": "You are designing an in-memory index for tens of millions of small records that is scanned in tight analytic loops but also needs point lookups by ID. Walk through how you would choose and lay out the data structures for performance, and what you would measure.",
        "answer": "Start from access patterns, not Big-O: the dominant cost at this scale is memory bandwidth and cache misses, so favor contiguous storage. Store the records in a `[]Record` (array-of-structs) or, if hot loops touch only a few fields, split into struct-of-arrays parallel slices so each cache line carries only relevant data. Order struct fields largest-to-smallest to minimize alignment padding, which directly shrinks the footprint and improves lines-per-record; verify with unsafe.Sizeof and consider field grouping by co-access. For point lookups, keep a `map[ID]int` mapping ID to the slice index rather than a `map[ID]Record`, so the map holds tiny values and the records stay contiguous for scans; use a comparable value type for the key and avoid slice/pointer keys. Avoid linked structures and per-record pointers because they defeat prefetching and add GC-scannable pointers. Preallocate with make(..., n) to avoid growth churn, and if the map is large, presize it to cut rehashing. Measure with realistic benchmarks and pprof: allocs/op, memory profile for footprint, and CPU profile plus perf/cache-miss counters to confirm the layout actually reduces misses; the recommendation is AoS-or-SoA slices for scans plus an ID-to-index map for lookups, chosen and tuned by profiling rather than intuition."
      },
      "keyPoints": [
        "Choose by access pattern and memory layout; Big-O hides the constant factors that dominate at scale.",
        "Slices are contiguous and cache/prefetch friendly; maps scatter across buckets and iterate in randomized order.",
        "Order struct fields largest-to-smallest to minimize alignment padding and shrink footprint.",
        "Map keys must be comparable: slices, maps, and funcs are illegal; key by string(bytes) or a comparable struct.",
        "Value struct keys dedupe by content; pointer keys dedupe by identity.",
        "Prefer an ID-to-index map over a map of full records to keep the records contiguous for scans."
      ],
      "walkthrough": [
        {
          "title": "Bad struct laid out",
          "caption": "unsafe.Sizeof reports Bad as 24 bytes: the int64 needs 8-byte alignment, so 7 padding bytes follow field a and 7 trailing padding bytes follow field c.",
          "focus": [
            "type Bad struct {",
            "a bool"
          ],
          "state": [
            {
              "k": "Bad size",
              "v": "24"
            },
            {
              "k": "Bad align",
              "v": "8"
            },
            {
              "k": "padding",
              "v": "14 bytes wasted"
            }
          ]
        },
        {
          "title": "Good struct laid out",
          "caption": "Reordering fields largest-to-smallest places the two bools right after the int64, so only trailing padding remains and Good shrinks to 16 bytes.",
          "focus": [
            "type Good struct {",
            "b int64"
          ],
          "state": [
            {
              "k": "Good size",
              "v": "16"
            },
            {
              "k": "Bad size",
              "v": "24"
            },
            {
              "k": "savings",
              "v": "8 bytes / value"
            }
          ]
        },
        {
          "title": "Print the sizes",
          "caption": "main prints both sizes, making the 24-vs-16 difference visible — the same fields, only the declaration order changed.",
          "focus": [
            "unsafe.Sizeof(Bad{})",
            "unsafe.Sizeof(Good{})"
          ],
          "state": [
            {
              "k": "stdout",
              "v": "Bad size=24 align=8"
            },
            {
              "k": "stdout",
              "v": "Good size=16 align=8"
            }
          ]
        },
        {
          "title": "Build contiguous slice",
          "caption": "A slice of Point values is preallocated with cap 4 and filled, so all 4 points live back-to-back in one backing array with no per-element pointers.",
          "focus": [
            "make([]Point, 0, 4)",
            "Point{X: i, Y: i * i}"
          ],
          "state": [
            {
              "k": "len(pts)",
              "v": "4"
            },
            {
              "k": "cap(pts)",
              "v": "4"
            },
            {
              "k": "layout",
              "v": "contiguous, 8B each"
            },
            {
              "k": "reallocs",
              "v": "0"
            }
          ]
        },
        {
          "title": "Cache-friendly sum",
          "caption": "sumX walks the slice by index; because the Point values sit contiguously in memory, the CPU streams cache lines linearly instead of chasing pointers.",
          "focus": [
            "for i := range pts",
            "total += int64(pts[i].X)"
          ],
          "state": [
            {
              "k": "total",
              "v": "0+1+2+3 = 6"
            },
            {
              "k": "access",
              "v": "sequential"
            },
            {
              "k": "cache misses",
              "v": "minimal"
            }
          ]
        },
        {
          "title": "Comparable struct key",
          "caption": "Point has only int32 fields, so it is comparable and can be used directly as a map key without allocating to build the key.",
          "focus": [
            "make(map[Point]bool, len(pts))",
            "seen[p] = true"
          ],
          "state": [
            {
              "k": "key type",
              "v": "Point (comparable)"
            },
            {
              "k": "map hint",
              "v": "4"
            },
            {
              "k": "key alloc",
              "v": "none"
            }
          ]
        },
        {
          "title": "Distinct count",
          "caption": "All four points are unique, so len(seen) is 4 — the map hashes Point's fields to determine key identity and equality.",
          "focus": [
            "fmt.Println(\"distinct points:\", len(seen))"
          ],
          "state": [
            {
              "k": "len(seen)",
              "v": "4"
            },
            {
              "k": "stdout",
              "v": "distinct points: 4"
            }
          ]
        }
      ]
    }
  ]
};
