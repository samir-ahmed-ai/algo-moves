import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const concurrency: GoTopic = {
  id: 'concurrency',
  title: 'Concurrency & Goroutines',
  icon: 'Workflow',
  concepts: [
    {
      id: 'go-conc-scheduler',
      title: 'Goroutines & the GMP scheduler',
      difficulty: 'Hard',
      tags: ['concurrency', 'runtime', 'scheduler', 'goroutines', 'GMP'],
      summary: "How Go's M:N scheduler multiplexes millions of goroutines onto OS threads.",
      pattern: 'GMP scheduler',
      visual:
        'G (goroutines) sit in P-local runqueues; each P binds one M (OS thread) to run them, stealing work when idle.',
      memorize:
        'G on P on M; GOMAXPROCS caps P; idle P steals half; async preempt via SIGURG at safe points.',
      scene:
        "Picture 4 chefs (M) each holding one cutting board (P) with a stack of orders (G); an idle chef grabs half the orders off a busy chef's board.",
      time: '—',
      space: 'O(1) stack ~2KB per G',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"runtime"\n\t"sync"\n\t"sync/atomic"\n)\n\nfunc main() {\n\tprev := runtime.GOMAXPROCS(4)\n\tfmt.Printf("logical CPUs=%d, previous GOMAXPROCS=%d\\n", runtime.NumCPU(), prev)\n\n\tvar completed atomic.Int64\n\tconst goroutines = 100_000\n\n\tvar wg sync.WaitGroup\n\twg.Add(goroutines)\n\tfor i := 0; i < goroutines; i++ {\n\t\tgo func(n int) {\n\t\t\tdefer wg.Done()\n\t\t\tsum := 0\n\t\t\tfor j := 0; j < n%64; j++ {\n\t\t\t\tsum += j\n\t\t\t}\n\t\t\tif sum >= 0 {\n\t\t\t\tcompleted.Add(1)\n\t\t\t}\n\t\t}(i)\n\t}\n\n\twg.Wait()\n\tfmt.Printf("spawned=%d completed=%d maxGoroutines=%d\\n",\n\t\tgoroutines, completed.Load(), runtime.NumGoroutine())\n}\n',
      keyPoints: [
        "GMP: G=goroutine, M=OS thread, P=scheduling context; GOMAXPROCS sets the number of P's, capping parallel execution of Go code.",
        'Goroutines are cheap because they use small (~2KB) growable stacks and are multiplexed in user space, avoiding kernel context-switch cost.',
        'Blocking on a channel/mutex parks the G and frees M+P; a raw blocking syscall blocks the M itself and triggers a P handoff to another M.',
        "Work-stealing keeps P's busy: an idle P checks the global queue and netpoller, then steals ~half of a random victim P's local runqueue.",
        'Asynchronous (SIGURG-based) preemption since Go 1.14 interrupts call-free tight loops at safe points, preventing P starvation.',
        'GOMAXPROCS is cgroup-aware by default in Go 1.25+, but pin it explicitly to the CPU quota in containers to avoid preemption-driven tail latency.',
      ],
      walkthrough: [
        {
          title: 'Cap the P count',
          caption:
            'GOMAXPROCS(4) sets the number of logical processors (P) to 4, returning the previous value, so at most 4 goroutines run Go code simultaneously.',
          focus: ['prev := runtime.GOMAXPROCS(4)'],
          state: [
            {
              k: 'GOMAXPROCS (P)',
              v: '4',
            },
            {
              k: 'prev',
              v: 'old value',
            },
          ],
        },
        {
          title: 'Report the machine',
          caption:
            'NumCPU reports the number of logical CPUs usable by the current process, which is independent of the GOMAXPROCS cap we just set.',
          focus: ['runtime.NumCPU()', 'previous GOMAXPROCS=%d'],
          state: [
            {
              k: 'P',
              v: '4',
            },
            {
              k: 'NumCPU',
              v: 'host-dependent',
            },
          ],
        },
        {
          title: 'Arm the barrier',
          caption:
            'WaitGroup counter is set to 100,000 up front so main can later block until every spawned goroutine calls Done.',
          focus: ['const goroutines = 100_000', 'wg.Add(goroutines)'],
          state: [
            {
              k: 'wg counter',
              v: '100000',
            },
            {
              k: 'completed',
              v: '0',
            },
          ],
        },
        {
          title: "Spawn 100k G's",
          caption:
            "Each 'go' creates a lightweight goroutine (starting ~2KB stack) queued onto a P's local run queue, far exceeding the 4 P's so most G's wait runnable.",
          focus: ['go func(n int) {', '}(i)'],
          state: [
            {
              k: 'goroutines created',
              v: 'up to 100000',
            },
            {
              k: 'P',
              v: '4',
            },
            {
              k: "running G's",
              v: '<= 4',
            },
            {
              k: 'stack/G',
              v: '~2KB',
            },
          ],
        },
        {
          title: 'Scheduled onto M',
          caption:
            "A runnable G is bound to a P and executed on an M (OS thread); when a P's local queue empties, an idle P steals half the runnable G's from another P's queue.",
          focus: ['sum := 0', 'sum += j'],
          state: [
            {
              k: 'G on P on M',
              v: 'active',
            },
            {
              k: 'idle P',
              v: 'steals half',
            },
            {
              k: 'work stealing',
              v: 'on',
            },
          ],
        },
        {
          title: 'Async preemption',
          caption:
            "The tight for loop is preemptible: the sysmon thread signals long-running G's with SIGURG so the scheduler can preempt at an async-safe point and give other G's a turn.",
          focus: ['for j := 0; j < n%64; j++ {'],
          state: [
            {
              k: 'preempt signal',
              v: 'SIGURG',
            },
            {
              k: 'trigger',
              v: '>10ms on P',
            },
            {
              k: 'time slice',
              v: '~10ms',
            },
          ],
        },
        {
          title: 'Atomic completion',
          caption:
            "completed.Add(1) is a lock-free atomic increment, so 100,000 concurrent G's can record completion without a mutex or data race.",
          focus: ['completed.Add(1)', 'defer wg.Done()'],
          state: [
            {
              k: 'completed',
              v: '-> 100000',
            },
            {
              k: 'wg counter',
              v: '-> 0',
            },
            {
              k: 'sync',
              v: 'atomic (lock-free)',
            },
          ],
        },
        {
          title: 'Join and report',
          caption:
            'wg.Wait parks main until the counter hits zero, then NumGoroutine reflects the drained population (near 1 plus runtime helpers) since the workers have exited.',
          focus: ['wg.Wait()', 'runtime.NumGoroutine()'],
          state: [
            {
              k: 'wg counter',
              v: '0',
            },
            {
              k: 'completed.Load()',
              v: '100000',
            },
            {
              k: 'live goroutines',
              v: '~1',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-channels',
      title: 'Channels: buffered, unbuffered, closed, nil',
      difficulty: 'Hard',
      tags: ['concurrency', 'channels', 'goroutines', 'runtime'],
      summary:
        'Send/receive, close semantics, comma-ok, and the nil-channel trick that senior Go hinges on.',
      pattern: 'Channels',
      visual:
        'send/recv rendezvous on unbuffered; buffered decouples up to cap; closed drains then yields zero,false; nil blocks forever',
      memorize:
        'Closed: send panics, recv drains then zero+false. Nil: recv/send block forever, close panics.',
      scene:
        'Picture a mail slot (unbuffered = hand-to-hand rendezvous), a mailbox with N slots (buffered), a slot welded shut (closed: no more sends, but you can still empty it), and a slot with no wall behind it (nil: mail vanishes into the void, nobody ever comes).',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\n// producer sends n values then closes; direction type enforces send-only.\nfunc producer(out chan<- int, n int) {\n\tfor i := 0; i < n; i++ {\n\t\tout <- i\n\t}\n\tclose(out)\n}\n\n// merge fans in two receive-only channels using comma-ok to detect close.\nfunc merge(a, b <-chan int) <-chan int {\n\tout := make(chan int)\n\tvar wg sync.WaitGroup\n\tdrain := func(c <-chan int) {\n\t\tdefer wg.Done()\n\t\tfor {\n\t\t\tv, ok := <-c\n\t\t\tif !ok {\n\t\t\t\treturn // closed channel: ok is false, v is zero value\n\t\t\t}\n\t\t\tout <- v\n\t\t}\n\t}\n\twg.Add(2)\n\tgo drain(a)\n\tgo drain(b)\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\treturn out\n}\n\nfunc main() {\n\ta := make(chan int)    // unbuffered: send blocks until received\n\tb := make(chan int, 3) // buffered: send blocks only when full\n\tgo producer(a, 3)\n\tgo producer(b, 3)\n\n\tsum := 0\n\tfor v := range merge(a, b) { // range stops when out is closed\n\t\tsum += v\n\t}\n\tfmt.Println(sum)\n}\n',
      keyPoints: [
        'Send on closed channel panics; close of nil or already-closed channel panics; only receiving is always safe.',
        'Receiving from a closed, drained channel returns (zero, false) without blocking — comma-ok distinguishes a real value from closure.',
        'Nil channels block forever on both send and receive, which is the mechanism for disabling a select case at runtime.',
        'Unbuffered send/recv is a rendezvous (both sides synchronize); buffered decouples sender and receiver up to the fixed capacity.',
        'Convention: the sole sender closes; with N senders use a WaitGroup-gated closer goroutine so close fires exactly once.',
        'range over a channel ends only when the channel is closed and drained — forgetting to close leaks the ranging goroutine.',
      ],
      walkthrough: [
        {
          title: 'Make the two channels',
          caption:
            'main creates an unbuffered channel a and a buffered channel b with capacity 3, so b can hold three values before a send blocks.',
          focus: ['a := make(chan int)', 'b := make(chan int, 3)'],
          state: [
            {
              k: 'a len/cap',
              v: '0/0',
            },
            {
              k: 'b len/cap',
              v: '0/3',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
        {
          title: 'Launch producers',
          caption:
            'Two producer goroutines start, each with a send-only view (chan<- int) of its channel; the compiler forbids them from receiving.',
          focus: ['go producer(a, 3)', 'go producer(b, 3)'],
          state: [
            {
              k: 'goroutines',
              v: '3',
            },
            {
              k: 'producer(b)',
              v: 'fills 3 without blocking',
            },
            {
              k: 'producer(a)',
              v: 'blocks on first send',
            },
          ],
        },
        {
          title: 'merge spins up drainers',
          caption:
            'merge makes the unbuffered out channel, adds 2 to the WaitGroup, and starts one drain goroutine per input plus a closer goroutine.',
          focus: ['out := make(chan int)', 'wg.Add(2)', 'go drain(a)', 'go drain(b)'],
          state: [
            {
              k: 'goroutines',
              v: '7',
            },
            {
              k: 'wg counter',
              v: '2',
            },
            {
              k: 'out len/cap',
              v: '0/0',
            },
          ],
        },
        {
          title: 'comma-ok receive on open channel',
          caption:
            'Each drainer receives with comma-ok; while the channel is open and delivering, ok is true and v holds the produced value, which is forwarded to out.',
          focus: ['v, ok := <-c', 'out <- v'],
          state: [
            {
              k: 'ok',
              v: 'true',
            },
            {
              k: 'v',
              v: 'produced int',
            },
            {
              k: 'forwarded to',
              v: 'out',
            },
          ],
        },
        {
          title: 'Producer closes its channel',
          caption:
            'After sending all n values, each producer calls close on its send-only channel; already-buffered values stay drainable after the close.',
          focus: ['close(out)'],
          state: [
            {
              k: 'a state',
              v: 'closed',
            },
            {
              k: 'b state',
              v: 'closed',
            },
            {
              k: 'buffered left',
              v: 'drain until empty',
            },
          ],
        },
        {
          title: 'Closed-channel receive: zero + false',
          caption:
            'Once a channel is drained and closed, the comma-ok receive returns immediately with the zero value and ok=false, so the drainer hits the !ok branch and returns.',
          focus: ['if !ok {', 'return // closed channel: ok is false, v is zero value'],
          state: [
            {
              k: 'ok',
              v: 'false',
            },
            {
              k: 'v',
              v: '0 (zero value)',
            },
            {
              k: 'receive',
              v: 'never blocks on closed',
            },
          ],
        },
        {
          title: 'WaitGroup closes out',
          caption:
            'When both drainers have returned, wg.Wait unblocks and the closer goroutine closes out; sending on a closed channel would panic, but only the closer touches out now.',
          focus: ['wg.Wait()', 'close(out)'],
          state: [
            {
              k: 'wg counter',
              v: '0',
            },
            {
              k: 'out state',
              v: 'closed',
            },
            {
              k: 'gotcha',
              v: 'send on closed = panic',
            },
          ],
        },
        {
          title: 'range drains then stops; sum printed',
          caption:
            'The range loop in main pulls every forwarded value into sum and terminates cleanly when out is closed, printing the total 0+1+2+0+1+2 = 6.',
          focus: ['for v := range merge(a, b) {', 'fmt.Println(sum)'],
          state: [
            {
              k: 'sum',
              v: '6',
            },
            {
              k: 'range',
              v: 'exits on close',
            },
            {
              k: 'nil-channel note',
              v: 'recv/send block forever',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-select',
      title: 'select, timeouts & non-blocking ops',
      difficulty: 'Hard',
      tags: ['concurrency', 'channels', 'select', 'timeouts', 'runtime'],
      summary:
        'How select picks ready cases, disables nil cases, and models timeouts/non-blocking I/O.',
      pattern: 'Channels',
      visual:
        'select evaluates all operands once, keeps the ready set, then picks one uniformly at random; nil channels are never ready; default fires only when none are.',
      memorize:
        'nil disables, default = non-blocking, random ready pick, time.After leaks a timer per iteration.',
      scene:
        'A dealer flips over every card face-up at once, discards the nil cards, and if two or more are live she picks one by coin toss — never in the order you wrote them.',
      time: 'O(n) over cases',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"context"\n\t"errors"\n\t"fmt"\n\t"time"\n)\n\n// merge fans two input streams into out until both close, honoring ctx.\n// Closed inputs are set to nil so their select case is disabled forever.\nfunc merge(ctx context.Context, a, b <-chan int) []int {\n\tvar got []int\n\tfor a != nil || b != nil {\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\treturn got\n\t\tcase v, ok := <-a:\n\t\t\tif !ok {\n\t\t\t\ta = nil // disable this case, don\'t spin on the closed channel\n\t\t\t\tcontinue\n\t\t\t}\n\t\t\tgot = append(got, v)\n\t\tcase v, ok := <-b:\n\t\t\tif !ok {\n\t\t\t\tb = nil\n\t\t\t\tcontinue\n\t\t\t}\n\t\t\tgot = append(got, v)\n\t\t}\n\t}\n\treturn got\n}\n\n// trySend is a non-blocking send using default.\nfunc trySend(ch chan<- int, v int) bool {\n\tselect {\n\tcase ch <- v:\n\t\treturn true\n\tdefault:\n\t\treturn false\n\t}\n}\n\nfunc main() {\n\ta := make(chan int, 2)\n\tb := make(chan int, 2)\n\ta <- 1\n\tb <- 2\n\tclose(a)\n\tclose(b)\n\n\tctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)\n\tdefer cancel()\n\n\tres := merge(ctx, a, b)\n\tfmt.Println("merged count:", len(res))\n\n\tfull := make(chan int) // unbuffered, no receiver\n\tfmt.Println("trySend ok:", trySend(full, 99))\n\n\tif errors.Is(ctx.Err(), context.DeadlineExceeded) {\n\t\tfmt.Println("deadline hit")\n\t}\n}\n',
      keyPoints: [
        'select picks uniformly at random among all ready cases — never rely on source order for priority.',
        'A nil channel case is never ready; niling a closed channel is the idiom to disable a case in a for-select loop.',
        'default makes select non-blocking — it fires exactly when no other case can proceed right now.',
        'time.After allocates a Timer per call that lives until it fires; reuse time.Timer.Reset in hot loops to avoid leaks.',
        'All channel operands and send RHS expressions are evaluated once, in source order, before a case is chosen.',
        '`select {}` blocks the goroutine forever; prefer context deadlines over ad-hoc timers for operation-wide bounds.',
      ],
      walkthrough: [
        {
          title: 'Buffered channels primed',
          caption:
            'Two buffered channels each get one value, then both are closed so their buffered value is still drainable but no more can be sent.',
          focus: ['a := make(chan int, 2)', 'a <- 1', 'close(a)'],
          state: [
            {
              k: 'a',
              v: 'buffered cap 2, len 1, closed',
            },
            {
              k: 'b',
              v: 'buffered cap 2, len 1, closed',
            },
          ],
        },
        {
          title: 'Context deadline armed',
          caption:
            'A 50ms deadline context is created; cancel is deferred so the timer resources are released on return.',
          focus: [
            'context.WithTimeout(context.Background(), 50*time.Millisecond)',
            'defer cancel()',
          ],
          state: [
            {
              k: 'ctx',
              v: 'deadline in 50ms',
            },
            {
              k: 'ctx.Err()',
              v: 'nil',
            },
          ],
        },
        {
          title: 'select picks a ready case',
          caption:
            'Inside merge, ctx.Done() is not ready but both a and b have a buffered value ready, so select picks one of the two ready receives at random.',
          focus: ['for a != nil || b != nil', 'select {', 'case v, ok := <-a:'],
          state: [
            {
              k: 'a != nil',
              v: 'true',
            },
            {
              k: 'b != nil',
              v: 'true',
            },
            {
              k: 'ready cases',
              v: '<-a, <-b (random pick)',
            },
            {
              k: 'got',
              v: '[]',
            },
          ],
        },
        {
          title: 'First buffered value received',
          caption:
            'The chosen channel yields its buffered value with ok=true, which is appended to got.',
          focus: ['got = append(got, v)'],
          state: [
            {
              k: 'ok',
              v: 'true',
            },
            {
              k: 'got',
              v: '[1] (or [2])',
            },
          ],
        },
        {
          title: 'Closed+drained channel disabled via nil',
          caption:
            'On the next receive from the same channel it is now closed and empty, so ok=false; setting the local variable to nil permanently disables that select case instead of busy-spinning.',
          focus: [
            'if !ok {',
            "a = nil // disable this case, don't spin on the closed channel",
            'continue',
          ],
          state: [
            {
              k: 'ok',
              v: 'false',
            },
            {
              k: 'a',
              v: 'nil (case disabled)',
            },
            {
              k: 'still active',
              v: '<-b',
            },
          ],
        },
        {
          title: 'Loop exits, count printed',
          caption:
            'After both a and b are drained and set to nil the loop condition becomes false, merge returns both values, and the count is printed as 2.',
          focus: ['return got', 'fmt.Println("merged count:", len(res))'],
          state: [
            {
              k: 'a',
              v: 'nil',
            },
            {
              k: 'b',
              v: 'nil',
            },
            {
              k: 'got',
              v: '[1 2]',
            },
            {
              k: 'stdout',
              v: 'merged count: 2',
            },
          ],
        },
        {
          title: 'Non-blocking send falls to default',
          caption:
            'trySend on an unbuffered channel with no receiver cannot proceed, so the default case runs immediately and it returns false without blocking.',
          focus: ['full := make(chan int) // unbuffered, no receiver', 'case ch <- v:', 'default:'],
          state: [
            {
              k: 'full',
              v: 'unbuffered, no receiver',
            },
            {
              k: 'send ready',
              v: 'false',
            },
            {
              k: 'result',
              v: 'false',
            },
            {
              k: 'stdout',
              v: 'trySend ok: false',
            },
          ],
        },
        {
          title: 'Deadline check (not yet hit)',
          caption:
            'Because merge drained instantly and returned well under 50ms, ctx.Err() is still nil, so errors.Is against DeadlineExceeded is false and "deadline hit" is not printed.',
          focus: ['errors.Is(ctx.Err(), context.DeadlineExceeded)', 'fmt.Println("deadline hit")'],
          state: [
            {
              k: 'ctx.Err()',
              v: 'nil',
            },
            {
              k: 'errors.Is',
              v: 'false',
            },
            {
              k: 'printed',
              v: 'no',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-context',
      title: 'context: cancellation & deadlines',
      difficulty: 'Hard',
      tags: ['context', 'cancellation', 'goroutines', 'timeouts', 'concurrency'],
      summary:
        'Propagate cancellation and deadlines across API boundaries without leaking goroutines.',
      pattern: 'Cancellation trees',
      visual: 'A cancel signal fans down a context tree, closing every derived Done() channel.',
      memorize:
        'Cancel always, defer it, read Done() and Err(), never stuff request data in Values.',
      scene:
        "Picture a root context as a tree trunk; snip any branch with cancel() and every leaf's Done() channel slams shut at once.",
      time: 'O(1) per cancel signal',
      space: 'O(depth) context chain',
      code: 'package main\n\nimport (\n\t"context"\n\t"errors"\n\t"fmt"\n\t"time"\n)\n\n// worker blocks until it gets a result or the context is cancelled.\nfunc worker(ctx context.Context, d time.Duration) error {\n\tselect {\n\tcase <-time.After(d):\n\t\treturn nil\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\t}\n}\n\nfunc main() {\n\tparent, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\n\tchild, childCancel := context.WithTimeout(parent, 50*time.Millisecond)\n\tdefer childCancel()\n\n\t// Slower than the child deadline: expect DeadlineExceeded.\n\tif err := worker(child, 200*time.Millisecond); err != nil {\n\t\tfmt.Println("child:", err, errors.Is(err, context.DeadlineExceeded))\n\t}\n\n\t// Cancelling the parent propagates to any further derived contexts.\n\tgc, gcCancel := context.WithCancel(parent)\n\tdefer gcCancel()\n\tcancel()\n\tif err := worker(gc, time.Hour); err != nil {\n\t\tfmt.Println("grandchild:", err, errors.Is(err, context.Canceled))\n\t}\n}\n',
      keyPoints: [
        'Cancellation flows down the context tree to derived contexts, never up to ancestors.',
        "Always defer cancel() the moment you create a cancellable/timeout context, even if the deadline fires itself — go vet's lostcancel enforces it.",
        'ctx.Err() returns context.Canceled for explicit cancel and context.DeadlineExceeded for timeout; test with errors.Is.',
        'Done() on a never-cancelled context (Background/TODO) returns a nil channel, so that select case is disabled, not immediate.',
        "Derived deadlines can only tighten an ancestor's deadline, never extend it.",
        'Reserve WithValue for request-scoped transiting data (trace IDs, auth, loggers), never for required function parameters.',
      ],
      walkthrough: [
        {
          title: 'Root and defer cancel',
          caption:
            'A cancellable parent context is derived from Background, and its cancel is deferred so the context tree is always released on return.',
          focus: ['parent, cancel := context.WithCancel(context.Background())', 'defer cancel()'],
          state: [
            {
              k: 'parent',
              v: 'active',
            },
            {
              k: 'parent.Err()',
              v: 'nil',
            },
            {
              k: 'deferred',
              v: 'cancel',
            },
          ],
        },
        {
          title: 'Child with 50ms deadline',
          caption:
            'A child is derived from parent with a 50ms timeout, and childCancel is deferred to release the timer even if the deadline never fires.',
          focus: [
            'child, childCancel := context.WithTimeout(parent, 50*time.Millisecond)',
            'defer childCancel()',
          ],
          state: [
            {
              k: 'child deadline',
              v: '+50ms',
            },
            {
              k: 'child.Err()',
              v: 'nil',
            },
            {
              k: 'deferred',
              v: 'cancel, childCancel',
            },
          ],
        },
        {
          title: 'worker races timer vs Done',
          caption:
            "worker(child, 200ms) enters a select that blocks on either its 200ms timer (time.After) or the child context's Done channel.",
          focus: ['case <-time.After(d):', 'case <-ctx.Done():'],
          state: [
            {
              k: 'd (work)',
              v: '200ms',
            },
            {
              k: 'child deadline',
              v: '50ms',
            },
            {
              k: 'select',
              v: 'blocked',
            },
          ],
        },
        {
          title: 'Deadline fires first',
          caption:
            "At ~50ms the child's deadline expires, closing Done before the 200ms timer, so worker returns ctx.Err() which is DeadlineExceeded.",
          focus: ['return ctx.Err()'],
          state: [
            {
              k: 'child.Err()',
              v: 'DeadlineExceeded',
            },
            {
              k: 'worker ret',
              v: 'DeadlineExceeded',
            },
            {
              k: 'elapsed',
              v: '~50ms',
            },
          ],
        },
        {
          title: 'Print child error',
          caption:
            'The child error is printed and errors.Is confirms it matches context.DeadlineExceeded, the sentinel to test against rather than string-matching.',
          focus: ['fmt.Println("child:", err, errors.Is(err, context.DeadlineExceeded))'],
          state: [
            {
              k: 'errors.Is',
              v: 'true',
            },
            {
              k: 'output',
              v: 'child: context deadline exceeded true',
            },
          ],
        },
        {
          title: 'Derive grandchild',
          caption:
            "A new context gc is derived directly from parent (not from the already-expired child), inheriting parent's cancellation.",
          focus: ['gc, gcCancel := context.WithCancel(parent)', 'defer gcCancel()'],
          state: [
            {
              k: 'gc',
              v: 'active',
            },
            {
              k: 'gc parent',
              v: 'parent',
            },
            {
              k: 'gc.Err()',
              v: 'nil',
            },
          ],
        },
        {
          title: 'Cancel parent propagates',
          caption:
            'Calling cancel() on parent cancels every context derived from it, so gc.Done() closes even though its own gcCancel was never called.',
          focus: ['cancel()'],
          state: [
            {
              k: 'parent.Err()',
              v: 'Canceled',
            },
            {
              k: 'gc.Err()',
              v: 'Canceled',
            },
            {
              k: 'propagation',
              v: 'parent->gc',
            },
          ],
        },
        {
          title: 'Grandchild returns Canceled',
          caption:
            'worker(gc, time.Hour) selects on gc.Done() which is already closed, returning Canceled immediately instead of waiting an hour; errors.Is confirms context.Canceled.',
          focus: ['case <-ctx.Done():', 'errors.Is(err, context.Canceled)'],
          state: [
            {
              k: 'd (work)',
              v: '1h (ignored)',
            },
            {
              k: 'worker ret',
              v: 'Canceled',
            },
            {
              k: 'errors.Is',
              v: 'true',
            },
            {
              k: 'output',
              v: 'grandchild: context canceled true',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-sync',
      title: 'sync primitives: Mutex, RWMutex, WaitGroup, Once',
      difficulty: 'Hard',
      tags: ['concurrency', 'sync', 'mutex', 'waitgroup', 'once'],
      summary:
        'Zero-value-ready locks that must never be copied, with subtle WaitGroup and Once semantics.',
      pattern: 'Sync primitives',
      visual:
        'A Mutex is a struct with internal state fields; copying it duplicates lock state and corrupts mutual exclusion.',
      memorize:
        'Zero-value ready, never copy after use; Add before go; Once marks done even if f panics.',
      scene:
        'Imagine a single bathroom key (Mutex) bolted to a wall — photocopy the key and now two people think they hold the only one; the RWMutex is a reading-room where many can read but a writer needs the whole room empty.',
      time: 'O(1) per lock/unlock',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\ntype Cache struct {\n\tmu   sync.RWMutex\n\tdata map[string]int\n\tonce sync.Once\n}\n\nfunc (c *Cache) init() {\n\tc.once.Do(func() { c.data = make(map[string]int) })\n}\n\nfunc (c *Cache) Set(k string, v int) {\n\tc.init()\n\tc.mu.Lock()\n\tdefer c.mu.Unlock()\n\tc.data[k] = v\n}\n\nfunc (c *Cache) Get(k string) (int, bool) {\n\tc.init()\n\tc.mu.RLock()\n\tdefer c.mu.RUnlock()\n\tv, ok := c.data[k]\n\treturn v, ok\n}\n\nfunc main() {\n\tc := &Cache{}\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < 5; i++ {\n\t\twg.Add(1)\n\t\tgo func(n int) {\n\t\t\tdefer wg.Done()\n\t\t\tc.Set(fmt.Sprintf("k%d", n), n*n)\n\t\t}(i)\n\t}\n\twg.Wait()\n\tv, _ := c.Get("k4")\n\tfmt.Println(v)\n}\n',
      keyPoints: [
        'All four primitives are zero-value ready; declare and use, no constructor.',
        "Never copy a Mutex/RWMutex/WaitGroup after first use — go vet's copylocks catches this.",
        'WaitGroup.Add must happen-before the goroutine and before Wait to avoid a counter race.',
        'RWMutex is not reentrant and can self-deadlock nested RLocks when a writer is waiting.',
        'RWMutex only pays off with frequent, non-trivial reads; short sections favor plain Mutex.',
        'Once.Do marks completion even if the function panics — it never retries.',
      ],
      walkthrough: [
        {
          title: 'Zero-value Cache',
          caption:
            'A Cache is allocated with its zero value; the embedded RWMutex and Once are immediately usable without any constructor, and data is still a nil map.',
          focus: ['c := &Cache{}'],
          state: [
            {
              k: 'c.data',
              v: 'nil map',
            },
            {
              k: 'once',
              v: 'not yet done',
            },
            {
              k: 'mu',
              v: 'unlocked',
            },
          ],
        },
        {
          title: 'Register goroutines',
          caption:
            'Before each goroutine is launched, wg.Add(1) increments the WaitGroup counter on the parent goroutine, so the count is raised before the goroutine runs and can never race with wg.Wait().',
          focus: ['wg.Add(1)', 'go func(n int) {'],
          state: [
            {
              k: 'wg counter',
              v: '1..5 (rising)',
            },
            {
              k: 'goroutines',
              v: 'spawning 5',
            },
            {
              k: 'i',
              v: '0->4',
            },
          ],
        },
        {
          title: 'Capture loop var',
          caption:
            'Each goroutine receives its own copy of i via the (n int) parameter, so all five see distinct values 0..4 rather than sharing one variable.',
          focus: ['}(i)', 'defer wg.Done()'],
          state: [
            {
              k: 'n per g',
              v: '0,1,2,3,4',
            },
            {
              k: 'wg counter',
              v: '5',
            },
          ],
        },
        {
          title: 'Once.Do races',
          caption:
            'All goroutines call c.init(), but sync.Once guarantees the map is created exactly once even under concurrent Set calls; every other caller blocks until that first initialization returns.',
          focus: ['c.once.Do(func() { c.data = make(map[string]int) })'],
          state: [
            {
              k: 'once',
              v: 'done after 1st',
            },
            {
              k: 'c.data',
              v: 'empty map{}',
            },
            {
              k: 'init runs',
              v: 'exactly 1x',
            },
          ],
        },
        {
          title: 'Write under Lock',
          caption:
            'Set takes the full write lock so only one goroutine mutates the map at a time; defer c.mu.Unlock() releases it even if the map write were to panic.',
          focus: ['c.mu.Lock()', 'c.data[k] = v'],
          state: [
            {
              k: 'mu',
              v: 'write-locked',
            },
            {
              k: 'writers',
              v: '1 at a time',
            },
            {
              k: 'data grows',
              v: 'k0..k4',
            },
          ],
        },
        {
          title: 'Wait for all',
          caption:
            'wg.Wait() blocks main until the counter returns to zero, i.e. all five deferred wg.Done() calls have run, establishing a happens-before edge to every prior Set.',
          focus: ['wg.Wait()'],
          state: [
            {
              k: 'wg counter',
              v: '5->0',
            },
            {
              k: 'main',
              v: 'unblocks',
            },
            {
              k: 'data',
              v: '{k0:0..k4:16}',
            },
          ],
        },
        {
          title: 'Concurrent-safe read',
          caption:
            'Get uses RLock, which many readers could hold simultaneously without blocking each other; here it safely reads k4 after all writes are complete.',
          focus: ['c.mu.RLock()', 'v, ok := c.data[k]'],
          state: [
            {
              k: 'mu',
              v: 'read-locked',
            },
            {
              k: 'k4',
              v: '16',
            },
            {
              k: 'ok',
              v: 'true',
            },
          ],
        },
        {
          title: 'Print result',
          caption:
            'The value for k4 (4*4) is printed, confirming the deterministic result guaranteed by the WaitGroup synchronization.',
          focus: ['fmt.Println(v)'],
          state: [
            {
              k: 'output',
              v: '16',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-worker-pool',
      title: 'Worker pools, fan-in & fan-out',
      difficulty: 'Hard',
      tags: ['concurrency', 'channels', 'worker-pool', 'fan-in', 'fan-out', 'waitgroup'],
      summary:
        'Bound concurrency with a fixed worker set; fan out over one channel, fan in results, close correctly.',
      pattern: 'Worker pools',
      visual:
        'One jobs channel feeds N workers (fan-out); workers push to one results channel (fan-in); a closer goroutine does wg.Wait then close(results).',
      memorize:
        'N goroutines range one jobs chan; producer closes jobs; separate closer does wg.Wait then close(results).',
      scene:
        "A kitchen pass: one ticket rail (jobs), four cooks pulling tickets, one plating window (results). The expo yells 'last ticket' (close jobs), cooks finish, then the window shutter drops (close results).",
      time: 'O(work/N) wall-clock',
      space: 'O(N + buffer)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\ntype result struct {\n\tjob int\n\tsum int\n}\n\nfunc worker(id int, jobs <-chan int, results chan<- result, wg *sync.WaitGroup) {\n\tdefer wg.Done()\n\tfor j := range jobs {\n\t\ts := 0\n\t\tfor i := 1; i <= j; i++ {\n\t\t\ts += i\n\t\t}\n\t\tresults <- result{job: j, sum: s}\n\t}\n}\n\nfunc main() {\n\tconst numWorkers = 4\n\tconst numJobs = 10\n\n\tjobs := make(chan int)\n\tresults := make(chan result)\n\n\tvar wg sync.WaitGroup\n\tfor w := 1; w <= numWorkers; w++ {\n\t\twg.Add(1)\n\t\tgo worker(w, jobs, results, &wg)\n\t}\n\n\tgo func() {\n\t\tfor j := 1; j <= numJobs; j++ {\n\t\t\tjobs <- j\n\t\t}\n\t\tclose(jobs)\n\t}()\n\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(results)\n\t}()\n\n\ttotal := 0\n\tfor r := range results {\n\t\ttotal += r.sum\n\t}\n\tfmt.Println("total:", total)\n}\n',
      keyPoints: [
        'Fan-out = N goroutines all ranging one jobs channel; fan-in = all workers sending to one results channel. Concurrency is bounded by N, not by buffer size.',
        'Close discipline: the producer (sole sender) closes jobs; a separate goroutine does wg.Wait() then close(results). A channel is closed once, by a sender that knows all sends are done — never by receivers, never by multiple workers.',
        'wg.Add(1) must happen-before wg.Wait() — call Add before launching the goroutine, or Wait can observe zero and close results while workers still send (send-on-closed panic).',
        'Consume results concurrently with production; running the producer inline before draining results deadlocks once N workers block on unread sends.',
        'Cancellation uses close(done) or ctx.Done() — a closed channel broadcasts to all receivers at once; sending would notify only one. Pair every worker channel op with a ctx.Done() select case to prevent leaks.',
        'Forgetting close(jobs) leaves workers blocked on range forever, so wg.Wait never returns and the whole pipeline deadlocks.',
      ],
      walkthrough: [
        {
          title: 'Make unbuffered channels',
          caption:
            'main creates two unbuffered channels: jobs to fan out work and results to fan in outcomes, so every send blocks until a matching receive.',
          focus: ['jobs := make(chan int)', 'results := make(chan result)'],
          state: [
            {
              k: 'jobs cap',
              v: '0 (unbuffered)',
            },
            {
              k: 'results cap',
              v: '0 (unbuffered)',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
        {
          title: 'Fan out N workers',
          caption:
            'The loop starts a fixed set of 4 worker goroutines, calling wg.Add(1) before each go so the WaitGroup counter can never race behind the launches.',
          focus: ['wg.Add(1)', 'go worker(w, jobs, results, &wg)'],
          state: [
            {
              k: 'numWorkers',
              v: '4',
            },
            {
              k: 'wg counter',
              v: '4',
            },
            {
              k: 'goroutines',
              v: '5 (main + 4)',
            },
            {
              k: 'workers',
              v: 'blocked on range jobs',
            },
          ],
        },
        {
          title: 'Producer feeds jobs',
          caption:
            'A separate producer goroutine sends jobs 1..10 into the unbuffered jobs channel; each send hands the value directly to whichever worker is ready to receive.',
          focus: ['jobs <- j', 'for j := 1; j <= numJobs; j++'],
          state: [
            {
              k: 'numJobs',
              v: '10',
            },
            {
              k: 'goroutines',
              v: '6',
            },
            {
              k: 'jobs sent',
              v: '1..10 (streaming)',
            },
          ],
        },
        {
          title: 'Workers compute and fan in',
          caption:
            'Each worker ranges over jobs, computes the triangular sum for its job, and sends the result into the shared results channel, fanning many workers into one stream.',
          focus: ['for j := range jobs {', 'results <- result{job: j, sum: s}'],
          state: [
            {
              k: 'per-job work',
              v: 'sum 1..j',
            },
            {
              k: 'active workers',
              v: 'up to 4 in parallel',
            },
            {
              k: 'results',
              v: 'flowing to main',
            },
          ],
        },
        {
          title: 'Close jobs to signal done',
          caption:
            "Once all 10 jobs are sent, the producer closes jobs; each worker's range loop drains remaining values then exits, letting the deferred wg.Done() fire.",
          focus: ['close(jobs)', 'defer wg.Done()'],
          state: [
            {
              k: 'jobs',
              v: 'closed',
            },
            {
              k: 'wg counter',
              v: '4 -> 0 as workers exit',
            },
            {
              k: 'gotcha',
              v: 'only producer closes jobs',
            },
          ],
        },
        {
          title: 'Closer closes results',
          caption:
            'The dedicated closer goroutine blocks on wg.Wait() until all workers have returned, then closes results — the only safe place to close it, since no sender remains.',
          focus: ['wg.Wait()', 'close(results)'],
          state: [
            {
              k: 'wg counter',
              v: '0',
            },
            {
              k: 'results',
              v: 'closed after Wait',
            },
            {
              k: 'gotcha',
              v: 'close AFTER all senders done',
            },
          ],
        },
        {
          title: 'Main drains and finishes',
          caption:
            "main's range over results receives every in-flight result, accumulates the total, and the loop ends cleanly when results is closed and empty.",
          focus: ['for r := range results {', 'fmt.Println("total:", total)'],
          state: [
            {
              k: 'total',
              v: '220',
            },
            {
              k: 'results',
              v: 'closed + drained',
            },
            {
              k: 'goroutines',
              v: '1 (main) -> exit',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-hazards',
      title: 'Races, deadlocks & goroutine leaks',
      difficulty: 'Hard',
      tags: ['concurrency', 'data-race', 'channels', 'deadlock', 'goroutine-leak', 'runtime'],
      summary:
        'The four canonical concurrency failure modes and why the runtime can only catch some of them.',
      pattern: 'Concurrency hazards',
      visual:
        '-race instruments memory access; runtime panics on closed-channel send/double-close; blocked goroutines leak silently unless ALL threads park (fatal deadlock).',
      memorize:
        'Race = detected only if it happens; closed send/double-close panics; leak = blocked forever; deadlock only when ALL goroutines sleep.',
      scene:
        'Four traps on one trail: an invisible tripwire (race), a spring-loaded pit (closed send), a locked room nobody leaves (leak), and a bridge where everyone waits for the other to cross first (deadlock).',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"context"\n\t"fmt"\n\t"time"\n)\n\n// worker fans results into out but honors ctx so it never leaks if the\n// consumer stops reading early.\nfunc worker(ctx context.Context, id int, out chan<- int) {\n\tfor i := 0; ; i++ {\n\t\tselect {\n\t\tcase out <- id*100 + i:\n\t\tcase <-ctx.Done():\n\t\t\treturn\n\t\t}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\tout := make(chan int)\n\n\tfor id := 0; id < 3; id++ {\n\t\tgo worker(ctx, id, out)\n\t}\n\n\t// Consume only a bounded prefix, then cancel so producers unblock.\n\tgot := make([]int, 0, 5)\n\tfor len(got) < 5 {\n\t\tselect {\n\t\tcase v := <-out:\n\t\t\tgot = append(got, v)\n\t\tcase <-time.After(time.Second):\n\t\t\tcancel()\n\t\t}\n\t}\n\tcancel()\n\n\tfmt.Println(len(got))\n}\n',
      keyPoints: [
        '`go build/test -race` is a dynamic happens-before detector: it finds races only on interleavings actually executed, never proves their absence.',
        'A data race per the Go memory model is any unsynchronized read+write to the same location; hardware atomicity of the store is irrelevant.',
        'Sending on a closed channel, closing an already-closed channel, and closing a nil channel all panic; only the SOLE OWNER should close, and producers never close a shared fan-in channel.',
        'Goroutines blocked on a send/receive that will never complete leak forever — they are never garbage collected; guard blocking ops with context or use buffering.',
        "The fatal 'all goroutines are asleep' deadlock fires only when NO goroutine is runnable; partial deadlocks with a live timer or netpoller are silent leaks instead.",
      ],
      walkthrough: [
        {
          title: 'Launch producers',
          caption:
            'An unbuffered channel is created and three worker goroutines are spawned, all blocked trying to send on out because no receiver is ready yet.',
          focus: ['out := make(chan int)', 'go worker(ctx, id, out)'],
          state: [
            {
              k: 'goroutines',
              v: '1 main + 3 workers',
            },
            {
              k: 'out',
              v: 'unbuffered, no receiver',
            },
            {
              k: 'workers',
              v: 'blocked on send',
            },
          ],
        },
        {
          title: 'First rendezvous',
          caption:
            "The main loop's receive synchronizes with one worker's send, handing over a single value with no data race because the channel provides happens-before ordering.",
          focus: ['case v := <-out:', 'case out <- id*100 + i:'],
          state: [
            {
              k: 'got',
              v: '[]',
            },
            {
              k: 'len(got)',
              v: '0 -> 1',
            },
            {
              k: 'race?',
              v: 'no (chan sync)',
            },
          ],
        },
        {
          title: 'Drain a bounded prefix',
          caption:
            'The loop repeats until exactly five values are collected; which worker wins each send is nondeterministic, but every handoff is race-free.',
          focus: ['for len(got) < 5 {', 'got = append(got, v)'],
          state: [
            {
              k: 'len(got)',
              v: 'grows to 5',
            },
            {
              k: 'cap(got)',
              v: '5',
            },
            {
              k: 'workers',
              v: 'still looping',
            },
          ],
        },
        {
          title: 'Leak averted by cancel',
          caption:
            "After the loop ends, cancel() closes ctx.Done(); each worker's select then takes the ctx.Done() branch and returns instead of blocking forever on a send nobody reads.",
          focus: ['cancel()', 'case <-ctx.Done():', 'return'],
          state: [
            {
              k: 'ctx',
              v: 'canceled',
            },
            {
              k: 'workers',
              v: 'draining, then return',
            },
            {
              k: 'leak?',
              v: 'no',
            },
          ],
        },
        {
          title: 'The leak counterfactual',
          caption:
            'Without the ctx.Done() case, a worker whose send has no receiver would park permanently on out <- ... — a goroutine leak the runtime never reports because the goroutine is merely blocked, not deadlocked.',
          focus: ['case out <- id*100 + i:'],
          state: [
            {
              k: 'if no ctx case',
              v: 'worker parks forever',
            },
            {
              k: 'runtime report',
              v: 'none',
            },
            {
              k: 'failure mode',
              v: 'leak',
            },
          ],
        },
        {
          title: 'Deadlock threshold',
          caption:
            "The runtime panics 'all goroutines are asleep - deadlock!' only when EVERY goroutine is blocked; here main keeps running and workers can exit, so this never triggers.",
          focus: ['select {', 'case <-time.After(time.Second):'],
          state: [
            {
              k: 'deadlock detector',
              v: 'fires iff ALL asleep',
            },
            {
              k: 'main',
              v: 'running',
            },
            {
              k: 'triggered?',
              v: 'no',
            },
          ],
        },
        {
          title: 'Close panics (contrast)',
          caption:
            'This program never closes out, avoiding the send-on-closed-channel and double-close panics — the two hazards the runtime always catches deterministically, unlike races and leaks.',
          focus: ['out := make(chan int)'],
          state: [
            {
              k: 'close(out)',
              v: 'never called',
            },
            {
              k: 'send-on-closed',
              v: 'would panic',
            },
            {
              k: 'double-close',
              v: 'would panic',
            },
          ],
        },
        {
          title: 'Deterministic finish',
          caption:
            'Main prints 5 and the deferred cancel runs (idempotent alongside the explicit cancel), guaranteeing every worker has a shutdown signal as the program exits.',
          focus: ['fmt.Println(len(got))', 'defer cancel()'],
          state: [
            {
              k: 'output',
              v: '5',
            },
            {
              k: 'cancel calls',
              v: 'idempotent',
            },
            {
              k: 'exit',
              v: 'clean',
            },
          ],
        },
      ],
    },
    {
      id: 'go-conc-atomic',
      title: 'atomic operations & the sync/atomic types',
      difficulty: 'Hard',
      tags: ['concurrency', 'sync/atomic', 'memory-model', 'lock-free', 'performance'],
      summary: 'Lock-free reads/writes with the typed atomics — and where their guarantees end.',
      pattern: 'Atomics',
      visual:
        'CPU executes a single indivisible LOCK-prefixed instruction; no other core observes a half-written value, and the operation is a full sequentially-consistent fence.',
      memorize:
        'Typed atomics are seq-cst; they make ONE word indivisible, not a critical section. Copy an atomic and you copy nothing safe — go vet catches it.',
      scene:
        'A bank teller stamping one ledger line with a single hammer blow: nobody ever sees half a stamp, but two separate stamps are still two separate moments.',
      time: 'O(1) per op',
      space: 'O(1)',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n\t"sync/atomic"\n)\n\n// Config is swapped atomically as an immutable snapshot.\ntype Config struct {\n\tVersion int\n\tTimeout int\n}\n\nfunc main() {\n\tvar current atomic.Pointer[Config]\n\tcurrent.Store(&Config{Version: 1, Timeout: 30})\n\n\tvar hits atomic.Int64\n\tvar wg sync.WaitGroup\n\n\t// Readers take a consistent snapshot without locking.\n\tfor i := 0; i < 8; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tfor j := 0; j < 1000; j++ {\n\t\t\t\tcfg := current.Load()\n\t\t\t\tif cfg.Timeout > 0 {\n\t\t\t\t\thits.Add(1)\n\t\t\t\t}\n\t\t\t}\n\t\t}()\n\t}\n\n\t// One writer publishes new immutable configs.\n\twg.Add(1)\n\tgo func() {\n\t\tdefer wg.Done()\n\t\tfor v := 2; v <= 5; v++ {\n\t\t\tcurrent.Store(&Config{Version: v, Timeout: 30 + v})\n\t\t}\n\t}()\n\n\twg.Wait()\n\tfmt.Println("final version:", current.Load().Version)\n\tfmt.Println("reads:", hits.Load())\n}\n',
      keyPoints: [
        'Go atomics are sequentially consistent — there is no relaxed or acquire/release tier as in C++.',
        'Mixing an atomic write with a plain (non-atomic) read of the same location is a data race with undefined behavior, regardless of CPU word size.',
        'Typed atomics (atomic.Int64, atomic.Pointer[T]) embed noCopy; copying after use is a go vet error — always Load to read.',
        'Atomics win when the whole operation is one machine word; multi-word invariants still require a mutex.',
        'atomic.Pointer swap of an immutable snapshot is the canonical lock-free copy-on-write pattern; Store then Load gives happens-before so initialized fields are visible.',
        'Add returns the post-operation value, never loses updates, and each concurrent call returns a distinct value.',
      ],
      walkthrough: [
        {
          title: 'Publish first config',
          caption:
            'The main goroutine atomically stores a pointer to the initial immutable Config, so any later Load observes a fully-constructed snapshot.',
          focus: [
            'var current atomic.Pointer[Config]',
            'current.Store(&Config{Version: 1, Timeout: 30})',
          ],
          state: [
            {
              k: 'current.Version',
              v: '1',
            },
            {
              k: 'current.Timeout',
              v: '30',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
        {
          title: 'Zero the atomic counter',
          caption:
            'An atomic.Int64 is declared; its zero value is a ready-to-use atomic that will accumulate hits indivisibly across all goroutines.',
          focus: ['var hits atomic.Int64', 'var wg sync.WaitGroup'],
          state: [
            {
              k: 'hits',
              v: '0',
            },
            {
              k: 'wg counter',
              v: '0',
            },
          ],
        },
        {
          title: 'Launch 8 readers',
          caption:
            'Eight reader goroutines are spawned, each registered on the WaitGroup, all racing to Load the same atomic pointer concurrently.',
          focus: ['for i := 0; i < 8; i++ {', 'go func() {'],
          state: [
            {
              k: 'reader goroutines',
              v: '8',
            },
            {
              k: 'wg counter',
              v: '8',
            },
            {
              k: 'goroutines',
              v: '9 (+main)',
            },
          ],
        },
        {
          title: 'Lock-free snapshot Load',
          caption:
            'Each reader calls Load to grab a consistent Config pointer without a mutex, then dereferences it safely because the pointee is never mutated after publication.',
          focus: ['cfg := current.Load()', 'if cfg.Timeout > 0 {'],
          state: [
            {
              k: 'cfg',
              v: 'consistent snapshot',
            },
            {
              k: 'lock held',
              v: 'none',
            },
            {
              k: 'Timeout > 0',
              v: 'true',
            },
          ],
        },
        {
          title: 'Atomic increment',
          caption:
            'hits.Add(1) performs a sequentially-consistent read-modify-write, so concurrent increments from all 8 readers never lose an update.',
          focus: ['hits.Add(1)'],
          state: [
            {
              k: 'hits',
              v: 'growing',
            },
            {
              k: 'op',
              v: 'indivisible RMW',
            },
            {
              k: 'races',
              v: '0',
            },
          ],
        },
        {
          title: 'Writer swaps pointers',
          caption:
            'The single writer publishes four new immutable Configs by Storing fresh pointers; readers atomically flip between whole snapshots with no torn reads.',
          focus: [
            'for v := 2; v <= 5; v++ {',
            'current.Store(&Config{Version: v, Timeout: 30 + v})',
          ],
          state: [
            {
              k: 'current.Version',
              v: '2->3->4->5',
            },
            {
              k: 'writer goroutines',
              v: '1',
            },
            {
              k: 'torn reads',
              v: '0',
            },
          ],
        },
        {
          title: 'Gotcha: one word, not a section',
          caption:
            "The atomic makes each pointer Store/Load indivisible, but a read-then-act sequence spanning multiple Loads is NOT a critical section; also, atomic.Pointer must never be copied after first use, and go vet's copylocks check flags such copies via its embedded noCopy.",
          focus: ['cfg := current.Load()', 'hits.Add(1)'],
          state: [
            {
              k: 'guarantee',
              v: '1 op atomic',
            },
            {
              k: 'NOT',
              v: 'a multi-op section',
            },
            {
              k: 'go vet',
              v: 'catches copy',
            },
          ],
        },
        {
          title: 'Join and report',
          caption:
            'wg.Wait blocks the main goroutine until all 9 tracked goroutines (8 readers + 1 writer) finish, then the final Load reads the last-published version (5) and hits totals 8000 with no data race.',
          focus: ['wg.Wait()', 'fmt.Println("reads:", hits.Load())'],
          state: [
            {
              k: 'final version',
              v: '5',
            },
            {
              k: 'reads',
              v: '8000',
            },
            {
              k: 'goroutines',
              v: '1 (main)',
            },
          ],
        },
      ],
    },
  ],
};
