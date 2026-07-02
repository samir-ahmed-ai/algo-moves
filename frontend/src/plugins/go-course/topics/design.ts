import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const design: GoTopic = {
  "id": "design",
  "title": "System Design in Go",
  "icon": "Blocks",
  "concepts": [
    {
      "id": "go-design-rate-limiter",
      "title": "Design: token-bucket rate limiter",
      "difficulty": "Hard",
      "tags": [
        "rate-limiting",
        "concurrency",
        "x/time/rate",
        "system-design",
        "token-bucket"
      ],
      "summary": "Token bucket with x/time/rate, per-key limiters, safe refill, and idle eviction.",
      "pattern": "Token bucket",
      "visual": "Bucket refills at rate r up to burst b; each request removes one token, empty means deny.",
      "memorize": "Token bucket = burst + steady rate; leaky bucket = pure smoothing. rate.Limiter is a token bucket, concurrency-safe, one per key.",
      "scene": "A dripping faucet fills a cup to the brim (burst); each sip is a request, and the faucet drip rate is your steady QPS.",
      "time": "O(1) per Allow",
      "space": "O(keys) for per-key map",
      "code": "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n\t\"time\"\n\n\t\"golang.org/x/time/rate\"\n)\n\n// PerKeyLimiter hands out a token-bucket limiter per client key. Each entry\n// records a last-seen time so a background sweeper (not shown) can evict idle\n// keys and keep the map from growing unbounded.\ntype PerKeyLimiter struct {\n\tmu      sync.Mutex\n\tbuckets map[string]*entry\n\tr       rate.Limit\n\tburst   int\n\tidleFor time.Duration\n}\n\ntype entry struct {\n\tlim  *rate.Limiter\n\tseen time.Time\n}\n\nfunc NewPerKeyLimiter(r rate.Limit, burst int, idleFor time.Duration) *PerKeyLimiter {\n\treturn &PerKeyLimiter{\n\t\tbuckets: make(map[string]*entry),\n\t\tr:       r,\n\t\tburst:   burst,\n\t\tidleFor: idleFor,\n\t}\n}\n\nfunc (p *PerKeyLimiter) get(key string) *rate.Limiter {\n\tp.mu.Lock()\n\tdefer p.mu.Unlock()\n\te, ok := p.buckets[key]\n\tif !ok {\n\t\te = &entry{lim: rate.NewLimiter(p.r, p.burst)}\n\t\tp.buckets[key] = e\n\t}\n\te.seen = time.Now()\n\treturn e.lim\n}\n\nfunc (p *PerKeyLimiter) Allow(key string) bool {\n\treturn p.get(key).Allow()\n}\n\nfunc main() {\n\t// 2 tokens/sec, burst of 3.\n\tp := NewPerKeyLimiter(rate.Every(500*time.Millisecond), 3, time.Minute)\n\tallowed := 0\n\tfor i := 0; i < 5; i++ {\n\t\tif p.Allow(\"user-42\") {\n\t\t\tallowed++\n\t\t}\n\t}\n\tfmt.Printf(\"burst admitted %d of 5\\n\", allowed)\n}\n",
      "quiz": [
        {
          "id": "bucket-vs-leaky",
          "prompt": "What is the key behavioral difference between a token-bucket limiter (as in x/time/rate) and a strict leaky-bucket-as-a-queue limiter?",
          "choices": [
            {
              "label": "Token bucket allows bursts — up to accumulated tokens",
              "correct": true
            },
            {
              "label": "Leaky bucket allows larger bursts — it stores requests",
              "correct": false
            },
            {
              "label": "Identical output rate — only the naming differs",
              "correct": false
            },
            {
              "label": "Token bucket smooths perfectly — no burst possible",
              "correct": false
            }
          ],
          "explain": "A token bucket accumulates up to `burst` tokens during idle periods, so it permits a short burst then throttles to rate r. A leaky bucket drains at a fixed rate; queued requests only leave at that rate, so saved-up capacity cannot fire as an output burst."
        },
        {
          "id": "limiter-safety",
          "prompt": "Regarding concurrency, which statement about a single *rate.Limiter shared across goroutines is correct?",
          "choices": [
            {
              "label": "Safe for concurrent use — no external lock needed",
              "correct": true
            },
            {
              "label": "Needs a mutex — Allow mutates state unsafely",
              "correct": false
            },
            {
              "label": "Safe only for Wait — Allow races on tokens",
              "correct": false
            },
            {
              "label": "One goroutine per limiter — sharing panics at runtime",
              "correct": false
            }
          ],
          "explain": "rate.Limiter methods (Allow, Reserve, Wait) are safe for concurrent use; the limiter guards its own state internally. You only need your own lock to protect the map that hands out per-key limiters."
        },
        {
          "id": "reserve-vs-allow",
          "prompt": "You call `r.Reserve()` on a rate.Limiter, then decide not to proceed. What must you do to avoid starving other callers?",
          "choices": [
            {
              "label": "Call Cancel on the reservation — returns the tokens",
              "correct": true
            },
            {
              "label": "Nothing — an unused Reserve auto-refunds later",
              "correct": false
            },
            {
              "label": "Call Allow again — that resets the reservation",
              "correct": false
            },
            {
              "label": "Sleep for Delay — the token frees itself then",
              "correct": false
            }
          ],
          "explain": "Reserve() consumes tokens optimistically for a future time. If you abandon it, calling Reservation.Cancel() returns the reserved tokens (as much as possible) so they aren't wasted; without Cancel the tokens stay consumed."
        },
        {
          "id": "refill-model",
          "prompt": "How does x/time/rate compute available tokens on each call, and why does that matter for correctness?",
          "choices": [
            {
              "label": "Elapsed-time math — no background goroutine or ticker",
              "correct": true
            },
            {
              "label": "Background ticker — a goroutine adds tokens per tick",
              "correct": false
            },
            {
              "label": "Fixed 1s window — counter resets every calendar second",
              "correct": false
            },
            {
              "label": "OS timer callback — the kernel refills the bucket",
              "correct": false
            }
          ],
          "explain": "The limiter is lazy: it derives current tokens from the time delta since the last event (tokens += elapsed * rate, capped at burst). No goroutine or ticker runs, so there is nothing to leak and no per-limiter background cost — important for millions of per-key limiters."
        },
        {
          "id": "perkey-eviction",
          "prompt": "In a per-key limiter map keyed by client ID, what is the primary production risk and its standard mitigation?",
          "choices": [
            {
              "label": "Unbounded map growth — evict idle entries periodically",
              "correct": true
            },
            {
              "label": "Token overflow — cap burst to prevent integer wrap",
              "correct": false
            },
            {
              "label": "Lock contention — replace the map with a slice",
              "correct": false
            },
            {
              "label": "Clock drift — call time.Now once at startup",
              "correct": false
            }
          ],
          "explain": "Distinct keys (IPs, user IDs) create limiters that never get freed, so the map grows without bound and leaks memory. The standard fix is a sweeper that removes entries whose last-seen time exceeds an idle threshold."
        },
        {
          "id": "infinite-limit",
          "prompt": "What does rate.NewLimiter(rate.Inf, 0) do?",
          "choices": [
            {
              "label": "Always allows — Inf disables throttling regardless of burst",
              "correct": true
            },
            {
              "label": "Always denies — burst 0 blocks every request",
              "correct": false
            },
            {
              "label": "Panics — Inf is not a valid rate.Limit",
              "correct": false
            },
            {
              "label": "Allows one — then blocks until burst rises",
              "correct": false
            }
          ],
          "explain": "rate.Inf is a special sentinel meaning no limit: Allow always returns true and the burst value is ignored. This is the idiomatic way to express an unlimited limiter without special-casing nil in call sites."
        }
      ],
      "design": {
        "prompt": "Design a distributed API rate limiter for a service running across N stateless instances behind a load balancer, enforcing per-API-key quotas (e.g. 1000 req/min with bursts). Discuss where the token-bucket state lives, consistency vs latency tradeoffs, and how x/time/rate fits.",
        "answer": "The core tension is that x/time/rate is an in-process token bucket, so N instances each holding their own limiter effectively multiplies the allowed rate by N. Three broad options: (1) local-only limiters with the global budget divided by N per instance — trivially fast and dependency-free, but wastes capacity under skewed load balancing and drifts when instances scale up/down; (2) a centralized store (Redis) implementing an atomic token bucket via a Lua script that computes refill from stored timestamp and token count — globally accurate but adds a network round trip and a hard dependency on Redis availability on the request path; (3) a hybrid where each instance keeps a local x/time/rate limiter as a fast path and periodically reconciles/leases a share of the global budget from the central store, degrading to local limits if the store is unreachable. Key pitfalls: clock skew across nodes (prefer a single authoritative clock in the Lua script, i.e. Redis TIME), the thundering-herd of many keys creating unbounded local maps (needs idle eviction), and fail-open vs fail-closed policy when the store is down. Recommendation: for most services, the hybrid (local x/time/rate fast path + Redis-backed atomic bucket for the global ceiling, fail-open with conservative local caps) gives the best latency/accuracy balance; use pure Redis only when strict global correctness dominates and the extra round-trip is acceptable."
      },
      "keyPoints": [
        "Token bucket = steady rate r plus burst capacity; leaky bucket smooths without letting saved capacity fire as a burst.",
        "rate.Limiter is concurrency-safe and refills lazily via elapsed-time math — no ticker or goroutine per limiter.",
        "Per-key limiters need a mutex-guarded map plus idle eviction, or the map leaks memory as keys accumulate.",
        "Use Reserve+Cancel to return unused tokens; Allow is the drop-on-empty fast path; Wait blocks until a token is available.",
        "rate.Inf disables throttling; rate.Every(d) converts an interval to a rate.Limit.",
        "In a distributed setting, N in-process limiters multiply the effective rate — coordinate via a central store or budget division."
      ]
    },
    {
      "id": "go-design-worker-pool",
      "title": "Design: bounded worker-pool service",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "worker-pool",
        "backpressure",
        "context",
        "errgroup"
      ],
      "summary": "Bound concurrency with fixed workers or a semaphore, apply backpressure, drain gracefully, and aggregate errors under cancellation.",
      "pattern": "Worker pool",
      "visual": "N goroutines drain a jobs channel; close(jobs) signals drain; ctx cancels in-flight work; errors funnel to one collector.",
      "memorize": "Fixed workers = warm goroutines + queue backpressure; semaphore = spawn-per-job capped. Producer closes jobs; WaitGroup closes results; ctx aborts; errgroup aggregates.",
      "scene": "A ticket counter with exactly N open windows: the queue outside is backpressure, closing the doors is graceful drain, and a fire alarm (ctx) empties every window at once.",
      "time": "O(J) over J jobs",
      "space": "O(N) workers + O(B) queue buffer",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"errors\"\n\t\"fmt\"\n\t\"sync\"\n\t\"time\"\n)\n\ntype Job struct{ ID int }\n\ntype Result struct {\n\tID  int\n\tErr error\n}\n\nfunc process(ctx context.Context, j Job) error {\n\tselect {\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\tcase <-time.After(time.Millisecond):\n\t\tif j.ID%7 == 0 {\n\t\t\treturn fmt.Errorf(\"job %d failed\", j.ID)\n\t\t}\n\t\treturn nil\n\t}\n}\n\nfunc worker(ctx context.Context, jobs <-chan Job, out chan<- Result) {\n\tfor j := range jobs {\n\t\tout <- Result{ID: j.ID, Err: process(ctx, j)}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithTimeout(context.Background(), time.Second)\n\tdefer cancel()\n\n\tconst workers = 4\n\tjobs := make(chan Job, workers)\n\tout := make(chan Result)\n\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < workers; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tworker(ctx, jobs, out)\n\t\t}()\n\t}\n\n\tgo func() {\n\t\tdefer close(jobs)\n\t\tfor i := 1; i <= 20; i++ {\n\t\t\tselect {\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\tcase jobs <- Job{ID: i}:\n\t\t\t}\n\t\t}\n\t}()\n\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\n\tvar errs []error\n\tfor r := range out {\n\t\tif r.Err != nil {\n\t\t\terrs = append(errs, r.Err)\n\t\t}\n\t}\n\tfmt.Printf(\"completed with %d errors: %v\\n\", len(errs), errors.Join(errs...))\n}\n",
      "quiz": [
        {
          "id": "fixed-vs-semaphore",
          "prompt": "You must cap concurrency at N for a long-lived, high-throughput ingestion service. What is the key runtime advantage of a fixed pool of N long-lived worker goroutines over spawning one goroutine per job gated by a size-N semaphore?",
          "choices": [
            {
              "label": "Reuses N goroutines — avoids per-job stack churn",
              "correct": true
            },
            {
              "label": "Guarantees ordering — jobs finish in arrival order"
            },
            {
              "label": "Removes cancellation need — workers self-terminate"
            },
            {
              "label": "Eliminates the channel — workers poll a shared slice"
            }
          ],
          "explain": "A fixed pool amortizes goroutine creation/teardown and stack growth across all jobs; the semaphore variant still creates and destroys a goroutine per job. Neither approach guarantees completion ordering, and both still need context for cancellation."
        },
        {
          "id": "backpressure-buffer",
          "prompt": "A producer sends to an unbuffered jobs channel feeding N workers. Under a sustained input rate exceeding total worker throughput, what actually happens?",
          "choices": [
            {
              "label": "Producer blocks on send — natural backpressure to upstream",
              "correct": true
            },
            {
              "label": "Jobs queue unbounded — memory grows until OOM"
            },
            {
              "label": "Runtime spawns extra workers — pool auto-scales"
            },
            {
              "label": "Sends silently drop — channel discards excess"
            }
          ],
          "explain": "An unbuffered (or bounded) channel blocks the sender once workers can't keep up, propagating backpressure to the producer. Channels never drop values or auto-scale the pool; unbounded growth only happens with an unbounded queue, which a channel is not."
        },
        {
          "id": "graceful-drain",
          "prompt": "For graceful drain — let in-flight and already-queued jobs finish, then stop — which sequence is correct?",
          "choices": [
            {
              "label": "close(jobs) then wg.Wait() — range exits after buffer drains",
              "correct": true
            },
            {
              "label": "cancel(ctx) then wg.Wait() — abandons queued jobs"
            },
            {
              "label": "close(out) first — receiver side, panics on send"
            },
            {
              "label": "wg.Wait() then close(jobs) — deadlocks on the range loop"
            }
          ],
          "explain": "Closing jobs lets each worker's for-range consume remaining buffered items and then return, so wg.Wait() unblocks after a full drain. Cancelling ctx is abort, not drain; closing out (the receive side) makes workers panic on send, and waiting before closing jobs deadlocks because workers never leave the range."
        },
        {
          "id": "close-out-owner",
          "prompt": "Multiple workers send Results to a shared out channel. Where must close(out) happen to avoid a panic?",
          "choices": [
            {
              "label": "In a goroutine after wg.Wait() — single close post-drain",
              "correct": true
            },
            {
              "label": "In each worker on return — last one closes it"
            },
            {
              "label": "By producer right after close(jobs) — same owner"
            },
            {
              "label": "In main before ranging out — receiver closes it"
            }
          ],
          "explain": "A channel with multiple senders must be closed exactly once, after all senders are done — hence close(out) in a dedicated goroutine gated by wg.Wait(). Closing per-worker double-closes (panic), and the producer and the receiver are not senders on out."
        },
        {
          "id": "ctx-cancel-inflight",
          "prompt": "Under context cancellation, why must the blocking send `out <- Result{...}` also be guarded by a select on ctx.Done() in a production pool?",
          "choices": [
            {
              "label": "Receiver may stop reading — send blocks forever otherwise",
              "correct": true
            },
            {
              "label": "Cancellation closes out — send panics on closed channel"
            },
            {
              "label": "ctx.Err() is nil mid-cancel — send corrupts result"
            },
            {
              "label": "Buffered sends ignore ctx — buffer must flush first"
            }
          ],
          "explain": "If the collector returns on cancellation and stops draining out, a worker blocked on an unguarded send leaks forever; a select over ctx.Done() lets it exit. Cancelling a context does not close channels, and ctx.Err() is non-nil once Done() fires."
        },
        {
          "id": "errgroup-first-error",
          "prompt": "You replace manual error collection with x/sync/errgroup using WithContext and SetLimit(N). What is the precise semantics of the returned error and the group's context?",
          "choices": [
            {
              "label": "Returns first non-nil error — ctx cancels on that error",
              "correct": true
            },
            {
              "label": "Returns joined errors — ctx cancels when all finish"
            },
            {
              "label": "Returns last error — ctx never auto-cancels"
            },
            {
              "label": "Returns nil until Wait — ctx cancels per goroutine"
            }
          ],
          "explain": "errgroup.WithContext cancels the derived context the moment any Go func returns a non-nil error, and Wait returns that first error. It does not join all errors (that's a manual pattern) nor cancel only on full completion."
        }
      ],
      "design": {
        "prompt": "Design a bounded worker-pool service that fetches thousands of URLs with a hard concurrency cap, per-request timeout, global deadline, and a single aggregated error report to the caller. Discuss fixed pool vs semaphore, how you bound queue growth, how you drain vs abort, and how you surface partial failures.",
        "answer": "Two shapes work: a fixed pool of N long-lived workers reading a bounded jobs channel, or spawn-per-job gated by a semaphore (golang.org/x/sync/semaphore or a buffered channel). Prefer the fixed pool for sustained high throughput — it amortizes goroutine/stack churn and gives natural backpressure via the bounded channel, so the producer blocks instead of letting an unbounded queue OOM the process. Use the semaphore variant when work is bursty or heterogeneous and you want per-job lifetime scoping without idle workers. Bound queue growth by sizing the jobs channel (often ~N) and never buffering results unboundedly; every blocking send must select on ctx.Done() so a worker can't leak if the collector stops reading. Distinguish graceful drain (close(jobs), let the range loops finish queued work, then wg.Wait()) from abort (cancel the context, workers observe ctx.Done() and bail mid-flight). For lifecycle correctness, exactly one goroutine closes the results channel after wg.Wait(), since there are multiple senders. Layer contexts: a global context.WithTimeout for the whole batch and a per-request context.WithTimeout derived from it. For error handling I recommend errgroup.WithContext + SetLimit(N) when fail-fast is acceptable (first error cancels the rest); when you must attempt every job and report all failures, keep an explicit results channel and combine with errors.Join for a single aggregated error preserving partial success. Recommendation: fixed pool + bounded channel + layered contexts + errors.Join collection — fail-fast errgroup only when early termination is desirable."
      },
      "keyPoints": [
        "Fixed pool amortizes goroutine/stack cost and gives natural backpressure via a bounded channel; semaphore-per-job scopes lifetime but recreates goroutines.",
        "Backpressure comes from a bounded/unbounded channel blocking the producer — channels never drop or auto-scale.",
        "Graceful drain = close(jobs) then wg.Wait(); abort = cancel ctx and have workers observe Done().",
        "A multi-sender results channel must be closed exactly once, after wg.Wait(), by a dedicated goroutine.",
        "Guard every blocking send with select-on-ctx.Done() so workers don't leak when the collector stops reading.",
        "errgroup.WithContext returns the first error and cancels on it; use explicit collection + errors.Join when you need all partial failures."
      ]
    },
    {
      "id": "go-design-lru-cache",
      "title": "Design: concurrent LRU cache",
      "difficulty": "Hard",
      "tags": [
        "system-design",
        "concurrency",
        "data-structures",
        "caching",
        "performance"
      ],
      "summary": "Build an O(1) LRU with map + doubly linked list, then make it concurrent via sharding vs a single mutex.",
      "pattern": "LRU cache",
      "visual": "hashmap points into a doubly linked list; every access splices the node to the front, tail is the eviction victim.",
      "memorize": "map->node for O(1) find, DLL for O(1) reorder; shard by key hash to cut mutex contention; sync.Map is read-mostly, not LRU.",
      "scene": "A coat-check where every ticket (map key) points straight to a hook (list node); grab your coat, it jumps to the front hook, and the coldest coat at the back gets tossed when the rack fills.",
      "time": "O(1) get/put",
      "space": "O(capacity)",
      "code": "package main\n\nimport (\n\t\"container/list\"\n\t\"fmt\"\n\t\"sync\"\n\t\"time\"\n)\n\ntype entry[K comparable, V any] struct {\n\tkey     K\n\tval     V\n\texpires time.Time\n}\n\n// shard is a single-mutex LRU: map for O(1) lookup, list for O(1) reorder.\ntype shard[K comparable, V any] struct {\n\tmu    sync.Mutex\n\tcap   int\n\tttl   time.Duration\n\tll    *list.List\n\titems map[K]*list.Element\n}\n\nfunc newShard[K comparable, V any](capacity int, ttl time.Duration) *shard[K, V] {\n\treturn &shard[K, V]{\n\t\tcap:   capacity,\n\t\tttl:   ttl,\n\t\tll:    list.New(),\n\t\titems: make(map[K]*list.Element, capacity),\n\t}\n}\n\nfunc (s *shard[K, V]) Get(k K) (V, bool) {\n\ts.mu.Lock()\n\tdefer s.mu.Unlock()\n\tel, ok := s.items[k]\n\tif !ok {\n\t\tvar zero V\n\t\treturn zero, false\n\t}\n\te := el.Value.(*entry[K, V])\n\tif !e.expires.IsZero() && time.Now().After(e.expires) {\n\t\ts.removeElem(el)\n\t\tvar zero V\n\t\treturn zero, false\n\t}\n\ts.ll.MoveToFront(el)\n\treturn e.val, true\n}\n\nfunc (s *shard[K, V]) Put(k K, v V) {\n\ts.mu.Lock()\n\tdefer s.mu.Unlock()\n\tif el, ok := s.items[k]; ok {\n\t\te := el.Value.(*entry[K, V])\n\t\te.val, e.expires = v, s.deadline()\n\t\ts.ll.MoveToFront(el)\n\t\treturn\n\t}\n\tel := s.ll.PushFront(&entry[K, V]{key: k, val: v, expires: s.deadline()})\n\ts.items[k] = el\n\tif s.ll.Len() > s.cap {\n\t\ts.removeElem(s.ll.Back())\n\t}\n}\n\nfunc (s *shard[K, V]) deadline() time.Time {\n\tif s.ttl <= 0 {\n\t\treturn time.Time{}\n\t}\n\treturn time.Now().Add(s.ttl)\n}\n\nfunc (s *shard[K, V]) removeElem(el *list.Element) {\n\ts.ll.Remove(el)\n\tdelete(s.items, el.Value.(*entry[K, V]).key)\n}\n\nfunc main() {\n\ts := newShard[string, int](2, 0)\n\ts.Put(\"a\", 1)\n\ts.Put(\"b\", 2)\n\ts.Get(\"a\")    // touch a -> b is now the coldest\n\ts.Put(\"c\", 3) // evicts b\n\t_, okB := s.Get(\"b\")\n\tv, okA := s.Get(\"a\")\n\tfmt.Println(okB, okA, v)\n}\n",
      "quiz": [
        {
          "id": "why-dll",
          "prompt": "Why does the classic LRU pair a hash map with a doubly linked list instead of using the map alone?",
          "choices": [
            {
              "label": "O(1) splice — DLL reorders touched node without scan",
              "correct": true
            },
            {
              "label": "Slices suffice — map plus slice gives same complexity"
            },
            {
              "label": "Ordering is free — Go maps preserve insertion order"
            },
            {
              "label": "Memory savings — a DLL uses less space per entry"
            }
          ],
          "explain": "The map gives O(1) key->node lookup, but recency ordering must be maintained; a doubly linked list lets you unlink and move a node to the front in O(1) given the node pointer, which a slice (O(n) shift) or the unordered map cannot do."
        },
        {
          "id": "shard-vs-mutex",
          "prompt": "Under heavy concurrent read/write load, why does sharding (N sub-caches keyed by hash(key)) usually beat one global mutex-guarded LRU?",
          "choices": [
            {
              "label": "Contention split — locks spread across N independent shards",
              "correct": true
            },
            {
              "label": "Higher hit rate — sharding improves cache hit ratio"
            },
            {
              "label": "Lock-free reads — sharding removes the need for any mutex"
            },
            {
              "label": "Global LRU order — shards keep one true recency list"
            }
          ],
          "explain": "Sharding partitions the keyspace so each shard has its own mutex; unrelated keys hit different locks, cutting contention. It does not raise hit rate (it can slightly lower it by fragmenting capacity), still needs a mutex per shard, and gives up a single global recency order."
        },
        {
          "id": "get-writes",
          "prompt": "A reviewer proposes taking only a read lock (RLock) in Get so reads run concurrently. What is the flaw?",
          "choices": [
            {
              "label": "MoveToFront mutates — Get writes list and needs exclusive lock",
              "correct": true
            },
            {
              "label": "RWMutex is slower — read locks cost more than Lock"
            },
            {
              "label": "Reads never race — an RLock in Get is entirely safe"
            },
            {
              "label": "Map reads mutate — indexing a map needs a write lock"
            }
          ],
          "explain": "A read hit must splice the node to the front of the list and may lazily evict an expired entry, both of which mutate shared state. That write under a shared RLock is a data race, so Get needs the exclusive lock (or a design that defers reordering)."
        },
        {
          "id": "ttl-eviction",
          "prompt": "With per-entry TTL and purely lazy expiry (checked only on access), what failure mode must the design address?",
          "choices": [
            {
              "label": "Stale retention — untouched expired keys pin memory",
              "correct": true
            },
            {
              "label": "Early eviction — TTL entries are dropped before they expire"
            },
            {
              "label": "Clock skew — lazy TTL requires synchronized clocks"
            },
            {
              "label": "O(n) reads — every Get must scan for expired entries"
            }
          ],
          "explain": "Lazy expiry only removes an entry when it is next accessed, so keys that are never read again stay resident and consume capacity/memory until LRU eviction reaches them. Production caches add active expiry (a background sweeper or sampling) to reclaim them."
        },
        {
          "id": "syncmap-fit",
          "prompt": "Why is sync.Map a poor foundation for an LRU cache despite being a concurrent map?",
          "choices": [
            {
              "label": "No ordering hook — cannot track recency for eviction",
              "correct": true
            },
            {
              "label": "Not concurrent — sync.Map still needs external locking"
            },
            {
              "label": "No generics — sync.Map cannot store typed values"
            },
            {
              "label": "Unbounded keys — sync.Map forbids Delete of entries"
            }
          ],
          "explain": "sync.Map is optimized for read-mostly, stable-key workloads and exposes no recency/size accounting or ordered structure, so you cannot implement O(1) eviction of the least-recently-used entry on top of it. LRU inherently needs the coordinated map+list mutation that a single lock (or sharded locks) provides."
        },
        {
          "id": "amortized-evict",
          "prompt": "On Put of a brand-new key when the shard is at capacity, what is the cost of the eviction step?",
          "choices": [
            {
              "label": "O(1) — remove list.Back and its map entry",
              "correct": true
            },
            {
              "label": "O(n) — scan all entries for the oldest timestamp"
            },
            {
              "label": "O(log n) — pop from a priority queue by access time"
            },
            {
              "label": "O(cap) — shift remaining nodes toward the tail"
            }
          ],
          "explain": "The tail of the list is by construction the least-recently-used node; ll.Back() plus a map delete is O(1). No scan or heap is needed because recency order is maintained incrementally on every access."
        }
      ],
      "design": {
        "prompt": "You are designing a shared in-process cache for a high-QPS Go service: hot keys are read thousands of times per second, entries have a TTL, and total memory is bounded. Walk through your design choices for concurrency (single mutex vs sharding vs sync.Map), eviction, and TTL, and give a recommendation with the tradeoffs.",
        "answer": "Start from the canonical O(1) LRU: a map from key to a doubly-linked-list node, where the list orders nodes by recency and the tail is always the eviction victim; get/put are O(1) because lookup is a map hit and reordering is a constant-time splice. For concurrency, a single mutex is simplest and preserves one true global recency order, but it serializes every access and becomes the bottleneck under high QPS because even reads must take the exclusive lock (a read hit mutates the list via MoveToFront). Sharding into N sub-caches keyed by hash(key), each with its own mutex and its own map+list, is the standard scaling answer: it spreads contention across shards at the cost of a fragmented recency order and slightly reduced effective hit rate, and N should be tuned to core count/contention rather than set huge. sync.Map is tempting but wrong here: it targets read-mostly, append-rarely, stable-key workloads and offers no recency tracking or size bound, so you cannot evict LRU on top of it. For TTL, combine lazy expiry (check the deadline on access and drop if past) with active expiry (a background sweeper or per-access sampling) so untouched-but-expired keys do not pin memory indefinitely. My recommendation: sharded LRU with a per-shard mutex, per-entry TTL with lazy-plus-sampled active expiry, and capacity enforced per shard; only fall back to a single-mutex LRU if you genuinely need a strict global LRU order or the QPS is low enough that contention never shows up in profiles."
      },
      "keyPoints": [
        "map gives O(1) key->node lookup; doubly linked list gives O(1) recency reordering and O(1) tail eviction",
        "a read hit mutates the list (MoveToFront), so Get cannot safely run under a shared read lock",
        "single mutex is simplest and keeps a true global LRU order but serializes all access under load",
        "sharding by hash(key) spreads lock contention at the cost of fragmented recency and slightly lower hit rate",
        "sync.Map has no recency/size accounting and suits read-mostly stable keys, not LRU eviction",
        "combine lazy TTL checks on access with active/sampled expiry so untouched expired keys do not pin memory"
      ]
    },
    {
      "id": "go-design-graceful-shutdown",
      "title": "Design: graceful shutdown",
      "difficulty": "Hard",
      "tags": [
        "system-design",
        "http",
        "context",
        "signals",
        "concurrency"
      ],
      "summary": "Drain in-flight requests on SIGTERM, then close dependencies in the right order.",
      "pattern": "Graceful shutdown",
      "visual": "SIGTERM -> cancel ctx -> Shutdown(ctx) stops Accept + drains conns -> close deps -> exit",
      "memorize": "NotifyContext to catch SIGTERM; Shutdown drains with a deadline; close in reverse of open.",
      "scene": "A restaurant at closing: doors locked to newcomers, but seated diners finish their meals before the lights go out.",
      "time": "—",
      "space": "—",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"errors\"\n\t\"log\"\n\t\"net/http\"\n\t\"os/signal\"\n\t\"syscall\"\n\t\"time\"\n)\n\nfunc main() {\n\tctx, stop := signal.NotifyContext(context.Background(),\n\t\tsyscall.SIGINT, syscall.SIGTERM)\n\tdefer stop()\n\n\tmux := http.NewServeMux()\n\tmux.HandleFunc(\"/work\", func(w http.ResponseWriter, r *http.Request) {\n\t\tselect {\n\t\tcase <-time.After(2 * time.Second):\n\t\t\tw.Write([]byte(\"done\\n\"))\n\t\tcase <-r.Context().Done():\n\t\t}\n\t})\n\n\tsrv := &http.Server{Addr: \":8080\", Handler: mux}\n\n\tgo func() {\n\t\tif err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {\n\t\t\tlog.Fatalf(\"listen: %v\", err)\n\t\t}\n\t}()\n\n\t<-ctx.Done()\n\tstop() // restore default handling: a second signal now kills hard\n\tlog.Println(\"shutting down\")\n\n\tshutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)\n\tdefer cancel()\n\n\tif err := srv.Shutdown(shutCtx); err != nil {\n\t\tlog.Printf(\"forced close: %v\", err)\n\t\t_ = srv.Close()\n\t}\n\tlog.Println(\"stopped\")\n}",
      "quiz": [
        {
          "id": "shutdown-vs-close",
          "prompt": "What is the essential behavioral difference between http.Server.Shutdown(ctx) and http.Server.Close()?",
          "choices": [
            {
              "label": "Shutdown drains in-flight — Close aborts connections immediately",
              "correct": true
            },
            {
              "label": "Shutdown blocks Accept — Close also drains open requests"
            },
            {
              "label": "They are identical — Close just lacks a context argument"
            },
            {
              "label": "Shutdown targets idle conns — Close ignores idle ones"
            }
          ],
          "explain": "Shutdown stops listeners, closes idle connections, then waits for active requests to finish (bounded by ctx). Close abruptly closes listeners and all connections without waiting for in-flight work."
        },
        {
          "id": "listenandserve-return",
          "prompt": "After Shutdown is called, what does the still-blocked ListenAndServe call in the goroutine return?",
          "choices": [
            {
              "label": "http.ErrServerClosed — must be filtered from real errors",
              "correct": true
            },
            {
              "label": "nil — a clean shutdown returns no error"
            },
            {
              "label": "context.Canceled — it propagates the shutdown context"
            },
            {
              "label": "io.EOF — the listener socket reached end of file"
            }
          ],
          "explain": "ListenAndServe always returns a non-nil error; on Shutdown/Close it returns http.ErrServerClosed. Idiomatic code checks errors.Is(err, http.ErrServerClosed) and treats only other errors as fatal."
        },
        {
          "id": "notifycontext-restore",
          "prompt": "Why call stop() (the cancel returned by signal.NotifyContext) right after <-ctx.Done() unblocks?",
          "choices": [
            {
              "label": "Restores default disposition — a second SIGTERM force-kills",
              "correct": true
            },
            {
              "label": "Frees the context — otherwise Shutdown cannot run"
            },
            {
              "label": "Re-arms the handler — so future signals are caught again"
            },
            {
              "label": "Flushes buffered signals — pending SIGTERMs are discarded"
            }
          ],
          "explain": "NotifyContext installs handlers that swallow the signal (only cancelling the context). Calling stop() uninstalls them, so if a slow drain hangs, an impatient operator's second SIGTERM reverts to the default terminate behavior instead of being ignored."
        },
        {
          "id": "shutdown-timeout-hang",
          "prompt": "A handler runs a 60s job ignoring r.Context(); Shutdown is given a 10s context. What happens at t=10s?",
          "choices": [
            {
              "label": "Shutdown returns ctx error — the handler keeps running",
              "correct": true
            },
            {
              "label": "Handler is force-killed — Shutdown terminates its goroutine"
            },
            {
              "label": "Shutdown extends automatically — waits for the 60s job"
            },
            {
              "label": "The process panics — deadline exceeded is fatal"
            }
          ],
          "explain": "Shutdown returns the context's error (DeadlineExceeded) but Go cannot forcibly kill a goroutine. The handler keeps running unless it observes cancellation; graceful shutdown requires handlers to honor their request context or you follow up with Close()."
        },
        {
          "id": "close-ordering",
          "prompt": "You have an HTTP server plus a DB pool the handlers use. What is the correct shutdown ordering?",
          "choices": [
            {
              "label": "Shutdown server first — then close the DB pool",
              "correct": true
            },
            {
              "label": "Close the DB pool first — then Shutdown the server"
            },
            {
              "label": "Close both concurrently — order is irrelevant"
            },
            {
              "label": "Close the DB first — server drains without dependencies"
            }
          ],
          "explain": "Dependencies must outlive their users. Draining the server first lets in-flight handlers finish their DB work; closing the pool first would make those still-draining requests fail. Close in reverse order of initialization."
        },
        {
          "id": "registeronshutdown",
          "prompt": "What does http.Server.RegisterOnShutdown(f) actually guarantee about when f runs during Shutdown?",
          "choices": [
            {
              "label": "Runs early asynchronously — signals hijacked conns to close",
              "correct": true
            },
            {
              "label": "Runs after draining — all active requests finish first"
            },
            {
              "label": "Runs conditionally — only if the context expires first"
            },
            {
              "label": "Runs synchronously — before listeners are ever closed"
            }
          ],
          "explain": "RegisterOnShutdown callbacks fire early (each in its own goroutine) when Shutdown starts, primarily to notify hijacked/WebSocket connections to close gracefully, since Shutdown itself does not track hijacked connections."
        }
      ],
      "design": {
        "prompt": "Design a graceful shutdown sequence for a Go service that runs an HTTP API, a Kafka consumer loop, and a background worker pool, all fronted by a Kubernetes load balancer. Cover signal handling, ordering, timeouts, and the readiness/traffic-draining interaction. What are the tradeoffs?",
        "answer": "Start with signal.NotifyContext on SIGTERM/SIGINT to get a root context that cancels on the pod's termination signal. The first move is to flip the readiness probe to failing (or stop accepting new work) so Kubernetes removes the pod from endpoints; because endpoint propagation is eventually consistent, sleep briefly (a few seconds) before closing listeners to avoid dropping requests the LB is still routing. Then drain in dependency order: call http.Server.Shutdown with a bounded context (e.g. 15-25s, safely under terminationGracePeriodSeconds) so in-flight requests finish; stop the Kafka consumer from fetching new messages but let outstanding messages commit their offsets; then quiesce the worker pool by closing its input and waiting on a WaitGroup; finally close shared dependencies (DB pool, Kafka producer, tracing flush) in reverse order of initialization so nothing closes a resource a still-draining component needs. Every wait must be timeout-bounded and fall back to a hard Close()/os.Exit because goroutines cannot be force-killed, so a handler ignoring its context will otherwise hang forever. The key tradeoff is drain completeness versus shutdown latency: generous timeouts reduce error rates during deploys but risk exceeding the grace period and getting SIGKILLed mid-flush, so budget the sum of all stages to stay under terminationGracePeriodSeconds. I recommend an explicit, ordered shutdown orchestrator (a slice of named close funcs each with its own deadline) rather than scattered defers, plus calling stop() after the first signal so a second SIGTERM force-kills a stuck process."
      },
      "keyPoints": [
        "signal.NotifyContext(SIGINT, SIGTERM) gives a context that cancels on the termination signal; call the returned stop() so a second signal reverts to default kill.",
        "Shutdown(ctx) stops listeners, closes idle conns, and drains active requests up to the context deadline; Close() aborts everything immediately.",
        "ListenAndServe returns http.ErrServerClosed on a clean shutdown; filter it with errors.Is before treating errors as fatal.",
        "Go cannot kill goroutines: Shutdown only waits, so handlers must honor r.Context() or the drain deadline just returns an error while work continues.",
        "Close dependencies in reverse order of initialization so draining components still have the resources (DB pool, producers) they depend on.",
        "Bound every stage with a timeout that sums to under Kubernetes terminationGracePeriodSeconds, and drain LB traffic (readiness) before closing listeners."
      ]
    },
    {
      "id": "go-design-pipeline",
      "title": "Design: cancellable pipeline",
      "difficulty": "Hard",
      "tags": [
        "concurrency",
        "pipeline",
        "context",
        "channels",
        "goroutine-leaks"
      ],
      "summary": "Compose stage goroutines with channels, fan-out/fan-in, and context so cancellation drains cleanly without leaks.",
      "pattern": "Pipeline",
      "visual": "gen → [worker × N] → merge; every stage selects on <-ctx.Done() so a canceled reader unblocks every blocked sender.",
      "memorize": "Sender closes; every stage selects on ctx.Done(); fan-in closes out after WaitGroup.",
      "scene": "A conveyor belt of goroutines: pull the emergency cord (ctx cancel) and every station's arm retracts at once instead of jamming.",
      "time": "O(n) items across stages",
      "space": "O(workers + channel buffers)",
      "code": "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\t\"sync\"\n)\n\nfunc gen(ctx context.Context, nums ...int) <-chan int {\n\tout := make(chan int)\n\tgo func() {\n\t\tdefer close(out)\n\t\tfor _, n := range nums {\n\t\t\tselect {\n\t\t\tcase out <- n:\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\t}\n\t\t}\n\t}()\n\treturn out\n}\n\nfunc square(ctx context.Context, in <-chan int) <-chan int {\n\tout := make(chan int)\n\tgo func() {\n\t\tdefer close(out)\n\t\tfor v := range in {\n\t\t\tselect {\n\t\t\tcase out <- v * v:\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\t}\n\t\t}\n\t}()\n\treturn out\n}\n\nfunc merge(ctx context.Context, cs ...<-chan int) <-chan int {\n\tout := make(chan int)\n\tvar wg sync.WaitGroup\n\twg.Add(len(cs))\n\tfor _, c := range cs {\n\t\tgo func(c <-chan int) {\n\t\t\tdefer wg.Done()\n\t\t\tfor v := range c {\n\t\t\t\tselect {\n\t\t\t\tcase out <- v:\n\t\t\t\tcase <-ctx.Done():\n\t\t\t\t\treturn\n\t\t\t\t}\n\t\t\t}\n\t\t}(c)\n\t}\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\treturn out\n}\n\nfunc main() {\n\tctx, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\n\tsource := gen(ctx, 1, 2, 3, 4, 5, 6)\n\tw1 := square(ctx, source)\n\tw2 := square(ctx, source)\n\n\tsum := 0\n\tfor v := range merge(ctx, w1, w2) {\n\t\tsum += v\n\t\tif sum > 20 {\n\t\t\tcancel()\n\t\t\tbreak\n\t\t}\n\t}\n\tfmt.Println(\"partial sum:\", sum)\n}\n",
      "quiz": [
        {
          "id": "why-select-on-done",
          "prompt": "In the pipeline, why must each stage's send be wrapped in `select { case out <- v: case <-ctx.Done(): }` rather than a bare `out <- v`?",
          "choices": [
            {
              "label": "Prevents leaked senders — bare send blocks forever if reader quits",
              "correct": true
            },
            {
              "label": "Guarantees ordering — select serializes sends across stages"
            },
            {
              "label": "Improves throughput — select is faster than a direct send"
            },
            {
              "label": "Avoids data races — select adds a memory barrier per send"
            }
          ],
          "explain": "If the consumer stops reading (break/cancel), a bare `out <- v` on an unbuffered channel blocks with no receiver forever, leaking the goroutine. Selecting on ctx.Done() gives the blocked sender an exit path."
        },
        {
          "id": "who-closes",
          "prompt": "Which stage is responsible for closing the merged output channel `out` in `merge`, and when?",
          "choices": [
            {
              "label": "A dedicated goroutine after wg.Wait — once all fan-in readers finish",
              "correct": true
            },
            {
              "label": "Each fan-in goroutine — it closes out via defer when its input drains"
            },
            {
              "label": "The main consumer — it closes out after the range loop ends"
            },
            {
              "label": "The context — cancel() closes out through Done propagation"
            }
          ],
          "explain": "Only one closer is allowed; closing from each fan-in goroutine would panic on the second close. A single goroutine waits on the WaitGroup, then closes out exactly once."
        },
        {
          "id": "leak-on-early-break",
          "prompt": "After main does `cancel(); break`, what actually lets the still-running `square` and `gen` goroutines terminate instead of leaking?",
          "choices": [
            {
              "label": "ctx.Done closes — their select's send case yields to the done case",
              "correct": true
            },
            {
              "label": "break closes the channels — the range in each stage then returns"
            },
            {
              "label": "GC reclaims them — unreferenced goroutines are collected"
            },
            {
              "label": "defer close(out) fires — closing out signals upstream to stop"
            }
          ],
          "explain": "Goroutines are never GC'd while runnable, and closing a channel does not propagate upstream. Cancellation unblocks each blocked send via the ctx.Done() case, and the returning stages then close their own outputs."
        },
        {
          "id": "shared-source-fanout",
          "prompt": "Both `w1` and `w2` read from the same `source` channel. What is the semantic consequence of this fan-out?",
          "choices": [
            {
              "label": "Work splits — each value is delivered to exactly one worker",
              "correct": true
            },
            {
              "label": "Values duplicate — each worker receives every value from source"
            },
            {
              "label": "Race panic — two receivers on one channel is illegal"
            },
            {
              "label": "Deadlock — the second receiver blocks the first"
            }
          ],
          "explain": "Multiple receivers on one channel is safe; each sent value is handed to exactly one ready receiver. That is precisely how a single source is load-balanced across N workers."
        },
        {
          "id": "unbuffered-cancel-visibility",
          "prompt": "All stage channels are unbuffered. When main calls cancel() mid-range, why might a worker have already computed a value it can never deliver — and is that a leak?",
          "choices": [
            {
              "label": "Value discarded, no leak — send loses the race to ctx.Done",
              "correct": true
            },
            {
              "label": "Value buffered, leak — the unsent item pins the goroutine"
            },
            {
              "label": "Panic — sending after cancel closes the channel"
            },
            {
              "label": "Blocked forever — worker cannot observe cancellation mid-send"
            }
          ],
          "explain": "On the next select both the send and the ctx.Done() case may be ready; if Done wins, the already-computed value is simply dropped and the goroutine returns. Dropping an in-flight value under cancellation is expected, not a leak."
        },
        {
          "id": "context-vs-done-channel",
          "prompt": "Compared to threading an explicit `done chan struct{}` through every stage, what does using `context.Context` primarily add here?",
          "choices": [
            {
              "label": "Deadlines plus values — carries timeouts and request scope",
              "correct": true
            },
            {
              "label": "Faster cancellation — ctx.Done signals before a done channel"
            },
            {
              "label": "Automatic goroutine cleanup — ctx joins and stops goroutines"
            },
            {
              "label": "Buffered cancellation — ctx queues cancel across stages"
            }
          ],
          "explain": "A plain done channel only broadcasts stop. context.Context adds deadlines/timeouts (WithTimeout), cancellation propagation through a context tree, and request-scoped values, while still using the same select-on-Done() discipline."
        }
      ],
      "design": {
        "prompt": "You're designing a reusable, generic pipeline framework for an ETL service: a source, N transform stages (some CPU-bound, some I/O-bound), and a sink. Requirements: bounded memory, first-error-aborts-everything semantics, clean shutdown with zero goroutine leaks, and backpressure. How do you structure the stages, propagate cancellation and errors, and choose channel buffering? What are the tradeoffs?",
        "answer": "Model each stage as a function `func(ctx, <-chan In) <-chan Out` that owns its output channel and closes it on return; wire cancellation with a single context whose Done() is selected on every send so no goroutine can block after the consumer leaves. For first-error-aborts, use `errgroup.WithContext`: each stage runs under g.Go, returns its error, and the shared ctx cancels all siblings on the first non-nil error; the caller gets the error from g.Wait() after draining. Backpressure falls out naturally from unbuffered (or small-buffered) channels — a slow sink stalls upstream sends, bounding memory; add buffering only to smooth bursty I/O stages, trading latency/memory for throughput. For CPU-bound stages, fan out to GOMAXPROCS workers reading a shared input and fan them back in via a WaitGroup-closed merge channel; for I/O-bound stages, fan out wider since goroutines are cheap and mostly blocked. The key leak-avoidance invariants: exactly one closer per channel, senders always select on ctx.Done(), and fan-in closes the merged channel only after wg.Wait(). Tradeoffs: unbuffered gives tight backpressure but more goroutine wakeups; buffered improves throughput but can hide a slow stage and inflate memory; errgroup centralizes error/cancel handling but requires disciplined draining so canceled stages can exit. I'd recommend the errgroup + context + owned-output-channel pattern with unbuffered channels by default, adding buffers only where profiling shows a stage starves, because it makes shutdown and error semantics uniform and leak-free across the whole graph."
      },
      "keyPoints": [
        "Each stage owns and closes exactly one output channel; downstream never closes upstream.",
        "Every send selects on ctx.Done() so a departed consumer can't strand a blocked sender.",
        "Fan-out = multiple receivers on one channel (work splits); fan-in = merge closed once after wg.Wait().",
        "Cancellation drops in-flight values by design — that is correct, not a leak.",
        "context adds deadlines and request scope over a bare done channel; use errgroup for first-error-aborts.",
        "Unbuffered channels give backpressure and bound memory; buffer only to smooth proven bottlenecks."
      ]
    }
  ]
};
