import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const concurrency: GoTopic = {
  "id": "concurrency",
  "title": "Concurrency & Goroutines",
  "icon": "Workflow",
  "concepts": [
    {
      "id": "go-conc-scheduler",
      "title": "Goroutines & the GMP scheduler",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "runtime",
        "scheduler",
        "goroutines",
        "GMP"
      ],
      "summary": "How Go's M:N scheduler multiplexes millions of goroutines onto OS threads.",
      "pattern": "GMP scheduler",
      "visual": "G (goroutines) sit in P-local runqueues; each P binds one M (OS thread) to run them, stealing work when idle.",
      "memorize": "G on P on M; GOMAXPROCS caps P; idle P steals half; async preempt via SIGURG at safe points.",
      "scene": "Picture 4 chefs (M) each holding one cutting board (P) with a stack of orders (G); an idle chef grabs half the orders off a busy chef's board.",
      "time": "—",
      "space": "O(1) stack ~2KB per G",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"runtime\"\n\t\"sync\"\n\t\"sync/atomic\"\n)\n\nfunc main() {\n\tprev := runtime.GOMAXPROCS(4)\n\tfmt.Printf(\"logical CPUs=%d, previous GOMAXPROCS=%d\\n\", runtime.NumCPU(), prev)\n\n\tvar completed atomic.Int64\n\tconst goroutines = 100_000\n\n\tvar wg sync.WaitGroup\n\twg.Add(goroutines)\n\tfor i := 0; i < goroutines; i++ {\n\t\tgo func(n int) {\n\t\t\tdefer wg.Done()\n\t\t\tsum := 0\n\t\t\tfor j := 0; j < n%64; j++ {\n\t\t\t\tsum += j\n\t\t\t}\n\t\t\tif sum >= 0 {\n\t\t\t\tcompleted.Add(1)\n\t\t\t}\n\t\t}(i)\n\t}\n\n\twg.Wait()\n\tfmt.Printf(\"spawned=%d completed=%d maxGoroutines=%d\\n\",\n\t\tgoroutines, completed.Load(), runtime.NumGoroutine())\n}\n",
      "quiz": [
        {
          "id": "gmp-letters",
          "prompt": "In Go's GMP model, what do G, M, and P denote, and which one does GOMAXPROCS bound?",
          "choices": [
            {
              "label": "G=goroutine, M=thread, P=processor — GOMAXPROCS bounds P",
              "correct": true
            },
            {
              "label": "G=goroutine, M=mutex, P=pointer — GOMAXPROCS bounds M"
            },
            {
              "label": "G=group, M=machine, P=process — GOMAXPROCS bounds G"
            },
            {
              "label": "G=goroutine, M=thread, P=processor — GOMAXPROCS bounds M"
            }
          ],
          "explain": "P is the scheduling context (a run-queue plus resources) needed to execute Go code; GOMAXPROCS sets the number of P's, capping goroutines running Go code simultaneously — not the total M count."
        },
        {
          "id": "gmp-threadcount",
          "prompt": "With GOMAXPROCS=4, why can a program still show far more than 4 OS threads (M's) alive?",
          "choices": [
            {
              "label": "Blocking syscalls detach M from P — runtime spins up new M's",
              "correct": true
            },
            {
              "label": "Each goroutine gets its own M — threads scale with goroutines"
            },
            {
              "label": "GOMAXPROCS bounds P not threads — M count equals goroutine count"
            },
            {
              "label": "cgo forbids thread reuse — every call forks a fresh M"
            }
          ],
          "explain": "When a G enters a blocking syscall, its M blocks with it and hands off P; the runtime creates or wakes another M to keep P busy, so live M count can exceed GOMAXPROCS."
        },
        {
          "id": "gmp-preempt",
          "prompt": "A tight loop with no function calls once starved the scheduler. What lets Go 1.26 preempt it?",
          "choices": [
            {
              "label": "Asynchronous preemption — SIGURG interrupts the running G",
              "correct": true
            },
            {
              "label": "Only cooperative yields — the loop must call runtime.Gosched",
              "correct": false
            },
            {
              "label": "Only stack-growth checks — every backward jump inserts a check",
              "correct": false
            },
            {
              "label": "Stop-the-world GC — collection forcibly rotates goroutines",
              "correct": false
            }
          ],
          "explain": "Since Go 1.14, signal-based (SIGURG) asynchronous preemption interrupts long-running loops at safe points, so a call-free tight loop no longer monopolizes its P."
        },
        {
          "id": "gmp-steal",
          "prompt": "What does an idle P do under work-stealing, and from where does it primarily take work?",
          "choices": [
            {
              "label": "Steals half a victim P's local runqueue — balances load",
              "correct": true
            },
            {
              "label": "Only drains the global runqueue — never touches other P's"
            },
            {
              "label": "Blocks until its own queue fills — waits for the netpoller"
            },
            {
              "label": "Steals one G from a victim's head — preserves strict FIFO"
            }
          ],
          "explain": "An idle P first checks the global queue and netpoller, then steals roughly half of a randomly chosen victim P's local runqueue to amortize stealing cost and rebalance load."
        },
        {
          "id": "gmp-cheap",
          "prompt": "Which factor most directly makes goroutines cheap compared to OS threads?",
          "choices": [
            {
              "label": "Small growable stacks start ~2KB — copied and resized on demand",
              "correct": true
            },
            {
              "label": "Goroutines run in kernel space — the OS schedules them directly"
            },
            {
              "label": "Each goroutine preallocates ~1MB — mapped lazily by the OS"
            },
            {
              "label": "Goroutines share one stack — no per-goroutine allocation happens"
            }
          ],
          "explain": "Goroutines begin with tiny (~2KB) contiguous stacks that grow by copying to a larger segment when needed, and user-space scheduling avoids kernel context-switch cost."
        },
        {
          "id": "gmp-blocking",
          "prompt": "A goroutine blocks on a channel receive. How does this differ from blocking in a raw OS syscall for the scheduler?",
          "choices": [
            {
              "label": "Channel block parks G and frees M+P — syscall block ties up M",
              "correct": true
            },
            {
              "label": "Both park the G identically — the M stays free in each case"
            },
            {
              "label": "Channel block spins the P — syscall block parks G cheaply"
            },
            {
              "label": "Channel block consumes an M — syscall block needs no thread"
            }
          ],
          "explain": "A channel or mutex block is a runtime-managed park: the G is set aside and M+P immediately run other G's. A raw blocking syscall blocks the M itself, forcing a P handoff to another M."
        }
      ],
      "design": {
        "prompt": "You run a latency-sensitive service in a container limited to 2 CPUs (via cgroups) on a 64-core host, but tail latencies spike unpredictably. Walk through how GOMAXPROCS, thread count, and the GMP scheduler interact here, and what you'd tune.",
        "answer": "The core trap: before Go 1.25, GOMAXPROCS defaulted to runtime.NumCPU(), which reads the host's 64 logical CPUs, not the cgroup's 2-CPU quota — so the runtime creates 64 P's and happily schedules 64 goroutines running Go code in parallel, but the CFS scheduler only grants ~2 CPUs of wall time. The result is heavy involuntary preemption, cache thrashing, and throttling stalls that manifest as tail-latency spikes. Go 1.25+ made the default cgroup-aware (rounding the CPU quota up), which usually fixes this, but you should still pin GOMAXPROCS explicitly to the quota (e.g. via automaxprocs or an env var) so behavior is deterministic across Go versions and quota changes. Separately, blocking syscalls and cgo can spin up extra M's beyond GOMAXPROCS; if you have many blocking calls, watch thread count and consider batching or async I/O so P's aren't constantly handed off. My recommendation: set GOMAXPROCS to match the cgroup limit, keep goroutine work non-blocking where possible, measure with runtime/metrics and scheduler-latency traces, and only raise GOMAXPROCS above the quota if profiling shows genuine idle CPU headroom. The tradeoff is throughput vs. latency: fewer P's reduces contention and preemption jitter but can underutilize bursts; too many P's maximizes parallelism on paper but wastes it against a hard cgroup ceiling."
      },
      "keyPoints": [
        "GMP: G=goroutine, M=OS thread, P=scheduling context; GOMAXPROCS sets the number of P's, capping parallel execution of Go code.",
        "Goroutines are cheap because they use small (~2KB) growable stacks and are multiplexed in user space, avoiding kernel context-switch cost.",
        "Blocking on a channel/mutex parks the G and frees M+P; a raw blocking syscall blocks the M itself and triggers a P handoff to another M.",
        "Work-stealing keeps P's busy: an idle P checks the global queue and netpoller, then steals ~half of a random victim P's local runqueue.",
        "Asynchronous (SIGURG-based) preemption since Go 1.14 interrupts call-free tight loops at safe points, preventing P starvation.",
        "GOMAXPROCS is cgroup-aware by default in Go 1.25+, but pin it explicitly to the CPU quota in containers to avoid preemption-driven tail latency."
      ]
    },
    {
      "id": "go-conc-channels",
      "title": "Channels: buffered, unbuffered, closed, nil",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "channels",
        "goroutines",
        "runtime"
      ],
      "summary": "Send/receive, close semantics, comma-ok, and the nil-channel trick that senior Go hinges on.",
      "pattern": "Channels",
      "visual": "send/recv rendezvous on unbuffered; buffered decouples up to cap; closed drains then yields zero,false; nil blocks forever",
      "memorize": "Closed: send panics, recv drains then zero+false. Nil: recv/send block forever, close panics.",
      "scene": "Picture a mail slot (unbuffered = hand-to-hand rendezvous), a mailbox with N slots (buffered), a slot welded shut (closed: no more sends, but you can still empty it), and a slot with no wall behind it (nil: mail vanishes into the void, nobody ever comes).",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n)\n\n// producer sends n values then closes; direction type enforces send-only.\nfunc producer(out chan<- int, n int) {\n\tfor i := 0; i < n; i++ {\n\t\tout <- i\n\t}\n\tclose(out)\n}\n\n// merge fans in two receive-only channels using comma-ok to detect close.\nfunc merge(a, b <-chan int) <-chan int {\n\tout := make(chan int)\n\tvar wg sync.WaitGroup\n\tdrain := func(c <-chan int) {\n\t\tdefer wg.Done()\n\t\tfor {\n\t\t\tv, ok := <-c\n\t\t\tif !ok {\n\t\t\t\treturn // closed channel: ok is false, v is zero value\n\t\t\t}\n\t\t\tout <- v\n\t\t}\n\t}\n\twg.Add(2)\n\tgo drain(a)\n\tgo drain(b)\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\treturn out\n}\n\nfunc main() {\n\ta := make(chan int)    // unbuffered: send blocks until received\n\tb := make(chan int, 3) // buffered: send blocks only when full\n\tgo producer(a, 3)\n\tgo producer(b, 3)\n\n\tsum := 0\n\tfor v := range merge(a, b) { // range stops when out is closed\n\t\tsum += v\n\t}\n\tfmt.Println(sum)\n}",
      "quiz": [
        {
          "id": "recv-from-closed",
          "prompt": "A goroutine executes `v, ok := <-ch` on a channel `ch` that has already been closed AND fully drained (buffer empty). What happens?",
          "choices": [
            {
              "label": "returns immediately — v is zero value, ok is false",
              "correct": true
            },
            {
              "label": "blocks forever — no more senders exist"
            },
            {
              "label": "panics — receive on closed channel is illegal"
            },
            {
              "label": "returns last value — ok stays true until reset"
            }
          ],
          "explain": "Receiving from a closed, drained channel never blocks: it yields the element type's zero value with ok=false. Only sending on a closed channel panics; receiving is always safe."
        },
        {
          "id": "nil-recv",
          "prompt": "What is the behavior of a receive `<-ch` when `ch` is a nil channel (declared `var ch chan int` and never made)?",
          "choices": [
            {
              "label": "blocks forever — nil channel never proceeds",
              "correct": true
            },
            {
              "label": "returns zero — behaves like a closed channel"
            },
            {
              "label": "panics immediately — nil dereference at runtime"
            },
            {
              "label": "returns instantly — ok is false right away"
            }
          ],
          "explain": "Both send and receive on a nil channel block forever. This is deliberate and exploited in select to dynamically disable a case by setting its channel to nil."
        },
        {
          "id": "close-nil",
          "prompt": "You call `close(ch)` where `ch` is a nil channel. What is the result?",
          "choices": [
            {
              "label": "panics — close of nil channel",
              "correct": true
            },
            {
              "label": "no-op — closing nil is silently ignored"
            },
            {
              "label": "blocks forever — matches nil send semantics"
            },
            {
              "label": "returns error — close reports the nil state"
            }
          ],
          "explain": "close(nil) panics with 'close of nil channel', just as closing an already-closed channel panics with 'close of closed channel'. close never returns a value, so it cannot report an error."
        },
        {
          "id": "buffered-full-send",
          "prompt": "Given `ch := make(chan int, 2)` with two values already buffered and no active receiver, what does a third `ch <- 3` do?",
          "choices": [
            {
              "label": "blocks until a receive frees a slot — buffer is full",
              "correct": true
            },
            {
              "label": "panics — buffer overflow at capacity"
            },
            {
              "label": "drops the value — oldest element evicted silently"
            },
            {
              "label": "succeeds immediately — buffer auto-grows on demand"
            }
          ],
          "explain": "A buffered channel's cap is fixed; sending when len == cap blocks until a receive frees a slot. Channels never drop values or grow their buffer, and a full send is not a panic."
        },
        {
          "id": "send-on-closed",
          "prompt": "After `close(ch)`, another goroutine still holds a reference and executes `ch <- 1`. What happens?",
          "choices": [
            {
              "label": "panics — send on closed channel",
              "correct": true
            },
            {
              "label": "blocks forever — closed channel accepts no sends"
            },
            {
              "label": "discarded — send on closed is a no-op"
            },
            {
              "label": "succeeds — value queued into the buffer"
            }
          ],
          "explain": "Sending on a closed channel always panics ('send on closed channel'), regardless of buffering. This is why the close-signaling convention is that only the sole sender closes, never receivers."
        },
        {
          "id": "range-close",
          "prompt": "A `for v := range ch` loop reads a buffered channel that senders fill and then never close. What is the outcome once all buffered values are consumed?",
          "choices": [
            {
              "label": "blocks awaiting next value — range ends only on close",
              "correct": true
            },
            {
              "label": "exits cleanly — range stops when buffer empties"
            },
            {
              "label": "panics — range requires a closed channel"
            },
            {
              "label": "yields zero values — loops forever on defaults"
            }
          ],
          "explain": "range over a channel terminates only when the channel is closed and drained. If it is never closed, the loop blocks on the empty channel — a classic goroutine leak / deadlock source."
        }
      ],
      "design": {
        "prompt": "You are designing a fan-in pipeline where multiple producer goroutines feed one consumer over a shared channel, and the pipeline must support graceful shutdown on a cancellation signal. Who should close the channel, and how do you avoid both 'send on closed channel' panics and goroutine leaks?",
        "answer": "The cardinal rule is that a channel is closed by its sole sender, never by a receiver and never by one of many concurrent senders — otherwise a second sender can panic on send-after-close. With multiple producers you cannot let any producer close the shared channel directly; instead put a sync.WaitGroup around the producers and a dedicated goroutine that calls wg.Wait() then close(out), so close happens exactly once after the last send. For cancellation, thread a context.Context (or a done channel) into every producer's select so each send races against <-ctx.Done(); on cancel, producers return, the WaitGroup drains, and the closer fires — no orphaned senders blocking on a full channel. The consumer ranges over the channel and exits naturally on close. Avoid the tempting nil-channel or 'closed flag' hacks for multi-sender close because checking-then-sending is a race. The recommended architecture is context for cancel propagation, a WaitGroup-gated single closer, and receiver-side range for drain; this gives deterministic shutdown with no panics and no leaked goroutines. If backpressure matters, size the buffer to smooth bursts but never rely on buffering for correctness — correctness comes from the close protocol, not the buffer."
      },
      "keyPoints": [
        "Send on closed channel panics; close of nil or already-closed channel panics; only receiving is always safe.",
        "Receiving from a closed, drained channel returns (zero, false) without blocking — comma-ok distinguishes a real value from closure.",
        "Nil channels block forever on both send and receive, which is the mechanism for disabling a select case at runtime.",
        "Unbuffered send/recv is a rendezvous (both sides synchronize); buffered decouples sender and receiver up to the fixed capacity.",
        "Convention: the sole sender closes; with N senders use a WaitGroup-gated closer goroutine so close fires exactly once.",
        "range over a channel ends only when the channel is closed and drained — forgetting to close leaks the ranging goroutine."
      ]
    },
    {
      "id": "go-conc-select",
      "title": "select, timeouts & non-blocking ops",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "channels",
        "select",
        "timeouts",
        "runtime"
      ],
      "summary": "How select picks ready cases, disables nil cases, and models timeouts/non-blocking I/O.",
      "pattern": "Channels",
      "visual": "select evaluates all operands once, keeps the ready set, then picks one uniformly at random; nil channels are never ready; default fires only when none are.",
      "memorize": "nil disables, default = non-blocking, random ready pick, time.After leaks a timer per iteration.",
      "scene": "A dealer flips over every card face-up at once, discards the nil cards, and if two or more are live she picks one by coin toss — never in the order you wrote them.",
      "time": "O(n) over cases",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"errors\"\n\t\"fmt\"\n\t\"time\"\n)\n\n// merge fans two input streams into out until both close, honoring ctx.\n// Closed inputs are set to nil so their select case is disabled forever.\nfunc merge(ctx context.Context, a, b <-chan int) []int {\n\tvar got []int\n\tfor a != nil || b != nil {\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\treturn got\n\t\tcase v, ok := <-a:\n\t\t\tif !ok {\n\t\t\t\ta = nil // disable this case, don't spin on the closed channel\n\t\t\t\tcontinue\n\t\t\t}\n\t\t\tgot = append(got, v)\n\t\tcase v, ok := <-b:\n\t\t\tif !ok {\n\t\t\t\tb = nil\n\t\t\t\tcontinue\n\t\t\t}\n\t\t\tgot = append(got, v)\n\t\t}\n\t}\n\treturn got\n}\n\n// trySend is a non-blocking send using default.\nfunc trySend(ch chan<- int, v int) bool {\n\tselect {\n\tcase ch <- v:\n\t\treturn true\n\tdefault:\n\t\treturn false\n\t}\n}\n\nfunc main() {\n\ta := make(chan int, 2)\n\tb := make(chan int, 2)\n\ta <- 1\n\tb <- 2\n\tclose(a)\n\tclose(b)\n\n\tctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)\n\tdefer cancel()\n\n\tres := merge(ctx, a, b)\n\tfmt.Println(\"merged count:\", len(res))\n\n\tfull := make(chan int) // unbuffered, no receiver\n\tfmt.Println(\"trySend ok:\", trySend(full, 99))\n\n\tif errors.Is(ctx.Err(), context.DeadlineExceeded) {\n\t\tfmt.Println(\"deadline hit\")\n\t}\n}\n",
      "quiz": [
        {
          "id": "random-ready",
          "prompt": "Two cases in a select are both ready when the statement executes. How does the runtime decide which one runs?",
          "choices": [
            {
              "label": "Uniform random — chosen among ready cases",
              "correct": true
            },
            {
              "label": "Source order — first ready case wins"
            },
            {
              "label": "Channel age — oldest blocked channel first"
            },
            {
              "label": "Goroutine priority — highest scheduler weight"
            }
          ],
          "explain": "When multiple cases can proceed, select chooses one uniformly at random (a pseudo-random permutation) to avoid starvation; source order does not affect which ready case wins."
        },
        {
          "id": "nil-case",
          "prompt": "Inside a for-select loop you set a channel variable to nil after it closes. What is the effect on that case?",
          "choices": [
            {
              "label": "Permanently disabled — nil channel never ready",
              "correct": true
            },
            {
              "label": "Panics immediately — nil receive is illegal"
            },
            {
              "label": "Always ready — nil yields the zero value"
            },
            {
              "label": "Runs default — nil falls through to default"
            }
          ],
          "explain": "A receive from a nil channel blocks forever, so its select case is never selectable; niling out a channel is the idiom to permanently disable its case."
        },
        {
          "id": "default-nonblock",
          "prompt": "A select has one send case on an unbuffered channel with no waiting receiver, plus a default. What happens?",
          "choices": [
            {
              "label": "default runs — send cannot proceed now",
              "correct": true
            },
            {
              "label": "Send case runs — value is buffered internally"
            },
            {
              "label": "Blocks — waits for a receiver to appear"
            },
            {
              "label": "Panics — send on unbuffered without receiver"
            }
          ],
          "explain": "With a default present, select never blocks: an unbuffered send cannot proceed without a ready receiver, so the default case executes immediately."
        },
        {
          "id": "time-after-leak",
          "prompt": "You write `case <-time.After(d)` inside a hot for-select loop that mostly takes the other case. What is the main hazard?",
          "choices": [
            {
              "label": "Timer leak — a fresh timer per iteration",
              "correct": true
            },
            {
              "label": "Panic — time.After cannot be used in select"
            },
            {
              "label": "Immediate fire — After returns a closed channel"
            },
            {
              "label": "Deadlock — timer blocks the select forever"
            }
          ],
          "explain": "Each time.After call allocates a new Timer that stays alive until it fires after d; in a tight loop these accumulate, wasting memory and timer-heap slots — reuse one time.Timer with Reset instead."
        },
        {
          "id": "empty-select",
          "prompt": "What does a select statement with no cases at all — `select {}` — do?",
          "choices": [
            {
              "label": "Blocks forever — never becomes ready",
              "correct": true
            },
            {
              "label": "Returns immediately — nothing to select"
            },
            {
              "label": "Panics — empty select is a compile error"
            },
            {
              "label": "Spins — busy-waits burning a core"
            }
          ],
          "explain": "`select {}` has no runnable case and no default, so it blocks the goroutine permanently (the runtime reports a deadlock if every goroutine is blocked)."
        },
        {
          "id": "eval-order",
          "prompt": "For `case ch <- f():`, when is f() evaluated relative to case selection?",
          "choices": [
            {
              "label": "Before selection — operands evaluated once upfront",
              "correct": true
            },
            {
              "label": "After selection — only for the chosen case"
            },
            {
              "label": "Never — send RHS is lazy until receiver reads"
            },
            {
              "label": "Twice — once to test readiness, once to send"
            }
          ],
          "explain": "Upon entering select, all channel operands and the right-hand-side expressions of send statements are evaluated exactly once, in source order, before any case is chosen."
        }
      ],
      "design": {
        "prompt": "You're building a worker that consumes from an input channel, must honor cancellation via context, and should give up if no item arrives within a timeout — all in one select loop. Walk through how you'd structure the select and manage the timeout, and what pitfalls you'd guard against.",
        "answer": "Use a single for-select with three kinds of cases: `<-ctx.Done()` for cancellation, `v, ok := <-in` for work (niling `in` when it closes so its case is disabled), and a timeout case. The key pitfall is `time.After(d)` inside the loop: it allocates a fresh timer every iteration and each lives until it fires, so a busy loop leaks timers and memory; instead create one `*time.Timer` outside the loop and `Reset` it after draining, or restructure so the timeout is per-idle-period rather than per-iteration. Remember select picks uniformly at random among ready cases, so a flood of work plus a fired timeout could pick either — if timeout must win deterministically you need a two-stage select (non-blocking work check first, then a blocking select). Also account for Timer.Stop returning false and the need to drain its channel when resetting to avoid a stale fire. My recommendation: prefer a context with deadline (`context.WithTimeout`) over ad-hoc timers when the timeout is a hard bound on the whole operation, because it composes across call layers and cancels cleanly; reserve a manually-managed reusable Timer for per-message idle timeouts where the deadline slides forward on each received item."
      },
      "keyPoints": [
        "select picks uniformly at random among all ready cases — never rely on source order for priority.",
        "A nil channel case is never ready; niling a closed channel is the idiom to disable a case in a for-select loop.",
        "default makes select non-blocking — it fires exactly when no other case can proceed right now.",
        "time.After allocates a Timer per call that lives until it fires; reuse time.Timer.Reset in hot loops to avoid leaks.",
        "All channel operands and send RHS expressions are evaluated once, in source order, before a case is chosen.",
        "`select {}` blocks the goroutine forever; prefer context deadlines over ad-hoc timers for operation-wide bounds."
      ]
    },
    {
      "id": "go-conc-context",
      "title": "context: cancellation & deadlines",
      "difficulty": "Hard",
      "tags": [
        "context",
        "cancellation",
        "goroutines",
        "timeouts",
        "concurrency"
      ],
      "summary": "Propagate cancellation and deadlines across API boundaries without leaking goroutines.",
      "pattern": "Cancellation trees",
      "visual": "A cancel signal fans down a context tree, closing every derived Done() channel.",
      "memorize": "Cancel always, defer it, read Done() and Err(), never stuff request data in Values.",
      "scene": "Picture a root context as a tree trunk; snip any branch with cancel() and every leaf's Done() channel slams shut at once.",
      "time": "O(1) per cancel signal",
      "space": "O(depth) context chain",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"errors\"\n\t\"fmt\"\n\t\"time\"\n)\n\n// worker blocks until it gets a result or the context is cancelled.\nfunc worker(ctx context.Context, d time.Duration) error {\n\tselect {\n\tcase <-time.After(d):\n\t\treturn nil\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\t}\n}\n\nfunc main() {\n\tparent, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\n\tchild, childCancel := context.WithTimeout(parent, 50*time.Millisecond)\n\tdefer childCancel()\n\n\t// Slower than the child deadline: expect DeadlineExceeded.\n\tif err := worker(child, 200*time.Millisecond); err != nil {\n\t\tfmt.Println(\"child:\", err, errors.Is(err, context.DeadlineExceeded))\n\t}\n\n\t// Cancelling the parent propagates to any further derived contexts.\n\tgc, gcCancel := context.WithCancel(parent)\n\tdefer gcCancel()\n\tcancel()\n\tif err := worker(gc, time.Hour); err != nil {\n\t\tfmt.Println(\"grandchild:\", err, errors.Is(err, context.Canceled))\n\t}\n}\n",
      "quiz": [
        {
          "id": "cancel-leak",
          "prompt": "You call ctx, _ := context.WithTimeout(parent, time.Second) and discard the cancel func. What is the concrete consequence even if the timeout eventually fires?",
          "choices": [
            {
              "label": "Context leak — timer and subtree held until deadline",
              "correct": true
            },
            {
              "label": "Immediate panic — discarding cancel is illegal"
            },
            {
              "label": "No effect — timer contexts self-clean instantly"
            },
            {
              "label": "Deadlock — parent blocks on the child"
            }
          ],
          "explain": "Discarding cancel keeps the child registered in the parent's children set and its timer armed until the deadline expires, leaking those resources until then; go vet's lostcancel check flags it. Calling cancel releases the timer and detaches the child immediately."
        },
        {
          "id": "deadline-err",
          "prompt": "A context created with WithTimeout expires. What does ctx.Err() return, and how should callers test it?",
          "choices": [
            {
              "label": "context.DeadlineExceeded — check via errors.Is",
              "correct": true
            },
            {
              "label": "context.Canceled — compare with =="
            },
            {
              "label": "nil — Err stays nil after timeout"
            },
            {
              "label": "os.ErrDeadlineExceeded — same sentinel reused"
            }
          ],
          "explain": "Timeout/deadline expiry sets Err to context.DeadlineExceeded; explicit cancel sets context.Canceled. context.DeadlineExceeded is its own sentinel (distinct from os.ErrDeadlineExceeded), and callers should prefer errors.Is since wrapped errors may not compare equal with ==."
        },
        {
          "id": "values-misuse",
          "prompt": "Which use of context.WithValue is the documented anti-pattern that seniors should reject in review?",
          "choices": [
            {
              "label": "Passing required function parameters — hides the API",
              "correct": true
            },
            {
              "label": "Carrying a request-scoped trace ID — accepted use"
            },
            {
              "label": "Storing a request-scoped auth identity — accepted use"
            },
            {
              "label": "Attaching a per-request logger — accepted use"
            }
          ],
          "explain": "Context values are for request-scoped data that transits API boundaries (trace IDs, request-scoped identity, loggers), not for passing mandatory arguments a function needs to operate. Using them to smuggle required params makes signatures dishonest and untyped."
        },
        {
          "id": "parent-propagate",
          "prompt": "Parent context P has child C (via WithCancel) and grandchild G (derived from C). You call C's cancel func. What happens to P and G?",
          "choices": [
            {
              "label": "G cancelled, P unaffected — cancel flows downward only",
              "correct": true
            },
            {
              "label": "Both G and P cancelled — signals flow both ways"
            },
            {
              "label": "Only C cancelled — derivation does not chain"
            },
            {
              "label": "Nothing cancels — cancel needs the root context"
            }
          ],
          "explain": "Cancellation propagates from a context to all contexts derived from it, but never upward to ancestors. Cancelling C closes G's Done() while leaving P live."
        },
        {
          "id": "done-nil",
          "prompt": "You call ctx.Done() on a context.Background(). What does the returned channel do in a select?",
          "choices": [
            {
              "label": "Returns nil channel — that case never fires",
              "correct": true
            },
            {
              "label": "Returns a closed channel — case fires immediately"
            },
            {
              "label": "Panics — Background has no Done method"
            },
            {
              "label": "Blocks the whole select — starves other cases"
            }
          ],
          "explain": "Background/TODO can never be cancelled, so Done() returns a nil channel; a receive on a nil channel blocks forever, so that single select case is effectively disabled while the other cases still run normally."
        },
        {
          "id": "deadline-shorten",
          "prompt": "parent has a deadline 10s from now. You call WithTimeout(parent, 30*time.Second). What is the child's effective deadline?",
          "choices": [
            {
              "label": "Inherits parent's 10s — child cannot extend it",
              "correct": true
            },
            {
              "label": "Uses child's 30s — the newer deadline wins"
            },
            {
              "label": "No deadline — conflicting deadlines cancel out"
            },
            {
              "label": "Sum of both — 40s total budget"
            }
          ],
          "explain": "A derived context can only tighten, never loosen, an ancestor's deadline; WithTimeout effectively records min(parent deadline, requested). The child fires at the parent's 10s mark."
        }
      ],
      "design": {
        "prompt": "You are designing the cancellation strategy for a request-handling service where an inbound HTTP request fans out to several downstream RPCs and a database query, and any failure or client disconnect should abort the rest. How do you structure context propagation, deadlines, and cleanup, and what are the failure modes you guard against?",
        "answer": "Thread the request's context (from http.Request.Context()) through every call so a client disconnect or handler return cancels the whole subtree; never store a context in a struct field, pass it as the first parameter. Derive a per-request WithTimeout to bound total latency, and optionally tighter per-hop deadlines, remembering derived deadlines can only shorten the parent's. Always defer cancel() immediately after creating a cancellable/timeout context, even when the timeout will fire on its own, to release the timer and detach from the parent promptly; the vet lostcancel check enforces this. For fan-out, errgroup.WithContext is the idiomatic tool: the first non-nil error cancels siblings. Guard against goroutine leaks by ensuring every spawned goroutine selects on ctx.Done() and exits, and against silently swallowing ctx.Err(). The main tradeoff is granularity: one coarse deadline is simple but can let a slow hop consume the whole budget, while per-hop deadlines are precise but add bookkeeping. My recommendation is a single request-level deadline plus errgroup for fan-out, adding per-hop timeouts only for known-slow or flaky dependencies."
      },
      "keyPoints": [
        "Cancellation flows down the context tree to derived contexts, never up to ancestors.",
        "Always defer cancel() the moment you create a cancellable/timeout context, even if the deadline fires itself — go vet's lostcancel enforces it.",
        "ctx.Err() returns context.Canceled for explicit cancel and context.DeadlineExceeded for timeout; test with errors.Is.",
        "Done() on a never-cancelled context (Background/TODO) returns a nil channel, so that select case is disabled, not immediate.",
        "Derived deadlines can only tighten an ancestor's deadline, never extend it.",
        "Reserve WithValue for request-scoped transiting data (trace IDs, auth, loggers), never for required function parameters."
      ]
    },
    {
      "id": "go-conc-sync",
      "title": "sync primitives: Mutex, RWMutex, WaitGroup, Once",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "sync",
        "mutex",
        "waitgroup",
        "once"
      ],
      "summary": "Zero-value-ready locks that must never be copied, with subtle WaitGroup and Once semantics.",
      "pattern": "Sync primitives",
      "visual": "A Mutex is a struct with internal state fields; copying it duplicates lock state and corrupts mutual exclusion.",
      "memorize": "Zero-value ready, never copy after use; Add before go; Once marks done even if f panics.",
      "scene": "Imagine a single bathroom key (Mutex) bolted to a wall — photocopy the key and now two people think they hold the only one; the RWMutex is a reading-room where many can read but a writer needs the whole room empty.",
      "time": "O(1) per lock/unlock",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n)\n\ntype Cache struct {\n\tmu   sync.RWMutex\n\tdata map[string]int\n\tonce sync.Once\n}\n\nfunc (c *Cache) init() {\n\tc.once.Do(func() { c.data = make(map[string]int) })\n}\n\nfunc (c *Cache) Set(k string, v int) {\n\tc.init()\n\tc.mu.Lock()\n\tdefer c.mu.Unlock()\n\tc.data[k] = v\n}\n\nfunc (c *Cache) Get(k string) (int, bool) {\n\tc.init()\n\tc.mu.RLock()\n\tdefer c.mu.RUnlock()\n\tv, ok := c.data[k]\n\treturn v, ok\n}\n\nfunc main() {\n\tc := &Cache{}\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < 5; i++ {\n\t\twg.Add(1)\n\t\tgo func(n int) {\n\t\t\tdefer wg.Done()\n\t\t\tc.Set(fmt.Sprintf(\"k%d\", n), n*n)\n\t\t}(i)\n\t}\n\twg.Wait()\n\tv, _ := c.Get(\"k4\")\n\tfmt.Println(v)\n}\n",
      "quiz": [
        {
          "id": "copy-after-use",
          "prompt": "A function takes a struct containing a sync.Mutex by value, locks it, and mutates a field. What is the core problem?",
          "choices": [
            {
              "label": "Copying after use — the copy has independent lock state",
              "correct": true
            },
            {
              "label": "Nothing wrong — value receivers lock fine"
            },
            {
              "label": "Deadlock always — value copies self-deadlock"
            },
            {
              "label": "Compile error — Mutex is not copyable"
            }
          ],
          "explain": "A sync.Mutex must not be copied after first use; copying duplicates the internal state, so the copy's lock protects nothing the original sees. go vet flags this via copylocks, but it is not a compile error."
        },
        {
          "id": "wg-add-placement",
          "prompt": "Why must wg.Add(1) be called before launching the goroutine rather than inside it?",
          "choices": [
            {
              "label": "Race on the counter — Wait may return before Add runs",
              "correct": true
            },
            {
              "label": "Add panics — inside goroutines it is illegal"
            },
            {
              "label": "Add is not goroutine-safe — needs a mutex"
            },
            {
              "label": "Done double-counts — inner Add doubles the total"
            }
          ],
          "explain": "If Add runs inside the goroutine, Wait in the parent may observe a zero counter and return before the goroutine even increments it, defeating the barrier. Add must happen-before the corresponding Wait."
        },
        {
          "id": "rwmutex-tradeoff",
          "prompt": "When does sync.RWMutex most likely UNDERperform a plain sync.Mutex?",
          "choices": [
            {
              "label": "Short critical sections — RWMutex bookkeeping dominates",
              "correct": true
            },
            {
              "label": "Read-mostly load — writers are rare"
            },
            {
              "label": "Many CPUs reading — parallel readers scale"
            },
            {
              "label": "Long read holds — concurrency is exploited"
            }
          ],
          "explain": "RWMutex has higher per-operation overhead than Mutex; for tiny critical sections that overhead outweighs any read-parallelism benefit, so a plain Mutex is often faster unless reads are frequent and non-trivial."
        },
        {
          "id": "once-panic",
          "prompt": "Inside sync.Once.Do, the function panics. What happens on a later Do call with the same function?",
          "choices": [
            {
              "label": "Marked done — the function never runs again",
              "correct": true
            },
            {
              "label": "Retried — Once reruns until it succeeds"
            },
            {
              "label": "Panics again — Once re-invokes on each call"
            },
            {
              "label": "Returns error — Do reports the prior panic"
            }
          ],
          "explain": "Once.Do sets its done flag via defer, so the call counts as complete even if f panics; it will never invoke f again. If initialization can fail and must retry, Once is the wrong tool."
        },
        {
          "id": "rlock-reentrant",
          "prompt": "A goroutine holds RLock and, while holding it, calls RLock again on the same RWMutex. Is this safe?",
          "choices": [
            {
              "label": "Deadlock-prone — a pending writer blocks the second RLock",
              "correct": true
            },
            {
              "label": "Always safe — read locks are reentrant"
            },
            {
              "label": "Compile error — nested RLock is rejected"
            },
            {
              "label": "Auto-upgraded — the second call takes a write lock"
            }
          ],
          "explain": "Go's RWMutex is not reentrant. If a writer is blocked waiting between the two RLock calls, the second RLock blocks to avoid writer starvation, causing a self-deadlock."
        },
        {
          "id": "zero-value",
          "prompt": "Which statement about zero-value readiness of these primitives is correct?",
          "choices": [
            {
              "label": "All four usable at zero value — no constructor needed",
              "correct": true
            },
            {
              "label": "WaitGroup needs New — zero value panics on Add"
            },
            {
              "label": "Mutex needs Init — zero value is unlocked-invalid"
            },
            {
              "label": "Once needs a flag — zero value runs immediately"
            }
          ],
          "explain": "sync.Mutex, sync.RWMutex, sync.WaitGroup, and sync.Once are all designed so their zero value is immediately usable; declaring var mu sync.Mutex yields an unlocked, ready mutex."
        }
      ],
      "design": {
        "prompt": "You are designing a concurrent in-memory cache for a high-throughput service. Reads vastly outnumber writes. Discuss how you would choose and structure the synchronization, and when you would move away from a single RWMutex.",
        "answer": "A single sync.RWMutex is the natural starting point given the read-heavy profile: RLock lets many readers proceed in parallel while writes take the exclusive Lock. However, RWMutex has real costs — its per-operation overhead exceeds a plain Mutex, so if critical sections are tiny (a single map lookup), the atomic bookkeeping can make it slower than Mutex; benchmark before assuming a win. A single global lock also becomes a contention point at high core counts because even readers serialize on the internal state. If profiling shows the lock is the bottleneck, options include sharding the map into N buckets each with its own RWMutex (reduces contention proportionally), using sync.Map for the append-heavy or disjoint-key access patterns it is optimized for, or an atomic.Pointer to an immutable snapshot swapped on write (copy-on-write) which gives readers fully lock-free access at the cost of write amplification. I would recommend starting with a sharded RWMutex design: it is simple, keeps strong consistency, and scales far better than one global lock, while avoiding sync.Map's caveats for general-purpose read/write mixes. Regardless of choice, ensure the cache struct is never copied after use (pass by pointer, embed nothing by value) and lazily initialize any maps with sync.Once so the zero value is safe."
      },
      "keyPoints": [
        "All four primitives are zero-value ready; declare and use, no constructor.",
        "Never copy a Mutex/RWMutex/WaitGroup after first use — go vet's copylocks catches this.",
        "WaitGroup.Add must happen-before the goroutine and before Wait to avoid a counter race.",
        "RWMutex is not reentrant and can self-deadlock nested RLocks when a writer is waiting.",
        "RWMutex only pays off with frequent, non-trivial reads; short sections favor plain Mutex.",
        "Once.Do marks completion even if the function panics — it never retries."
      ]
    },
    {
      "id": "go-conc-worker-pool",
      "title": "Worker pools, fan-in & fan-out",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "channels",
        "worker-pool",
        "fan-in",
        "fan-out",
        "waitgroup"
      ],
      "summary": "Bound concurrency with a fixed worker set; fan out over one channel, fan in results, close correctly.",
      "pattern": "Worker pools",
      "visual": "One jobs channel feeds N workers (fan-out); workers push to one results channel (fan-in); a closer goroutine does wg.Wait then close(results).",
      "memorize": "N goroutines range one jobs chan; producer closes jobs; separate closer does wg.Wait then close(results).",
      "scene": "A kitchen pass: one ticket rail (jobs), four cooks pulling tickets, one plating window (results). The expo yells 'last ticket' (close jobs), cooks finish, then the window shutter drops (close results).",
      "time": "O(work/N) wall-clock",
      "space": "O(N + buffer)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n)\n\ntype result struct {\n\tjob int\n\tsum int\n}\n\nfunc worker(id int, jobs <-chan int, results chan<- result, wg *sync.WaitGroup) {\n\tdefer wg.Done()\n\tfor j := range jobs {\n\t\ts := 0\n\t\tfor i := 1; i <= j; i++ {\n\t\t\ts += i\n\t\t}\n\t\tresults <- result{job: j, sum: s}\n\t}\n}\n\nfunc main() {\n\tconst numWorkers = 4\n\tconst numJobs = 10\n\n\tjobs := make(chan int)\n\tresults := make(chan result)\n\n\tvar wg sync.WaitGroup\n\tfor w := 1; w <= numWorkers; w++ {\n\t\twg.Add(1)\n\t\tgo worker(w, jobs, results, &wg)\n\t}\n\n\tgo func() {\n\t\tfor j := 1; j <= numJobs; j++ {\n\t\t\tjobs <- j\n\t\t}\n\t\tclose(jobs)\n\t}()\n\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(results)\n\t}()\n\n\ttotal := 0\n\tfor r := range results {\n\t\ttotal += r.sum\n\t}\n\tfmt.Println(\"total:\", total)\n}\n",
      "quiz": [
        {
          "id": "who-closes-results",
          "prompt": "In a fan-out/fan-in pool where N workers all send to a single unbuffered results channel, which strategy correctly closes results exactly once with no panic and no lost values?",
          "choices": [
            {
              "label": "Separate closer goroutine — wg.Wait then close(results)",
              "correct": true
            },
            {
              "label": "Each worker calls close — last one wins the race"
            },
            {
              "label": "Producer closes results — right after close(jobs)"
            },
            {
              "label": "Never close results — rely on GC to reclaim it"
            }
          ],
          "explain": "A channel must be closed exactly once by a party that knows all senders are done. Only a dedicated goroutine that does wg.Wait() (after every worker returns) can safely close(results). Each worker closing panics on the second close; the producer closing early would race with in-flight sends."
        },
        {
          "id": "deadlock-unbuffered",
          "prompt": "You launch the workers and then, in main, run the producer loop `for j := ...{ jobs <- j }` inline (not in a goroutine) BEFORE starting the results range loop, with unbuffered jobs and results channels. What happens?",
          "choices": [
            {
              "label": "Deadlock — workers block sending to unread results",
              "correct": true
            },
            {
              "label": "Runs fine — workers buffer results internally"
            },
            {
              "label": "Panic — send on a full channel is fatal"
            },
            {
              "label": "Producer skips jobs — non-blocking send drops them"
            }
          ],
          "explain": "Workers finish a job and block on `results <- ...` because nobody is receiving yet. Once N workers are blocked on results, they stop ranging jobs, so the producer blocks on `jobs <- j`, and no goroutine can make progress: deadlock. The fix is to consume results concurrently (or run the producer in its own goroutine)."
        },
        {
          "id": "forgot-close-jobs",
          "prompt": "A pool works correctly except the producer forgets to `close(jobs)` after sending all work. All results are still received by main's range loop. What is the runtime outcome?",
          "choices": [
            {
              "label": "Deadlock — workers block on range, wg.Wait never returns",
              "correct": true
            },
            {
              "label": "Clean exit — main returns after last result"
            },
            {
              "label": "Goroutines leak — program exits without deadlock"
            },
            {
              "label": "Panic — ranging a non-closed channel is illegal"
            }
          ],
          "explain": "`for j := range jobs` only ends when jobs is closed. Without close, workers block forever waiting for more jobs, so wg.Done() is never called, the closer's wg.Wait() never returns, results is never closed, and main's range loop blocks after the last value: the runtime detects all goroutines asleep and reports deadlock."
        },
        {
          "id": "done-channel-cancel",
          "prompt": "To let a worker pool abandon remaining work on cancellation, you add a `done` channel and use `select { case results <- r: case <-done: return }` in workers. What is the essential property of the done channel that makes this a correct broadcast to all workers?",
          "choices": [
            {
              "label": "close(done) — a closed channel is readable by all receivers",
              "correct": true
            },
            {
              "label": "Send one value — the first worker to read wins"
            },
            {
              "label": "Buffer done to N — one slot reserved per worker"
            },
            {
              "label": "done must be bidirectional — workers also send on it"
            }
          ],
          "explain": "Closing a channel makes every receive on it proceed immediately (with the zero value), so `close(done)` unblocks all workers simultaneously — a one-to-many broadcast. Sending values would signal only one receiver per send. This is why cancellation channels are closed, never sent on, and closed exactly once by the canceller."
        },
        {
          "id": "bounded-concurrency",
          "prompt": "What primarily bounds the maximum number of jobs executing concurrently in the canonical worker-pool pattern (fixed N goroutines ranging one jobs channel)?",
          "choices": [
            {
              "label": "Worker count N — only N goroutines ever pull jobs",
              "correct": true
            },
            {
              "label": "jobs channel capacity — buffer size caps parallelism"
            },
            {
              "label": "GOMAXPROCS — the scheduler runs at most that many"
            },
            {
              "label": "Number of jobs sent — more jobs means more parallelism"
            }
          ],
          "explain": "Concurrency is bounded by how many goroutines consume jobs, which is exactly N. The jobs buffer only decouples producer/consumer timing, not concurrency. GOMAXPROCS caps OS-thread parallelism for running goroutines, not how many are logically in-flight (many can be blocked on I/O)."
        },
        {
          "id": "waitgroup-add-placement",
          "prompt": "A developer moves `wg.Add(1)` from the launching loop into the top of each worker goroutine, keeping the closer goroutine's `wg.Wait(); close(results)`. Why is this a bug?",
          "choices": [
            {
              "label": "Add races Wait — Wait may see zero before workers add",
              "correct": true
            },
            {
              "label": "Add inside goroutine is illegal — must be in main"
            },
            {
              "label": "Counter overflows — each worker adds independently"
            },
            {
              "label": "defer Done runs first — counter goes negative always"
            }
          ],
          "explain": "wg.Add must happen-before the corresponding wg.Wait. If Add(1) runs inside the worker goroutine, the closer's Wait() can run before any worker has scheduled its Add, observe a counter of 0, return immediately, and close(results) while workers still send — causing a send-on-closed panic. Add must be called before starting the goroutine (or before Wait can run)."
        }
      ],
      "design": {
        "prompt": "Design a worker pool that processes a large, possibly unbounded stream of jobs with bounded concurrency, supports graceful cancellation (via context), propagates the first fatal error, and never leaks goroutines. Walk through your channel topology, closing discipline, and backpressure strategy, and note where you'd deviate from a naive textbook pool.",
        "answer": "Topology: a single jobs channel (fan-out to N workers) and a single results/errors channel (fan-in). The producer owns jobs and is the only closer of jobs; a dedicated goroutine does wg.Wait() then close(results), so results is closed exactly once by the party that knows all senders finished. For cancellation, thread context.Context into every worker and select on ctx.Done() at every blocking send/receive so no goroutine can wedge on a channel after cancel; this is the key leak-prevention rule — every channel op in a worker must be paired with a ctx.Done() case. For first-error propagation, prefer golang.org/x/sync/errgroup with a bounded g.SetLimit(N) or an errgroup wrapping the workers: the first non-nil return cancels the derived context and Wait returns that error, which is cleaner than hand-rolling an error channel and a sync.Once. Backpressure: keep jobs unbuffered or small-buffered so a slow consumer naturally throttles the producer rather than letting an unbounded queue balloon memory; buffering trades latency smoothing for memory and can hide overload. Pitfalls to call out: closing results from workers (double-close panic), closing on the producer side too early (send-on-closed race), placing wg.Add inside the goroutine (Add/Wait race), and forgetting close(jobs) (workers block on range forever). Recommendation: for real services use errgroup + context with SetLimit for the bound, reserve the manual sync.WaitGroup + closer-goroutine pattern for teaching or dependency-free code, and always make cancellation the default rather than a bolt-on so the pool composes safely inside larger pipelines."
      },
      "keyPoints": [
        "Fan-out = N goroutines all ranging one jobs channel; fan-in = all workers sending to one results channel. Concurrency is bounded by N, not by buffer size.",
        "Close discipline: the producer (sole sender) closes jobs; a separate goroutine does wg.Wait() then close(results). A channel is closed once, by a sender that knows all sends are done — never by receivers, never by multiple workers.",
        "wg.Add(1) must happen-before wg.Wait() — call Add before launching the goroutine, or Wait can observe zero and close results while workers still send (send-on-closed panic).",
        "Consume results concurrently with production; running the producer inline before draining results deadlocks once N workers block on unread sends.",
        "Cancellation uses close(done) or ctx.Done() — a closed channel broadcasts to all receivers at once; sending would notify only one. Pair every worker channel op with a ctx.Done() select case to prevent leaks.",
        "Forgetting close(jobs) leaves workers blocked on range forever, so wg.Wait never returns and the whole pipeline deadlocks."
      ]
    },
    {
      "id": "go-conc-hazards",
      "title": "Races, deadlocks & goroutine leaks",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "data-race",
        "channels",
        "deadlock",
        "goroutine-leak",
        "runtime"
      ],
      "summary": "The four canonical concurrency failure modes and why the runtime can only catch some of them.",
      "pattern": "Concurrency hazards",
      "visual": "-race instruments memory access; runtime panics on closed-channel send/double-close; blocked goroutines leak silently unless ALL threads park (fatal deadlock).",
      "memorize": "Race = detected only if it happens; closed send/double-close panics; leak = blocked forever; deadlock only when ALL goroutines sleep.",
      "scene": "Four traps on one trail: an invisible tripwire (race), a spring-loaded pit (closed send), a locked room nobody leaves (leak), and a bridge where everyone waits for the other to cross first (deadlock).",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\t\"time\"\n)\n\n// worker fans results into out but honors ctx so it never leaks if the\n// consumer stops reading early.\nfunc worker(ctx context.Context, id int, out chan<- int) {\n\tfor i := 0; ; i++ {\n\t\tselect {\n\t\tcase out <- id*100 + i:\n\t\tcase <-ctx.Done():\n\t\t\treturn\n\t\t}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\tout := make(chan int)\n\n\tfor id := 0; id < 3; id++ {\n\t\tgo worker(ctx, id, out)\n\t}\n\n\t// Consume only a bounded prefix, then cancel so producers unblock.\n\tgot := make([]int, 0, 5)\n\tfor len(got) < 5 {\n\t\tselect {\n\t\tcase v := <-out:\n\t\t\tgot = append(got, v)\n\t\tcase <-time.After(time.Second):\n\t\t\tcancel()\n\t\t}\n\t}\n\tcancel()\n\n\tfmt.Println(len(got))\n}\n",
      "quiz": [
        {
          "id": "race-detector-guarantee",
          "prompt": "A team runs their full suite under `go test -race` and it passes green. What can they correctly conclude about data races in the code?",
          "choices": [
            {
              "label": "No races exist — detector proves absence",
              "correct": false
            },
            {
              "label": "No races on executed interleavings — unexercised paths untested",
              "correct": true
            },
            {
              "label": "Races impossible now — instrumentation rewrote the binary",
              "correct": false
            },
            {
              "label": "Only map races ruled out — other types slip past",
              "correct": false
            }
          ],
          "explain": "The race detector is a dynamic, happens-before analyzer: it flags races only on memory accesses that actually occur during the run. A clean run proves nothing about code paths or goroutine interleavings never exercised, so it cannot prove absence."
        },
        {
          "id": "closed-channel-send",
          "prompt": "Consider these four channel operations. Exactly one of the statements below is a TRUE description of an operation that is guaranteed to panic at runtime. Which is it?",
          "choices": [
            {
              "label": "Receiving from a closed channel — yields zero value",
              "correct": false
            },
            {
              "label": "Closing an already-closed channel — second close panics",
              "correct": true
            },
            {
              "label": "Closing a nil channel — send blocks forever instead",
              "correct": false
            },
            {
              "label": "Sending on a full buffered channel — it just blocks",
              "correct": false
            }
          ],
          "explain": "Closing an already-closed channel panics with 'close of closed channel', so this statement is both true and describes a guaranteed panic. Receiving from a closed channel returns the zero value with ok=false (no panic); closing a nil channel actually panics rather than blocking, so that statement is false; sending on a full buffered channel simply blocks."
        },
        {
          "id": "leak-unreceived",
          "prompt": "A helper does `ch := make(chan int); go func(){ ch <- compute() }()` then returns after a `select` picks a timeout branch instead of `<-ch`. What happens to the goroutine?",
          "choices": [
            {
              "label": "Garbage collected — no references remain to it",
              "correct": false
            },
            {
              "label": "Leaks forever — blocked on send nobody receives",
              "correct": true
            },
            {
              "label": "Panics on send — receiver already gone",
              "correct": false
            },
            {
              "label": "Returns cleanly — send on unbuffered succeeds anyway",
              "correct": false
            }
          ],
          "explain": "The goroutine blocks permanently on the unbuffered send because no receiver will ever arrive; goroutines are never GC'd while runnable or blocked, so it leaks. A buffered channel of size 1 or a context-aware select is the standard fix."
        },
        {
          "id": "fatal-deadlock-detect",
          "prompt": "When does the Go runtime report `fatal error: all goroutines are asleep - deadlock!`?",
          "choices": [
            {
              "label": "Any goroutine blocks — scheduler flags the stall",
              "correct": false
            },
            {
              "label": "Every goroutine blocks — none can make progress",
              "correct": true
            },
            {
              "label": "A mutex is held — over a configurable timeout",
              "correct": false
            },
            {
              "label": "Two goroutines block — on each other cyclically",
              "correct": false
            }
          ],
          "explain": "The runtime's deadlock detector fires only when NO goroutine is runnable — every one is blocked on channels, mutexes, or other sync primitives. A partial deadlock where a background timer, netpoller, or one live goroutine still runs is invisible to it."
        },
        {
          "id": "single-writer-race",
          "prompt": "One goroutine only writes an `int` field and another only reads it, with no synchronization. Is this a data race under the Go memory model?",
          "choices": [
            {
              "label": "Never a race — word-sized int writes are atomic on amd64",
              "correct": false
            },
            {
              "label": "Yes — concurrent read/write lacks happens-before",
              "correct": true
            },
            {
              "label": "Never a race — a single writer eliminates it",
              "correct": false
            },
            {
              "label": "Only a data race — when the int spans a cache line",
              "correct": false
            }
          ],
          "explain": "The Go memory model defines a data race as a read and a write (or two writes) to the same location with no happens-before ordering, regardless of hardware atomicity of the store. It is undefined behavior even with a single writer; use atomic.Int64 or a mutex."
        },
        {
          "id": "range-close-leak",
          "prompt": "A consumer does `for v := range ch { ... }` but the producers finish and never `close(ch)`. What is the runtime outcome for the consumer?",
          "choices": [
            {
              "label": "Loop exits — range detects idle producers",
              "correct": false
            },
            {
              "label": "Consumer blocks — range waits on a channel never closed",
              "correct": true
            },
            {
              "label": "Panic raised — range on drained channel errors",
              "correct": false
            },
            {
              "label": "Loop spins — receiving zero values in a busy loop",
              "correct": false
            }
          ],
          "explain": "`range` over a channel terminates only when the channel is closed; if producers exit without closing, the consumer blocks forever on receive and leaks — or triggers a fatal deadlock if it is the last runnable goroutine."
        }
      ],
      "design": {
        "prompt": "You own a high-throughput ingestion service built on worker-pool and fan-in/fan-out goroutine patterns. Recently it has shown slow memory growth in production and one rare crash logged as 'send on closed channel'. Design a strategy to prevent, detect, and diagnose goroutine leaks, channel-lifecycle panics, and data races across the dev-to-prod lifecycle. Discuss tradeoffs.",
        "answer": "Establish channel-ownership discipline first: exactly one goroutine owns a channel's lifecycle and is the sole closer, and producers never close a shared fan-in channel — this alone eliminates most 'send on closed channel' panics; use a dedicated done/context or a sync.WaitGroup-gated closer so the close happens strictly after all sends complete. For leaks, make every blocking send/receive selectable against ctx.Done() and enforce that helpers spawning goroutines accept a context, so early consumer exit cancels producers instead of stranding them. In CI, run `go test -race` on realistic concurrent tests plus a leak checker like uber-go/goleak to fail builds that strand goroutines; accept that -race roughly 5-10x slows execution and only finds races on exercised interleavings, so pair it with stress/fuzz tests and randomized scheduling to widen coverage. In production, -race is too costly to run continuously, so rely on runtime.NumGoroutine metrics and periodic pprof goroutine dumps to catch monotonic growth and identify the blocked stack, plus panic-recovery at goroutine boundaries with structured logging to localize the closed-channel path. The recommendation: prevent structurally (ownership + context cancellation), gate with -race and goleak in CI, and observe with goroutine-count SLOs and on-demand pprof in prod — defense in depth, since no single tool proves the absence of these hazards. The key tradeoff is that stronger guarantees (always -race, always leak-checking) cost throughput and CI time, so push detection as far left as economically viable and lean on lightweight observability where instrumentation is too expensive."
      },
      "keyPoints": [
        "`go build/test -race` is a dynamic happens-before detector: it finds races only on interleavings actually executed, never proves their absence.",
        "A data race per the Go memory model is any unsynchronized read+write to the same location; hardware atomicity of the store is irrelevant.",
        "Sending on a closed channel, closing an already-closed channel, and closing a nil channel all panic; only the SOLE OWNER should close, and producers never close a shared fan-in channel.",
        "Goroutines blocked on a send/receive that will never complete leak forever — they are never garbage collected; guard blocking ops with context or use buffering.",
        "The fatal 'all goroutines are asleep' deadlock fires only when NO goroutine is runnable; partial deadlocks with a live timer or netpoller are silent leaks instead."
      ]
    },
    {
      "id": "go-conc-atomic",
      "title": "atomic operations & the sync/atomic types",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "sync/atomic",
        "memory-model",
        "lock-free",
        "performance"
      ],
      "summary": "Lock-free reads/writes with the typed atomics — and where their guarantees end.",
      "pattern": "Atomics",
      "visual": "CPU executes a single indivisible LOCK-prefixed instruction; no other core observes a half-written value, and the operation is a full sequentially-consistent fence.",
      "memorize": "Typed atomics are seq-cst; they make ONE word indivisible, not a critical section. Copy an atomic and you copy nothing safe — go vet catches it.",
      "scene": "A bank teller stamping one ledger line with a single hammer blow: nobody ever sees half a stamp, but two separate stamps are still two separate moments.",
      "time": "O(1) per op",
      "space": "O(1)",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n\t\"sync/atomic\"\n)\n\n// Config is swapped atomically as an immutable snapshot.\ntype Config struct {\n\tVersion int\n\tTimeout int\n}\n\nfunc main() {\n\tvar current atomic.Pointer[Config]\n\tcurrent.Store(&Config{Version: 1, Timeout: 30})\n\n\tvar hits atomic.Int64\n\tvar wg sync.WaitGroup\n\n\t// Readers take a consistent snapshot without locking.\n\tfor i := 0; i < 8; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tfor j := 0; j < 1000; j++ {\n\t\t\t\tcfg := current.Load()\n\t\t\t\tif cfg.Timeout > 0 {\n\t\t\t\t\thits.Add(1)\n\t\t\t\t}\n\t\t\t}\n\t\t}()\n\t}\n\n\t// One writer publishes new immutable configs.\n\twg.Add(1)\n\tgo func() {\n\t\tdefer wg.Done()\n\t\tfor v := 2; v <= 5; v++ {\n\t\t\tcurrent.Store(&Config{Version: v, Timeout: 30 + v})\n\t\t}\n\t}()\n\n\twg.Wait()\n\tfmt.Println(\"final version:\", current.Load().Version)\n\tfmt.Println(\"reads:\", hits.Load())\n}\n",
      "quiz": [
        {
          "id": "seqcst-ordering",
          "prompt": "Under the Go memory model, what ordering guarantee do the sync/atomic operations (e.g. atomic.Int64.Add, Pointer.Store/Load) provide?",
          "choices": [
            {
              "label": "Sequential consistency — one total order all goroutines agree on",
              "correct": true
            },
            {
              "label": "Only acquire/release — no total order across atomics"
            },
            {
              "label": "Relaxed by default — you opt into a fence"
            },
            {
              "label": "Per-variable order — reordered across variables"
            }
          ],
          "explain": "Since Go 1.19 the memory model specifies that atomic operations behave as if executed in some single, total order consistent with each goroutine's program order — i.e. sequentially consistent. Go exposes no relaxed or acquire/release tiers like C++."
        },
        {
          "id": "racy-vs-atomic",
          "prompt": "A field is written by one goroutine with atomic.StoreInt64 but read elsewhere with a plain `x := v` (non-atomic). Under Go 1.26 the race detector flags this. Why is the plain read undefined behavior?",
          "choices": [
            {
              "label": "Data race — read racing any write is UB",
              "correct": true
            },
            {
              "label": "Only a torn read — stale but well-defined value"
            },
            {
              "label": "Fine on amd64 — 64-bit loads are naturally atomic"
            },
            {
              "label": "Only a race — if the read also used atomic.Add"
            }
          ],
          "explain": "The memory model requires that if any concurrent access to a location is a write, all such accesses must be atomic. Mixing an atomic write with a plain read is a data race with undefined behavior regardless of architecture or word size."
        },
        {
          "id": "copy-atomic",
          "prompt": "You have `var n atomic.Int64` and write `m := n` to snapshot it. What is the correct assessment?",
          "choices": [
            {
              "label": "noCopy violation — go vet flags it, use n.Load()",
              "correct": true
            },
            {
              "label": "Safe copy — m becomes an independent counter"
            },
            {
              "label": "Compile error — atomic types are not copyable"
            },
            {
              "label": "Deep copy — but the two share a lock"
            }
          ],
          "explain": "atomic.Int64 embeds a noCopy marker, so copying it after first use is a bug that go vet reports. It still compiles, but the copy is not a valid atomic. To read the value use n.Load()."
        },
        {
          "id": "atomics-vs-mutex",
          "prompt": "For which workload do atomics most clearly beat a sync.Mutex, and why?",
          "choices": [
            {
              "label": "Single-word hot counter — no critical section to serialize",
              "correct": true
            },
            {
              "label": "Multi-field invariant update — atomics compose fields"
            },
            {
              "label": "Long read-mostly section — atomics scale reads better"
            },
            {
              "label": "Any shared state — atomics always beat a mutex"
            }
          ],
          "explain": "Atomics excel when the entire operation is one machine word (a counter, a flag, a pointer swap): a single LOCK-prefixed instruction with no blocking or context switch. They cannot protect a multi-word invariant, which still needs a mutex."
        },
        {
          "id": "add-return",
          "prompt": "Two goroutines each call `atomic.AddInt64(&c, 1)` 1000 times on a zero-valued c. What can you rely on for the final value and each call's return?",
          "choices": [
            {
              "label": "Final is 2000 — each return is the post-increment value",
              "correct": true
            },
            {
              "label": "Final is 2000 — but two returns may repeat a value"
            },
            {
              "label": "Final may be under 2000 — updates can be lost"
            },
            {
              "label": "Final is 2000 — returns are the pre-increment value"
            }
          ],
          "explain": "AddInt64 is an atomic read-modify-write returning the new (post-add) value; no updates are lost so the sum is exactly 2000. Because each add is a distinct RMW step, every return value is unique — no two calls can return the same number, so returns can never repeat."
        },
        {
          "id": "pointer-publish",
          "prompt": "A writer builds a fully-initialized struct then does `p.Store(ptr)` (atomic.Pointer); a reader does `cfg := p.Load()` and dereferences it. Are the struct's fields safely visible to the reader?",
          "choices": [
            {
              "label": "Yes — Store happens-before the Load reading it",
              "correct": true
            },
            {
              "label": "Still racy — a mutex must guard the field reads"
            },
            {
              "label": "Only the pointer — fields may be seen half-written"
            },
            {
              "label": "Yes — but only if fields are atomic types"
            }
          ],
          "explain": "An atomic Store observed by an atomic Load establishes a happens-before edge, so all writes sequenced before the Store (the struct initialization) are visible after the Load. This is the standard lock-free immutable-snapshot publication pattern."
        }
      ],
      "design": {
        "prompt": "You maintain a service whose configuration (dozens of fields) is reloaded occasionally but read on every request across thousands of goroutines. Compare using an atomic.Pointer[Config] snapshot versus a sync.RWMutex guarding a mutable Config. Which do you recommend and what are the tradeoffs?",
        "answer": "With an atomic.Pointer[Config], readers do a single Load and dereference an immutable snapshot — no blocking, no cache-line contention from lock acquisition, and reads scale linearly with cores; the writer allocates a brand-new Config and Stores the pointer, and the Store/Load happens-before edge guarantees full visibility of the initialized struct. The key constraint is immutability: once published, a Config must never be mutated in place, or you reintroduce races. An RWMutex lets readers mutate in place and is simpler for partial updates, but even RLock has atomic bookkeeping that contends under very high reader concurrency, and a writer's Lock blocks all readers during reload. For a read-mostly, whole-object-swap workload the atomic.Pointer approach is clearly better: fastest possible reads, trivial writer logic, and no reader starvation. I recommend atomic.Pointer with a copy-on-write writer (build new, Store), reserving the RWMutex for cases needing fine-grained in-place field updates or read-side invariants spanning multiple objects. If several config objects must change together, wrap them in one struct so a single pointer swap stays atomic."
      },
      "keyPoints": [
        "Go atomics are sequentially consistent — there is no relaxed or acquire/release tier as in C++.",
        "Mixing an atomic write with a plain (non-atomic) read of the same location is a data race with undefined behavior, regardless of CPU word size.",
        "Typed atomics (atomic.Int64, atomic.Pointer[T]) embed noCopy; copying after use is a go vet error — always Load to read.",
        "Atomics win when the whole operation is one machine word; multi-word invariants still require a mutex.",
        "atomic.Pointer swap of an immutable snapshot is the canonical lock-free copy-on-write pattern; Store then Load gives happens-before so initialized fields are visible.",
        "Add returns the post-operation value, never loses updates, and each concurrent call returns a distinct value."
      ]
    }
  ]
};
