import type { GoTopic } from '../types';

// AUTO-GENERATED go-course topic — authored & Go-1.26-verified content.
export const design: GoTopic = {
  id: 'design',
  title: 'System Design in Go',
  icon: 'Blocks',
  concepts: [
    {
      id: 'go-design-rate-limiter',
      title: 'Design: token-bucket rate limiter',
      difficulty: 'Hard',
      tags: ['rate-limiting', 'concurrency', 'x/time/rate', 'system-design', 'token-bucket'],
      summary: 'Token bucket with x/time/rate, per-key limiters, safe refill, and idle eviction.',
      pattern: 'Token bucket',
      visual:
        'Bucket refills at rate r up to burst b; each request removes one token, empty means deny.',
      memorize:
        'Token bucket = burst + steady rate; leaky bucket = pure smoothing. rate.Limiter is a token bucket, concurrency-safe, one per key.',
      scene:
        'A dripping faucet fills a cup to the brim (burst); each sip is a request, and the faucet drip rate is your steady QPS.',
      time: 'O(1) per Allow',
      space: 'O(keys) for per-key map',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"sync"\n\t"time"\n\n\t"golang.org/x/time/rate"\n)\n\n// PerKeyLimiter hands out a token-bucket limiter per client key. Each entry\n// records a last-seen time so a background sweeper (not shown) can evict idle\n// keys and keep the map from growing unbounded.\ntype PerKeyLimiter struct {\n\tmu      sync.Mutex\n\tbuckets map[string]*entry\n\tr       rate.Limit\n\tburst   int\n\tidleFor time.Duration\n}\n\ntype entry struct {\n\tlim  *rate.Limiter\n\tseen time.Time\n}\n\nfunc NewPerKeyLimiter(r rate.Limit, burst int, idleFor time.Duration) *PerKeyLimiter {\n\treturn &PerKeyLimiter{\n\t\tbuckets: make(map[string]*entry),\n\t\tr:       r,\n\t\tburst:   burst,\n\t\tidleFor: idleFor,\n\t}\n}\n\nfunc (p *PerKeyLimiter) get(key string) *rate.Limiter {\n\tp.mu.Lock()\n\tdefer p.mu.Unlock()\n\te, ok := p.buckets[key]\n\tif !ok {\n\t\te = &entry{lim: rate.NewLimiter(p.r, p.burst)}\n\t\tp.buckets[key] = e\n\t}\n\te.seen = time.Now()\n\treturn e.lim\n}\n\nfunc (p *PerKeyLimiter) Allow(key string) bool {\n\treturn p.get(key).Allow()\n}\n\nfunc main() {\n\t// 2 tokens/sec, burst of 3.\n\tp := NewPerKeyLimiter(rate.Every(500*time.Millisecond), 3, time.Minute)\n\tallowed := 0\n\tfor i := 0; i < 5; i++ {\n\t\tif p.Allow("user-42") {\n\t\t\tallowed++\n\t\t}\n\t}\n\tfmt.Printf("burst admitted %d of 5\\n", allowed)\n}\n',
      keyPoints: [
        'Token bucket = steady rate r plus burst capacity; leaky bucket smooths without letting saved capacity fire as a burst.',
        'rate.Limiter is concurrency-safe and refills lazily via elapsed-time math — no ticker or goroutine per limiter.',
        'Per-key limiters need a mutex-guarded map plus idle eviction, or the map leaks memory as keys accumulate.',
        'Use Reserve+Cancel to return unused tokens; Allow is the drop-on-empty fast path; Wait blocks until a token is available.',
        'rate.Inf disables throttling; rate.Every(d) converts an interval to a rate.Limit.',
        'In a distributed setting, N in-process limiters multiply the effective rate — coordinate via a central store or budget division.',
      ],
      walkthrough: [
        {
          title: 'Construct the limiter',
          caption:
            'main builds a PerKeyLimiter configured for 2 tokens/sec (one every 500ms) with a burst capacity of 3 and a 1-minute idle window.',
          focus: ['p := NewPerKeyLimiter(rate.Every(500*time.Millisecond), 3, time.Minute)'],
          state: [
            {
              k: 'p.r',
              v: '2/sec',
            },
            {
              k: 'p.burst',
              v: '3',
            },
            {
              k: 'p.idleFor',
              v: '1m',
            },
            {
              k: 'buckets',
              v: '{} (empty)',
            },
          ],
        },
        {
          title: 'First Allow call',
          caption:
            'i=0: main calls p.Allow("user-42"), which delegates to get to fetch (or create) this key\'s limiter.',
          focus: ['if p.Allow("user-42") {', 'return p.get(key).Allow()'],
          state: [
            {
              k: 'i',
              v: '0',
            },
            {
              k: 'allowed',
              v: '0',
            },
            {
              k: 'key',
              v: 'user-42',
            },
          ],
        },
        {
          title: 'Create the bucket under lock',
          caption:
            'get locks the mutex, finds no entry for user-42, and lazily creates a fresh rate.Limiter that starts full with 3 tokens.',
          focus: ['e, ok := p.buckets[key]', 'e = &entry{lim: rate.NewLimiter(p.r, p.burst)}'],
          state: [
            {
              k: 'ok',
              v: 'false',
            },
            {
              k: 'tokens',
              v: '3.0 (full)',
            },
            {
              k: 'mu',
              v: 'locked',
            },
          ],
        },
        {
          title: 'Record last-seen and unlock',
          caption:
            'get stamps e.seen with the current time (for the idle sweeper) and returns the limiter as the deferred Unlock releases the mutex.',
          focus: ['e.seen = time.Now()', 'defer p.mu.Unlock()'],
          state: [
            {
              k: 'e.seen',
              v: 'now',
            },
            {
              k: 'buckets',
              v: '{user-42}',
            },
            {
              k: 'mu',
              v: 'unlocked',
            },
          ],
        },
        {
          title: 'Burst drains tokens',
          caption:
            'Allow() consumes one token per call; i=0,1,2 each find a token available and admit, dropping the bucket to roughly 0.',
          focus: ['allowed++', '.Allow()'],
          state: [
            {
              k: 'i',
              v: '2',
            },
            {
              k: 'allowed',
              v: '3',
            },
            {
              k: 'tokens',
              v: '~0.0',
            },
          ],
        },
        {
          title: 'Gotcha: refill is time-based',
          caption:
            'i=3,4 run microseconds later, so almost no tokens have refilled (refill needs 500ms each) and both calls are rejected.',
          focus: ['for i := 0; i < 5; i++ {', 'p.Allow("user-42")'],
          state: [
            {
              k: 'i',
              v: '4',
            },
            {
              k: 'allowed',
              v: '3',
            },
            {
              k: 'tokens',
              v: '~0.0 (no time elapsed)',
            },
            {
              k: 'rejected',
              v: '2',
            },
          ],
        },
        {
          title: 'Report the result',
          caption:
            'The loop ends and main prints that exactly the burst size was admitted: 3 of 5.',
          focus: ['fmt.Printf("burst admitted %d of 5\\n", allowed)'],
          state: [
            {
              k: 'allowed',
              v: '3',
            },
            {
              k: 'output',
              v: 'burst admitted 3 of 5',
            },
          ],
        },
      ],
    },
    {
      id: 'go-design-worker-pool',
      title: 'Design: bounded worker-pool service',
      difficulty: 'Hard',
      tags: ['concurrency', 'worker-pool', 'backpressure', 'context', 'errgroup'],
      summary:
        'Bound concurrency with fixed workers or a semaphore, apply backpressure, drain gracefully, and aggregate errors under cancellation.',
      pattern: 'Worker pool',
      visual:
        'N goroutines drain a jobs channel; close(jobs) signals drain; ctx cancels in-flight work; errors funnel to one collector.',
      memorize:
        'Fixed workers = warm goroutines + queue backpressure; semaphore = spawn-per-job capped. Producer closes jobs; WaitGroup closes results; ctx aborts; errgroup aggregates.',
      scene:
        'A ticket counter with exactly N open windows: the queue outside is backpressure, closing the doors is graceful drain, and a fire alarm (ctx) empties every window at once.',
      time: 'O(J) over J jobs',
      space: 'O(N) workers + O(B) queue buffer',
      code: 'package main\n\nimport (\n\t"context"\n\t"errors"\n\t"fmt"\n\t"sync"\n\t"time"\n)\n\ntype Job struct{ ID int }\n\ntype Result struct {\n\tID  int\n\tErr error\n}\n\nfunc process(ctx context.Context, j Job) error {\n\tselect {\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\tcase <-time.After(time.Millisecond):\n\t\tif j.ID%7 == 0 {\n\t\t\treturn fmt.Errorf("job %d failed", j.ID)\n\t\t}\n\t\treturn nil\n\t}\n}\n\nfunc worker(ctx context.Context, jobs <-chan Job, out chan<- Result) {\n\tfor j := range jobs {\n\t\tout <- Result{ID: j.ID, Err: process(ctx, j)}\n\t}\n}\n\nfunc main() {\n\tctx, cancel := context.WithTimeout(context.Background(), time.Second)\n\tdefer cancel()\n\n\tconst workers = 4\n\tjobs := make(chan Job, workers)\n\tout := make(chan Result)\n\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < workers; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tworker(ctx, jobs, out)\n\t\t}()\n\t}\n\n\tgo func() {\n\t\tdefer close(jobs)\n\t\tfor i := 1; i <= 20; i++ {\n\t\t\tselect {\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\tcase jobs <- Job{ID: i}:\n\t\t\t}\n\t\t}\n\t}()\n\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\n\tvar errs []error\n\tfor r := range out {\n\t\tif r.Err != nil {\n\t\t\terrs = append(errs, r.Err)\n\t\t}\n\t}\n\tfmt.Printf("completed with %d errors: %v\\n", len(errs), errors.Join(errs...))\n}\n',
      keyPoints: [
        'Fixed pool amortizes goroutine/stack cost and gives natural backpressure via a bounded channel; semaphore-per-job scopes lifetime but recreates goroutines.',
        'Backpressure comes from a bounded/unbounded channel blocking the producer — channels never drop or auto-scale.',
        'Graceful drain = close(jobs) then wg.Wait(); abort = cancel ctx and have workers observe Done().',
        'A multi-sender results channel must be closed exactly once, after wg.Wait(), by a dedicated goroutine.',
        "Guard every blocking send with select-on-ctx.Done() so workers don't leak when the collector stops reading.",
        'errgroup.WithContext returns the first error and cancels on it; use explicit collection + errors.Join when you need all partial failures.',
      ],
      walkthrough: [
        {
          title: 'Bounded context + channels',
          caption:
            'A 1s deadline context is created and the job/result channels are made, with jobs buffered to the worker count so the producer can run slightly ahead before blocking.',
          focus: [
            'ctx, cancel := context.WithTimeout(context.Background(), time.Second)',
            'jobs := make(chan Job, workers)',
            'out := make(chan Result)',
          ],
          state: [
            {
              k: 'workers',
              v: '4',
            },
            {
              k: 'cap(jobs)',
              v: '4',
            },
            {
              k: 'cap(out)',
              v: '0',
            },
            {
              k: 'ctx',
              v: '1s deadline',
            },
          ],
        },
        {
          title: 'Spawn warm workers',
          caption:
            'Four long-lived worker goroutines are started and tracked with the WaitGroup; each will pull jobs until the channel is closed.',
          focus: ['for i := 0; i < workers; i++ {', 'wg.Add(1)', 'go func() {'],
          state: [
            {
              k: 'goroutines',
              v: '4 workers',
            },
            {
              k: 'wg counter',
              v: '4',
            },
            {
              k: 'pool',
              v: 'idle, warm',
            },
          ],
        },
        {
          title: 'Producer feeds + backpressure',
          caption:
            'A producer goroutine sends jobs 1..20 into the buffered channel; once the 4-slot buffer fills it blocks on the send until a worker frees a slot, applying natural backpressure.',
          focus: ['for i := 1; i <= 20; i++ {', 'case jobs <- Job{ID: i}:'],
          state: [
            {
              k: 'produced',
              v: '1..20',
            },
            {
              k: 'buffer',
              v: 'fills to 4 then blocks',
            },
            {
              k: 'backpressure',
              v: 'send blocks',
            },
          ],
        },
        {
          title: 'Workers process jobs',
          caption:
            'Each worker ranges over jobs, runs process under the context, and sends a Result; jobs whose ID is divisible by 7 (7 and 14) return an error, the rest succeed.',
          focus: [
            'for j := range jobs {',
            'out <- Result{ID: j.ID, Err: process(ctx, j)}',
            'if j.ID%7 == 0 {',
          ],
          state: [
            {
              k: 'failing IDs',
              v: '7, 14',
            },
            {
              k: 'process',
              v: '~1ms each',
            },
            {
              k: 'out',
              v: 'drained by main',
            },
          ],
        },
        {
          title: 'Cancellation path',
          caption:
            "If the deadline fires or ctx is canceled, process returns ctx.Err() immediately and the producer's select takes the ctx.Done() branch, stopping new sends.",
          focus: ['case <-ctx.Done():', 'return ctx.Err()'],
          state: [
            {
              k: 'on timeout',
              v: 'process aborts',
            },
            {
              k: 'producer',
              v: 'stops early',
            },
            {
              k: 'remaining jobs',
              v: 'skipped',
            },
          ],
        },
        {
          title: 'Producer closes jobs',
          caption:
            "When the producer's loop ends (or it returns on cancel), its deferred close(jobs) runs, causing every worker's range loop to terminate after the buffer empties.",
          focus: ['defer close(jobs)', 'for j := range jobs {'],
          state: [
            {
              k: 'jobs',
              v: 'closed',
            },
            {
              k: 'workers',
              v: 'draining then exit',
            },
          ],
        },
        {
          title: 'WaitGroup gates out close',
          caption:
            "The gotcha: a dedicated goroutine blocks on wg.Wait() and only closes out after all workers exit — closing out any earlier would race a live worker's send and panic.",
          focus: ['wg.Wait()', 'close(out)', 'defer wg.Done()'],
          state: [
            {
              k: 'wg counter',
              v: '4 -> 0',
            },
            {
              k: 'out',
              v: 'closed after last worker',
            },
            {
              k: 'why',
              v: 'avoid send-on-closed panic',
            },
          ],
        },
        {
          title: 'Aggregate + report',
          caption:
            "Main ranges over out until it is closed, collecting non-nil errors, then joins them so the whole pool's failures surface as one aggregated error.",
          focus: ['for r := range out {', 'errs = append(errs, r.Err)', 'errors.Join(errs...)'],
          state: [
            {
              k: 'errs (no timeout)',
              v: '2 (jobs 7,14)',
            },
            {
              k: 'output',
              v: 'completed with 2 errors',
            },
            {
              k: 'exit',
              v: 'clean drain',
            },
          ],
        },
      ],
    },
    {
      id: 'go-design-lru-cache',
      title: 'Design: concurrent LRU cache',
      difficulty: 'Hard',
      tags: ['system-design', 'concurrency', 'data-structures', 'caching', 'performance'],
      summary:
        'Build an O(1) LRU with map + doubly linked list, then make it concurrent via sharding vs a single mutex.',
      pattern: 'LRU cache',
      visual:
        'hashmap points into a doubly linked list; every access splices the node to the front, tail is the eviction victim.',
      memorize:
        'map->node for O(1) find, DLL for O(1) reorder; shard by key hash to cut mutex contention; sync.Map is read-mostly, not LRU.',
      scene:
        'A coat-check where every ticket (map key) points straight to a hook (list node); grab your coat, it jumps to the front hook, and the coldest coat at the back gets tossed when the rack fills.',
      time: 'O(1) get/put',
      space: 'O(capacity)',
      code: 'package main\n\nimport (\n\t"container/list"\n\t"fmt"\n\t"sync"\n\t"time"\n)\n\ntype entry[K comparable, V any] struct {\n\tkey     K\n\tval     V\n\texpires time.Time\n}\n\n// shard is a single-mutex LRU: map for O(1) lookup, list for O(1) reorder.\ntype shard[K comparable, V any] struct {\n\tmu    sync.Mutex\n\tcap   int\n\tttl   time.Duration\n\tll    *list.List\n\titems map[K]*list.Element\n}\n\nfunc newShard[K comparable, V any](capacity int, ttl time.Duration) *shard[K, V] {\n\treturn &shard[K, V]{\n\t\tcap:   capacity,\n\t\tttl:   ttl,\n\t\tll:    list.New(),\n\t\titems: make(map[K]*list.Element, capacity),\n\t}\n}\n\nfunc (s *shard[K, V]) Get(k K) (V, bool) {\n\ts.mu.Lock()\n\tdefer s.mu.Unlock()\n\tel, ok := s.items[k]\n\tif !ok {\n\t\tvar zero V\n\t\treturn zero, false\n\t}\n\te := el.Value.(*entry[K, V])\n\tif !e.expires.IsZero() && time.Now().After(e.expires) {\n\t\ts.removeElem(el)\n\t\tvar zero V\n\t\treturn zero, false\n\t}\n\ts.ll.MoveToFront(el)\n\treturn e.val, true\n}\n\nfunc (s *shard[K, V]) Put(k K, v V) {\n\ts.mu.Lock()\n\tdefer s.mu.Unlock()\n\tif el, ok := s.items[k]; ok {\n\t\te := el.Value.(*entry[K, V])\n\t\te.val, e.expires = v, s.deadline()\n\t\ts.ll.MoveToFront(el)\n\t\treturn\n\t}\n\tel := s.ll.PushFront(&entry[K, V]{key: k, val: v, expires: s.deadline()})\n\ts.items[k] = el\n\tif s.ll.Len() > s.cap {\n\t\ts.removeElem(s.ll.Back())\n\t}\n}\n\nfunc (s *shard[K, V]) deadline() time.Time {\n\tif s.ttl <= 0 {\n\t\treturn time.Time{}\n\t}\n\treturn time.Now().Add(s.ttl)\n}\n\nfunc (s *shard[K, V]) removeElem(el *list.Element) {\n\ts.ll.Remove(el)\n\tdelete(s.items, el.Value.(*entry[K, V]).key)\n}\n\nfunc main() {\n\ts := newShard[string, int](2, 0)\n\ts.Put("a", 1)\n\ts.Put("b", 2)\n\ts.Get("a")    // touch a -> b is now the coldest\n\ts.Put("c", 3) // evicts b\n\t_, okB := s.Get("b")\n\tv, okA := s.Get("a")\n\tfmt.Println(okB, okA, v)\n}\n',
      keyPoints: [
        'map gives O(1) key->node lookup; doubly linked list gives O(1) recency reordering and O(1) tail eviction',
        'a read hit mutates the list (MoveToFront), so Get cannot safely run under a shared read lock',
        'single mutex is simplest and keeps a true global LRU order but serializes all access under load',
        'sharding by hash(key) spreads lock contention at the cost of fragmented recency and slightly lower hit rate',
        'sync.Map has no recency/size accounting and suits read-mostly stable keys, not LRU eviction',
        'combine lazy TTL checks on access with active/sampled expiry so untouched expired keys do not pin memory',
      ],
      walkthrough: [
        {
          title: 'Build the shard',
          caption:
            'newShard allocates an empty list.List and a map[K]*list.Element, giving O(1) lookup plus O(1) reorder for a cap-2, no-TTL LRU.',
          focus: [
            's := newShard[string, int](2, 0)',
            'll:    list.New(),',
            'items: make(map[K]*list.Element, capacity),',
          ],
          state: [
            {
              k: 'cap',
              v: '2',
            },
            {
              k: 'ttl',
              v: '0 (none)',
            },
            {
              k: 'll',
              v: '[] (empty)',
            },
            {
              k: 'items',
              v: '{}',
            },
          ],
        },
        {
          title: 'Put("a", 1)',
          caption:
            'Key a is absent, so a new entry is pushed to the front of the list and recorded in the map; length is 1, under cap.',
          focus: [
            'el := s.ll.PushFront(&entry[K, V]{key: k, val: v, expires: s.deadline()})',
            's.items[k] = el',
          ],
          state: [
            {
              k: 'll (MRU→LRU)',
              v: '[a]',
            },
            {
              k: 'items',
              v: '{a}',
            },
            {
              k: 'len',
              v: '1',
            },
          ],
        },
        {
          title: 'Put("b", 2)',
          caption:
            'Key b is also new; it is pushed to the front so b becomes MRU and a slides to the back — length now equals cap, no eviction yet.',
          focus: [
            'if s.ll.Len() > s.cap {',
            'el := s.ll.PushFront(&entry[K, V]{key: k, val: v, expires: s.deadline()})',
          ],
          state: [
            {
              k: 'll (MRU→LRU)',
              v: '[b, a]',
            },
            {
              k: 'items',
              v: '{a, b}',
            },
            {
              k: 'len',
              v: '2 (= cap)',
            },
          ],
        },
        {
          title: 'Get("a") touches a',
          caption:
            'a is found and not expired (ttl=0 means expires.IsZero() is true, so the check short-circuits), so MoveToFront makes a the MRU — this is the pivotal step that leaves b as the coldest entry.',
          focus: [
            'if !e.expires.IsZero() && time.Now().After(e.expires) {',
            's.ll.MoveToFront(el)',
            'return e.val, true',
          ],
          state: [
            {
              k: 'll (MRU→LRU)',
              v: '[a, b]',
            },
            {
              k: 'LRU / next evict',
              v: 'b',
            },
            {
              k: 'return',
              v: '1, true',
            },
          ],
        },
        {
          title: 'Put("c", 3) evicts b',
          caption:
            'c is new and pushed to front making len 3 > cap 2, so removeElem(ll.Back()) drops b — the least-recently-used — from both the list and the map.',
          focus: ['if s.ll.Len() > s.cap {', 's.removeElem(s.ll.Back())'],
          state: [
            {
              k: 'll (MRU→LRU)',
              v: '[c, a]',
            },
            {
              k: 'items',
              v: '{a, c}',
            },
            {
              k: 'evicted',
              v: 'b',
            },
            {
              k: 'len',
              v: '2',
            },
          ],
        },
        {
          title: 'removeElem detail',
          caption:
            "Eviction stays O(1): the list node is unlinked and its key is read off the element's entry to delete the matching map slot, keeping map and list in sync.",
          focus: ['s.ll.Remove(el)', 'delete(s.items, el.Value.(*entry[K, V]).key)'],
          state: [
            {
              k: 'items',
              v: '{a, c}',
            },
            {
              k: 'list len',
              v: '2',
            },
          ],
        },
        {
          title: 'Get("b") misses',
          caption:
            'b was evicted, so the map lookup fails and Get returns the zero value with false — okB is false.',
          focus: ['el, ok := s.items[k]', 'if !ok {', 'return zero, false'],
          state: [
            {
              k: 'okB',
              v: 'false',
            },
            {
              k: 'items',
              v: '{a, c}',
            },
          ],
        },
        {
          title: 'Get("a") hits, print',
          caption:
            'a survived because touching it earlier saved it from eviction; the program prints false true 1.',
          focus: ['v, okA := s.Get("a")', 'fmt.Println(okB, okA, v)'],
          state: [
            {
              k: 'okA',
              v: 'true',
            },
            {
              k: 'v',
              v: '1',
            },
            {
              k: 'output',
              v: 'false true 1',
            },
          ],
        },
      ],
    },
    {
      id: 'go-design-graceful-shutdown',
      title: 'Design: graceful shutdown',
      difficulty: 'Hard',
      tags: ['system-design', 'http', 'context', 'signals', 'concurrency'],
      summary: 'Drain in-flight requests on SIGTERM, then close dependencies in the right order.',
      pattern: 'Graceful shutdown',
      visual:
        'SIGTERM -> cancel ctx -> Shutdown(ctx) stops Accept + drains conns -> close deps -> exit',
      memorize:
        'NotifyContext to catch SIGTERM; Shutdown drains with a deadline; close in reverse of open.',
      scene:
        'A restaurant at closing: doors locked to newcomers, but seated diners finish their meals before the lights go out.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"context"\n\t"errors"\n\t"log"\n\t"net/http"\n\t"os/signal"\n\t"syscall"\n\t"time"\n)\n\nfunc main() {\n\tctx, stop := signal.NotifyContext(context.Background(),\n\t\tsyscall.SIGINT, syscall.SIGTERM)\n\tdefer stop()\n\n\tmux := http.NewServeMux()\n\tmux.HandleFunc("/work", func(w http.ResponseWriter, r *http.Request) {\n\t\tselect {\n\t\tcase <-time.After(2 * time.Second):\n\t\t\tw.Write([]byte("done\\n"))\n\t\tcase <-r.Context().Done():\n\t\t}\n\t})\n\n\tsrv := &http.Server{Addr: ":8080", Handler: mux}\n\n\tgo func() {\n\t\tif err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {\n\t\t\tlog.Fatalf("listen: %v", err)\n\t\t}\n\t}()\n\n\t<-ctx.Done()\n\tstop() // restore default handling: a second signal now kills hard\n\tlog.Println("shutting down")\n\n\tshutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)\n\tdefer cancel()\n\n\tif err := srv.Shutdown(shutCtx); err != nil {\n\t\tlog.Printf("forced close: %v", err)\n\t\t_ = srv.Close()\n\t}\n\tlog.Println("stopped")\n}\n',
      keyPoints: [
        'signal.NotifyContext(SIGINT, SIGTERM) gives a context that cancels on the termination signal; call the returned stop() so a second signal reverts to default kill.',
        'Shutdown(ctx) stops listeners, closes idle conns, and drains active requests up to the context deadline; Close() aborts everything immediately.',
        'ListenAndServe returns http.ErrServerClosed on a clean shutdown; filter it with errors.Is before treating errors as fatal.',
        'Go cannot kill goroutines: Shutdown only waits, so handlers must honor r.Context() or the drain deadline just returns an error while work continues.',
        'Close dependencies in reverse order of initialization so draining components still have the resources (DB pool, producers) they depend on.',
        'Bound every stage with a timeout that sums to under Kubernetes terminationGracePeriodSeconds, and drain LB traffic (readiness) before closing listeners.',
      ],
      walkthrough: [
        {
          title: 'Register signal listener',
          caption:
            'signal.NotifyContext derives a context that will be canceled the moment SIGINT or SIGTERM arrives, and stop is deferred to release the signal handler on exit.',
          focus: ['ctx, stop := signal.NotifyContext(context.Background()', 'defer stop()'],
          state: [
            {
              k: 'ctx',
              v: 'active',
            },
            {
              k: 'watched signals',
              v: 'SIGINT, SIGTERM',
            },
          ],
        },
        {
          title: 'Wire the handler',
          caption:
            "A mux is built whose /work handler simulates slow work, finishing after 2s unless the request's own context is canceled first.",
          focus: [
            'mux.HandleFunc("/work"',
            'case <-time.After(2 * time.Second):',
            'case <-r.Context().Done():',
          ],
          state: [
            {
              k: 'route',
              v: '/work',
            },
            {
              k: 'work duration',
              v: '2s',
            },
          ],
        },
        {
          title: 'Serve in background',
          caption:
            'ListenAndServe runs in its own goroutine so main can proceed; a normal shutdown returns ErrServerClosed, which is treated as expected rather than fatal.',
          focus: ['go func()', 'srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed)'],
          state: [
            {
              k: 'server goroutine',
              v: 'running',
            },
            {
              k: 'main goroutine',
              v: 'will block',
            },
            {
              k: 'listening',
              v: ':8080',
            },
          ],
        },
        {
          title: 'Block until signal',
          caption:
            'Main parks on ctx.Done(); it stays blocked here serving traffic until the OS delivers SIGINT/SIGTERM and NotifyContext cancels ctx.',
          focus: ['<-ctx.Done()'],
          state: [
            {
              k: 'main goroutine',
              v: 'blocked',
            },
            {
              k: 'ctx',
              v: 'waiting for signal',
            },
          ],
        },
        {
          title: 'Signal: restore hard-kill',
          caption:
            'On the first signal main wakes, and stop() detaches the handler so a SECOND SIGINT/SIGTERM now kills the process immediately instead of being swallowed during a slow drain.',
          focus: [
            'stop() // restore default handling: a second signal now kills hard',
            'log.Println("shutting down")',
          ],
          state: [
            {
              k: 'signal',
              v: 'received',
            },
            {
              k: 'signal handler',
              v: 'detached',
            },
            {
              k: '2nd signal',
              v: 'hard kill',
            },
          ],
        },
        {
          title: 'Bound the drain',
          caption:
            'A 10-second deadline context is created to cap how long shutdown will wait for in-flight requests before giving up.',
          focus: [
            'shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)',
            'defer cancel()',
          ],
          state: [
            {
              k: 'drain deadline',
              v: '10s',
            },
            {
              k: 'shutCtx',
              v: 'active',
            },
          ],
        },
        {
          title: 'Drain in-flight requests',
          caption:
            'srv.Shutdown stops accepting new connections and blocks until active handlers (the 2s /work calls) finish or shutCtx expires; it also causes ListenAndServe to return ErrServerClosed.',
          focus: ['srv.Shutdown(shutCtx)'],
          state: [
            {
              k: 'new connections',
              v: 'refused',
            },
            {
              k: 'in-flight',
              v: 'draining',
            },
            {
              k: 'ListenAndServe',
              v: 'returns ErrServerClosed',
            },
          ],
        },
        {
          title: 'Force close on timeout',
          caption:
            'If draining exceeds the 10s deadline Shutdown returns an error, so srv.Close forcibly severs remaining connections as a last resort; either way the program then logs stopped.',
          focus: [
            'log.Printf("forced close: %v", err)',
            '_ = srv.Close()',
            'log.Println("stopped")',
          ],
          state: [
            {
              k: 'drain',
              v: 'timed out',
            },
            {
              k: 'connections',
              v: 'force-closed',
            },
            {
              k: 'exit',
              v: 'complete',
            },
          ],
        },
      ],
    },
    {
      id: 'go-design-pipeline',
      title: 'Design: cancellable pipeline',
      difficulty: 'Hard',
      tags: ['concurrency', 'pipeline', 'context', 'channels', 'goroutine-leaks'],
      summary:
        'Compose stage goroutines with channels, fan-out/fan-in, and context so cancellation drains cleanly without leaks.',
      pattern: 'Pipeline',
      visual:
        'gen → [worker × N] → merge; every stage selects on <-ctx.Done() so a canceled reader unblocks every blocked sender.',
      memorize:
        'Sender closes; every stage selects on ctx.Done(); fan-in closes out after WaitGroup.',
      scene:
        "A conveyor belt of goroutines: pull the emergency cord (ctx cancel) and every station's arm retracts at once instead of jamming.",
      time: 'O(n) items across stages',
      space: 'O(workers + channel buffers)',
      code: 'package main\n\nimport (\n\t"context"\n\t"fmt"\n\t"sync"\n)\n\nfunc gen(ctx context.Context, nums ...int) <-chan int {\n\tout := make(chan int)\n\tgo func() {\n\t\tdefer close(out)\n\t\tfor _, n := range nums {\n\t\t\tselect {\n\t\t\tcase out <- n:\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\t}\n\t\t}\n\t}()\n\treturn out\n}\n\nfunc square(ctx context.Context, in <-chan int) <-chan int {\n\tout := make(chan int)\n\tgo func() {\n\t\tdefer close(out)\n\t\tfor v := range in {\n\t\t\tselect {\n\t\t\tcase out <- v * v:\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\t}\n\t\t}\n\t}()\n\treturn out\n}\n\nfunc merge(ctx context.Context, cs ...<-chan int) <-chan int {\n\tout := make(chan int)\n\tvar wg sync.WaitGroup\n\twg.Add(len(cs))\n\tfor _, c := range cs {\n\t\tgo func(c <-chan int) {\n\t\t\tdefer wg.Done()\n\t\t\tfor v := range c {\n\t\t\t\tselect {\n\t\t\t\tcase out <- v:\n\t\t\t\tcase <-ctx.Done():\n\t\t\t\t\treturn\n\t\t\t\t}\n\t\t\t}\n\t\t}(c)\n\t}\n\tgo func() {\n\t\twg.Wait()\n\t\tclose(out)\n\t}()\n\treturn out\n}\n\nfunc main() {\n\tctx, cancel := context.WithCancel(context.Background())\n\tdefer cancel()\n\n\tsource := gen(ctx, 1, 2, 3, 4, 5, 6)\n\tw1 := square(ctx, source)\n\tw2 := square(ctx, source)\n\n\tsum := 0\n\tfor v := range merge(ctx, w1, w2) {\n\t\tsum += v\n\t\tif sum > 20 {\n\t\t\tcancel()\n\t\t\tbreak\n\t\t}\n\t}\n\tfmt.Println("partial sum:", sum)\n}\n',
      keyPoints: [
        'Each stage owns and closes exactly one output channel; downstream never closes upstream.',
        "Every send selects on ctx.Done() so a departed consumer can't strand a blocked sender.",
        'Fan-out = multiple receivers on one channel (work splits); fan-in = merge closed once after wg.Wait().',
        'Cancellation drops in-flight values by design — that is correct, not a leak.',
        'context adds deadlines and request scope over a bare done channel; use errgroup for first-error-aborts.',
        'Unbuffered channels give backpressure and bound memory; buffer only to smooth proven bottlenecks.',
      ],
      walkthrough: [
        {
          title: 'Build the pipeline',
          caption:
            'main creates a cancellable context and wires gen into two square stages, all sharing ctx so a single cancel() can stop every goroutine.',
          focus: [
            'ctx, cancel := context.WithCancel(context.Background())',
            'source := gen(ctx, 1, 2, 3, 4, 5, 6)',
          ],
          state: [
            {
              k: 'ctx',
              v: 'active',
            },
            {
              k: 'stages wired',
              v: 'gen->2x square',
            },
            {
              k: 'values emitted',
              v: '0',
            },
          ],
        },
        {
          title: 'Source emits with select',
          caption:
            'The gen goroutine tries to send each number, but the select lets it bail out via ctx.Done() instead of blocking forever on an unread channel.',
          focus: ['case out <- n:', 'case <-ctx.Done():'],
          state: [
            {
              k: 'gen goroutine',
              v: 'running',
            },
            {
              k: 'out chan',
              v: 'unbuffered',
            },
            {
              k: 'sending',
              v: '1,2,3...',
            },
          ],
        },
        {
          title: 'Fan-out shares one source',
          caption:
            'w1 and w2 both read from the same source channel, so the six values are split between the two square workers rather than duplicated.',
          focus: ['w1 := square(ctx, source)', 'w2 := square(ctx, source)'],
          state: [
            {
              k: 'square goroutines',
              v: '2',
            },
            {
              k: 'source consumers',
              v: 'w1 & w2',
            },
            {
              k: 'values per worker',
              v: '~3 each',
            },
          ],
        },
        {
          title: 'Fan-in merges channels',
          caption:
            'merge launches one goroutine per input channel, all forwarding into a shared out, and a separate goroutine waits on the WaitGroup to close out exactly once.',
          focus: ['wg.Add(len(cs))', 'case out <- v:'],
          state: [
            {
              k: 'merge fwd goroutines',
              v: '2',
            },
            {
              k: 'wg counter',
              v: '2',
            },
            {
              k: 'out',
              v: 'open',
            },
          ],
        },
        {
          title: 'Consume until threshold',
          caption:
            'main sums squared values as they arrive; each iteration of the range reads one value from the merged channel.',
          focus: ['for v := range merge(ctx, w1, w2)', 'sum += v'],
          state: [
            {
              k: 'sum',
              v: 'growing',
            },
            {
              k: 'squares seen',
              v: '1,4,9,16...',
            },
            {
              k: 'threshold',
              v: '20',
            },
          ],
        },
        {
          title: 'Cancel and break',
          caption:
            'Once sum exceeds 20 main calls cancel() and breaks, closing ctx.Done() for every stage before it stops reading the merged channel.',
          focus: ['if sum > 20 {', 'cancel()'],
          state: [
            {
              k: 'sum',
              v: '>20',
            },
            {
              k: 'ctx',
              v: 'cancelled',
            },
            {
              k: 'main loop',
              v: 'exited',
            },
          ],
        },
        {
          title: 'Stages drain via ctx.Done()',
          caption:
            'With no consumer left, each blocked send unblocks through its ctx.Done() case and the goroutines return, hitting their deferred close(out).',
          focus: ['case <-ctx.Done():', 'return'],
          state: [
            {
              k: 'blocked sends',
              v: 'released',
            },
            {
              k: 'gen/square goroutines',
              v: 'returning',
            },
            {
              k: 'defer close(out)',
              v: 'fires',
            },
          ],
        },
        {
          title: 'Clean shutdown, no leak',
          caption:
            'As each forwarding goroutine returns, wg.Done() drops the counter to zero, wg.Wait() unblocks and close(out) runs once, leaving no leaked goroutines.',
          focus: ['wg.Wait()', 'close(out)'],
          state: [
            {
              k: 'wg counter',
              v: '0',
            },
            {
              k: 'out',
              v: 'closed',
            },
            {
              k: 'leaked goroutines',
              v: '0',
            },
          ],
        },
      ],
    },
  ],
};
