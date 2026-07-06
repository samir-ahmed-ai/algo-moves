import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 9: Scale, Privacy & System Design
export const scalePrivacy: GoTopic = {
  id: 'scale-privacy',
  title: 'Scale, Privacy & System Design',
  icon: 'Scale',
  concepts: [
    {
      id: 'ortb-scale-pacing',
      title: 'Budget Pacing with Token Bucket',
      difficulty: 'Hard',
      tags: ['pacing', 'token-bucket', 'budget', 'rate-limiting', 'atomic', 'Go'],
      summary: 'Token-bucket algorithm for smooth budget pacing per advertiser per time window.',
      pattern: 'Token bucket pacing',
      visual:
        'Bucket fills at rate = budget/day_seconds. Each won impression deducts CPM from bucket. Empty bucket → suppress bidding. Reset window at midnight. Atomic operations for lock-free hot path.',
      memorize:
        'Bucket: capacity=daily_budget, refill_rate=budget/86400s. Deduct CPM on win. If bucket empty → no bid. Use atomic.Int64 (scaled integers) for lock-free counter. Shard by advertiser_id for scale.',
      scene:
        'A daily expense card: you get $1,000/day. Each purchase deducts from the balance. When it hits zero, the card declines. The bank reloads it at midnight. Your budget pacing system is the bank — but it fills the bucket continuously, not all at once.',
      time: 'O(1) per bid decision',
      space: 'O(N·advertisers)',
      code: `package main

import (
	"fmt"
	"sync/atomic"
	"time"
)

// TokenBucketPacer implements smooth budget pacing using a token bucket.
// Tokens represent micro-dollars (1 token = $0.000001 CPM) to use integer atomics.
const tokenScale = 1_000_000 // 1 USD = 1,000,000 tokens

type TokenBucketPacer struct {
	tokens       atomic.Int64 // current tokens (micro-dollars)
	maxTokens    int64        // daily budget in micro-dollars
	refillPerMs  int64        // tokens to add per millisecond
	lastRefill   int64        // Unix ms of last refill tick
}

// NewDailyPacer creates a pacer for a given daily budget in USD.
func NewDailyPacer(dailyBudgetUSD float64) *TokenBucketPacer {
	max := int64(dailyBudgetUSD * tokenScale)
	p := &TokenBucketPacer{
		maxTokens:   max,
		refillPerMs: max / (24 * 60 * 60 * 1000), // tokens per millisecond
		lastRefill:  time.Now().UnixMilli(),
	}
	p.tokens.Store(max) // start full (front-loaded) or start at 0 for smooth (adjust as needed)
	return p
}

// refill adds tokens proportional to elapsed time since last refill.
// Must be called before TryBid to keep the bucket current.
func (p *TokenBucketPacer) refill() {
	now := time.Now().UnixMilli()
	last := atomic.SwapInt64(&p.lastRefill, now)
	elapsed := now - last
	if elapsed <= 0 {
		return
	}
	add := elapsed * p.refillPerMs
	for {
		cur := p.tokens.Load()
		next := cur + add
		if next > p.maxTokens {
			next = p.maxTokens
		}
		if p.tokens.CompareAndSwap(cur, next) {
			break
		}
	}
}

// TryBid returns true if the campaign has budget to bid the given CPM.
// On success it deducts the bid amount; on failure it leaves the bucket unchanged.
func (p *TokenBucketPacer) TryBid(cpmUSD float64) bool {
	p.refill()
	cost := int64(cpmUSD * tokenScale)
	for {
		cur := p.tokens.Load()
		if cur < cost {
			return false // paced out
		}
		if p.tokens.CompareAndSwap(cur, cur-cost) {
			return true
		}
	}
}

// RecordWin deducts the actual clearing price (after auction) from the bucket.
func (p *TokenBucketPacer) RecordWin(clearingPriceUSD float64) {
	cost := int64(clearingPriceUSD * tokenScale)
	p.tokens.Add(-cost)
}

func (p *TokenBucketPacer) Budget() float64 {
	return float64(p.tokens.Load()) / tokenScale
}

func main() {
	pacer := NewDailyPacer(100.00) // $100/day budget
	fmt.Printf("Initial budget: $%.4f\\n", pacer.Budget())

	// Simulate 5 bid attempts.
	cpms := []float64{2.50, 3.00, 1.20, 4.00, 2.80}
	for _, cpm := range cpms {
		if pacer.TryBid(cpm) {
			pacer.RecordWin(cpm) // in real system, only deduct on actual win
			fmt.Printf("Bid $%.2f CPM → allowed. Remaining: $%.4f\\n", cpm, pacer.Budget())
		} else {
			fmt.Printf("Bid $%.2f CPM → paced out. Remaining: $%.4f\\n", cpm, pacer.Budget())
		}
	}

	// Pacing rate: expected $100 / 86400s = $0.001157/s
	fmt.Printf("\\nRefill rate: $%.6f/ms\\n",
		float64(pacer.refillPerMs)/tokenScale)
}
`,
      quiz: [
        {
          id: 'ortb-pacing-smooth-vs-asap',
          prompt: 'In "smooth pacing," a $1,000/day campaign at 9 AM should have spent approximately:',
          choices: [
            { label: '$375 — 9/24 hours × $1,000 (proportional to time elapsed)', correct: true },
            { label: '$1,000 — smooth pacing spends all budget as fast as possible' },
            { label: '$0 — smooth pacing saves budget for peak hours' },
            { label: '$500 — smooth pacing targets midday spending' },
          ],
          explain:
            'Smooth pacing distributes budget linearly across the day: at 9 AM (9/24 = 37.5% of the day), the campaign should have spent about 37.5% of $1,000 = $375. This prevents "morning burnout" where a campaign exhausts its budget in the first hours then goes dark for the rest of the day. Front-loading is an alternative when high early traffic is expected.',
        },
        {
          id: 'ortb-pacing-atomic-cas',
          prompt: 'The pacing implementation uses Compare-And-Swap (CAS) in a loop. Why is a loop necessary?',
          choices: [
            { label: 'Contention retry — CAS fails under concurrent update; loop retries', correct: true },
            { label: 'Budget guard — the loop ensures the budget never goes negative' },
            { label: 'Cache propagation claim — CAS is for contention, not cache propagation' },
            { label: 'Go limitation claim — Go atomic has no per-function CAS call limit' },
          ],
          explain:
            'CAS (CompareAndSwap) atomically checks that the current value equals the expected value and only updates it if so. Under contention (multiple goroutines simultaneously updating the counter), one goroutine\'s CAS will fail (the value changed before it could update). The loop retries with the freshly-loaded current value. This spin loop is correct and wait-free in the absence of starvation.',
        },
        {
          id: 'ortb-pacing-per-dsp',
          prompt: 'Should a DSP check budget pacing before or after the bid decision targeting logic?',
          choices: [
            { label: 'After targeting — skip budget check for impressions that miss targeting', correct: true },
            { label: 'Before targeting — fail fast on empty budget before targeting compute' },
            { label: 'Simultaneously — in a separate goroutine alongside targeting logic' },
            { label: 'Never in bidder — budget managed by a separate billing service only' },
          ],
          explain:
            'Targeting checks are O(1) in-process lookups (nanoseconds). Budget pacing involves an atomic read + potential CAS. While both are fast, the fail-fast order should be: cheap targeting checks first (geo, category, audience match). If the impression doesn\'t match any campaign, budget is irrelevant. Only perform the budget deduction when you\'re about to commit to a bid.',
        },
      ],
      design: {
        prompt:
          'Your DSP has 10,000 active campaigns, each with a daily budget. Budget pacing state is per-campaign. You run 100 bidder pods. How do you ensure budget pacing is consistent across all pods without a per-request Redis round-trip?',
        answer:
          '1. Local token buckets: each pod maintains in-process token buckets for all campaigns. Updates are atomic int64 CAS — nanosecond latency.\n2. Budget sharding: divide total daily budget by pod count. Each pod\'s bucket = total_budget / N_pods. Allow small over-delivery (< 1%) from rounding.\n3. Reconciliation: background goroutine every second calls a Redis counter for each campaign\'s total spend (INCRBY with the pod\'s local spend increment). This is the global spend tracker.\n4. Budget reset: at midnight, all pods reset their local counters. Redis counters also reset.\n5. Budget exhaustion signal: when global spend in Redis approaches 95% of total budget, a coordination layer broadcasts a "paced out" signal to all pods via pub/sub (Redis or Kafka). Pods stop bidding for that campaign immediately.',
      },
      keyPoints: [
        'Token bucket: refills at budget/day_seconds rate; deducts CPM on each bid.',
        'Use atomic.Int64 with micro-dollar scaling for lock-free counter updates.',
        'CAS loop handles concurrent goroutine contention without a mutex.',
        'Smooth pacing: spend proportional to time elapsed. Front-loaded: spend early while traffic is high.',
        'Shard budgets across pods; reconcile with central Redis every second for global accuracy.',
      ],
    },
    {
      id: 'ortb-scale-frequency-cap',
      title: 'Frequency Capping with Redis',
      difficulty: 'Hard',
      tags: ['frequency-cap', 'Redis', 'INCR', 'EXPIRE', 'consistent-hashing', 'user-tracking'],
      summary: 'Per-user per-campaign impression caps using Redis INCR+EXPIRE or sliding windows.',
      pattern: 'Redis frequency cap',
      visual:
        'Key: "fc:{userID}:{campaignID}:{window}". INCR → check vs cap. EXPIRE to auto-evict. If count > cap → no bid. Sliding window alternative: ZADD timestamp, ZCOUNT in [now-window, now].',
      memorize:
        'Fixed window: INCR + EXPIRE. Sliding window: ZADD ts + ZCOUNT range. Co-locate Redis with bidder (< 1ms). Consistent hash user to shard. Read-then-bid = 2 RTTs; Redis pipeline = 1 RTT.',
      scene:
        'A concert wristband counter at the door: each time you enter (impression), the doorman taps your wristband counter. At 3 taps (cap), you\'re turned away. The band expires at midnight (window reset). Multiple doors (Redis shards) share the same log via consistent hashing.',
      time: 'O(1) INCR / O(log N) ZADD per impression check',
      space: 'O(users × campaigns × windows)',
      code: `package main

import (
	"fmt"
	"time"
)

// RedisFreqCap simulates Redis-backed frequency capping.
// In production, replace with an actual go-redis client.

type InMemoryRedis struct {
	data    map[string]int64
	expiry  map[string]time.Time
}

func NewInMemoryRedis() *InMemoryRedis {
	return &InMemoryRedis{
		data:   make(map[string]int64),
		expiry: make(map[string]time.Time),
	}
}

func (r *InMemoryRedis) INCR(key string) int64 {
	if exp, ok := r.expiry[key]; ok && time.Now().After(exp) {
		delete(r.data, key)
		delete(r.expiry, key)
	}
	r.data[key]++
	return r.data[key]
}

func (r *InMemoryRedis) EXPIRE(key string, ttl time.Duration) {
	r.expiry[key] = time.Now().Add(ttl)
}

func (r *InMemoryRedis) GET(key string) (int64, bool) {
	if exp, ok := r.expiry[key]; ok && time.Now().After(exp) {
		return 0, false
	}
	v, ok := r.data[key]
	return v, ok
}

// FreqCapChecker checks and increments frequency caps using Redis.
type FreqCapChecker struct {
	redis  *InMemoryRedis
	window time.Duration
}

// freqKey creates a Redis key for a daily frequency cap.
func freqKey(userID, campaignID string, window time.Duration) string {
	// Bucket by day (for daily cap) or hour (for hourly cap).
	now := time.Now().UTC()
	var bucket string
	if window >= 24*time.Hour {
		bucket = now.Format("2006-01-02") // daily bucket
	} else {
		bucket = now.Format("2006-01-02T15") // hourly bucket
	}
	return fmt.Sprintf("fc:%s:%s:%s", userID, campaignID, bucket)
}

// CheckAndIncrement returns (allowed, currentCount).
// If allowed is true, it has incremented the counter.
func (fc *FreqCapChecker) CheckAndIncrement(userID, campaignID string, cap int64) (bool, int64) {
	key := freqKey(userID, campaignID, fc.window)

	// Pipeline-style: read current, check, increment only if under cap.
	// In production use a Lua script for atomicity:
	//   local v = redis.call('GET', KEYS[1]) or 0
	//   if tonumber(v) >= tonumber(ARGV[1]) then return 0 end
	//   redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], ARGV[2])
	//   return 1
	cur, _ := fc.redis.GET(key)
	if cur >= cap {
		return false, cur // capped
	}
	newCount := fc.redis.INCR(key)
	fc.redis.EXPIRE(key, fc.window) // reset TTL on each increment
	return true, newCount
}

func main() {
	checker := &FreqCapChecker{
		redis:  NewInMemoryRedis(),
		window: 24 * time.Hour,
	}

	userID     := "user-42"
	campaignID := "camp-nike"
	cap        := int64(3) // max 3 impressions/day

	for i := 0; i < 5; i++ {
		allowed, count := checker.CheckAndIncrement(userID, campaignID, cap)
		fmt.Printf("Impression %d: allowed=%t count=%d\\n", i+1, allowed, count)
	}
}
`,
      quiz: [
        {
          id: 'ortb-freqcap-atomicity',
          prompt: 'The read-then-increment pattern for frequency capping (GET + INCR) has a race condition. What is it and how is it fixed?',
          choices: [
            { label: 'Race condition — two goroutines both allow, both increment; Lua fix', correct: true },
            { label: 'Shard mismatch — GET and INCR may route to different Redis shards' },
            { label: 'Thread safety — INCR is thread-safe in Redis; not the issue here' },
            { label: 'EXPIRE reset claim — EXPIRE sets TTL but does not reset counter value' },
          ],
          explain:
            'Without atomicity, two simultaneous "check then increment" operations can both see count < cap, both allow the impression, and both increment — serving one extra impression. Fix with a Redis Lua script: the script runs atomically (single-threaded in Redis), performing GET, check, and INCR in one network round-trip. redis.call inside Lua is serialised.',
        },
        {
          id: 'ortb-freqcap-sliding',
          prompt: 'A sliding window frequency cap (last 24 hours, not daily calendar boundary) is more complex than fixed-window. What Redis data structure enables it?',
          choices: [
            { label: 'Sorted Set — ZADD timestamp as score, ZCOUNT in [now-86400s, now] range', correct: true },
            { label: 'String + INCR — works for fixed windows; not rolling 24-hour windows' },
            { label: 'Hash with buckets — needs manual hourly summing; not native to Redis' },
            { label: 'List with LPUSH — LLEN returns total length, not a time-ranged count' },
          ],
          explain:
            'Sliding window: ZADD key <unix_ms_timestamp> <unique_member> adds each impression with its timestamp as score. ZCOUNT key (now-86400000) now counts impressions in the last 24 hours. Periodically ZREMRANGEBYSCORE key 0 (now-86400000) prunes old entries. Each operation is O(log N) but gives exact sliding window semantics.',
        },
        {
          id: 'ortb-freqcap-consistent-hash',
          prompt: 'Why should frequency cap Redis lookups use consistent hashing to route to shards?',
          choices: [
            { label: 'Same-shard routing — avoids split counts for the same user-campaign key', correct: true },
            { label: 'Sort order claim — consistent hashing is not alphabetic sorting' },
            { label: 'Memory claim — consistent hashing controls routing, not memory per shard' },
            { label: 'Redis requirement claim — Redis does not mandate consistent hashing' },
          ],
          explain:
            'If "fc:user-42:camp-nike:2026-07-01" routes to Shard A on one pod and Shard B on another (inconsistent routing), the counter is split — each shard shows 2, but total is 4. The cap of 3 is exceeded without either shard knowing. Consistent hashing ensures every pod routes the same key to the same shard, maintaining a globally consistent count.',
        },
      ],
      design: {
        prompt:
          'You need to cap a user at 5 impressions per 24-hour period across all DSP bidder pods. The check must be done in the bidder hot path with < 1 ms added latency. How do you architect this?',
        answer:
          '1. Co-locate Redis: run a Redis instance on the same host/pod as the bidder. Loopback TCP RTT < 0.1 ms.\n2. Lua script for atomic check-and-increment: single round-trip. Returns 0 (capped) or new count.\n3. Key design: "fc:{userID}:{campaignID}:{UTC-date}" with EXPIRE = seconds until next midnight (to align with calendar-day cap resets).\n4. Consistent hashing: userID-based consistent hashing to a Redis cluster shard — same user always hits same shard.\n5. Cache hot users locally: use an in-process LRU cache of recent (userID, campaignID) → count pairs. Serve from cache if count >= cap without calling Redis. Invalidate cache entry on Redis INCR. Reduces Redis calls for already-capped users by 80-90%.\n6. Pre-fetch: when a BidRequest arrives, fan-out audience + freq-cap lookups concurrently. Freq-cap check overlaps with targeting logic.',
      },
      keyPoints: [
        'Fixed-window cap: Redis INCR + EXPIRE per (user, campaign, day) key.',
        'Sliding-window cap: Redis Sorted Set with ZADD(timestamp) + ZCOUNT(now-window, now).',
        'Atomicity: use a Lua script for check + increment in one Redis round-trip.',
        'Consistent hash userID to Redis shard to avoid split counts.',
        'Co-locate Redis on same host as bidder for < 1 ms RTT; optional in-process LRU for already-capped users.',
      ],
    },
    {
      id: 'ortb-scale-logging',
      title: 'Write-Behind Logging with Kafka',
      difficulty: 'Hard',
      tags: ['Kafka', 'write-behind', 'ring-buffer', 'logging', 'async', 'sampling'],
      summary: 'Never block the hot path: ring buffer → background writer → Kafka → data warehouse.',
      pattern: 'Write-behind logging',
      visual:
        'Hot path: append bid event to ring buffer (O(1), non-blocking). Background goroutine: drain ring buffer → batch → Kafka producer → ack. Never call Kafka synchronously in the bid handler.',
      memorize:
        'Ring buffer cap=10k. Background goroutine flushes every 100ms or when full. Kafka batch = 1000 events. On overflow: sample (log 1% of losing bids) or drop oldest. Monitor lag.',
      scene:
        'A restaurant kitchen order board: instead of running to the manager\'s office after every dish, cooks clip their completed order tickets on a rotating drum (ring buffer). A runner collects all tickets every 10 minutes (background flush) and files them in the archive (Kafka).',
      time: 'O(1) hot path append; O(batch) background flush',
      space: 'O(ring_buffer_cap)',
      code: `package main

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

// BidEvent is one log record written to the ring buffer.
type BidEvent struct {
	AuctionID string
	DSPID     string
	ImpID     string
	Price     float64
	Won       bool
	Timestamp time.Time
}

// RingBuffer is a fixed-size, non-blocking circular buffer for bid events.
// Overflow policy: drop oldest (overwrite). For high-priority events (wins),
// prefer a separate, smaller ring with no drop.
type RingBuffer struct {
	buf    []BidEvent
	head   atomic.Int64 // next write position
	count  atomic.Int64 // number of events in buffer
	cap    int64
	mu     sync.Mutex   // protects Drain
}

func NewRingBuffer(capacity int64) *RingBuffer {
	return &RingBuffer{buf: make([]BidEvent, capacity), cap: capacity}
}

// Append adds an event. If the buffer is full, it overwrites the oldest entry.
func (r *RingBuffer) Append(e BidEvent) {
	idx := r.head.Add(1) - 1
	r.buf[idx%r.cap] = e
	if r.count.Load() < r.cap {
		r.count.Add(1)
	}
}

// Drain returns all events since the last drain and resets the counter.
func (r *RingBuffer) Drain() []BidEvent {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := r.count.Swap(0)
	if n == 0 {
		return nil
	}
	head := r.head.Load()
	events := make([]BidEvent, n)
	for i := int64(0); i < n; i++ {
		idx := (head - n + i) % r.cap
		if idx < 0 {
			idx += r.cap
		}
		events[i] = r.buf[idx]
	}
	return events
}

// KafkaWriter simulates writing batches to Kafka.
// In production use confluent-kafka-go or sarama.
type KafkaWriter struct{ topic string }

func (k *KafkaWriter) WriteBatch(events []BidEvent) error {
	fmt.Printf("[kafka] topic=%s batch=%d first=%s\\n",
		k.topic, len(events), events[0].AuctionID)
	return nil
}

// StartLogger runs the background writer goroutine.
// It flushes the ring buffer every flushInterval or when drainThreshold is reached.
func StartLogger(buf *RingBuffer, kw *KafkaWriter, flushInterval time.Duration, done <-chan struct{}) {
	ticker := time.NewTicker(flushInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if events := buf.Drain(); len(events) > 0 {
				kw.WriteBatch(events) //nolint:errcheck
			}
		case <-done:
			// Final flush on shutdown.
			if events := buf.Drain(); len(events) > 0 {
				kw.WriteBatch(events) //nolint:errcheck
			}
			return
		}
	}
}

func main() {
	buf := NewRingBuffer(10_000)
	kw  := &KafkaWriter{topic: "bid-events"}
	done := make(chan struct{})

	go StartLogger(buf, kw, 100*time.Millisecond, done)

	// Simulate hot-path bid events.
	for i := 0; i < 50; i++ {
		buf.Append(BidEvent{
			AuctionID: fmt.Sprintf("req-%03d", i),
			DSPID:     "dsp-a",
			Price:     2.50,
			Won:       i%5 == 0,
			Timestamp: time.Now(),
		})
	}

	time.Sleep(150 * time.Millisecond) // let background goroutine flush
	close(done)
	time.Sleep(10 * time.Millisecond)
	fmt.Println("Logger shutdown complete")
}
`,
      quiz: [
        {
          id: 'ortb-log-why-async',
          prompt: 'Why must Kafka/database writes happen asynchronously and not inline in the bid handler?',
          choices: [
            { label: 'Latency budget — 1-10ms Kafka write would triple p99 bid latency', correct: true },
            { label: 'Sync support claim — Kafka does support synchronous writes' },
            { label: 'Handler limit claim — Go HTTP handlers can initiate network calls' },
            { label: 'Spec requirement claim — OpenRTB does not mandate async Kafka writes' },
          ],
          explain:
            'A Kafka produce call (with ack) typically takes 1–10 ms due to network + broker processing. In a bidder with 5 ms p99 target, inline Kafka writes would immediately destroy that SLA. Write-behind: append to a lock-free ring buffer (nanoseconds), return the bid response, and let a background goroutine batch-write to Kafka outside the hot path.',
        },
        {
          id: 'ortb-log-overflow',
          prompt: 'The ring buffer is full and a new bid event arrives. The best overflow policy for an ad exchange is:',
          choices: [
            { label: 'Prioritize wins — sample losers at 1%; never drop revenue win events', correct: true },
            { label: 'Block on drain — blocking the hot path defeats write-behind logging' },
            { label: 'Drop all events claim — win events cannot be dropped; revenue at risk' },
            { label: 'Dynamic resize claim — runtime buffer doubling risks out-of-memory' },
          ],
          explain:
            'Win events (nurl fires, billing) are revenue-critical — losing one means a DSP doesn\'t know it won and can\'t reconcile spend. Losing bid events are high-volume and lower priority — a 1% sample is statistically representative for analytics. Best practice: maintain two ring buffers — one high-priority (wins, small, never drop) and one best-effort (all bids, sample on overflow).',
        },
        {
          id: 'ortb-log-consumer-lag',
          prompt: 'Your Kafka consumer group for the bid-events topic shows increasing consumer lag. What does this indicate?',
          choices: [
            { label: 'Consumers behind — producer rate exceeds consumers; scale up', correct: true },
            { label: 'Disk space alert — consumer lag indicates rate mismatch, not disk' },
            { label: 'Ring buffer claim — consumer lag is Kafka offsets, not ring buffer' },
            { label: 'No production claim — increasing lag proves production is outpacing' },
          ],
          explain:
            'Consumer lag = (latest producer offset) - (latest consumer committed offset). Increasing lag means the producer is writing events faster than the consumer processes them. Fix: add consumer instances (if partitions > current consumers) or increase partition count (requires repartitioning) and scale consumers proportionally.',
        },
      ],
      design: {
        prompt:
          'Design the logging pipeline for an exchange processing 1M auction events per second, storing 30 days of data for billing reconciliation and fraud analysis.',
        answer:
          '1. Hot path: per-bidder-pod ring buffer (capacity 50k events). Background goroutine flushes every 50 ms in batches of 5k events.\n2. Kafka: 32 partitions on the bid-events topic (partition key = advertiser_id for co-location). Retention: 7 days on Kafka (hot).\n3. Stream processing: Flink or Spark Streaming consumer materialises real-time aggregates (spend by campaign, win rate by DSP) into Redis for live dashboards.\n4. Cold storage: Kafka consumer writes to S3/GCS as Parquet files (partitioned by date/hour). 30-day retention.\n5. Data warehouse: Snowflake/BigQuery loads from S3 daily for SQL-based billing reconciliation and fraud queries.\n6. Sampling: win events written 100%; losing bids sampled at 10% (still 100k/sec at 1M RPS — manageable). This gives statistically valid loss analysis without 10× storage cost.\n7. Schema evolution: use Avro with a Schema Registry to handle field additions without breaking consumers.',
      },
      keyPoints: [
        'Never block the hot path with I/O: append to a ring buffer in nanoseconds; flush to Kafka in background.',
        'Use two ring buffers: high-priority (wins, never drop) and best-effort (all bids, sample on overflow).',
        'Consumer lag = producer offset - consumer offset; increasing lag → scale consumer instances.',
        'Partition by advertiser_id for Kafka co-location; batch size 1k–5k events for throughput.',
        'Win events 100% captured; losing bids sampled at 1–10% for analytics with lower storage cost.',
      ],
    },
    {
      id: 'ortb-privacy-consent',
      title: 'GDPR, TCF & Consent Strings',
      difficulty: 'Hard',
      tags: ['GDPR', 'TCF', 'consent', 'GPP', 'us_privacy', 'CCPA', 'OpenRTB'],
      summary: 'TCF 2.2 consent strings in BidRequest, GDPR enforcement in bidders, and GPP/CCPA.',
      pattern: 'Privacy consent flow',
      visual:
        'BidRequest.regs.gdpr=1 → check BidRequest.user.consent (TCF string) for vendor purposes. Parse TC string: vendor ID present + purpose 1-10 consented? → bid. GPP string: BidRequest.regs.gpp. CCPA: BidRequest.regs.ext.us_privacy.',
      memorize:
        'GDPR in BidRequest: regs.gdpr=1 + user.consent=TCF_string. TCF purposes: 1=store/access, 3=personalised ads, 4=personalised content. DSP vendor ID in TC string? Consent for purposes? → bid. GPP replaces individual privacy strings.',
      scene:
        'A nightclub with a GDPR bouncer: regs.gdpr=1 means you\'re in Europe. user.consent is the patron\'s ID bracelet. The bouncer (bidder) checks: "Is this DSP on the approved vendor list? Did the patron consent to purpose 3 (personalised ads)?" Two \'yes\' answers = entry.',
      time: 'O(1) per consent check',
      space: '—',
      code: `package main

import (
	"encoding/base64"
	"fmt"
)

// Privacy fields in an OpenRTB BidRequest (simplified representation).
type BidRequest struct {
	ID   string
	Regs *Regs
	User *User
}

type Regs struct {
	GDPR      int    \`json:"gdpr,omitempty"\`       // 0=no, 1=yes
	USPrivacy string \`json:"us_privacy,omitempty"\` // CCPA string e.g. "1YNN"
	GPP       string \`json:"gpp,omitempty"\`        // IAB GPP consent string
	GPPSIDs   []int  \`json:"gpp_sid,omitempty"\`    // applicable GPP section IDs
}

type User struct {
	Consent string \`json:"consent,omitempty"\` // TCF 2.x consent string (base64url)
}

// TCFConsent is a simplified view of a decoded TCF 2.x consent string.
// Production: use a TCF decoder library (e.g. LiveRamp iabtcf-encoder).
type TCFConsent struct {
	VendorID      int
	PurposesGranted []int // IAB purpose IDs consented
	LIGranted     []int // legitimate interest granted
}

// CanBid returns true if the DSP can bid given GDPR context.
// This simplified check does not replace a full TCF SDK.
func CanBid(req *BidRequest, dspVendorID int, requiredPurposes []int) (bool, string) {
	if req.Regs == nil || req.Regs.GDPR != 1 {
		return true, "no GDPR scope" // not in GDPR scope
	}
	if req.User == nil || req.User.Consent == "" {
		return false, "GDPR scope: no consent string"
	}

	// Decode and validate the TCF consent string.
	// Real implementation: use github.com/InteractiveAdvertisingBureau/iabtcf-encoder
	raw, err := base64.RawURLEncoding.DecodeString(req.User.Consent)
	if err != nil || len(raw) < 10 {
		return false, "GDPR scope: invalid consent string"
	}

	// Production: parse TC string to check vendor consent + purpose consent.
	// Simplified check: assume consent string contains vendor+purposes for demo.
	// In reality you'd decode bit vectors from the binary TCF format.
	fmt.Printf("  TCF string decoded: %d bytes, vendor=%d, purposes=%v\\n",
		len(raw), dspVendorID, requiredPurposes)

	// Dummy approval: if consent string length > 50 bytes, assume consented.
	if len(raw) > 10 {
		return true, "consent granted"
	}
	return false, "vendor or purpose consent not found"
}

// ParseUSPrivacy parses a CCPA (California Consumer Privacy Act) consent string.
// Format: "1YNN" where [0]=spec version, [1]=has CCPA notice, [2]=opt-out of sale, [3]=LSPA
func ParseUSPrivacy(s string) (version, notice, optOut, lspa byte) {
	if len(s) < 4 {
		return 0, 0, 0, 0
	}
	return s[0], s[1], s[2], s[3]
}

func main() {
	// A fake but valid-length base64url string for demo.
	fakeConsent := base64.RawURLEncoding.EncodeToString(make([]byte, 50))

	req := &BidRequest{
		ID:   "req-eu-001",
		Regs: &Regs{GDPR: 1, USPrivacy: "1YNN"},
		User: &User{Consent: fakeConsent},
	}

	allowed, reason := CanBid(req, 42, []int{1, 3, 4})
	fmt.Printf("Can bid: %t (%s)\\n", allowed, reason)

	// CCPA: "1YNN" → version=1, notice=Y(yes), opt-out=N(no), lspa=N(no)
	version, notice, optOut, lspa := ParseUSPrivacy(req.Regs.USPrivacy)
	fmt.Printf("\\nCCPA: version=%c notice=%c optOut=%c lspa=%c\\n",
		version, notice, optOut, lspa)
	fmt.Printf("User opted out of data sale: %t\\n", optOut == 'Y')
}
`,
      quiz: [
        {
          id: 'ortb-privacy-gdpr-nobid',
          prompt: 'You receive a BidRequest with regs.gdpr=1 but user.consent is missing. What should your DSP do?',
          choices: [
            { label: 'No-bid — missing consent string means no verifiable legal basis for GDPR', correct: true },
            { label: 'Bid normally claim — consent string is required in GDPR scope' },
            { label: 'Contextual bid claim — even contextual bidding needs legal review' },
            { label: 'Pop-up claim — pre-bid consent is required; not via creative pop-up' },
          ],
          explain:
            'Under GDPR, processing personal data (including user IDs and targeting) requires a legal basis — typically consent via TCF or legitimate interest. Without a consent string, you have no documented basis and must no-bid. Some DSPs have a policy to bid with contextual-only data (no user.id, no audience) even without consent, but this requires legal review.',
        },
        {
          id: 'ortb-privacy-tcf-purposes',
          prompt: 'TCF 2.x Purpose 3 is required for which activity?',
          choices: [
            { label: 'Personalised ads profile — building audience segments for ad targeting', correct: true },
            { label: 'Store/access info — that is TCF Purpose 1, not Purpose 3' },
            { label: 'Measure ad performance — that is TCF Purpose 7, not Purpose 3' },
            { label: 'Market research — that is TCF Purpose 9, not Purpose 3' },
          ],
          explain:
            'TCF purposes: 1=Store/access info on device, 2=Select basic ads, 3=Create personalised ads profile, 4=Select personalised ads, 5=Create personalised content profile, 6=Select personalised content, 7=Measure ad performance, 8=Measure content performance, 9=Apply market research, 10=Develop/improve products. Behavioural ad targeting requires purposes 3 and 4.',
        },
        {
          id: 'ortb-privacy-ccpa',
          prompt: 'A CCPA us_privacy string of "1YYN" means:',
          choices: [
            { label: 'Opted out of data sale — Y in position 3 means user opted out of sale', correct: true },
            { label: 'Opted in claim — Y in position 3 means opt-out, not opt-in' },
            { label: 'CCPA inapplicable claim — CCPA applies; notice=Y means given' },
            { label: 'No notice claim — position 2 Y means notice was provided to the user' },
          ],
          explain:
            'CCPA us_privacy format: [0]=spec version (1), [1]=notice given (Y/N/-, Y=yes), [2]=opt-out of sale (Y=opted out, N=not opted out, -=unknown), [3]=LSPA signatory (Y/N). "1YYN": version=1, notice=Y (given), opt-out=Y (user opted out of sale), LSPA=N. DSP must not sell this user\'s data to third parties.',
        },
      ],
      design: {
        prompt:
          'Your DSP must enforce GDPR + CCPA + GPP consent across all 1M+ bid requests per second without adding latency. How do you structure consent enforcement?',
        answer:
          '1. Consent check is O(1): parse regs.gdpr, regs.us_privacy, and user.consent in the BidRequest struct during JSON decode. No network call needed.\n2. TCF string decoding: use a compiled TCF parser (Go library). Parse the base64-encoded consent string and check bit vectors for your vendor ID + required purposes. ~1 microsecond per check.\n3. Short-circuit no-bid: if gdpr=1 and consent string missing or invalid → HTTP 204 immediately. No targeting, no budget deduction, no Kafka event.\n4. Consent caching: cache decoded consent per user.id with TTL=5 minutes (consent rarely changes mid-session). Use LRU cache keyed by consent string hash.\n5. GPP support: inspect regs.gpp_sid to determine which GPP sections apply (e.g. section 2 = TCF EU, section 7 = US California). Route to the appropriate consent check handler per section.\n6. Audit trail: log consent status (granted/denied + purpose IDs) per auction in the write-behind Kafka log for compliance documentation.',
      },
      keyPoints: [
        'regs.gdpr=1 activates GDPR scope; user.consent holds the TCF 2.x base64url string.',
        'TCF purposes: 1=cookies, 3=personalised ads profile, 4=select personalised ads (required for behavioural targeting).',
        'Missing consent string in GDPR scope → no-bid (no documented legal basis).',
        'CCPA us_privacy "1YNN": notice=Y, no opt-out. "1YYN": user opted out of data sale.',
        'GPP (Global Privacy Platform) consolidates US state laws and TCF into one string; inspect gpp_sid to know which sections apply.',
      ],
    },
    {
      id: 'ortb-privacy-identity',
      title: 'Identity: IDFA, GAID, UID2 & Cookieless',
      difficulty: 'Hard',
      tags: ['identity', 'IDFA', 'GAID', 'UID2', 'cookieless', 'eids', 'LiveRamp'],
      summary: 'Device IDs, cookie-sync, UID2, and identity in a cookieless world.',
      pattern: 'Identity graph',
      visual:
        'Web: cookie → buyeruid via sync. Mobile: device.ifa = IDFA/GAID. CTV: no persistent ID. Cookieless: UID2 (hashed email → token) in user.eids. eids = extended identifiers array.',
      memorize:
        'Web: User.buyeruid via cookie sync. Mobile: Device.ifa (IDFA iOS, GAID Android). CTV: no ID → contextual only. UID2: HEM (hashed email) → opaque token. user.eids[{source:"uidapi.com", uids:[{id:TOKEN}]}].',
      scene:
        'Loyalty card programs: web cookies are like store loyalty numbers (reset anytime, browser-specific). IDFA/GAID are device serial numbers (reset only when user opts out). UID2 is a federated loyalty card that works across stores but hides your actual email.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// ExtendedID (EID) per OpenRTB 2.6 §3.2.27.
// User.eids[] carries multiple identity tokens from different ID systems.
type ExtendedID struct {
	Source string    \`json:"source"\`           // domain of the ID system
	UIDs   []UID     \`json:"uids"\`
}

type UID struct {
	ID    string \`json:"id"\`              // the identity token / hash
	AType int    \`json:"atype,omitempty"\` // 1=person-based, 3=device-based
	Ext   *UIDExt \`json:"ext,omitempty"\`
}

type UIDExt struct {
	Stype string \`json:"stype,omitempty"\` // e.g. "commonid", "tdid"
}

// User with identity fields.
type User struct {
	ID       string       \`json:"id,omitempty"\`
	BuyerUID string       \`json:"buyeruid,omitempty"\`
	EIDs     []ExtendedID \`json:"eids,omitempty"\`
}

// Device with advertising ID fields.
type Device struct {
	UA         string \`json:"ua,omitempty"\`
	IP         string \`json:"ip,omitempty"\`
	OS         string \`json:"os,omitempty"\`
	IFA        string \`json:"ifa,omitempty"\`   // IDFA or GAID
	IFAType    string \`json:"ifatype,omitempty"\` // "idfa", "aaid", "ppid", etc.
	LMT        int    \`json:"lmt,omitempty"\`    // 1 = user opted out of ad tracking
	DeviceType int    \`json:"devicetype,omitempty"\` // 1=mobile, 2=PC, 3=CTV
}

// IdentityEnvironment classifies the request's identity availability.
type IdentityEnvironment string

const (
	IDEnvCookieSync   IdentityEnvironment = "cookie-sync"   // web with buyeruid
	IDEnvDeviceID     IdentityEnvironment = "device-id"     // mobile with IFA
	IDEnvUID2         IdentityEnvironment = "uid2"          // cookieless with UID2
	IDEnvContextual   IdentityEnvironment = "contextual"    // no user ID available
)

// ClassifyIdentity returns the best identity signal available.
func ClassifyIdentity(user *User, device *Device) IdentityEnvironment {
	if device != nil && device.IFA != "" && device.LMT != 1 {
		return IDEnvDeviceID
	}
	if user != nil && user.BuyerUID != "" {
		return IDEnvCookieSync
	}
	if user != nil {
		for _, eid := range user.EIDs {
			if eid.Source == "uidapi.com" || eid.Source == "liveramp.com" {
				return IDEnvUID2
			}
		}
	}
	return IDEnvContextual
}

func main() {
	// Scenario 1: Mobile app — GAID present.
	device1 := &Device{OS: "Android", IFA: "38400000-8cf0-11bd-b23e-10b96e40000d", IFAType: "aaid", LMT: 0}
	user1 := &User{}
	fmt.Printf("Mobile: %s\\n", ClassifyIdentity(user1, device1))

	// Scenario 2: Web — cookie-synced buyeruid.
	device2 := &Device{OS: "Windows", UA: "Chrome/123", IP: "203.0.113.1"}
	user2   := &User{BuyerUID: "dsp-user-9876"}
	fmt.Printf("Web (cookie): %s\\n", ClassifyIdentity(user2, device2))

	// Scenario 3: UID2 token present (logged-in user, cookieless browser).
	user3 := &User{
		EIDs: []ExtendedID{
			{
				Source: "uidapi.com",
				UIDs: []UID{{ID: "A4AAAAARfHPXn7...", AType: 1}},
			},
		},
	}
	device3 := &Device{UA: "Firefox/120"}
	fmt.Printf("UID2 (cookieless): %s\\n", ClassifyIdentity(user3, device3))

	// Scenario 4: CTV — no persistent ID.
	device4 := &Device{DeviceType: 3, OS: "tvOS"}
	fmt.Printf("CTV: %s\\n", ClassifyIdentity(nil, device4))

	// Show EID structure.
	b, _ := json.MarshalIndent(user3.EIDs, "", "  ")
	fmt.Println("\nEIDs structure:", string(b))
}
`,
      quiz: [
        {
          id: 'ortb-id-att',
          prompt: 'After Apple\'s App Tracking Transparency (ATT, iOS 14.5+), what happens to IDFA availability?',
          choices: [
            { label: 'Opt-in required — ~70% opted out; IDFA on ~30% of iOS traffic', correct: true },
            { label: 'Completely removed — IDFA is opt-in gated but not fully removed from iOS' },
            { label: 'PPID auto-replace claim — PPID is optional; ATT makes IDFA opt-in gated' },
            { label: 'Encrypted IDFA claim — ATT makes IDFA unavailable, not encrypted' },
          ],
          explain:
            'ATT requires app publishers to show a system prompt asking users to allow tracking (and therefore IDFA access). Most users (60–75%) chose "Ask App Not to Track" at launch. Device.ifa is empty/zeroed and Device.lmt=1 for opted-out users. Publishers fill Device.ifa with a Publisher Provided ID (PPID) as an alternative in some cases.',
        },
        {
          id: 'ortb-id-uid2',
          prompt: 'UID2 (The Trade Desk\'s Unified ID 2.0) is designed to work in a cookieless world by:',
          choices: [
            { label: 'Hashed email token — SHA-256 of email to opaque token; no raw email', correct: true },
            { label: 'Fingerprint claim — UID2 is email-based; fingerprinting is not used' },
            { label: 'localStorage claim — UID2 is server-side; not a browser localStorage ID' },
            { label: 'IP-based claim — UID2 uses hashed email, not IP or user-agent' },
          ],
          explain:
            'UID2 flow: (1) user authenticates (login, newsletter signup) and consents to advertising use; (2) publisher sends hashed email (SHA-256 of lowercase email) to UID2 API; (3) UID2 API returns an opaque token; (4) publisher places token in BidRequest.user.eids[{source:"uidapi.com"}]; (5) DSPs with a UID2 API key can decrypt the token to a stable, pseudonymous ID for targeting. The raw email is never exposed in the bidstream.',
        },
        {
          id: 'ortb-id-eids',
          prompt: 'User.eids (Extended IDs) supports multiple ID sources. Why does this matter for DSPs?',
          choices: [
            { label: 'Multi-ID support — DSP picks whichever ID system it has keys for', correct: true },
            { label: 'DMP segments claim — eids has identity tokens, not DMP data segments' },
            { label: 'buyeruid backup claim — eids is a richer multi-source identity layer' },
            { label: 'Signatures claim — eids has identity tokens, not bid-signing material' },
          ],
          explain:
            'The identity landscape is fragmented: some publishers use UID2, others LiveRamp ATS, others ID5. eids[] is an array of identity tokens from multiple systems in the same BidRequest. A DSP with a UID2 key picks up the UID2 token; a DSP with LiveRamp integration uses the RampID. No single ID system has universal coverage, so multi-ID support is essential.',
        },
      ],
      design: {
        prompt:
          'Your DSP needs to build a robust identity resolution strategy for a post-cookie world. Describe how you handle each identity environment and what targeting capabilities you maintain.',
        answer:
          '1. IDFA/GAID (mobile): full deterministic targeting. Use device.ifa as user key. Audience lookup in DSP database. Full frequency cap per device.\n2. Cookie-synced (web, <30% and declining): use user.buyeruid for audience lookup. Run cookie-sync with major exchanges to maximise match rate. Store (exchange_uid → dsp_uid) in Redis.\n3. UID2 / LiveRamp (logged-in, CTV): decrypt eids token with API key. Map to internal user record. High-quality signal for premium inventory.\n4. First-party data (publishers with logins): publisher sends PPID in device.ifa. DSP matches PPID to own customer records via secure data clean room (non-deterministic but high quality).\n5. Contextual (no ID — growing to 40–60% of traffic): use site.page, site.cat, app.bundle, device.os, geo.country. Content classification model for contextual segments. IAB Topics API signal.\n6. Cohort / topics (Chrome Privacy Sandbox): when available, use Topics API to get topic interest buckets without user ID.\n7. Measurement: use conversion APIs (CAPI) for attribution in cookieless environments where pixels can\'t fire.',
      },
      keyPoints: [
        'Web: User.buyeruid via cookie sync. Mobile: Device.ifa (IDFA/GAID). CTV: often no persistent ID.',
        'ATT (iOS 14.5+) made IDFA opt-in; ~70% users opted out → contextual targeting for most iOS traffic.',
        'UID2: hashed email → opaque token in user.eids[{source:"uidapi.com"}] for cookieless web/CTV.',
        'eids[] supports multiple ID systems; DSPs use whichever they have a key for.',
        'Cookieless fallback: contextual (page content, categories, geo) maintains targeting without user ID.',
      ],
    },
    {
      id: 'ortb-design-capstone',
      title: 'Capstone: Design an Ad Exchange',
      difficulty: 'Hard',
      tags: ['system-design', 'exchange', 'scalability', 'OpenRTB', 'architecture', 'capstone'],
      summary: 'End-to-end design of an ad exchange: 1M RPS, sub-100 ms auctions, impression tracking, billing.',
      pattern: 'Exchange system design',
      visual:
        'SSP → Exchange[validate, enrich, select DSPs, fan-out, auction, win-notice, markup] → Publisher. Fraud sidecar (UDS), in-process caches, write-behind Kafka. Impression pixel server, burl handler, billing reconciliation.',
      memorize:
        'Exchange components: Ingestion(validate+enrich) → DSP Selector(scoring) → Fan-Out(goroutines+ctx) → Auction(sort+floor) → Markup(macro-sub) → Tracking(nurl+burl+pixel). Never DB on hot path. Write-behind Kafka. Shard by user/advertiser. Circuit break slow DSPs.',
      scene:
        'A stock exchange trading floor: bids flood in (SSPs), traders are matched to counterparties (DSPs selected), the floor enforces rules (floors, deals), the winner is announced (win notice), the trade settles (billing), and the ticker tape records everything (Kafka). All in 100 ms.',
      time: 'O(N·DSPs) fan-out, O(N log N) auction, O(1) everything else',
      space: 'O(N·DSPs) in-flight goroutines',
      code: `package main

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// ---- Minimal exchange data types ----

type BidRequest  struct{ ID, PublisherID string; TMax int; BidFloor float64 }
type DSPBid      struct{ DSPID string; Price float64; AdM string }
type AuctionWin  struct{ DSPID, AdM string; ClearingPrice float64 }

// ---- DSP registry and scoring ----

type DSPEntry struct {
	ID       string
	Endpoint string
	WinRate  float64 // rolling 7-day win rate
	P99MS    float64 // rolling p99 response latency
}

// SelectDSPs returns top-N DSPs scored by predicted win probability.
func SelectDSPs(all []DSPEntry, n int) []DSPEntry {
	scored := make([]DSPEntry, len(all))
	copy(scored, all)
	sort.Slice(scored, func(i, j int) bool {
		// Simple score: win_rate * (1 - latency_penalty)
		si := scored[i].WinRate * (1 - scored[i].P99MS/200)
		sj := scored[j].WinRate * (1 - scored[j].P99MS/200)
		return si > sj
	})
	if n > len(scored) {
		n = len(scored)
	}
	return scored[:n]
}

// ---- Fan-out to DSPs ----

// mockCallDSP simulates calling a DSP and returning a bid.
func mockCallDSP(ctx context.Context, dsp DSPEntry, req BidRequest) *DSPBid {
	select {
	case <-ctx.Done():
		return nil
	case <-time.After(time.Duration(dsp.P99MS*0.5) * time.Millisecond):
		if dsp.WinRate > 0.3 { // simulate some DSPs not bidding
			return &DSPBid{DSPID: dsp.ID, Price: 2.0 + dsp.WinRate*3.0, AdM: "<ad/>"}
		}
		return nil
	}
}

func FanOut(ctx context.Context, req BidRequest, dsps []DSPEntry) []DSPBid {
	ch := make(chan *DSPBid, len(dsps))
	var wg sync.WaitGroup
	for _, dsp := range dsps {
		wg.Add(1)
		go func(d DSPEntry) {
			defer wg.Done()
			ch <- mockCallDSP(ctx, d, req)
		}(dsp)
	}
	go func() { wg.Wait(); close(ch) }()

	var bids []DSPBid
	for b := range ch {
		if b != nil {
			bids = append(bids, *b)
		}
	}
	return bids
}

// ---- Auction ----

func RunFirstPriceAuction(bids []DSPBid, floor float64) *AuctionWin {
	var winner *DSPBid
	for i := range bids {
		b := &bids[i]
		if b.Price < floor {
			continue
		}
		if winner == nil || b.Price > winner.Price {
			winner = b
		}
	}
	if winner == nil {
		return nil
	}
	return &AuctionWin{DSPID: winner.DSPID, AdM: winner.AdM, ClearingPrice: winner.Price}
}

// ---- Exchange main flow ----

func ProcessAuction(req BidRequest, allDSPs []DSPEntry) *AuctionWin {
	ctx, cancel := context.WithTimeout(context.Background(),
		time.Duration(req.TMax)*time.Millisecond)
	defer cancel()

	// Step 1: Select top 5 DSPs by score.
	dsps := SelectDSPs(allDSPs, 5)

	// Step 2: Fan-out.
	bids := FanOut(ctx, req, dsps)

	// Step 3: Auction.
	winner := RunFirstPriceAuction(bids, req.BidFloor)
	if winner == nil {
		fmt.Println("No fill — no bids cleared floor")
		return nil
	}

	// Step 4: Background win notice + billing events (not blocking).
	go fmt.Printf("[nurl] → DSP %s clearing=$%.2f\\n", winner.DSPID, winner.ClearingPrice)

	return winner
}

func main() {
	allDSPs := []DSPEntry{
		{ID: "dsp-a", WinRate: 0.45, P99MS: 30},
		{ID: "dsp-b", WinRate: 0.60, P99MS: 50},
		{ID: "dsp-c", WinRate: 0.20, P99MS: 20},
		{ID: "dsp-d", WinRate: 0.35, P99MS: 80},
		{ID: "dsp-e", WinRate: 0.55, P99MS: 40},
	}

	req := BidRequest{ID: "req-001", PublisherID: "pub-1", TMax: 100, BidFloor: 1.00}

	start := time.Now()
	win := ProcessAuction(req, allDSPs)
	elapsed := time.Since(start)

	if win != nil {
		fmt.Printf("Winner: %s price=$%.2f elapsed=%v\\n",
			win.DSPID, win.ClearingPrice, elapsed.Round(time.Millisecond))
	}
	time.Sleep(10 * time.Millisecond) // let goroutines finish in demo
}
`,
      quiz: [
        {
          id: 'ortb-capstone-hot-path',
          prompt: 'Which components should NEVER be in the synchronous hot path of an exchange auction?',
          choices: [
            {
              label: 'All writes async — DB, Kafka, and notice calls must be write-behind',
              correct: true,
            },
            { label: 'DSP fan-out claim — fan-out calls are concurrent, not sequential' },
            { label: 'JSON decode claim — BidRequest decoding is required in the hot path' },
            { label: 'Auction math claim — sort of N≤10 bids is trivial and stays in-path' },
          ],
          explain:
            'The hot path must return the winning markup to the SSP within tmax (80–120 ms). Any I/O operation not strictly required for the auction result must be async: DB writes (use write-behind ring buffer), Kafka produces (background goroutine), win notices (fire-and-forget goroutine), and loss notices. In-process operations (JSON decode, targeting match, sort N≤10 bids) are fine in the hot path.',
        },
        {
          id: 'ortb-capstone-bottleneck',
          prompt: 'At 1M RPS, which single change typically yields the biggest latency improvement in a Go exchange?',
          choices: [
            { label: 'In-process cache — moves enrichment from Redis RTT to nanosecond lookups', correct: true },
            { label: 'Protobuf serialisation — helps latency less than eliminating Redis RTTs' },
            { label: 'GOMAXPROCS increase — exceeding CPU count adds context-switch overhead' },
            { label: 'Goroutine pools — per-DSP spawn cost is negligible compared to Redis RTT' },
          ],
          explain:
            'A Redis lookup takes 0.5–2 ms per call. An in-process cache lookup takes nanoseconds. At 1M RPS, even 1 ms per request = 1,000 ms of aggregate latency per second across the fleet. Moving the most frequently accessed data (top-N DSP scores, user segment maps, targeting rules) to in-process caches (refreshed from Redis every 5–10 seconds) consistently yields the largest single latency improvement.',
        },
        {
          id: 'ortb-capstone-reconciliation',
          prompt: 'Your exchange bills advertisers based on burl (billing notice) counts. The DSP disputes the count saying their pixel count is 15% lower. Per IAB standards:',
          choices: [
            { label: 'Exchange count authoritative — 15% is within contract tolerance', correct: true },
            { label: 'Lower count claim — exchange count is authoritative, not DSP pixels' },
            { label: 'Always dispute claim — 15% is within many contracts\' tolerance' },
            { label: 'Split difference claim — contracts use exchange count, not an average' },
          ],
          explain:
            'IAB guidelines recognise that server-to-server exchange counts (burl) and client-side DSP pixel counts will diverge due to ad blockers, browser issues, and network failures. Exchange burl count is authoritative for billing settlement. Most contracts allow 10–15% discrepancy without dispute. Above this threshold, parties may involve a third-party measurement vendor (IAS, DoubleVerify) as arbitrator.',
        },
      ],
      design: {
        prompt:
          'Design a complete ad exchange that handles 1 million bid requests per second, 50 DSPs, sub-100 ms auctions, independent impression counting, and $4B/month billing reconciliation. Cover the key architectural decisions.',
        answer:
          '**Architecture overview:**\n\n1. Ingestion tier: stateless Go HTTP servers (50 pods, ~20k RPS each). Load-balanced via L7 (Envoy). BidRequest validated and enriched from in-process caches (DSP scores, publisher floors, ads.txt cache).\n\n2. Fraud sidecar: Unix domain socket to a co-located IVT scoring process. < 2 ms. Blocks known bot traffic.\n\n3. DSP selection: score all 50 DSPs by (win_rate × targeting_match × capacity_signal). Select top 5–10. Updated in-process from a Redis-backed config every 5 seconds.\n\n4. Fan-out: goroutine per DSP with per-DSP context deadline (tmax - 15 ms). Buffered channel for results. Hedged requests to slow DSPs after hedge_delay = DSP_p50.\n\n5. Auction: filter eligible bids (price ≥ floor), first-price sort, winner selected. O(N log N), N ≤ 10.\n\n6. Markup + macro substitution: replace \${AUCTION_PRICE} in adm/nurl/burl. Return markup to SSP.\n\n7. Async notices: background goroutines fire winner nurl + all loser lurls. Ring buffer → Kafka for audit.\n\n8. Impression tracking: stateless pixel servers (100 pods) return 1×1 GIF. Deduplicate in Redis (SETNX + 60s TTL). Write unique impressions to Kafka.\n\n9. Billing: burl fires at render event. Kafka consumer reconciles (burl count vs DSP pixel count) daily. Settle within 10% discrepancy.\n\n10. Scale numbers: 1M RPS ingress; 5–10 DSPs per auction = 5–10M outbound requests/sec. p99 end-to-end ≤ 80 ms. $4B/month / 2.592B seconds = ~$1,543/second in clearing price settlement.',
      },
      keyPoints: [
        'Hot path: decode → validate → select DSPs → fan-out → collect bids → auction → macro-sub markup → respond to SSP.',
        'Never block hot path on I/O: all writes (Kafka, DB, notice HTTP calls) are fire-and-forget goroutines.',
        'Smart DSP selection (score by win rate + latency): fan out to 5–10, not all 50.',
        'In-process caches for enrichment data: targeting rules, DSP scores, pub floors — avoids Redis RTT in hot path.',
        'Impression pixel server: 1×1 transparent GIF, Redis SETNX dedup, ring buffer → Kafka for counts.',
        'Billing: exchange burl is authoritative; < 10–15% discrepancy vs DSP pixel is normal.',
      ],
    },
  ],
};
