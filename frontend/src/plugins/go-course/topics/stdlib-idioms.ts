import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const stdlibIdioms: GoTopic = {
  id: 'stdlib-idioms',
  title: 'Standard Library & Idioms',
  icon: 'Library',
  concepts: [
    {
      id: 'go-std-io',
      title: 'io.Reader / io.Writer composition',
      difficulty: 'Hard',
      tags: ['io', 'interfaces', 'streaming', 'bufio', 'composition'],
      summary:
        'Compose small io interfaces to stream data through wrappers without buffering everything in memory.',
      pattern: 'Streaming IO',
      visual:
        'Read fills a caller-owned slice, returns (n, err); wrappers chain Read/Write calls without copying the whole stream.',
      memorize:
        'Read may return n>0 AND err; process bytes before checking err. io.EOF is a value, not a failure.',
      scene:
        'Water flowing through a series of pipe fittings: each fitting (Tee, MultiWriter, counter) taps or splits the stream, but no bucket holds it all.',
      time: 'O(n) in bytes streamed',
      space: 'O(buffer) not O(stream)',
      keyPoints: [
        'The io.Reader contract allows n>0 with a non-nil error (including io.EOF); always process returned bytes before inspecting the error.',
        'io.Copy treats io.EOF as success and returns nil; a non-nil result means a real read/write failure or short write.',
        'bufio.Writer buffers in memory and only emits on fill or Flush/Close — forgetting Flush silently drops the tail.',
        'io.TeeReader and io.MultiWriter enable fan-out (hash-while-streaming, mirror-to-two-sinks) without holding the whole stream; MultiWriter stops at the first sink error.',
        'bufio.Scanner caps tokens at bufio.MaxScanTokenSize (64 KB) by default and reports bufio.ErrTooLong; raise it via Buffer() for large lines.',
        'io.LimitReader returns EOF once N bytes are consumed without touching the underlying reader; good for bounding untrusted input, but that EOF is indistinguishable from a genuine end.',
      ],
      code: 'package main\n\nimport (\n\t"bufio"\n\t"bytes"\n\t"crypto/sha256"\n\t"fmt"\n\t"io"\n\t"strings"\n)\n\n// countingReader wraps an io.Reader and tracks how many bytes flowed through it.\ntype countingReader struct {\n\tr io.Reader\n\tn int64\n}\n\nfunc (c *countingReader) Read(p []byte) (int, error) {\n\tn, err := c.r.Read(p)\n\tc.n += int64(n)\n\treturn n, err\n}\n\nfunc main() {\n\tsrc := strings.NewReader("the quick brown fox\\njumps over the lazy dog\\n")\n\n\t// Count bytes as they are read.\n\tcr := &countingReader{r: src}\n\n\t// Tee everything read into a hash so we digest while we stream.\n\th := sha256.New()\n\ttee := io.TeeReader(cr, h)\n\n\t// Fan out the output to two sinks at once.\n\tvar buf bytes.Buffer\n\tmirror := &bytes.Buffer{}\n\tdst := io.MultiWriter(&buf, mirror)\n\n\tif _, err := io.Copy(dst, tee); err != nil {\n\t\tpanic(err)\n\t}\n\n\t// Line-oriented reads over the captured bytes.\n\tsc := bufio.NewScanner(&buf)\n\tlines := 0\n\tfor sc.Scan() {\n\t\tlines++\n\t}\n\tif err := sc.Err(); err != nil {\n\t\tpanic(err)\n\t}\n\n\tfmt.Printf("bytes=%d lines=%d sum=%x\\n", cr.n, lines, h.Sum(nil)[:4])\n}\n',
      walkthrough: [
        {
          title: 'Build the reader chain',
          caption:
            'A string source is wrapped by countingReader so every byte read from src also increments a counter, forming the base of a lazy pipeline that moves nothing yet.',
          focus: [
            'src := strings.NewReader("the quick brown fox\\njumps over the lazy dog\\n")',
            'cr := &countingReader{r: src}',
          ],
          state: [
            {
              k: 'cr.n',
              v: '0',
            },
            {
              k: 'src bytes',
              v: '44 unread',
            },
            {
              k: 'data moved',
              v: 'none (lazy)',
            },
          ],
        },
        {
          title: 'Tee reads into a hash',
          caption:
            'TeeReader wraps cr so that whatever is Read from tee is simultaneously written into the sha256 hash, letting us digest the stream while it flows rather than after.',
          focus: ['h := sha256.New()', 'tee := io.TeeReader(cr, h)'],
          state: [
            {
              k: 'hash',
              v: 'empty',
            },
            {
              k: 'reader chain',
              v: 'src->cr->tee',
            },
            {
              k: 'cr.n',
              v: '0',
            },
          ],
        },
        {
          title: 'Fan out the writer side',
          caption:
            'MultiWriter bundles buf and mirror into one dst so a single Write call duplicates the bytes into both buffers at once.',
          focus: ['dst := io.MultiWriter(&buf, mirror)'],
          state: [
            {
              k: 'buf.Len',
              v: '0',
            },
            {
              k: 'mirror.Len',
              v: '0',
            },
            {
              k: 'sinks',
              v: '2',
            },
          ],
        },
        {
          title: 'Copy pumps the pipeline',
          caption:
            'io.Copy loops calling tee.Read into an internal 32KB buffer and writing to dst, so bytes stream src->cr(count)->tee(hash)->dst(buf+mirror) without ever buffering the whole input separately.',
          focus: ['if _, err := io.Copy(dst, tee); err != nil {'],
          state: [
            {
              k: 'cr.n',
              v: '44',
            },
            {
              k: 'hash',
              v: 'digesting',
            },
            {
              k: 'buf.Len',
              v: '44',
            },
            {
              k: 'mirror.Len',
              v: '44',
            },
          ],
        },
        {
          title: 'How EOF terminates',
          caption:
            'strings.Reader returns the final bytes with a nil error, then returns n=0 with io.EOF on the next call; countingReader adds each n to the count and passes the error through unchanged, and io.Copy treats that io.EOF as a clean stop (not an error).',
          focus: ['n, err := c.r.Read(p)', 'c.n += int64(n)', 'return n, err'],
          state: [
            {
              k: 'final data Read',
              v: 'n>0, err=nil',
            },
            {
              k: 'next Read',
              v: 'n=0, err=EOF',
            },
            {
              k: 'cr.n',
              v: '44 (final)',
            },
          ],
        },
        {
          title: 'Scan the captured bytes',
          caption:
            "bufio.Scanner reads buf line by line, splitting on '\\n', incrementing lines for each of the two lines it yields.",
          focus: ['sc := bufio.NewScanner(&buf)', 'for sc.Scan() {'],
          state: [
            {
              k: 'lines',
              v: '2',
            },
            {
              k: 'buf drained',
              v: 'yes',
            },
            {
              k: 'sc.Err',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Report the results',
          caption:
            'With the pipeline fully drained, it prints the counted byte total, the line count, and the first 4 bytes of the streamed sha256 digest.',
          focus: ['fmt.Printf("bytes=%d lines=%d sum=%x\\n", cr.n, lines, h.Sum(nil)[:4])'],
          state: [
            {
              k: 'bytes',
              v: '44',
            },
            {
              k: 'lines',
              v: '2',
            },
            {
              k: 'sum',
              v: 'sha256[:4]',
            },
          ],
        },
      ],
    },
    {
      id: 'go-std-json',
      title: 'encoding/json quirks',
      difficulty: 'Hard',
      tags: ['encoding/json', 'serialization', 'reflection', 'struct-tags', 'interfaces'],
      summary:
        'Reflection-driven (un)marshaling: exported fields, tags, omitempty, embedding, and interface{} defaults.',
      pattern: 'encoding/json',
      visual:
        'reflect walks exported fields; tags rename; interface{} decodes to map[string]any + float64',
      memorize:
        'Only exported fields; interface{} -> map[string]any & float64; omitempty tests the ZERO value; RawMessage defers parsing',
      scene:
        "A customs officer (reflect) only lets CAPITALIZED passengers through the gate; every number arriving without a passport is stamped 'float64'.",
      time: 'O(n) over input bytes',
      space: 'O(n) for decoded tree',
      code: 'package main\n\nimport (\n\t"encoding/json"\n\t"fmt"\n)\n\ntype Base struct {\n\tID   int    `json:"id"`\n\tName string `json:"name,omitempty"`\n}\n\ntype Event struct {\n\tBase\n\tKind string          `json:"kind"`\n\tData json.RawMessage `json:"data"`\n\ttag  string\n}\n\nfunc main() {\n\te := Event{Base: Base{ID: 7}, Kind: "click", tag: "ignored"}\n\tout, _ := json.Marshal(e)\n\tfmt.Println(string(out))\n\n\tvar v interface{}\n\t_ = json.Unmarshal([]byte(`{"n":42,"xs":[1,2]}`), &v)\n\tm := v.(map[string]interface{})\n\tfmt.Printf("%T %T\\n", m["n"], m["xs"])\n\n\tvar dec Event\n\t_ = json.Unmarshal([]byte(`{"id":9,"kind":"k","data":{"raw":true}}`), &dec)\n\tfmt.Println(dec.ID, dec.Kind, string(dec.Data))\n}\n',
      keyPoints: [
        'Only exported fields are (un)marshaled; unexported fields are invisible to reflection and silently skipped.',
        'Decoding into interface{} produces map[string]interface{}, []interface{}, and float64 for all numbers; use Decoder.UseNumber() to preserve precision.',
        'omitempty tests the type\'s zero value (false/0/nil/empty coll/"") and never fires for structs or non-nil pointers; use omitzero (Go 1.24+) to skip zero structs.',
        'Anonymous embedded structs without a json tag are flattened; adding a tag makes them a nested object.',
        'json.RawMessage defers parsing and preserves exact bytes — ideal for discriminated unions and opaque passthrough.',
        'Unknown JSON keys are ignored by default; opt into strictness with Decoder.DisallowUnknownFields().',
      ],
      walkthrough: [
        {
          title: 'Construct the Event',
          caption:
            'An Event is built with an embedded Base (ID=7, Name unset), Kind="click", and the unexported field tag set to "ignored".',
          focus: ['e := Event{Base: Base{ID: 7}, Kind: "click", tag: "ignored"}'],
          state: [
            {
              k: 'e.ID',
              v: '7',
            },
            {
              k: 'e.Name',
              v: '"" (zero)',
            },
            {
              k: 'e.Kind',
              v: '"click"',
            },
            {
              k: 'e.tag',
              v: '"ignored"',
            },
          ],
        },
        {
          title: 'Marshal walks exported fields',
          caption:
            'json.Marshal uses reflection: Base is embedded so its fields flatten to top level, Name has omitempty and is the zero "" so it is dropped, and unexported tag is skipped entirely.',
          focus: ['out, _ := json.Marshal(e)'],
          state: [
            {
              k: 'id',
              v: '7 (Base flattened)',
            },
            {
              k: 'name',
              v: 'omitted (zero + omitempty)',
            },
            {
              k: 'tag',
              v: 'skipped (unexported)',
            },
            {
              k: 'data',
              v: 'null (nil RawMessage)',
            },
          ],
        },
        {
          title: 'Print the JSON output',
          caption:
            'The result is {"id":7,"kind":"click","data":null}: embedded fields promoted, name omitted, tag absent, and nil RawMessage encoded as null.',
          focus: ['fmt.Println(string(out))'],
          state: [
            {
              k: 'stdout',
              v: '{"id":7,"kind":"click","data":null}',
            },
          ],
        },
        {
          title: 'Unmarshal into interface{}',
          caption:
            'With a nil interface{} target, json.Unmarshal chooses default Go types: JSON objects become map[string]interface{}, arrays become []interface{}, and all numbers become float64.',
          focus: ['var v interface{}', 'json.Unmarshal([]byte(`{"n":42,"xs":[1,2]}`), &v)'],
          state: [
            {
              k: 'v dynamic type',
              v: 'map[string]interface{}',
            },
            {
              k: 'm["n"]',
              v: 'float64(42)',
            },
            {
              k: 'm["xs"]',
              v: '[]interface{}{float64(1),float64(2)}',
            },
          ],
        },
        {
          title: 'Type assertion + %T gotcha',
          caption:
            'The assertion to map[string]interface{} succeeds, and %T reveals the number decoded as float64 (not int) and the array as []interface{}, the classic interface{} default.',
          focus: ['m := v.(map[string]interface{})', 'fmt.Printf("%T %T\\n", m["n"], m["xs"])'],
          state: [
            {
              k: 'stdout',
              v: 'float64 []interface {}',
            },
          ],
        },
        {
          title: 'Unmarshal into typed struct',
          caption:
            'Decoding into a concrete Event matches JSON keys to tags case-insensitively, fills the promoted embedded ID, and stores the data object verbatim without parsing because Data is json.RawMessage.',
          focus: [
            'var dec Event',
            'json.Unmarshal([]byte(`{"id":9,"kind":"k","data":{"raw":true}}`), &dec)',
          ],
          state: [
            {
              k: 'dec.ID',
              v: '9 (into embedded Base)',
            },
            {
              k: 'dec.Kind',
              v: '"k"',
            },
            {
              k: 'dec.Data',
              v: '{"raw":true} (raw bytes, deferred)',
            },
          ],
        },
        {
          title: 'Print decoded fields',
          caption:
            'Output is "9 k {\\"raw\\":true}": the RawMessage held the nested JSON as unparsed bytes, letting you defer or re-dispatch its parsing later.',
          focus: ['fmt.Println(dec.ID, dec.Kind, string(dec.Data))'],
          state: [
            {
              k: 'stdout',
              v: '9 k {"raw":true}',
            },
          ],
        },
      ],
    },
    {
      id: 'go-std-time',
      title: 'time: monotonic clocks & tickers',
      difficulty: 'Hard',
      tags: ['time', 'monotonic', 'ticker', 'timer', 'concurrency'],
      summary:
        'How time.Time carries a monotonic reading, and how Timers and Tickers behave under Go 1.23+ unbuffered-channel semantics.',
      pattern: 'Time & Tickers',
      visual:
        'time.Now() stamps wall+monotonic; Sub/Since use monotonic; Ticker.C is an unbuffered channel (cap 0) that Stop never closes.',
      memorize:
        'Since uses monotonic; Go 1.23+ GCs unstopped timers and makes C unbuffered so Stop/Reset leave no stale value; Stop never closes C; Round(0) strips monotonic.',
      scene:
        'A metronome (Ticker) in a back room: since Go 1.23 the runtime quietly carts it off for GC once nobody holds it, but Stop still never slams the channel door shut.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"context"\n\t"fmt"\n\t"time"\n)\n\n// poll runs work every interval until ctx is cancelled.\nfunc poll(ctx context.Context, interval time.Duration, work func(time.Duration)) {\n\tstart := time.Now()\n\tticker := time.NewTicker(interval)\n\tdefer ticker.Stop() // stop future ticks promptly on return\n\n\tfor {\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\treturn\n\t\tcase <-ticker.C:\n\t\t\t// Since uses the monotonic reading captured in start,\n\t\t\t// so it is immune to wall-clock jumps (NTP, DST, manual sets).\n\t\t\twork(time.Since(start))\n\t\t}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithTimeout(context.Background(), 120*time.Millisecond)\n\tdefer cancel()\n\n\tticks := 0\n\tpoll(ctx, 40*time.Millisecond, func(elapsed time.Duration) {\n\t\tticks++\n\t\tfmt.Printf("tick %d after ~%v\\n", ticks, elapsed.Round(10*time.Millisecond))\n\t})\n\n\t// Round(0) strips the monotonic reading for stable marshaling/equality.\n\tt := time.Now().Round(0)\n\tfmt.Println("stripped monotonic:", t.Equal(t))\n}\n',
      keyPoints: [
        'time.Now() captures wall + monotonic; Sub/Since/Add use the monotonic reading, making elapsed-time immune to NTP/DST/manual clock jumps.',
        '== on time.Time compares the monotonic field too; use Equal or strip via Round(0) for values that cross marshaling boundaries.',
        'Since Go 1.23 an unreferenced, unstopped Timer or Ticker is GC-eligible immediately; time.After in a loop no longer leaks until it fires, but it still churns allocations, so reuse a Timer/Ticker.',
        'Ticker.Stop halts future ticks but never closes C, so you cannot range-until-closed on it; still defer Stop to stop ticks promptly.',
        'Since Go 1.23 timer channels are unbuffered (cap 0) and Stop/Reset guarantee no stale value survives, so the pre-1.23 drain-before-Reset guard is no longer needed and len/cap now return 0.',
        "Ticker coalesces missed ticks (fixed-rate); fixed-delay requires Reset-after-completion; Sleep-in-loop drifts by the job's own runtime.",
      ],
      walkthrough: [
        {
          title: 'Capture monotonic start',
          caption:
            'time.Now() records both a wall-clock time and a monotonic reading, and start keeps both so later elapsed math ignores wall-clock jumps.',
          focus: ['start := time.Now()'],
          state: [
            {
              k: 'start',
              v: 'has monotonic',
            },
            {
              k: 'interval',
              v: '40ms',
            },
          ],
        },
        {
          title: 'Create the ticker',
          caption:
            'NewTicker starts a ticker that delivers a value on ticker.C roughly every 40ms; defer ensures Stop runs on return to release its resources.',
          focus: ['ticker := time.NewTicker(interval)', 'defer ticker.Stop()'],
          state: [
            {
              k: 'ticker.C',
              v: 'cap 1, empty',
            },
            {
              k: 'period',
              v: '40ms',
            },
            {
              k: 'ctx budget',
              v: '120ms',
            },
          ],
        },
        {
          title: 'Select blocks on two channels',
          caption:
            'The loop parks in select, simultaneously waiting for ctx cancellation and for the next tick, resuming on whichever fires first.',
          focus: ['select {', 'case <-ctx.Done():'],
          state: [
            {
              k: 'blocked on',
              v: 'ctx.Done, ticker.C',
            },
            {
              k: 'ticks',
              v: '0',
            },
            {
              k: 'elapsed',
              v: '~0',
            },
          ],
        },
        {
          title: 'First tick fires',
          caption:
            'At ~40ms the ticker sends on C, select takes that case, and work is invoked with time.Since(start) computed from the monotonic reading.',
          focus: ['case <-ticker.C:', 'work(time.Since(start))'],
          state: [
            {
              k: 'ticks',
              v: '1',
            },
            {
              k: 'elapsed',
              v: '~40ms',
            },
            {
              k: 'source',
              v: 'monotonic',
            },
          ],
        },
        {
          title: 'Monotonic immunity',
          caption:
            'time.Since subtracts using the monotonic component, so even an NTP or DST wall-clock jump between start and now cannot corrupt the elapsed value.',
          focus: ['work(time.Since(start))', 'elapsed.Round(10*time.Millisecond)'],
          state: [
            {
              k: 'ticks',
              v: '2 (~80ms)',
            },
            {
              k: 'wall jump',
              v: 'ignored',
            },
            {
              k: 'printed',
              v: '~40ms, ~80ms',
            },
          ],
        },
        {
          title: 'Context times out',
          caption:
            'Around 120ms ctx.Done() closes; select takes that case and poll returns. Whether a third tick prints first is a race, since that tick and the deadline are both ready near 120ms.',
          focus: ['case <-ctx.Done():', 'return'],
          state: [
            {
              k: 'ticks',
              v: '~2-3',
            },
            {
              k: 'ctx',
              v: 'deadline exceeded',
            },
          ],
        },
        {
          title: 'Deferred Stop under 1.23+',
          caption:
            'The deferred ticker.Stop() runs on return; since Go 1.23 the ticker is GC-eligible even if unstopped, and Stop guarantees no stale tick is delivered after it returns.',
          focus: ['defer ticker.Stop()'],
          state: [
            {
              k: 'ticker',
              v: 'stopped',
            },
            {
              k: 'ticker.C',
              v: 'not closed',
            },
            {
              k: 'GC',
              v: 'reclaimable',
            },
          ],
        },
        {
          title: 'Round(0) strips monotonic',
          caption:
            'time.Now().Round(0) removes the monotonic reading, yielding a pure wall-clock Time suitable for stable marshaling and equality; t.Equal(t) is trivially true.',
          focus: ['t := time.Now().Round(0)', 't.Equal(t)'],
          state: [
            {
              k: 't',
              v: 'wall-clock only',
            },
            {
              k: 'monotonic',
              v: 'stripped',
            },
            {
              k: 't.Equal(t)',
              v: 'true',
            },
          ],
        },
      ],
    },
    {
      id: 'go-std-defer-idioms',
      title: 'defer patterns & resource cleanup',
      difficulty: 'Hard',
      tags: ['defer', 'resource-cleanup', 'error-handling', 'loops', 'runtime'],
      summary: 'LIFO defers, loop pitfalls, error-preserving close, and defer cost under Go 1.26.',
      pattern: 'Defer & cleanup',
      visual:
        'Deferred calls push onto a per-goroutine LIFO stack, popped as the enclosing function returns — after the return value is assigned but before control leaves.',
      memorize:
        'Defer = LIFO, args eval now / body runs later; loop bodies leak until func returns; name the return to catch Close errors.',
      scene:
        "Imagine a stack of plates: each defer sets a plate on top; when the function ends you unstack top-first, and any plate can still scribble on the labeled 'return' card before it's handed off.",
      time: 'O(n) defers',
      space: 'O(n) stack',
      code: 'package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\ntype resource struct {\n\tname string\n}\n\nfunc (r *resource) Close() error {\n\tif r.name == "bad" {\n\t\treturn fmt.Errorf("close %s: flush failed", r.name)\n\t}\n\tfmt.Println("closed", r.name)\n\treturn nil\n}\n\nfunc open(name string) (*resource, error) {\n\tif name == "" {\n\t\treturn nil, errors.New("empty name")\n\t}\n\treturn &resource{name: name}, nil\n}\n\n// process opens two resources and guarantees cleanup even on partial failure.\n// The named return err is rewritten by the deferred close so a flush error is\n// not silently swallowed.\nfunc process(a, b string) (err error) {\n\tra, err := open(a)\n\tif err != nil {\n\t\treturn err\n\t}\n\tdefer func() {\n\t\tif cerr := ra.Close(); cerr != nil && err == nil {\n\t\t\terr = cerr\n\t\t}\n\t}()\n\n\trb, err := open(b)\n\tif err != nil {\n\t\treturn err\n\t}\n\tdefer func() {\n\t\tif cerr := rb.Close(); cerr != nil && err == nil {\n\t\t\terr = cerr\n\t\t}\n\t}()\n\n\tfmt.Println("processing", ra.name, rb.name)\n\treturn nil\n}\n\nfunc main() {\n\tnames := []string{"ok", "bad"}\n\tfor _, n := range names {\n\t\tif err := process("main", n); err != nil {\n\t\t\tfmt.Println("error:", err)\n\t\t}\n\t}\n}\n',
      keyPoints: [
        'Defer arguments are evaluated at the defer statement; only a closure body reads later mutations at run time.',
        'Defers unwind LIFO and run after the (named) return value is assigned but before control leaves — enabling error rewriting.',
        'Defers are function-scoped, not block-scoped: defer-in-loop leaks resources until the function returns; extract a helper per iteration.',
        "Go 1.22's fresh loop variable only matters for closures capturing the variable; `defer f(v)` already captured v at defer time in every Go version.",
        'Open-coded defers are near-free in straight-line code; loop/dynamic defers fall back to runtime.deferproc and may allocate.',
        'Merge cleanup errors via `if cerr := c.Close(); cerr != nil && err == nil { err = cerr }` on a named return so Close/Commit failures are not dropped.',
      ],
      walkthrough: [
        {
          title: 'Loop enters, call process("main","ok")',
          caption:
            'main ranges over names and calls process with b="ok" first; execution jumps into process with named return err zero-valued to nil.',
          focus: ['for _, n := range names {', 'if err := process("main", n); err != nil {'],
          state: [
            {
              k: 'n',
              v: '"ok"',
            },
            {
              k: 'err (named)',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Open ra, register defer A',
          caption:
            'open("main") succeeds so ra points to a live resource, then the first deferred closure is pushed onto process\'s defer stack (its body does not run yet).',
          focus: [
            'ra, err := open(a)',
            'defer func() {',
            'if cerr := ra.Close(); cerr != nil && err == nil {',
          ],
          state: [
            {
              k: 'ra.name',
              v: '"main"',
            },
            {
              k: 'defer stack',
              v: '[A]',
            },
            {
              k: 'err',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Open rb, register defer B',
          caption:
            'open("ok") succeeds and a second closure is pushed above A; deferred calls run LIFO so B will fire before A on return.',
          focus: [
            'rb, err := open(b)',
            'defer func() {',
            'if cerr := rb.Close(); cerr != nil && err == nil {',
          ],
          state: [
            {
              k: 'rb.name',
              v: '"ok"',
            },
            {
              k: 'defer stack',
              v: '[A, B]',
            },
            {
              k: 'order',
              v: 'B then A',
            },
          ],
        },
        {
          title: 'Return nil triggers LIFO unwind',
          caption:
            'the body finishes and returns nil, then B runs first closing rb ("ok") and A runs second closing ra ("main"), both leaving named err as nil.',
          focus: [
            'return nil',
            'if cerr := rb.Close(); cerr != nil && err == nil {',
            'if cerr := ra.Close(); cerr != nil && err == nil {',
          ],
          state: [
            {
              k: 'closed order',
              v: 'ok, main',
            },
            {
              k: 'err returned',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Second iteration: process("main","bad")',
          caption:
            'the loop calls process again with b="bad", re-opening ra="main" and rb="bad" and re-registering both defers on a fresh stack.',
          focus: [
            'defer func() {',
            'if cerr := ra.Close(); cerr != nil && err == nil {',
            'rb, err := open(b)',
          ],
          state: [
            {
              k: 'ra.name',
              v: '"main"',
            },
            {
              k: 'rb.name',
              v: '"bad"',
            },
            {
              k: 'defer stack',
              v: '[A, B]',
            },
            {
              k: 'err',
              v: 'nil',
            },
          ],
        },
        {
          title: 'GOTCHA: Close error rewrites named return',
          caption:
            'return nil sets err=nil, but deferred B calls rb.Close() which returns a flush error; because err==nil the closure overwrites the named return with cerr instead of swallowing it.',
          focus: [
            'return nil',
            'return fmt.Errorf("close %s: flush failed", r.name)',
            'err = cerr',
          ],
          state: [
            {
              k: 'return value pre-defer',
              v: 'nil',
            },
            {
              k: 'cerr',
              v: '"close bad: flush failed"',
            },
            {
              k: 'err after B',
              v: 'cerr',
            },
          ],
        },
        {
          title: 'Defer A guarded by err==nil',
          caption:
            'A then closes ra ("main") successfully, but since err is now non-nil the guard skips reassignment so the earlier flush error is preserved and process returns it.',
          focus: [
            'if cerr := ra.Close(); cerr != nil && err == nil {',
            'fmt.Println("closed", r.name)',
          ],
          state: [
            {
              k: 'ra Close',
              v: 'nil',
            },
            {
              k: 'err preserved',
              v: '"close bad: flush failed"',
            },
          ],
        },
        {
          title: 'main prints the surfaced error',
          caption:
            'back in main the non-nil err from the "bad" iteration is printed, proving the deferred close surfaced a failure a naked return would have hidden.',
          focus: ['fmt.Println("error:", err)'],
          state: [
            {
              k: 'output',
              v: 'error: close bad: flush failed',
            },
          ],
        },
      ],
    },
  ],
};
