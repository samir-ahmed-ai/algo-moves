import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 4: Build a Bidder in Go
export const bidderInGo: GoTopic = {
  id: 'bidder-in-go',
  title: 'Build a Bidder in Go',
  icon: 'Code',
  concepts: [
    {
      id: 'ortb-bidder-server',
      title: 'HTTP Bidder Server',
      difficulty: 'Medium',
      tags: ['net/http', 'bidder', 'OpenRTB', 'JSON', 'HTTP-server'],
      summary: 'A minimal OpenRTB bidder: HTTP server, JSON decode, validate, encode response.',
      pattern: 'Bidder HTTP server',
      visual:
        'POST /bid → decode BidRequest → validate → decide → encode BidResponse → respond. HTTP 204 for no-bid. Content-Type: application/json.',
      memorize:
        'POST /bid. Decode JSON BidRequest. Validate (imp present, budget). Decide (targeting match → CPM). Encode BidResponse. 204 if no bid. Always read + drain body.',
      scene:
        'A sushi chef at the pass: order arrives (POST), chef reads the ticket (decode), checks ingredient stock (validate), plates the dish at the right price (decide + encode), hands it out. No ingredients? Politely declines (204).',
      time: 'O(N·imps) per request',
      space: 'O(1) per request',
      code: `package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// ---- Minimal OpenRTB type stubs ----

type BidRequest struct {
	ID   string       \`json:"id"\`
	Imp  []Impression \`json:"imp"\`
	TMax int          \`json:"tmax,omitempty"\`
}

type Impression struct {
	ID       string  \`json:"id"\`
	BidFloor float64 \`json:"bidfloor,omitempty"\`
}

type BidResponse struct {
	ID      string    \`json:"id"\`
	SeatBid []SeatBid \`json:"seatbid,omitempty"\`
}

type SeatBid struct {
	Seat string \`json:"seat,omitempty"\`
	Bid  []Bid  \`json:"bid"\`
}

type Bid struct {
	ID    string  \`json:"id"\`
	ImpID string  \`json:"impid"\`
	Price float64 \`json:"price"\`
	AdM   string  \`json:"adm,omitempty"\`
	MType int     \`json:"mtype,omitempty"\`
}

// ---- Bidder server ----

type Bidder struct {
	SeatID  string
	BaseCPM float64
}

// decideBid returns a Bid for the impression or nil if no bid.
func (b *Bidder) decideBid(imp Impression) *Bid {
	cpm := b.BaseCPM
	if cpm < imp.BidFloor {
		return nil // can't clear floor
	}
	return &Bid{
		ID:    fmt.Sprintf("bid-%s", imp.ID),
		ImpID: imp.ID,
		Price: cpm,
		AdM:   "<div style='width:300px;height:250px;background:#ccc'>Ad</div>",
		MType: 1, // banner
	}
}

func (b *Bidder) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Always drain + close the body to allow connection reuse.
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MB limit
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}

	var req BidRequest
	if err := json.Unmarshal(body, &req); err != nil || len(req.Imp) == 0 {
		w.WriteHeader(http.StatusNoContent) // treat malformed as no-bid
		return
	}

	var bids []Bid
	for _, imp := range req.Imp {
		if bid := b.decideBid(imp); bid != nil {
			bids = append(bids, *bid)
		}
	}

	if len(bids) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	resp := BidResponse{
		ID: req.ID,
		SeatBid: []SeatBid{{Seat: b.SeatID, Bid: bids}},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	bidder := &Bidder{SeatID: "seat-demo", BaseCPM: 2.50}
	srv := &http.Server{
		Addr:         ":8090",
		Handler:      http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/bid" {
				bidder.ServeHTTP(w, r)
				return
			}
			http.NotFound(w, r)
		}),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}

	// Demonstrate in-process: send a test bid request.
	go func() {
		time.Sleep(50 * time.Millisecond)
		imp := Impression{ID: "imp-1", BidFloor: 1.00}
		bid := bidder.decideBid(imp)
		if bid != nil {
			fmt.Printf("Test bid: impid=%s price=%.2f\\n", bid.ImpID, bid.Price)
		}
		// In production: send HTTP POST to http://localhost:8090/bid
	}()

	// Start server (blocks). In tests, use httptest.NewServer instead.
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	go srv.ListenAndServe() //nolint:errcheck
	<-ctx.Done()
	srv.Shutdown(context.Background()) //nolint:errcheck
	fmt.Println("Bidder server demo complete")
}
`,
      quiz: [
        {
          id: 'ortb-server-drain',
          prompt: 'Why must a bidder HTTP handler always drain and close r.Body even when returning HTTP 204?',
          choices: [
            { label: 'TCP keep-alive — drain body to allow connection reuse for next request', correct: true },
            { label: 'Complete response — ensures exchange gets full body before close' },
            { label: 'Retry prevention claim — draining body does not prevent retries' },
            { label: 'Spec requirement claim — spec does not mandate explicit body ack' },
          ],
          explain:
            'Go\'s net/http uses persistent connections by default. If a handler returns without consuming the request body, the server cannot reuse the connection for the next request — it must tear down the TCP connection instead. With 1M+ requests/sec the TCP connection churn this causes is catastrophic. Always defer r.Body.Close() and read (or discard with io.Copy(io.Discard, r.Body)).',
        },
        {
          id: 'ortb-server-content-type',
          prompt: 'An exchange sends a BidRequest with Content-Type: application/json. Your bidder responds without setting a Content-Type. The exchange may:',
          choices: [
            { label: 'Parse failure — exchange rejects or warns on wrong Content-Type', correct: true },
            { label: 'Auto-detect claim — exchanges do not always auto-detect Content-Type' },
            { label: 'HTTP 415 claim — some exchanges return 415 on wrong Content-Type' },
            { label: 'Mirror header claim — response Content-Type must be set explicitly' },
          ],
          explain:
            'While exchanges are generally tolerant, missing Content-Type on the response is an integration error. Some strict exchanges reject responses with the wrong or absent Content-Type header. Always set "Content-Type: application/json" explicitly in your bidder response to comply with the OpenRTB spec and avoid integration issues.',
        },
        {
          id: 'ortb-server-readtimeout',
          prompt: 'Your bidder http.Server has ReadTimeout=5s and the exchange tmax=100ms. Why set ReadTimeout much higher than tmax?',
          choices: [
            { label: 'ReadTimeout vs tmax — covers request read; tmax is DSP processing budget', correct: true },
            { label: 'They are the same thing — ReadTimeout should equal tmax' },
            { label: 'Read-not-write claim — ReadTimeout covers request reading, not write' },
            { label: 'Lower-than-tmax claim — ReadTimeout should exceed tmax, not be lower' },
          ],
          explain:
            'ReadTimeout governs how long the server waits for the client to send the full request (headers + body). BidRequests can be large (enriched with user data) and the exchange → bidder connection may be slow on a bad network day. tmax is the bidder\'s own logic deadline for computing and returning a bid. They are independent concerns: ReadTimeout protects against slow/broken exchange connections; internal bid computation is time-bounded by a context.WithDeadline derived from tmax.',
        },
      ],
      design: {
        prompt:
          'Your bidder needs to handle 50,000 concurrent bid requests per second with p99 < 5 ms processing time. How do you architect the Go server to achieve this?',
        answer:
          '1. HTTP server: use net/http with GOMAXPROCS = num_CPUs; Go\'s goroutine-per-request model handles 50k concurrent requests with ~50k goroutines (each ~8 KB stack = ~400 MB — acceptable).\n2. In-process caching: preload all campaign rules, targeting criteria, and frequency caps into in-memory data structures (sync.Map or read-optimised RWMutex map). Never make synchronous DB or Redis calls in the hot path.\n3. JSON decode optimisation: use a pooled json.Decoder (sync.Pool) to avoid allocations. Consider protobuf for high-traffic exchanges.\n4. Pre-allocated response pools: pool BidResponse + Bid objects via sync.Pool to reduce GC pressure.\n5. Connection management: configure http.Transport with MaxIdleConnsPerHost and tune SO_REUSEPORT for multi-core socket distribution.\n6. Profile: use runtime/pprof + go test -bench to identify allocations. Target < 1000 bytes allocated per request.',
      },
      keyPoints: [
        'Always drain r.Body + defer r.Body.Close() to enable TCP keep-alive connection reuse.',
        'Set Content-Type: application/json on bid responses; return HTTP 204 for no-bid.',
        'Apply a body size limit (io.LimitReader) to protect against malformed giant payloads.',
        'Keep bid decision logic pure (no network calls) for sub-5 ms p99 processing time.',
        'Use httptest.NewServer in unit tests — avoids the overhead of a real TCP socket.',
      ],
    },
    {
      id: 'ortb-bidder-decision',
      title: 'Bid Decision Logic & Targeting',
      difficulty: 'Medium',
      tags: ['targeting', 'bid-decision', 'CPM', 'campaign', 'audience', 'floor'],
      summary: 'Evaluating targeting criteria, computing bid price, and respecting floor + budget.',
      pattern: 'Bid decision pipeline',
      visual:
        'For each imp: geo match → category match → audience match → budget check → compute CPM. If all pass and CPM > floor → bid. Else no-bid.',
      memorize:
        'Target pipeline: GEO → CAT → AUD → BUDGET → CPM > FLOOR. Fast-fail at each gate. Pacing guard last (cheap checks first). Return highest CPM across matching campaigns.',
      scene:
        'A job recruiter: first checks location (geo match), then checks industry (category), then reviews CV (audience), then checks hiring budget (budget), then makes an offer (CPM). Any step failing → pass.',
      time: 'O(C·G) — campaigns × gates per campaign',
      space: 'O(1)',
      code: `package main

import (
	"fmt"
	"strings"
)

// ---- Domain types ----

type GeoTarget struct {
	Countries []string
	Regions   []string
}

type CampaignTarget struct {
	Geo        GeoTarget
	Categories []string  // IAB categories e.g. "IAB1" (Arts & Entertainment)
	Segments   []string  // audience segment IDs
	BaseCPM    float64
	BudgetLeft float64
}

type Impression struct {
	ID          string
	BidFloor    float64
	Categories  []string
	GeoCountry  string
	GeoRegion   string
}

type User struct {
	Segments []string
}

// matchesGeo returns true if imp's geo falls within the campaign target.
func matchesGeo(imp Impression, t GeoTarget) bool {
	if len(t.Countries) == 0 {
		return true // no geo restriction
	}
	for _, c := range t.Countries {
		if strings.EqualFold(c, imp.GeoCountry) {
			return true
		}
	}
	return false
}

// matchesCategory returns true if imp shares at least one IAB category.
func matchesCategory(imp Impression, cats []string) bool {
	if len(cats) == 0 {
		return true
	}
	set := make(map[string]struct{}, len(imp.Categories))
	for _, c := range imp.Categories {
		set[c] = struct{}{}
	}
	for _, c := range cats {
		if _, ok := set[c]; ok {
			return true
		}
	}
	return false
}

// matchesAudience returns true if the user has at least one targeted segment.
func matchesAudience(user User, segs []string) bool {
	if len(segs) == 0 {
		return true
	}
	set := make(map[string]struct{}, len(user.Segments))
	for _, s := range user.Segments {
		set[s] = struct{}{}
	}
	for _, s := range segs {
		if _, ok := set[s]; ok {
			return true
		}
	}
	return false
}

// DecideBid returns the winning CPM across all campaigns, or 0 if no bid.
func DecideBid(imp Impression, user User, campaigns []CampaignTarget) float64 {
	bestCPM := 0.0
	for _, c := range campaigns {
		if !matchesGeo(imp, c.Geo) {
			continue
		}
		if !matchesCategory(imp, c.Categories) {
			continue
		}
		if !matchesAudience(user, c.Segments) {
			continue
		}
		if c.BudgetLeft <= 0 {
			continue
		}
		if c.BaseCPM <= imp.BidFloor {
			continue
		}
		if c.BaseCPM > bestCPM {
			bestCPM = c.BaseCPM
		}
	}
	return bestCPM
}

func main() {
	campaigns := []CampaignTarget{
		{
			Geo:        GeoTarget{Countries: []string{"USA"}},
			Categories: []string{"IAB1", "IAB7"},
			Segments:   []string{"seg-sports", "seg-shoes"},
			BaseCPM:    4.50,
			BudgetLeft: 1000.00,
		},
		{
			Geo:        GeoTarget{}, // global
			Categories: []string{"IAB2"},
			Segments:   []string{},
			BaseCPM:    1.20,
			BudgetLeft: 500.00,
		},
	}

	imp := Impression{
		ID: "imp-1", BidFloor: 1.00,
		Categories: []string{"IAB7"},
		GeoCountry: "USA",
	}
	user := User{Segments: []string{"seg-sports"}}

	cpm := DecideBid(imp, user, campaigns)
	fmt.Printf("Best CPM: $%.2f\\n", cpm)
}
`,
      quiz: [
        {
          id: 'ortb-decision-order',
          prompt: 'In a bid decision pipeline, why should cheap/fast filters run before expensive ones?',
          choices: [
            { label: 'Cheap checks first — fast-failing filters eliminate most imps cheaply', correct: true },
            { label: 'Spec mandate claim — OpenRTB spec does not mandate evaluation order' },
            { label: 'Higher CPM claim — cheap checks do not directly raise bid CPM' },
            { label: 'Scheduler claim — Go scheduler does not prioritise cheaper goroutines' },
          ],
          explain:
            'A typical targeting pipeline might have: geo check (O(1) string compare), category blocklist (O(1) set lookup), then audience match (O(1) in-process), then frequency cap check (network call to Redis). Fast-failing on geo + blocklist eliminates 50–80% of impressions before you ever touch the network, dramatically reducing p99 latency and Redis load.',
        },
        {
          id: 'ortb-decision-multi-campaign',
          prompt: 'Your DSP has 100 active campaigns that all match a given impression. What value should the bidder submit as Bid.price?',
          choices: [
            { label: 'The highest CPM among all matching campaigns — submit the maximum value', correct: true },
            { label: 'Average CPM claim — averaging campaigns does not maximise DSP yield' },
            { label: 'Multi-bid claim — OpenRTB allows only one bid per SeatBid per imp' },
            { label: 'The floor price — let the exchange determine the clearing CPM' },
          ],
          explain:
            'An exchange accepts one bid per seat per impression. Submit the highest CPM your DSP can justify across matching campaigns — this maximises win probability. Use that campaign\'s creative in Bid.adm and CrID. If you need separate creatives per advertiser (competitive separation), you may submit multiple SeatBid entries with different seat IDs, but most implementations just use the top-CPM campaign.',
        },
        {
          id: 'ortb-decision-floor',
          prompt: 'Your campaign\'s model predicts CPM=$2.00 but the Imp.bidfloor is $2.50. The correct action is:',
          choices: [
            { label: 'No-bid — bidding below floor will be rejected by the exchange anyway', correct: true },
            { label: 'Bid $2.50 claim — exchange can\'t infer true value from your bid price' },
            { label: 'Bid $2.00 claim — exchange does not round bids up to meet the floor' },
            { label: 'Bid $0 claim — exchange needs bids above the floor price, not at zero' },
          ],
          explain:
            'Bids below bidfloor are rejected silently — bidding $2.00 against a $2.50 floor is a no-bid in practice. Never bid above your true valuation (in first-price) unless your bidding model accounts for it. The DSP should no-bid cleanly (HTTP 204) and save the network round-trip cost.',
        },
      ],
      design: {
        prompt:
          'Your campaign targeting rules are stored in a database that has 200 ms read latency. How do you make bid decisions in < 5 ms without removing targeting capability?',
        answer:
          '1. In-memory cache: load all campaign rules at startup into a read-optimised in-process data structure (e.g. map[segmentID][]Campaign indexed by targeting key). Read latency drops to nanoseconds.\n2. Cache refresh: run a background goroutine that polls for campaign changes every 5–10 seconds. Use sync/atomic.Value to publish new snapshots without blocking the hot path (pointer swap, no lock on readers).\n3. Targeting index: pre-invert targeting rules — for each (geo, category, segment) combination, store which campaigns apply. O(1) lookup per combination.\n4. Budget: track budget locally with atomic int64 counters (optimistic). Reconcile with DB every second. Accept small over-delivery (~1%) in exchange for zero-latency budget checks.\n5. Change propagation: use a publish/subscribe channel (Redis pub/sub or Kafka) for real-time campaign updates (budget exhausted, pause) to complement the periodic poll.',
      },
      keyPoints: [
        'Bid decision must complete in < 5 ms; never make synchronous DB or network calls in the hot path.',
        'Fast-fail: apply cheapest targeting checks (geo, blocklist) before expensive ones (audience, freq cap).',
        'Submit the highest matching-campaign CPM; the exchange accepts one bid per seat per impression.',
        'No-bid if CPM ≤ bidfloor; bidding below floor wastes network round-trip.',
        'Use atomic pointer swap (sync/atomic.Value) for zero-lock in-process campaign cache updates.',
      ],
    },
    {
      id: 'ortb-bidder-concurrency',
      title: 'Concurrency & Context Deadlines',
      difficulty: 'Hard',
      tags: ['context', 'goroutines', 'concurrency', 'deadline', 'tmax', 'RWMutex'],
      summary: 'Using context.WithDeadline, goroutines, and safe shared state in a real bidder.',
      pattern: 'Context deadline + goroutines',
      visual:
        'ctx = context.WithDeadline(r.Context(), now+tmax). Parallel lookups in goroutines. Cancel propagation frees resources. RWMutex protects campaign cache reads.',
      memorize:
        'Derive context from r.Context() with tmax deadline. Pass ctx everywhere. Use select{case <-ctx.Done()} to abort. sync.RWMutex: many readers, one writer for campaign cache.',
      scene:
        'A fire station: the alarm (request) sets a 100 ms clock (context deadline). Each firewoman (goroutine) gets a copy of the clock. When it rings, everyone abandons the half-pulled hose — the building is lost, but no one wastes more time.',
      time: 'O(1) wall-clock, bounded by deadline',
      space: 'O(goroutines) per request',
      code: `package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// CampaignCache is a thread-safe in-memory campaign store.
// RWMutex allows many concurrent readers but one writer at a time —
// perfect for a cache that is read millions of times and written occasionally.
type CampaignCache struct {
	mu        sync.RWMutex
	campaigns map[string]float64 // campaignID → baseCPM
}

func (cc *CampaignCache) Get(id string) (float64, bool) {
	cc.mu.RLock()
	defer cc.mu.RUnlock()
	v, ok := cc.campaigns[id]
	return v, ok
}

func (cc *CampaignCache) Set(id string, cpm float64) {
	cc.mu.Lock()
	defer cc.mu.Unlock()
	cc.campaigns[id] = cpm
}

// lookupAudience simulates a fast in-process audience segment lookup.
func lookupAudience(ctx context.Context, userID string) ([]string, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(2 * time.Millisecond): // simulate 2ms lookup
		return []string{"seg-sports", "seg-shoes"}, nil
	}
}

// lookupFreqCap simulates checking a co-located Redis sidecar.
func lookupFreqCap(ctx context.Context, userID, campaignID string) (int, error) {
	select {
	case <-ctx.Done():
		return 0, ctx.Err()
	case <-time.After(3 * time.Millisecond): // simulate 3ms lookup
		return 2, nil // user has seen this campaign 2 times today
	}
}

// BidWithContext runs parallel lookups and cancels all of them if the
// context deadline is exceeded before they complete.
func BidWithContext(ctx context.Context, userID string, cache *CampaignCache) (float64, error) {
	type result struct {
		segs []string
		freq int
		err  error
	}
	ch := make(chan result, 1)

	go func() {
		var r result
		// Run audience + freq-cap lookups concurrently.
		var wg sync.WaitGroup
		wg.Add(2)

		var segs []string
		var freq int
		var errSeg, errFreq error

		go func() {
			defer wg.Done()
			segs, errSeg = lookupAudience(ctx, userID)
		}()
		go func() {
			defer wg.Done()
			freq, errFreq = lookupFreqCap(ctx, userID, "camp-1")
		}()

		wg.Wait()
		if errSeg != nil {
			r.err = errSeg
		} else if errFreq != nil {
			r.err = errFreq
		} else {
			r.segs, r.freq = segs, freq
		}
		ch <- r
	}()

	select {
	case <-ctx.Done():
		return 0, fmt.Errorf("bid timed out: %w", ctx.Err())
	case r := <-ch:
		if r.err != nil {
			return 0, r.err
		}
		if r.freq >= 5 {
			return 0, nil // frequency capped
		}
		// Simplified: return CPM if user has matching segment.
		for _, s := range r.segs {
			if s == "seg-sports" {
				cpm, _ := cache.Get("camp-1")
				return cpm, nil
			}
		}
		return 0, nil
	}
}

func main() {
	cache := &CampaignCache{campaigns: map[string]float64{"camp-1": 3.75}}

	// Tight deadline — should succeed (lookups take 3 ms total, deadline 50 ms).
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	cpm, err := BidWithContext(ctx, "user-42", cache)
	fmt.Printf("CPM: %.2f  err: %v\\n", cpm, err)

	// Simulate timeout (deadline shorter than lookup time).
	ctx2, cancel2 := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel2()
	cpm2, err2 := BidWithContext(ctx2, "user-42", cache)
	fmt.Printf("CPM: %.2f  err: %v\\n", cpm2, err2)
}
`,
      quiz: [
        {
          id: 'ortb-conc-context-derive',
          prompt: 'In an HTTP bidder handler, what should be used as the parent context for bid processing?',
          choices: [
            { label: 'r.Context() — cancellation propagates if exchange closes connection', correct: true },
            { label: 'context.Background() — bid runs independently of request lifecycle' },
            { label: 'context.TODO() — until a proper parent is established' },
            { label: 'Global context claim — shared global context ignores per-request cancels' },
          ],
          explain:
            'r.Context() is cancelled when the exchange closes the connection (timeout, disconnect). Deriving your bid context from r.Context() means all goroutines spawned for the bid automatically cancel if the exchange gave up — avoiding wasted CPU on lookups the exchange will never read. Then add a WithDeadline for tmax on top of r.Context().',
        },
        {
          id: 'ortb-conc-rwmutex',
          prompt: 'Why is sync.RWMutex more appropriate than sync.Mutex for a campaign cache accessed 100k times/sec?',
          choices: [
            { label: 'RWMutex benefit — concurrent readers OK; Mutex serialises all access', correct: true },
            { label: 'Always faster claim — Mutex outperforms RWMutex in write-heavy code' },
            { label: 'sync.Mutex does not support concurrent access — only RWMutex does' },
            { label: 'Map requirement claim — Mutex also works for maps; RWMutex not required' },
          ],
          explain:
            'sync.RWMutex allows any number of goroutines to hold a read lock simultaneously. Write locks are exclusive. In a bidder where campaign data is read millions of times between infrequent refreshes (every few seconds), RLock() contention is near-zero. With sync.Mutex every reader blocks every other reader — catastrophic throughput loss at 100k RPS.',
        },
        {
          id: 'ortb-conc-goroutine-leak',
          prompt: 'A bidder goroutine blocks on a channel receive with no context or timeout. If the exchange closes the connection, the goroutine will:',
          choices: [
            { label: 'Leak — block forever; goroutines accumulate until OOM', correct: true },
            { label: 'GC claim — goroutines are not GC\'d; they must exit or be cancelled' },
            { label: 'Panic claim — goroutines don\'t panic; they block indefinitely' },
            { label: 'Parent cancel claim — goroutine parent exit does not cancel children' },
          ],
          explain:
            'Go goroutines are not garbage collected while they are blocked. A goroutine waiting on a channel with no timeout will live forever if no sender ever sends. In a bidder under 50k RPS, even 0.1% goroutine leaks (50/sec) fill memory in minutes. Always use select with ctx.Done() or time.After to bound goroutine lifetime.',
        },
      ],
      design: {
        prompt:
          'Your bidder needs to call three services: audience lookup (3 ms), frequency cap (2 ms), and creative selection (5 ms). They are independent. The exchange tmax is 80 ms. How do you run them to minimise latency?',
        answer:
          'Run all three concurrently in goroutines, aggregate results, and respect the context deadline:\n1. Create a context with deadline = now + 70ms (leaving 10ms buffer for network + response serialisation).\n2. Launch three goroutines, each selecting on ctx.Done() and a result channel.\n3. Use a WaitGroup or errgroup to collect all three results (or the first error).\n4. Theoretical total: max(3, 2, 5) = 5 ms — 16x faster than serial (10 ms + 2 ms + 5 ms = 17 ms wait).\n5. If any service times out, short-circuit: submit a conservative bid using defaults (e.g. base CPM without audience uplift) rather than no-bidding — this preserves some revenue while respecting deadline.\n6. Use sync.Pool for the result-collecting structs to avoid per-request allocations.',
      },
      keyPoints: [
        'Always derive bid context from r.Context(), then add a WithDeadline for tmax.',
        'Pass context to every goroutine; always select on ctx.Done() to prevent leaks.',
        'sync.RWMutex for in-process campaign cache: O(1) read lock with many concurrent readers.',
        'Run independent lookups (audience, freq cap, creative) concurrently to minimise wall-clock latency.',
        'Prefer a conservative bid under deadline pressure over a no-bid — preserves revenue.',
      ],
    },
    {
      id: 'ortb-bidder-benchmark',
      title: 'Benchmarking the Hot Path',
      difficulty: 'Hard',
      tags: ['benchmark', 'pprof', 'allocations', 'JSON', 'performance', 'Go'],
      summary: 'go test -bench, pprof CPU/memory profiling, and minimising allocations in JSON decode.',
      pattern: 'Profiling + benchmark',
      visual:
        'go test -bench=. -benchmem → ns/op + B/op + allocs/op. pprof: go tool pprof cpu.prof → top / list. Optimise: sync.Pool for decoder, reuse slices, avoid interface boxing.',
      memorize:
        'BenchmarkBidder in _test.go. -benchmem for allocations. -cpuprofile / -memprofile for pprof. sync.Pool for json.Decoder. Pre-allocate []Bid with cap. Avoid fmt.Sprintf in hot path.',
      scene:
        'A Formula 1 pit stop timer: benchmark gives you lap time (ns/op) and tyre changes (allocs/op). pprof shows you which mechanic is slowest. You fix the bottleneck and retimer.',
      time: 'O(1) per request after optimisation',
      space: 'O(1) allocs/op goal',
      code: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
)

// ---- Types ----
type BidRequest  struct { ID string \`json:"id"\`; Imp []Imp \`json:"imp"\` }
type Imp         struct { ID string \`json:"id"\`; BidFloor float64 \`json:"bidfloor"\` }
type BidResponse struct { ID string \`json:"id"\`; SeatBid []SeatBid \`json:"seatbid,omitempty"\` }
type SeatBid     struct { Bid []Bid \`json:"bid"\` }
type Bid         struct { ID string \`json:"id"\`; ImpID string \`json:"impid"\`; Price float64 \`json:"price"\` }

// ---- Unoptimised version: allocates a new decoder every call ----
func processUnoptimised(body []byte) (*BidResponse, error) {
	var req BidRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, err
	}
	var bids []Bid
	for _, imp := range req.Imp {
		bids = append(bids, Bid{ID: "b" + imp.ID, ImpID: imp.ID, Price: 2.50})
	}
	return &BidResponse{ID: req.ID, SeatBid: []SeatBid{{Bid: bids}}}, nil
}

// ---- Optimised version: pooled decoder, pre-allocated slice ----
var decoderPool = sync.Pool{New: func() any { return json.NewDecoder(nil) }}

func processOptimised(body []byte) (*BidResponse, error) {
	dec := decoderPool.Get().(*json.Decoder)
	dec.Reset(bytes.NewReader(body))
	defer decoderPool.Put(dec)

	var req BidRequest
	if err := dec.Decode(&req); err != nil {
		return nil, err
	}
	bids := make([]Bid, 0, len(req.Imp)) // pre-allocate capacity
	for _, imp := range req.Imp {
		bids = append(bids, Bid{ID: "b" + imp.ID, ImpID: imp.ID, Price: 2.50})
	}
	return &BidResponse{ID: req.ID, SeatBid: []SeatBid{{Bid: bids}}}, nil
}

// BenchmarkUnoptimised and BenchmarkOptimised can be run with:
//   go test -bench=. -benchmem -count=5
// Expected output: optimised should show fewer B/op and allocs/op.

func BenchmarkUnoptimised(b *testing.B) {
	body := []byte(\`{"id":"req-1","imp":[{"id":"i1","bidfloor":1.0},{"id":"i2","bidfloor":0.5}]}\`)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		processUnoptimised(body) //nolint:errcheck
	}
}

func BenchmarkOptimised(b *testing.B) {
	body := []byte(\`{"id":"req-1","imp":[{"id":"i1","bidfloor":1.0},{"id":"i2","bidfloor":0.5}]}\`)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		processOptimised(body) //nolint:errcheck
	}
}

func main() {
	// Quick sanity check (not a benchmark — run with go test -bench=. for real numbers)
	body := []byte(\`{"id":"req-1","imp":[{"id":"i1","bidfloor":1.0}]}\`)
	resp, err := processOptimised(body)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Printf("Response: id=%s bids=%d price=%.2f\\n",
		resp.ID, len(resp.SeatBid[0].Bid), resp.SeatBid[0].Bid[0].Price)
	fmt.Println("Run 'go test -bench=. -benchmem' for performance numbers.")
	// Suppress unused benchmark symbols in main binary
	_ = testing.B{}
}
`,
      quiz: [
        {
          id: 'ortb-bench-allocopt',
          prompt: 'In a Go benchmark, -benchmem reports "1024 B/op 8 allocs/op". To reduce allocations in the JSON decode path, which technique is most effective?',
          choices: [
            { label: 'sync.Pool — reuse json.Decoder instances to cut allocations per request', correct: true },
            { label: 'High GOGC claim — defers GC but doesn\'t reduce allocation count' },
            { label: 'go:noinline claim — prevents inlining; doesn\'t reduce allocs' },
            { label: 'Marshal claim — Marshal encodes, not decodes; wrong function' },
          ],
          explain:
            'json.Decoder and its internal buffers are allocated on each call. sync.Pool maintains a free list of reusable objects; Reset(newReader) repoints an existing Decoder to the new input without reallocation. This is the canonical pattern in high-throughput Go servers. Alternatively, use a zero-allocation JSON library (sonic, go-json) for the biggest wins.',
        },
        {
          id: 'ortb-bench-pprof',
          prompt: 'You run: go test -bench=BenchmarkBidder -cpuprofile=cpu.prof. How do you identify the hottest function?',
          choices: [
            { label: 'go tool pprof — type "top" for top CPU functions by cumulative time', correct: true },
            { label: 'go vet -profile claim — go vet does not accept pprof profiles' },
            { label: 'Text editor claim — pprof files are binary; use go tool pprof' },
            { label: 'go build -pprof claim — go build does not read pprof profiles' },
          ],
          explain:
            '"go tool pprof cpu.prof" opens an interactive session. "top" shows the top CPU consumers by flat (self) and cum (cumulative) time. "list FuncName" shows the annotated source lines. "web" opens a visual flame graph in the browser. For allocation profiling use -memprofile=mem.prof and "go tool pprof mem.prof".',
        },
        {
          id: 'ortb-bench-prealloc',
          prompt: 'make([]Bid, 0, len(req.Imp)) instead of var bids []Bid reduces allocations because:',
          choices: [
            { label: 'Pre-alloc capacity — avoids slice growth and backing-array copies', correct: true },
            { label: 'GC avoidance claim — make still allocates on heap; GC still scans' },
            { label: 'GC hint claim — len() is used for capacity hint, not GC scanning' },
            { label: 'Stack alloc claim — slice with cap always allocates on the heap' },
          ],
          explain:
            'When a Go slice grows beyond its capacity, the runtime allocates a new, larger backing array and copies all elements. If you know the upper bound (len(req.Imp) impressions → at most len(req.Imp) bids), pre-allocating with make eliminates these growth copies. One allocation instead of O(log N) for N elements.',
        },
      ],
      design: {
        prompt:
          'After profiling your bidder with pprof, you find that 60% of CPU time is spent in encoding/json.Unmarshal. What are your options to reduce this?',
        answer:
          '1. Pool json.Decoder with sync.Pool and Reset() — avoids decoder allocation per request.\n2. Zero-alloc JSON libraries: bytedance/sonic (uses JIT on amd64) or tidwall/gjson for partial field access — 3-5× faster than stdlib.\n3. Protobuf (protobuf OpenRTB schema): binary encoding is 3-10× faster to decode than JSON and has smaller wire size. Many exchanges support Content-Type: application/octet-stream with proto.\n4. Partial decoding: use gjson or gojay to extract only the fields your bidder uses (id, imp[].id, imp[].bidfloor, device.geo.country) rather than decoding the full 5 KB request.\n5. Request body pooling: pool the byte slice buffers (io.ReadAll destination) with sync.Pool to avoid per-request heap allocations for the body copy.',
      },
      keyPoints: [
        'go test -bench=. -benchmem reports ns/op (speed) and B/op + allocs/op (memory).',
        'go tool pprof cpu.prof → top/list/web to find CPU bottlenecks; -memprofile for allocations.',
        'Pool json.Decoder with sync.Pool; Reset(reader) repoints without reallocation.',
        'Pre-allocate slices with make([]T, 0, knownCap) to avoid backing-array copies.',
        'For extreme throughput, replace encoding/json with sonic, go-json, or protobuf.',
      ],
    },
  ],
};
