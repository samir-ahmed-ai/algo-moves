import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const testing: GoTopic = {
  id: 'testing',
  title: 'Testing & Reliability',
  icon: 'FlaskConical',
  concepts: [
    {
      id: 'go-test-table',
      title: 'Table-driven tests & subtests',
      difficulty: 'Hard',
      tags: ['testing', 'subtests', 't.Run', 't.Cleanup', 'golden-files', 'go-cmp'],
      summary:
        'Structure cases as data, run each via t.Run, and diff want/got with cleanups and golden files.',
      pattern: 'Table tests',
      visual:
        'slice of case structs → t.Run(tc.name) spins a subtest per row → failures isolated, filterable, cleaned up',
      memorize:
        'One struct per case, t.Run per row, t.Cleanup unwinds, cmp.Diff not reflect, -update rewrites golden.',
      scene:
        'A spreadsheet of test rows feeding a conveyor belt: each row rides into its own numbered t.Run booth, gets stamped pass/fail, and the janitor (t.Cleanup) sweeps the booth on the way out.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sort"\n\t"strings"\n)\n\n// normalize dedupes and sorts words case-insensitively.\nfunc normalize(in []string) []string {\n\tseen := make(map[string]struct{})\n\tvar out []string\n\tfor _, w := range in {\n\t\tw = strings.ToLower(strings.TrimSpace(w))\n\t\tif w == "" {\n\t\t\tcontinue\n\t\t}\n\t\tif _, ok := seen[w]; ok {\n\t\t\tcontinue\n\t\t}\n\t\tseen[w] = struct{}{}\n\t\tout = append(out, w)\n\t}\n\tsort.Strings(out)\n\treturn out\n}\n\nfunc main() {\n\tcases := []struct {\n\t\tname string\n\t\tin   []string\n\t\twant []string\n\t}{\n\t\t{name: "empty", in: nil, want: nil},\n\t\t{name: "dedup_and_sort", in: []string{"B", "a", "b"}, want: []string{"a", "b"}},\n\t\t{name: "trims_blanks", in: []string{" x ", "", "x"}, want: []string{"x"}},\n\t}\n\tfor _, tc := range cases {\n\t\tgot := normalize(tc.in)\n\t\tfmt.Printf("%s: %v (want %v)\\n", tc.name, got, tc.want)\n\t}\n}\n',
      keyPoints: [
        'Since Go 1.22 the range variable is per-iteration, so `tc := tc` is no longer needed even for parallel subtests.',
        'A parallel subtest pauses at t.Parallel() until its enclosing t.Run returns; the outer t.Run call blocks until all children finish — the idiom for grouped teardown.',
        't.Cleanup runs at test/subtest scope end, not at helper return like defer; both are LIFO and neither survives os.Exit.',
        'Prefer cmp.Diff for readable diffs and configurable equality (EquateApproxTime, Comparers); it still uses reflection and panics on unexported fields without an option.',
        'The go tool skips testdata for build/vet but tests read it at runtime; gate golden regeneration behind -update and review the diff.',
        'testing maps spaces to underscores and treats slashes as nested subtest paths; duplicate results get a #NN suffix.',
      ],
      walkthrough: [
        {
          title: 'Cases as data',
          caption:
            'Execution enters main and builds a slice of anonymous structs, one row per test case with name, input, and expected output.',
          focus: ['cases := []struct {', 'name string'],
          state: [
            {
              k: 'rows',
              v: '3',
            },
            {
              k: 'struct fields',
              v: 'name/in/want',
            },
          ],
        },
        {
          title: 'Row definitions',
          caption:
            'Each literal fills a case: empty maps nil to nil, dedup_and_sort expects sorted uniques, trims_blanks drops empties and duplicates.',
          focus: [
            '{name: "empty", in: nil, want: nil}',
            '{name: "dedup_and_sort", in: []string{"B", "a", "b"}, want: []string{"a", "b"}}',
          ],
          state: [
            {
              k: 'cases[0]',
              v: 'empty',
            },
            {
              k: 'cases[1]',
              v: 'dedup_and_sort',
            },
            {
              k: 'cases[2]',
              v: 'trims_blanks',
            },
          ],
        },
        {
          title: 'Loop over rows',
          caption:
            'The range loop iterates each case; a real test would wrap this body in t.Run(tc.name, ...) to get an isolated subtest per row.',
          focus: ['for _, tc := range cases {', 'got := normalize(tc.in)'],
          state: [
            {
              k: 'tc',
              v: 'empty',
            },
            {
              k: 'iter',
              v: '1/3',
            },
          ],
        },
        {
          title: 'Normalize empty',
          caption:
            'normalize on nil input builds an empty seen map, the range does zero iterations, sort.Strings on nil is a no-op, and out stays nil.',
          focus: ['seen := make(map[string]struct{})', 'return out'],
          state: [
            {
              k: 'tc.in',
              v: 'nil',
            },
            {
              k: 'out',
              v: 'nil',
            },
            {
              k: 'got',
              v: '[]',
            },
          ],
        },
        {
          title: 'Dedup and sort',
          caption:
            'For {B,a,b} each word is lowercased, the map records first sightings so the duplicate b is skipped, then sort.Strings orders the survivors to [a b].',
          focus: [
            'w = strings.ToLower(strings.TrimSpace(w))',
            'if _, ok := seen[w]; ok {',
            'sort.Strings(out)',
          ],
          state: [
            {
              k: 'tc.in',
              v: '[B a b]',
            },
            {
              k: 'after lower',
              v: 'b,a,b',
            },
            {
              k: 'seen',
              v: '{a,b}',
            },
            {
              k: 'got',
              v: '[a b]',
            },
          ],
        },
        {
          title: 'Trim blanks gotcha',
          caption:
            'For {" x ","","x"} TrimSpace turns " x " into x, the empty string is skipped by the continue, and the second x is deduped so only [x] remains.',
          focus: ['if w == "" {', 'continue'],
          state: [
            {
              k: 'tc.in',
              v: "[' x ' '' 'x']",
            },
            {
              k: 'trimmed',
              v: "x,'',x",
            },
            {
              k: 'skipped',
              v: 'blank + dup',
            },
            {
              k: 'got',
              v: '[x]',
            },
          ],
        },
        {
          title: 'Diff want vs got',
          caption:
            'The Printf reports got beside want for each row; in a real test this line becomes a cmp.Diff(tc.want, got) so structural differences fail the subtest instead of reflect.DeepEqual.',
          focus: ['fmt.Printf("%s: %v (want %v)\\n", tc.name, got, tc.want)'],
          state: [
            {
              k: 'empty',
              v: '[] want []',
            },
            {
              k: 'dedup_and_sort',
              v: '[a b] want [a b]',
            },
            {
              k: 'trims_blanks',
              v: '[x] want [x]',
            },
          ],
        },
      ],
    },
    {
      id: 'go-test-parallel',
      title: 't.Parallel, helpers & cleanup',
      difficulty: 'Hard',
      tags: ['testing', 'parallel', 'cleanup', 'race', 'subtests'],
      summary:
        'How parallel subtests schedule, capture loop vars, and interleave with cleanup and t.TempDir.',
      pattern: 'Parallel tests',
      visual:
        "Parallel subtests pause at t.Parallel(), resume after the parent's function returns, then run concurrently.",
      memorize:
        'Parallel subtests wait for the parent body to return; Cleanup is LIFO and runs after all children finish.',
      scene:
        'A relay race: each runner (subtest) freezes at the baton line calling t.Parallel(), and they all sprint together the instant the coach (parent) leaves the track.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"os"\n\t"path/filepath"\n\t"sync"\n\t"testing"\n)\n\nfunc writeConfig(t *testing.T, name, body string) string {\n\tt.Helper()\n\tdir := t.TempDir()\n\tp := filepath.Join(dir, name)\n\tif err := os.WriteFile(p, []byte(body), 0o600); err != nil {\n\t\tt.Fatalf("write %s: %v", p, err)\n\t}\n\treturn p\n}\n\nfunc TestConfigs(t *testing.T) {\n\tcases := []struct {\n\t\tname string\n\t\tbody string\n\t}{\n\t\t{"alpha", "a=1"},\n\t\t{"beta", "b=2"},\n\t}\n\tvar mu sync.Mutex\n\tseen := map[string]bool{}\n\tt.Cleanup(func() {\n\t\tif len(seen) != len(cases) {\n\t\t\tt.Errorf("saw %d configs, want %d", len(seen), len(cases))\n\t\t}\n\t})\n\tfor _, tc := range cases {\n\t\tt.Run(tc.name, func(t *testing.T) {\n\t\t\tt.Parallel()\n\t\t\tp := writeConfig(t, tc.name+".cfg", tc.body)\n\t\t\tgot, err := os.ReadFile(p)\n\t\t\tif err != nil {\n\t\t\t\tt.Fatalf("read: %v", err)\n\t\t\t}\n\t\t\tif string(got) != tc.body {\n\t\t\t\tt.Errorf("body = %q, want %q", got, tc.body)\n\t\t\t}\n\t\t\tmu.Lock()\n\t\t\tseen[tc.name] = true\n\t\t\tmu.Unlock()\n\t\t})\n\t}\n}\n\nfunc main() {}\n',
      keyPoints: [
        't.Parallel() pauses the subtest; it resumes only after the parent function returns, then siblings run concurrently up to -test.parallel (default GOMAXPROCS).',
        'Go 1.22+ scopes loop variables per iteration, so capturing the range var in a parallel closure is now safe; older code needed tc := tc.',
        'Parent t.Cleanup runs after all subtests (including parallel) complete; per-test Cleanup is LIFO and t.TempDir is removed during that phase.',
        't.Helper() only reprices failure file:line to the caller; it does not affect control flow.',
        't.TempDir() and t.Setenv are per-*testing.T; t.Setenv is incompatible with t.Parallel() and process-global mutations (Chdir/Setenv) leak across parallel tests.',
        "Fatal/FailNow must be called from the test's own goroutine — from another goroutine it only Goexits that goroutine and fails to stop the test; *testing.T methods are otherwise concurrency-safe, so use a channel to report back and run -race.",
      ],
      walkthrough: [
        {
          title: 'Parent test begins',
          caption:
            'TestConfigs starts, builds the cases table and registers a parent-level Cleanup that later asserts every config was seen.',
          focus: ['cases := []struct {', 't.Cleanup(func() {'],
          state: [
            {
              k: 'cases',
              v: '[alpha, beta]',
            },
            {
              k: 'seen',
              v: '{}',
            },
            {
              k: 'parent cleanups',
              v: '1',
            },
          ],
        },
        {
          title: 'Launch alpha subtest',
          caption:
            'The first loop iteration calls t.Run, which starts the alpha subtest in its own goroutine; the parent blocks in t.Run until alpha calls t.Parallel.',
          focus: ['for _, tc := range cases {', 't.Run(tc.name, func(t *testing.T) {'],
          state: [
            {
              k: 'tc.name',
              v: 'alpha',
            },
            {
              k: 'tc.body',
              v: 'a=1',
            },
            {
              k: 'subtests',
              v: '1 (alpha)',
            },
          ],
        },
        {
          title: 'alpha calls t.Parallel',
          caption:
            'alpha marks itself parallel: it pauses immediately and returns control to the parent so the loop can keep going before any parallel body runs.',
          focus: ['t.Parallel()'],
          state: [
            {
              k: 'tc.name',
              v: 'alpha (paused)',
            },
            {
              k: 'parallel queue',
              v: '[alpha]',
            },
            {
              k: 'running body',
              v: 'none',
            },
          ],
        },
        {
          title: 'Launch beta, parent returns',
          caption:
            "The loop's second iteration starts beta, which also calls t.Parallel and pauses; once the parent function body returns, all paused parallel subtests are released to run concurrently.",
          focus: ['{"beta", "b=2"},', 't.Parallel()'],
          state: [
            {
              k: 'parallel queue',
              v: '[alpha, beta]',
            },
            {
              k: 'tc captured',
              v: 'per-iteration (Go 1.22+)',
            },
            {
              k: 'parent body',
              v: 'returned',
            },
          ],
        },
        {
          title: 'Subtests create TempDirs',
          caption:
            'Both subtests now run in parallel; each writeConfig call gets its own unique t.TempDir, so the alpha and beta files never collide.',
          focus: ['dir := t.TempDir()', 'p := writeConfig(t, tc.name+".cfg", tc.body)'],
          state: [
            {
              k: 'alpha dir',
              v: '<tmpA>/alpha.cfg',
            },
            {
              k: 'beta dir',
              v: '<tmpB>/beta.cfg',
            },
            {
              k: 'running',
              v: 'alpha ∥ beta',
            },
          ],
        },
        {
          title: 'Guarded map write',
          caption:
            'Each subtest reads its file back, verifies the body, then locks the shared mutex to record its name in seen without a data race.',
          focus: ['mu.Lock()', 'seen[tc.name] = true'],
          state: [
            {
              k: 'seen',
              v: '{alpha:true, beta:true}',
            },
            {
              k: 'mu',
              v: 'serializes writes',
            },
            {
              k: 'races',
              v: '0',
            },
          ],
        },
        {
          title: 'Per-subtest TempDir cleanup',
          caption:
            "As each parallel subtest finishes, its own registered cleanups run LIFO — the testing framework removes that subtest's TempDir automatically.",
          focus: ['dir := t.TempDir()'],
          state: [
            {
              k: 'alpha status',
              v: 'done, tmp removed',
            },
            {
              k: 'beta status',
              v: 'done, tmp removed',
            },
          ],
        },
        {
          title: 'Parent Cleanup runs last',
          caption:
            "Only after every parallel child has completed does the parent's Cleanup fire; seen now has 2 entries so the length check passes.",
          focus: [
            'if len(seen) != len(cases) {',
            't.Errorf("saw %d configs, want %d", len(seen), len(cases))',
          ],
          state: [
            {
              k: 'len(seen)',
              v: '2',
            },
            {
              k: 'len(cases)',
              v: '2',
            },
            {
              k: 'result',
              v: 'PASS',
            },
          ],
        },
      ],
    },
    {
      id: 'go-test-fuzz',
      title: 'Fuzzing',
      difficulty: 'Hard',
      tags: ['testing', 'fuzzing', 'reliability', 'corpus', 'go-test'],
      summary:
        'Native Go fuzzing: FuzzX targets, seed corpus, differential invariants, and persisted crashers.',
      pattern: 'Fuzzing',
      visual:
        'go test -fuzz mutates seed inputs, replays them against f.Fuzz, and persists any crasher to testdata/fuzz.',
      memorize:
        'FuzzXxx(f); f.Add seeds; f.Fuzz(func(t,args){...}); crashers land in testdata/fuzz/FuzzXxx and become permanent regression tests.',
      scene:
        'A slot machine that keeps yanking the lever on your parser until it screams, then photographs the exact winning combination and tapes it to the wall forever.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"encoding/json"\n\t"fmt"\n\t"testing"\n)\n\n// roundTrip encodes m to JSON and decodes it back; it is the property under test.\nfunc roundTrip(m map[string]int) (map[string]int, error) {\n\tb, err := json.Marshal(m)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\tout := map[string]int{}\n\tif err := json.Unmarshal(b, &out); err != nil {\n\t\treturn nil, err\n\t}\n\treturn out, nil\n}\n\n// FuzzRoundTrip checks the invariant: decode(encode(x)) == x for a single-key map.\nfunc FuzzRoundTrip(f *testing.F) {\n\tf.Add("key", 0)\n\tf.Add("", -1)\n\tf.Add("é", 42)\n\tf.Fuzz(func(t *testing.T, k string, v int) {\n\t\tin := map[string]int{k: v}\n\t\tout, err := roundTrip(in)\n\t\tif err != nil {\n\t\t\tt.Skip() // encoding of some inputs is out of scope\n\t\t}\n\t\tif got := out[k]; got != v {\n\t\t\tt.Fatalf("round-trip mismatch: key=%q want %d got %d", k, v, got)\n\t\t}\n\t})\n}\n\nfunc main() {\n\tout, _ := roundTrip(map[string]int{"answer": 42})\n\tfmt.Println(out)\n}\n',
      keyPoints: [
        'Fuzz targets are `func FuzzXxx(f *testing.F)`; `f.Add` supplies seed inputs and `f.Fuzz` takes a callback whose args (after `*testing.T`) are the fuzzed values.',
        "`f.Add` argument types and order must exactly match the `f.Fuzz` callback's fuzzed parameters, or the target panics at run time.",
        'Fuzzable argument types are limited: []byte, string, the integer/float families, bool, rune, byte — not maps, structs, or arbitrary composites/interfaces.',
        'Without `-fuzz`, `go test` executes only the seed corpus (seeds + persisted testdata) as normal deterministic tests; `-fuzz=Regexp` starts mutation-based fuzzing that runs until failure or `-fuzztime`.',
        "A failing input is minimized and persisted to `testdata/fuzz/FuzzXxx/` in the package, turning every crasher into a checked-in regression test; the engine's generated corpus instead lives under `$GOCACHE/fuzz`.",
        'Strong invariants (round-trips, differential comparison, bounds) catch far more than crash-only checks; `f.Fuzz` must be the final call on `f`.',
      ],
      walkthrough: [
        {
          title: 'Fuzz target discovered',
          caption:
            'go test -fuzz runs FuzzRoundTrip, handing it a *testing.F whose f.Fuzz signature (string,int) defines the fuzzed argument types.',
          focus: ['func FuzzRoundTrip(f *testing.F)'],
          state: [
            {
              k: 'target',
              v: 'FuzzRoundTrip',
            },
            {
              k: 'arg types',
              v: 'string, int',
            },
            {
              k: 'phase',
              v: 'registration',
            },
          ],
        },
        {
          title: 'Seed corpus added',
          caption:
            "Each f.Add call registers a seed entry; its argument types and count must exactly match the f.Fuzz function's parameters.",
          focus: ['f.Add("key", 0)', 'f.Add("", -1)', 'f.Add("é", 42)'],
          state: [
            {
              k: 'seeds',
              v: '3',
            },
            {
              k: 'also from',
              v: 'testdata/fuzz corpus',
            },
            {
              k: 'types checked',
              v: '(string,int)',
            },
          ],
        },
        {
          title: 'Fuzz body registered',
          caption:
            'f.Fuzz stores the property function; the engine invokes it once per seed, then with mutated inputs derived from the corpus.',
          focus: ['f.Fuzz(func(t *testing.T, k string, v int) {'],
          state: [
            {
              k: 'runs',
              v: 'seeds first, then mutations',
            },
            {
              k: 'parallel',
              v: 'up to GOMAXPROCS workers',
            },
          ],
        },
        {
          title: 'Property under test',
          caption:
            'For each input the body builds a single-key map and round-trips it through json.Marshal then json.Unmarshal.',
          focus: ['in := map[string]int{k: v}', 'out, err := roundTrip(in)'],
          state: [
            {
              k: 'k',
              v: '"key" (seed 1)',
            },
            {
              k: 'v',
              v: '0',
            },
            {
              k: 'in',
              v: '{"key":0}',
            },
          ],
        },
        {
          title: 'Skip out-of-scope inputs',
          caption:
            'If round-trip returns an error the case is dropped via t.Skip so it is not counted as a crasher; for map[string]int this branch is effectively unreachable.',
          focus: ['if err != nil {', 't.Skip()'],
          state: [
            {
              k: 'err',
              v: 'nil for map[string]int',
            },
            {
              k: 'note',
              v: 'Skip branch effectively dead',
            },
          ],
        },
        {
          title: 'Differential invariant',
          caption:
            'The core assertion compares the decoded value against the input; any deviation triggers t.Fatalf and marks the input as failing.',
          focus: [
            'if got := out[k]; got != v {',
            't.Fatalf("round-trip mismatch: key=%q want %d got %d", k, v, got)',
          ],
          state: [
            {
              k: 'invariant',
              v: 'decode(encode(x)) == x',
            },
            {
              k: 'got',
              v: '0',
            },
            {
              k: 'want',
              v: '0',
            },
            {
              k: 'result',
              v: 'pass',
            },
          ],
        },
        {
          title: 'Mutation phase',
          caption:
            'The engine mutates seeds over the fuzzed args (k string, v int) searching for an input that trips t.Fatalf; for this lossless round-trip no realistic mutation actually fails.',
          focus: ['k string, v int'],
          state: [
            {
              k: 'phase',
              v: 'mutation',
            },
            {
              k: 'example',
              v: 'unusual key bytes / edge int',
            },
            {
              k: 'status',
              v: 'no crasher expected',
            },
          ],
        },
        {
          title: 'Crasher persisted as regression',
          caption:
            'Were the assertion to fail, the input would be written to testdata/fuzz/FuzzRoundTrip/<hash> and thereafter replayed by plain go test as a permanent regression test.',
          focus: ['func FuzzRoundTrip(f *testing.F) {'],
          state: [
            {
              k: 'saved to',
              v: 'testdata/fuzz/FuzzRoundTrip',
            },
            {
              k: 'format',
              v: 'go test fuzz v1',
            },
            {
              k: 'replayed by',
              v: 'go test (no -fuzz)',
            },
          ],
        },
      ],
    },
    {
      id: 'go-test-doubles',
      title: 'Test doubles & httptest',
      difficulty: 'Hard',
      tags: ['testing', 'httptest', 'interfaces', 'dependency-injection', 'fakes'],
      summary:
        'Design testable seams with interfaces, choose fakes over mocks, and drive HTTP code with httptest.',
      pattern: 'Test doubles',
      visual:
        'Consumer depends on a small interface; tests inject a fake; httptest wires a real loopback server.',
      memorize:
        'Accept interfaces at the seam, inject the double, use httptest.Server for real transport and ResponseRecorder for handlers.',
      scene:
        "A stunt double stands in for the actor on the cliff edge: same shape, controlled behavior, no real danger — that's your fake behind a small interface.",
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"context"\n\t"encoding/json"\n\t"fmt"\n\t"net/http"\n\t"net/http/httptest"\n)\n\n// Seam: consumer defines the small interface it needs.\ntype RateFetcher interface {\n\tRate(ctx context.Context, ccy string) (float64, error)\n}\n\ntype httpFetcher struct {\n\tclient *http.Client\n\tbase   string\n}\n\nfunc (f httpFetcher) Rate(ctx context.Context, ccy string) (float64, error) {\n\treq, _ := http.NewRequestWithContext(ctx, http.MethodGet, f.base+"/rate/"+ccy, nil)\n\tresp, err := f.client.Do(req)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\tdefer resp.Body.Close()\n\tif resp.StatusCode != http.StatusOK {\n\t\treturn 0, fmt.Errorf("status %d", resp.StatusCode)\n\t}\n\tvar out struct{ Rate float64 }\n\tif err := json.NewDecoder(resp.Body).Decode(&out); err != nil {\n\t\treturn 0, err\n\t}\n\treturn out.Rate, nil\n}\n\n// Convert takes the interface, not a concrete type: injectable seam.\nfunc Convert(ctx context.Context, f RateFetcher, ccy string, amt float64) (float64, error) {\n\tr, err := f.Rate(ctx, ccy)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\treturn amt * r, nil\n}\n\nfunc main() {\n\tsrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n\t\tjson.NewEncoder(w).Encode(map[string]float64{"Rate": 1.1})\n\t}))\n\tdefer srv.Close()\n\n\tf := httpFetcher{client: srv.Client(), base: srv.URL}\n\ttotal, _ := Convert(context.Background(), f, "EUR", 100)\n\tfmt.Printf("%.1f\\n", total)\n}\n',
      keyPoints: [
        'Define small interfaces in the consumer package to create injectable seams; accept interfaces, return structs.',
        'Prefer fakes (working in-memory implementations) for domain logic; reserve mocks for asserting specific interactions or simulating errors.',
        'Use httptest.NewServer to test HTTP clients over a real loopback transport; use httptest.NewRecorder to test handlers in memory.',
        'With NewTLSServer, use srv.Client() so the self-signed cert is trusted.',
        'Inject *http.Client / dependencies via constructors instead of reaching for globals like http.DefaultClient.',
        'Read handler output via rec.Result() (close its Body) or the raw rec.Body *bytes.Buffer via String/Bytes.',
      ],
      walkthrough: [
        {
          title: 'Define the seam',
          caption:
            'The consumer declares the smallest interface it needs, so any type providing Rate can be substituted at the seam.',
          focus: [
            'type RateFetcher interface {',
            'Rate(ctx context.Context, ccy string) (float64, error)',
          ],
          state: [
            {
              k: 'interface',
              v: 'RateFetcher',
            },
            {
              k: 'methods',
              v: '1 (Rate)',
            },
          ],
        },
        {
          title: 'Convert takes the interface',
          caption:
            'Convert depends on the RateFetcher interface rather than the concrete httpFetcher, making the dependency injectable.',
          focus: [
            'func Convert(ctx context.Context, f RateFetcher, ccy string, amt float64) (float64, error)',
            'f RateFetcher',
          ],
          state: [
            {
              k: 'param f type',
              v: 'RateFetcher',
            },
            {
              k: 'coupling',
              v: 'interface, not concrete',
            },
          ],
        },
        {
          title: 'Spin up httptest server',
          caption:
            'httptest.NewServer starts a real HTTP server on a loopback (127.0.0.1) port whose handler encodes a JSON rate of 1.1 with a default 200 status.',
          focus: [
            'srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {',
            'json.NewEncoder(w).Encode(map[string]float64{"Rate": 1.1})',
          ],
          state: [
            {
              k: 'srv.URL',
              v: 'http://127.0.0.1:PORT',
            },
            {
              k: 'handler rate',
              v: '1.1',
            },
            {
              k: 'transport',
              v: 'real TCP',
            },
          ],
        },
        {
          title: 'Inject the real double',
          caption:
            "The httpFetcher is wired with the server's own client and base URL, so it talks to the test server over real transport.",
          focus: [
            'f := httpFetcher{client: srv.Client(), base: srv.URL}',
            'total, _ := Convert(context.Background(), f, "EUR", 100)',
          ],
          state: [
            {
              k: 'f.base',
              v: 'srv.URL',
            },
            {
              k: 'ccy',
              v: 'EUR',
            },
            {
              k: 'amt',
              v: '100',
            },
          ],
        },
        {
          title: 'Fetch over HTTP',
          caption:
            "Convert calls Rate, which builds a GET request to /rate/EUR and sends it through the server's client to the live handler.",
          focus: [
            'r, err := f.Rate(ctx, ccy)',
            'req, _ := http.NewRequestWithContext(ctx, http.MethodGet, f.base+"/rate/"+ccy, nil)',
          ],
          state: [
            {
              k: 'request',
              v: 'GET /rate/EUR',
            },
            {
              k: 'ctx',
              v: 'Background',
            },
          ],
        },
        {
          title: 'Decode the response',
          caption:
            'The 200 OK check passes and the JSON body is decoded into out.Rate, yielding 1.1.',
          focus: [
            'if resp.StatusCode != http.StatusOK {',
            'if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {',
          ],
          state: [
            {
              k: 'status',
              v: '200 OK',
            },
            {
              k: 'out.Rate',
              v: '1.1',
            },
          ],
        },
        {
          title: 'Apply the rate',
          caption:
            'Convert multiplies the requested amount by the fetched rate to produce the converted total.',
          focus: ['return amt * r, nil'],
          state: [
            {
              k: 'r',
              v: '1.1',
            },
            {
              k: 'amt',
              v: '100',
            },
            {
              k: 'total',
              v: '110',
            },
          ],
        },
        {
          title: 'Print and tear down',
          caption:
            'The total prints as 110.0 and the deferred srv.Close shuts the test server down cleanly.',
          focus: ['fmt.Printf("%.1f\\n", total)', 'defer srv.Close()'],
          state: [
            {
              k: 'stdout',
              v: '110.0',
            },
            {
              k: 'server',
              v: 'closed',
            },
          ],
        },
      ],
    },
  ],
};
