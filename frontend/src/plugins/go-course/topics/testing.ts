import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const testing: GoTopic = {
  "id": "testing",
  "title": "Testing & Reliability",
  "icon": "FlaskConical",
  "concepts": [
    {
      "id": "go-test-table",
      "title": "Table-driven tests & subtests",
      "difficulty": "Hard",
      "tags": [
        "testing",
        "subtests",
        "t.Run",
        "t.Cleanup",
        "golden-files",
        "go-cmp"
      ],
      "summary": "Structure cases as data, run each via t.Run, and diff want/got with cleanups and golden files.",
      "pattern": "Table tests",
      "visual": "slice of case structs → t.Run(tc.name) spins a subtest per row → failures isolated, filterable, cleaned up",
      "memorize": "One struct per case, t.Run per row, t.Cleanup unwinds, cmp.Diff not reflect, -update rewrites golden.",
      "scene": "A spreadsheet of test rows feeding a conveyor belt: each row rides into its own numbered t.Run booth, gets stamped pass/fail, and the janitor (t.Cleanup) sweeps the booth on the way out.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sort\"\n\t\"strings\"\n)\n\n// normalize dedupes and sorts words case-insensitively.\nfunc normalize(in []string) []string {\n\tseen := make(map[string]struct{})\n\tvar out []string\n\tfor _, w := range in {\n\t\tw = strings.ToLower(strings.TrimSpace(w))\n\t\tif w == \"\" {\n\t\t\tcontinue\n\t\t}\n\t\tif _, ok := seen[w]; ok {\n\t\t\tcontinue\n\t\t}\n\t\tseen[w] = struct{}{}\n\t\tout = append(out, w)\n\t}\n\tsort.Strings(out)\n\treturn out\n}\n\nfunc main() {\n\tcases := []struct {\n\t\tname string\n\t\tin   []string\n\t\twant []string\n\t}{\n\t\t{name: \"empty\", in: nil, want: nil},\n\t\t{name: \"dedup_and_sort\", in: []string{\"B\", \"a\", \"b\"}, want: []string{\"a\", \"b\"}},\n\t\t{name: \"trims_blanks\", in: []string{\" x \", \"\", \"x\"}, want: []string{\"x\"}},\n\t}\n\tfor _, tc := range cases {\n\t\tgot := normalize(tc.in)\n\t\tfmt.Printf(\"%s: %v (want %v)\\n\", tc.name, got, tc.want)\n\t}\n}\n",
      "quiz": [
        {
          "id": "parallel-loopvar",
          "prompt": "In Go 1.26, you write a table test where each subtest calls t.Parallel() as its first line, capturing tc from `for _, tc := range cases`. Compared to Go 1.21, what is the observable effect?",
          "choices": [
            {
              "label": "Correct results — per-iteration loop variable",
              "correct": true
            },
            {
              "label": "Data race — one shared tc pointer"
            },
            {
              "label": "Compile error — parallel needs explicit capture"
            },
            {
              "label": "All subtests skipped — parallel deferred forever"
            }
          ],
          "explain": "Since Go 1.22 the loop variable is scoped per-iteration, so the classic `tc := tc` shadow is unnecessary and every parallel subtest sees its own row. Pre-1.22 all parallel subtests would read the single shared tc after the loop advanced, so they observed the last row (a logic bug)."
        },
        {
          "id": "parallel-run-timing",
          "prompt": "A parent test calls t.Run(\"group\", ...) whose body launches subtests that each call t.Parallel(). When does code *after* that t.Run(\"group\", ...) call execute relative to those parallel subtests?",
          "choices": [
            {
              "label": "After they finish — parent blocks on the group",
              "correct": true
            },
            {
              "label": "Concurrently — parent never waits"
            },
            {
              "label": "Before they start — subtests are queued only"
            },
            {
              "label": "Never — t.Run panics with parallel children"
            }
          ],
          "explain": "A parallel subtest pauses at t.Parallel() until its enclosing t.Run function returns, then the paused siblings run together; the outer t.Run(\"group\") call does not return until all of them complete, so code after it sees them done. This is the standard idiom for grouped parallel cleanup."
        },
        {
          "id": "cleanup-vs-defer",
          "prompt": "You register resource teardown inside a helper that a subtest calls. Why prefer t.Cleanup(fn) over `defer fn()` written in that helper?",
          "choices": [
            {
              "label": "Runs at subtest end — not helper return",
              "correct": true
            },
            {
              "label": "Guarantees LIFO — unlike defer"
            },
            {
              "label": "Survives os.Exit — defer skips it"
            },
            {
              "label": "Executes concurrently — speeds teardown"
            }
          ],
          "explain": "A defer in the helper fires when the helper returns, often before the subtest body finishes using the resource; t.Cleanup defers teardown to the end of that test/subtest scope. Both run in LIFO order, and neither survives os.Exit."
        },
        {
          "id": "cmp-vs-reflect",
          "prompt": "Comparing want/got structs that contain a time.Time and an unexported field, why is cmp.Diff (go-cmp) generally preferred over reflect.DeepEqual for assertions?",
          "choices": [
            {
              "label": "Readable diff — plus configurable equality",
              "correct": true
            },
            {
              "label": "Faster path — avoids reflection entirely"
            },
            {
              "label": "Reads unexported fields — silently by default"
            },
            {
              "label": "Nil equals empty slice — treated same always"
            }
          ],
          "explain": "cmp.Diff yields a human-readable diff and supports Options like cmpopts.EquateApproxTime and custom Comparers, whereas DeepEqual only returns a bool. cmp still uses reflection internally, and it panics on unexported fields unless you pass an option (e.g. cmpopts.IgnoreUnexported), unlike DeepEqual which reads them."
        },
        {
          "id": "golden-update",
          "prompt": "Golden-file tests read testdata/*.golden and compare against output, with a `-update` flag that rewrites them. What is the key risk of this pattern?",
          "choices": [
            {
              "label": "Blind -update — bakes in regressions",
              "correct": true
            },
            {
              "label": "testdata compiled — bloats the binary"
            },
            {
              "label": "go test ignores testdata — by convention"
            },
            {
              "label": "Golden must be Go — valid source required"
            }
          ],
          "explain": "Regenerating golden files without reviewing the diff can silently enshrine a bug as the new expected output. The go tool skips the testdata directory for building and vetting, but test code still reads it at runtime; golden files are arbitrary bytes, not Go source."
        },
        {
          "id": "subtest-naming",
          "prompt": "Two table rows have names \"add x\" and \"add/x\". How does the testing package expose these for `go test -run`?",
          "choices": [
            {
              "label": "Spaces to underscores — slash nests subtests",
              "correct": true
            },
            {
              "label": "Both identical — sanitized to add_x"
            },
            {
              "label": "Duplicate panic — names must be unique"
            },
            {
              "label": "Slash rejected — only letters allowed"
            }
          ],
          "explain": "testing rewrites spaces to underscores, so \"add x\" becomes add_x, while a literal slash in a name creates a nested subtest path (add/x). Identical resulting names get a #NN suffix rather than panicking, so these two rows stay distinct anyway."
        }
      ],
      "design": {
        "prompt": "You own a package whose core function produces large structured output (nested structs, maps, timestamps). The team wants fast, maintainable tests. Design a table-driven + golden-file strategy: how do you structure cases, handle non-deterministic fields, decide golden vs inline expectations, and keep failures debuggable?",
        "answer": "Model each case as a struct row with a descriptive `name`, inputs, and either an inline `want` or a golden-file key, iterated via t.Run so failures are isolated and filterable with -run. Use golden files (testdata/*.golden) only for large or verbose outputs where inline literals would be unreadable, and keep small/critical expectations inline so intent is visible in the test source. For non-determinism (timestamps, UUIDs, map ordering) normalize before comparison or use cmp.Diff with cmpopts (EquateApproxTime, SortSlices) rather than reflect.DeepEqual, because a readable diff is the single biggest lever on debuggability. Gate golden regeneration behind a `-update` flag but treat regenerated diffs as code review artifacts — never blind-update, or you enshrine regressions. Register resource teardown with t.Cleanup (not defer in helpers) so cleanup runs at subtest scope even with t.Parallel, and mark helpers with t.Helper() so failure line numbers point at the case, not the assertion util. The recommended default: inline tables for logic-dense small cases, golden files for serialization/rendering output, go-cmp everywhere, and a reviewed -update workflow."
      },
      "keyPoints": [
        "Since Go 1.22 the range variable is per-iteration, so `tc := tc` is no longer needed even for parallel subtests.",
        "A parallel subtest pauses at t.Parallel() until its enclosing t.Run returns; the outer t.Run call blocks until all children finish — the idiom for grouped teardown.",
        "t.Cleanup runs at test/subtest scope end, not at helper return like defer; both are LIFO and neither survives os.Exit.",
        "Prefer cmp.Diff for readable diffs and configurable equality (EquateApproxTime, Comparers); it still uses reflection and panics on unexported fields without an option.",
        "The go tool skips testdata for build/vet but tests read it at runtime; gate golden regeneration behind -update and review the diff.",
        "testing maps spaces to underscores and treats slashes as nested subtest paths; duplicate results get a #NN suffix."
      ]
    },
    {
      "id": "go-test-parallel",
      "title": "t.Parallel, helpers & cleanup",
      "difficulty": "Hard",
      "tags": [
        "testing",
        "parallel",
        "cleanup",
        "race",
        "subtests"
      ],
      "summary": "How parallel subtests schedule, capture loop vars, and interleave with cleanup and t.TempDir.",
      "pattern": "Parallel tests",
      "visual": "Parallel subtests pause at t.Parallel(), resume after the parent's function returns, then run concurrently.",
      "memorize": "Parallel subtests wait for the parent body to return; Cleanup is LIFO and runs after all children finish.",
      "scene": "A relay race: each runner (subtest) freezes at the baton line calling t.Parallel(), and they all sprint together the instant the coach (parent) leaves the track.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"os\"\n\t\"path/filepath\"\n\t\"sync\"\n\t\"testing\"\n)\n\nfunc writeConfig(t *testing.T, name, body string) string {\n\tt.Helper()\n\tdir := t.TempDir()\n\tp := filepath.Join(dir, name)\n\tif err := os.WriteFile(p, []byte(body), 0o600); err != nil {\n\t\tt.Fatalf(\"write %s: %v\", p, err)\n\t}\n\treturn p\n}\n\nfunc TestConfigs(t *testing.T) {\n\tcases := []struct {\n\t\tname string\n\t\tbody string\n\t}{\n\t\t{\"alpha\", \"a=1\"},\n\t\t{\"beta\", \"b=2\"},\n\t}\n\tvar mu sync.Mutex\n\tseen := map[string]bool{}\n\tt.Cleanup(func() {\n\t\tif len(seen) != len(cases) {\n\t\t\tt.Errorf(\"saw %d configs, want %d\", len(seen), len(cases))\n\t\t}\n\t})\n\tfor _, tc := range cases {\n\t\tt.Run(tc.name, func(t *testing.T) {\n\t\t\tt.Parallel()\n\t\t\tp := writeConfig(t, tc.name+\".cfg\", tc.body)\n\t\t\tgot, err := os.ReadFile(p)\n\t\t\tif err != nil {\n\t\t\t\tt.Fatalf(\"read: %v\", err)\n\t\t\t}\n\t\t\tif string(got) != tc.body {\n\t\t\t\tt.Errorf(\"body = %q, want %q\", got, tc.body)\n\t\t\t}\n\t\t\tmu.Lock()\n\t\t\tseen[tc.name] = true\n\t\t\tmu.Unlock()\n\t\t})\n\t}\n}\n\nfunc main() {}\n",
      "quiz": [
        {
          "id": "scheduling-order",
          "prompt": "A parent test calls t.Run for three subtests, each calling t.Parallel() as its first line, and the parent body then executes a log statement after the loop. When does that final log statement run relative to the parallel subtests' bodies?",
          "choices": [
            {
              "label": "Before them — parallel bodies resume after parent returns",
              "correct": true
            },
            {
              "label": "After them — parent blocks until children finish"
            },
            {
              "label": "Interleaved — parent and children race freely"
            },
            {
              "label": "Undefined — depends on GOMAXPROCS value"
            }
          ],
          "explain": "t.Parallel() pauses the subtest and returns control to the parent. The parent runs to completion (including the post-loop log); only when the parent function returns does the framework resume the paused parallel subtests concurrently."
        },
        {
          "id": "loop-capture",
          "prompt": "In Go 1.26, the code sample's loop uses `tc` directly inside the parallel closure without a shadow copy. Why is this safe, unlike in Go 1.21?",
          "choices": [
            {
              "label": "Per-iteration scoping — loop var is fresh each iteration",
              "correct": true
            },
            {
              "label": "t.Parallel copies — the framework snapshots captured vars"
            },
            {
              "label": "Range over slice — never shared the variable anyway"
            },
            {
              "label": "Escape analysis — the compiler duplicates the closure"
            }
          ],
          "explain": "Go 1.22 changed for-loop semantics so the loop variable is scoped per iteration (a fresh variable each pass). Before that, all closures shared one `tc`, so parallel subtests observed the final value. This is a language change, not a testing/framework behavior."
        },
        {
          "id": "cleanup-timing",
          "prompt": "The parent registers t.Cleanup checking that all parallel subtests ran, and the subtests populate `seen` under a mutex. Why does this Cleanup reliably observe a complete map?",
          "choices": [
            {
              "label": "Runs after children — parent cleanup waits for parallels",
              "correct": true
            },
            {
              "label": "Mutex forces order — cleanup blocks on the lock"
            },
            {
              "label": "Cleanup is synchronous — fires as each child finishes"
            },
            {
              "label": "map is race-free — Go maps synchronize automatically"
            }
          ],
          "explain": "A parent's registered Cleanup functions run only after all of its subtests (including parallel ones, which resume after the parent returns) have completed. So by cleanup time every parallel child has updated `seen`. The mutex is needed for the concurrent writes, not for ordering."
        },
        {
          "id": "helper-line",
          "prompt": "writeConfig calls t.Helper() and then t.Fatalf on write failure. What is the effect of t.Helper() on that failure report?",
          "choices": [
            {
              "label": "Attributes failure — to the caller's line, not helper",
              "correct": true
            },
            {
              "label": "Reruns the helper — retries after marking it"
            },
            {
              "label": "Suppresses output — hides the helper from logs"
            },
            {
              "label": "Enables Fatalf — required for Fatal in helpers"
            }
          ],
          "explain": "t.Helper() marks the function so the test framework skips it when computing the file:line shown in failure messages, pointing at the calling test line instead. It does not change control flow; t.Fatalf works in any function whose t belongs to the running goroutine."
        },
        {
          "id": "tempdir-parallel",
          "prompt": "Both parallel subtests call writeConfig, which calls t.TempDir(). Can these two parallel subtests collide on the same directory or clash on cleanup?",
          "choices": [
            {
              "label": "No collision — each subtest t gets a unique dir",
              "correct": true
            },
            {
              "label": "Possible collision — shared parent temp root reused"
            },
            {
              "label": "Cleanup clash — parent removes dir mid-test"
            },
            {
              "label": "Only if same name — TempDir keys off the test name"
            }
          ],
          "explain": "t.TempDir() creates a unique directory per calling *testing.T and auto-removes it when that test (and its cleanups) finish. Each subtest has its own t, so the two parallel subtests get distinct directories with independent, correctly-ordered removal."
        },
        {
          "id": "fatal-goroutine",
          "prompt": "Inside a parallel subtest, a developer spawns a goroutine that calls t.Fatalf on error and does not wait for it. What is the primary correctness problem?",
          "choices": [
            {
              "label": "Fatal from other goroutine — does not stop the test",
              "correct": true
            },
            {
              "label": "Data race — t is not safe from goroutines"
            },
            {
              "label": "Deadlock — Fatalf blocks the spawned goroutine"
            },
            {
              "label": "Panic — Fatalf outside the test goroutine panics"
            }
          ],
          "explain": "FailNow/Fatal must be called from the goroutine running the test; from another goroutine it Goexits only that spawned goroutine and does not stop the test goroutine, which keeps running (and may return) concurrently. Because the test isn't halted at the failure point, the failure can be recorded too late to matter or race with cleanup/completion. The fix is to signal back (channel/error) and call Fatal on the test goroutine. Note *testing.T methods are themselves safe for concurrent use, so option two is wrong."
        }
      ],
      "design": {
        "prompt": "You inherit a large test suite that runs serially in ~12 minutes. You want to parallelize aggressively with t.Parallel() to cut wall-clock time. Walk through how you'd do it safely, what shared state and ordering hazards you'd audit for, and how you'd keep the suite deterministic and debuggable.",
        "answer": "First, understand the execution model: subtests calling t.Parallel() pause and resume only after their parent returns, then run concurrently bounded by -test.parallel (defaults to GOMAXPROCS). So parallelism is per parent — a top-level test only parallelizes against its siblings, and subtests parallelize within their parent's group. The main hazards are shared mutable state: package-level vars, singletons, os.Chdir/os.Setenv (process-global — a classic footgun since one parallel test's env change leaks into others), fixed ports, and shared temp paths. I'd replace os.Setenv with t.Setenv (which refuses to run under t.Parallel(), surfacing the conflict), use t.TempDir() for per-test isolation, and inject dependencies instead of using globals. Ordering: never assume subtest completion order, and remember parent t.Cleanup runs after all children finish, which is exactly the right place for group-level assertions/teardown; per-test Cleanup is LIFO. Determinism/debuggability: seed randomness explicitly, avoid time.Sleep-based synchronization, and ensure any goroutine spawned inside a test signals failures back to the test goroutine (only that goroutine may call Fatal). I'd run under -race from day one because parallelism is what surfaces latent data races. Recommendation: parallelize incrementally — enable t.Parallel() per package, run with -race and a low -parallel to shake out env/global collisions, then raise concurrency; keep genuinely serial tests (those touching process-global state) unmarked so they run in the serial phase after the parallel group drains."
      },
      "keyPoints": [
        "t.Parallel() pauses the subtest; it resumes only after the parent function returns, then siblings run concurrently up to -test.parallel (default GOMAXPROCS).",
        "Go 1.22+ scopes loop variables per iteration, so capturing the range var in a parallel closure is now safe; older code needed tc := tc.",
        "Parent t.Cleanup runs after all subtests (including parallel) complete; per-test Cleanup is LIFO and t.TempDir is removed during that phase.",
        "t.Helper() only reprices failure file:line to the caller; it does not affect control flow.",
        "t.TempDir() and t.Setenv are per-*testing.T; t.Setenv is incompatible with t.Parallel() and process-global mutations (Chdir/Setenv) leak across parallel tests.",
        "Fatal/FailNow must be called from the test's own goroutine — from another goroutine it only Goexits that goroutine and fails to stop the test; *testing.T methods are otherwise concurrency-safe, so use a channel to report back and run -race."
      ]
    },
    {
      "id": "go-test-fuzz",
      "title": "Fuzzing",
      "difficulty": "Hard",
      "tags": [
        "testing",
        "fuzzing",
        "reliability",
        "corpus",
        "go-test"
      ],
      "summary": "Native Go fuzzing: FuzzX targets, seed corpus, differential invariants, and persisted crashers.",
      "pattern": "Fuzzing",
      "visual": "go test -fuzz mutates seed inputs, replays them against f.Fuzz, and persists any crasher to testdata/fuzz.",
      "memorize": "FuzzXxx(f); f.Add seeds; f.Fuzz(func(t,args){...}); crashers land in testdata/fuzz/FuzzXxx and become permanent regression tests.",
      "scene": "A slot machine that keeps yanking the lever on your parser until it screams, then photographs the exact winning combination and tapes it to the wall forever.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"encoding/json\"\n\t\"fmt\"\n\t\"testing\"\n)\n\n// roundTrip encodes m to JSON and decodes it back; it is the property under test.\nfunc roundTrip(m map[string]int) (map[string]int, error) {\n\tb, err := json.Marshal(m)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\tout := map[string]int{}\n\tif err := json.Unmarshal(b, &out); err != nil {\n\t\treturn nil, err\n\t}\n\treturn out, nil\n}\n\n// FuzzRoundTrip checks the invariant: decode(encode(x)) == x for a single-key map.\nfunc FuzzRoundTrip(f *testing.F) {\n\tf.Add(\"key\", 0)\n\tf.Add(\"\", -1)\n\tf.Add(\"é\", 42)\n\tf.Fuzz(func(t *testing.T, k string, v int) {\n\t\tin := map[string]int{k: v}\n\t\tout, err := roundTrip(in)\n\t\tif err != nil {\n\t\t\tt.Skip() // encoding of some inputs is out of scope\n\t\t}\n\t\tif got := out[k]; got != v {\n\t\t\tt.Fatalf(\"round-trip mismatch: key=%q want %d got %d\", k, v, got)\n\t\t}\n\t})\n}\n\nfunc main() {\n\tout, _ := roundTrip(map[string]int{\"answer\": 42})\n\tfmt.Println(out)\n}",
      "quiz": [
        {
          "id": "seed-vs-mutation",
          "prompt": "During `go test -fuzz=FuzzRoundTrip`, what role do the arguments passed to `f.Add` play?",
          "choices": [
            {
              "label": "Fixed assertions — each must pass or fuzzing aborts",
              "correct": false
            },
            {
              "label": "Seed inputs — mutator evolves new inputs from them",
              "correct": true
            },
            {
              "label": "Type hints — discarded before mutation begins",
              "correct": false
            },
            {
              "label": "Coverage targets — inputs the engine must reach",
              "correct": false
            }
          ],
          "explain": "f.Add supplies the seed corpus: concrete inputs that are run as-is and then used as starting points for coverage-guided mutation. They are not assertions and are not discarded before mutation."
        },
        {
          "id": "add-type-match",
          "prompt": "What constraint does `f.Add` impose relative to the `f.Fuzz` callback signature?",
          "choices": [
            {
              "label": "Types must match — order and types mirror the callback",
              "correct": true
            },
            {
              "label": "No constraint — Add accepts any values freely",
              "correct": false
            },
            {
              "label": "One Add allowed — at most a single call per target",
              "correct": false
            },
            {
              "label": "Count must match — types coerced at runtime",
              "correct": false
            }
          ],
          "explain": "Each f.Add call must pass values whose types and order exactly match the fuzzed parameters of the f.Fuzz callback (the parameters after *testing.T); a mismatch panics at run time when the target executes. Multiple f.Add calls are allowed and encouraged."
        },
        {
          "id": "corpus-persist",
          "prompt": "A fuzz run discovers an input that makes `t.Fatal` fire. Where does Go persist it?",
          "choices": [
            {
              "label": "testdata/fuzz/FuzzRoundTrip — checked-in regression corpus",
              "correct": true
            },
            {
              "label": "$GOCACHE/fuzz — cleared by go clean -cache",
              "correct": false
            },
            {
              "label": "OS temp dir — lost when the process exits",
              "correct": false
            },
            {
              "label": "Nowhere — reported to stderr but never saved",
              "correct": false
            }
          ],
          "explain": "Failing inputs are minimized and written to testdata/fuzz/FuzzXxx/ inside the package so they can be committed and replayed as ordinary regression tests. The engine-generated (non-failing) corpus lives under $GOCACHE/fuzz, but crashers go to testdata."
        },
        {
          "id": "no-fuzz-flag",
          "prompt": "You run `go test` WITHOUT the `-fuzz` flag on a package containing `FuzzRoundTrip`. What happens?",
          "choices": [
            {
              "label": "Skipped entirely — fuzz targets need the -fuzz flag",
              "correct": false
            },
            {
              "label": "Seed corpus runs — deterministic, no mutation",
              "correct": true
            },
            {
              "label": "Infinite mutation — until the default timeout hits",
              "correct": false
            },
            {
              "label": "Compile error — Fuzz targets require -fuzz to build",
              "correct": false
            }
          ],
          "explain": "Without -fuzz, the target still runs its seed corpus (f.Add inputs plus any persisted testdata) deterministically, so crashers stay covered on every CI run. Mutation only begins when -fuzz matches the target."
        },
        {
          "id": "fuzz-arg-types",
          "prompt": "Which is a valid argument type for a `f.Fuzz` callback under Go 1.26?",
          "choices": [
            {
              "label": "[]byte — a supported fuzzable input type",
              "correct": true
            },
            {
              "label": "map[string]int — composite maps are fuzzable",
              "correct": false
            },
            {
              "label": "time.Time — structs mutated field-wise",
              "correct": false
            },
            {
              "label": "any — arbitrary concrete values generated",
              "correct": false
            }
          ],
          "explain": "The fuzzing engine supports only a fixed set of types: []byte, string, bool, the sized int/uint families, byte, rune, float32, and float64. Maps, structs, and interfaces (including any) are not fuzzable arguments."
        },
        {
          "id": "fuzz-terminal",
          "prompt": "Why is calling `f.Add` after `f.Fuzz` has run considered a misuse of the fuzz API?",
          "choices": [
            {
              "label": "f.Fuzz is terminal — it must be the last call",
              "correct": true
            },
            {
              "label": "Add is deprecated — replaced by f.Seed in 1.26",
              "correct": false
            },
            {
              "label": "Concurrency panic — Add is not goroutine-safe",
              "correct": false
            },
            {
              "label": "No misuse — either order works fine",
              "correct": false
            }
          ],
          "explain": "f.Fuzz is the terminal operation of a fuzz target: it runs the callback over the corpus and mutations, so all seeds must be registered via f.Add beforehand. f.Add is not deprecated and there is no f.Seed method."
        }
      ],
      "design": {
        "prompt": "You maintain a security-sensitive binary parser (e.g. a protocol decoder). Design a fuzzing strategy: how do you structure targets, seed the corpus, express meaningful invariants beyond \"does not panic\", integrate fuzzing into CI, and handle the discovered-crasher lifecycle?",
        "answer": "Structure one fuzz target per decode entry point, keeping each `f.Fuzz` body fast and deterministic so the mutator gets high executions/sec and coverage feedback stays meaningful. Seed the corpus with real-world captured inputs and known historical bug reproducers via `f.Add`, plus check in the persisted `testdata/fuzz/FuzzX` files so crashers become permanent regression tests replayed by plain `go test`. Go beyond panic-detection with strong invariants: differential testing against a reference implementation, round-trip properties (decode then re-encode must match or the residual must be well-defined), and resource bounds (reject inputs that allocate absurd amounts). Because `go test -fuzz` runs one target and never terminates on its own, CI cannot just `-fuzz` forever; run bounded jobs with `-fuzz=FuzzX -fuzztime=Ns` (or a fixed iteration budget) on a dedicated long-running/nightly pipeline, while PR CI runs the fast seed-corpus pass (no `-fuzz`). The tradeoff is coverage-vs-cost: longer fuzztime and OSS-Fuzz-style continuous fuzzing find deeper bugs but need infrastructure and triage discipline. Recommendation: seed-corpus regression on every PR, time-boxed fuzzing nightly, continuous fuzzing (OSS-Fuzz) for the highest-value parsers, and treat every crasher as: minimize, commit the testdata reproducer, fix, and keep the reproducer forever."
      },
      "keyPoints": [
        "Fuzz targets are `func FuzzXxx(f *testing.F)`; `f.Add` supplies seed inputs and `f.Fuzz` takes a callback whose args (after `*testing.T`) are the fuzzed values.",
        "`f.Add` argument types and order must exactly match the `f.Fuzz` callback's fuzzed parameters, or the target panics at run time.",
        "Fuzzable argument types are limited: []byte, string, the integer/float families, bool, rune, byte — not maps, structs, or arbitrary composites/interfaces.",
        "Without `-fuzz`, `go test` executes only the seed corpus (seeds + persisted testdata) as normal deterministic tests; `-fuzz=Regexp` starts mutation-based fuzzing that runs until failure or `-fuzztime`.",
        "A failing input is minimized and persisted to `testdata/fuzz/FuzzXxx/` in the package, turning every crasher into a checked-in regression test; the engine's generated corpus instead lives under `$GOCACHE/fuzz`.",
        "Strong invariants (round-trips, differential comparison, bounds) catch far more than crash-only checks; `f.Fuzz` must be the final call on `f`."
      ]
    },
    {
      "id": "go-test-doubles",
      "title": "Test doubles & httptest",
      "difficulty": "Hard",
      "tags": [
        "testing",
        "httptest",
        "interfaces",
        "dependency-injection",
        "fakes"
      ],
      "summary": "Design testable seams with interfaces, choose fakes over mocks, and drive HTTP code with httptest.",
      "pattern": "Test doubles",
      "visual": "Consumer depends on a small interface; tests inject a fake; httptest wires a real loopback server.",
      "memorize": "Accept interfaces at the seam, inject the double, use httptest.Server for real transport and ResponseRecorder for handlers.",
      "scene": "A stunt double stands in for the actor on the cliff edge: same shape, controlled behavior, no real danger — that's your fake behind a small interface.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"encoding/json\"\n\t\"fmt\"\n\t\"net/http\"\n\t\"net/http/httptest\"\n)\n\n// Seam: consumer defines the small interface it needs.\ntype RateFetcher interface {\n\tRate(ctx context.Context, ccy string) (float64, error)\n}\n\ntype httpFetcher struct {\n\tclient *http.Client\n\tbase   string\n}\n\nfunc (f httpFetcher) Rate(ctx context.Context, ccy string) (float64, error) {\n\treq, _ := http.NewRequestWithContext(ctx, http.MethodGet, f.base+\"/rate/\"+ccy, nil)\n\tresp, err := f.client.Do(req)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\tdefer resp.Body.Close()\n\tif resp.StatusCode != http.StatusOK {\n\t\treturn 0, fmt.Errorf(\"status %d\", resp.StatusCode)\n\t}\n\tvar out struct{ Rate float64 }\n\tif err := json.NewDecoder(resp.Body).Decode(&out); err != nil {\n\t\treturn 0, err\n\t}\n\treturn out.Rate, nil\n}\n\n// Convert takes the interface, not a concrete type: injectable seam.\nfunc Convert(ctx context.Context, f RateFetcher, ccy string, amt float64) (float64, error) {\n\tr, err := f.Rate(ctx, ccy)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\treturn amt * r, nil\n}\n\nfunc main() {\n\tsrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n\t\tjson.NewEncoder(w).Encode(map[string]float64{\"Rate\": 1.1})\n\t}))\n\tdefer srv.Close()\n\n\tf := httpFetcher{client: srv.Client(), base: srv.URL}\n\ttotal, _ := Convert(context.Background(), f, \"EUR\", 100)\n\tfmt.Printf(\"%.1f\\n\", total)\n}\n",
      "quiz": [
        {
          "id": "httptest-server-vs-recorder",
          "prompt": "You want to test an http.Handler's routing, status codes, and written body in memory, without paying for real TCP. What is the idiomatic tool?",
          "choices": [
            {
              "label": "httptest.NewRecorder — call handler, inspect Result",
              "correct": true
            },
            {
              "label": "httptest.NewServer — spins a real loopback listener"
            },
            {
              "label": "http.DefaultServeMux — global mux is easiest"
            },
            {
              "label": "net.Pipe — hand-roll the transport yourself"
            }
          ],
          "explain": "ResponseRecorder implements http.ResponseWriter in memory; you invoke the handler's ServeHTTP directly and read the recorded status/body/headers with no socket. httptest.NewServer is for testing clients against a real transport, not for exercising a handler in isolation."
        },
        {
          "id": "fake-vs-mock",
          "prompt": "For an interface with 12 methods used across many tests, which double minimizes test brittleness while preserving realistic behavior?",
          "choices": [
            {
              "label": "A fake — working in-memory implementation of interface",
              "correct": true
            },
            {
              "label": "A mock — strict call-order expectations on every method"
            },
            {
              "label": "A stub — returns zero values for all methods"
            },
            {
              "label": "A spy — asserts each method's exact argument sequence"
            }
          ],
          "explain": "A fake is a real, simplified implementation (e.g. an in-memory store) that behaves correctly, so tests assert on outcomes rather than interaction details. Strict mocks couple tests to call sequences, making unrelated refactors break tests."
        },
        {
          "id": "interface-seam-location",
          "prompt": "Where should the RateFetcher interface be defined for the cleanest seam under Go conventions?",
          "choices": [
            {
              "label": "Consumer package — declares what it needs",
              "correct": true
            },
            {
              "label": "Producer package — exports its own contract"
            },
            {
              "label": "Shared interfaces package — imported by both sides"
            },
            {
              "label": "On the concrete struct — as an embedded interface field"
            }
          ],
          "explain": "Go idiom is 'accept interfaces, return structs' and define the interface where it is consumed, keeping it small and letting the producer stay a plain struct. Producer-defined interfaces tend to be wide and force consumers to depend on the whole contract."
        },
        {
          "id": "httptest-client-tls",
          "prompt": "You start an httptest.NewTLSServer. Why must the client use srv.Client() rather than http.DefaultClient?",
          "choices": [
            {
              "label": "srv.Client trusts the cert — TLS to the test server works",
              "correct": true
            },
            {
              "label": "Shorter default timeout — srv.Client tightens deadlines"
            },
            {
              "label": "No HTTPS redirects — DefaultClient would refuse them"
            },
            {
              "label": "Shares a goroutine pool — srv.Client reuses server's"
            }
          ],
          "explain": "NewTLSServer generates a self-signed certificate; srv.Client() returns a client whose transport is configured to trust exactly that cert. http.DefaultClient would reject it with an x509 verification error."
        },
        {
          "id": "avoid-globals-di",
          "prompt": "A package calls http.Get(url) directly via the global default client. What is the primary testability defect?",
          "choices": [
            {
              "label": "No seam — cannot inject a test double for transport",
              "correct": true
            },
            {
              "label": "http.Get leaks goroutines — tests cannot join them"
            },
            {
              "label": "http.Get ignores context — tests cannot time out"
            },
            {
              "label": "Default client is unsafe — races under concurrent use"
            }
          ],
          "explain": "Reaching for the global default client hard-wires the dependency, leaving no injection point to substitute an httptest server or fake. Depending on an injected *http.Client or a small interface restores the seam. (The default client is in fact concurrency-safe.)"
        },
        {
          "id": "recorder-result-body",
          "prompt": "After handler.ServeHTTP(rec, req), which expression yields an *http.Response whose Body you read and then Close?",
          "choices": [
            {
              "label": "rec.Result().Body — snapshot Body, then Close it",
              "correct": true
            },
            {
              "label": "rec.Body.Close — the buffer needs closing first",
              "correct": false
            },
            {
              "label": "req.Response.Body — the request carries the reply",
              "correct": false
            },
            {
              "label": "rec.Header().Get(\"Body\") — headers hold the payload",
              "correct": false
            }
          ],
          "explain": "Result() returns an *http.Response whose Body is a reader over the recorded bytes and should be closed. rec.Body is a *bytes.Buffer (readable via String/Bytes) but is not an *http.Response and has no Close method; req.Response and a 'Body' header are simply the wrong places to look."
        }
      ],
      "design": {
        "prompt": "You're designing the test strategy for a service package that calls three external HTTP APIs and a SQL database. Discuss how you'd introduce seams, when you'd reach for httptest versus hand-written fakes versus generated mocks, and how you'd keep the production wiring clean.",
        "answer": "I'd define small, consumer-side interfaces at each boundary (one per capability the service actually uses, not a dump of the vendor SDK) and inject them via a constructor, so the service never touches globals like http.DefaultClient or a package-level DB handle. For the HTTP clients I'd write concrete implementations that take an injected *http.Client, then test them with httptest.NewServer to exercise real serialization, status handling, and transport quirks end-to-end; that catches URL-building and decoding bugs a mock would hide. For the service's own logic I'd inject in-memory fakes of the interfaces (e.g. a fake rate store) because fakes assert on outcomes and survive refactors, whereas strict mocks with call-order expectations make every refactor a test rewrite. I'd reserve generated mocks for narrow cases where I must assert that a specific side effect happened (e.g. an audit call was made) or to simulate hard-to-produce errors like context cancellation mid-call. The database gets a repository interface so business logic uses an in-memory fake, with a smaller set of integration tests hitting a real DB (testcontainers) to validate SQL. The recommendation: interfaces at the seam plus DI via constructor, httptest for the adapter layer, fakes for the domain layer, and mocks sparingly for interaction-critical paths — this keeps the fast test suite decoupled and pushes real-transport/real-SQL verification into a smaller, deliberate integration tier. The tradeoff: fakes cost upfront effort but survive refactors, mocks are cheap but couple to internals, and httptest adds fidelity at some setup and speed cost."
      },
      "keyPoints": [
        "Define small interfaces in the consumer package to create injectable seams; accept interfaces, return structs.",
        "Prefer fakes (working in-memory implementations) for domain logic; reserve mocks for asserting specific interactions or simulating errors.",
        "Use httptest.NewServer to test HTTP clients over a real loopback transport; use httptest.NewRecorder to test handlers in memory.",
        "With NewTLSServer, use srv.Client() so the self-signed cert is trusted.",
        "Inject *http.Client / dependencies via constructors instead of reaching for globals like http.DefaultClient.",
        "Read handler output via rec.Result() (close its Body) or the raw rec.Body *bytes.Buffer via String/Bytes."
      ]
    }
  ]
};
