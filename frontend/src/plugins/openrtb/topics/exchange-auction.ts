import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 5: Ad Exchange & Auction in Go
export const exchangeAuction: GoTopic = {
  id: 'exchange-auction',
  title: 'Ad Exchange & Auction',
  icon: 'Gavel',
  concepts: [
    {
      id: 'ortb-exchange-fanout',
      title: 'Fan-Out to N DSPs',
      difficulty: 'Hard',
      tags: ['fan-out', 'goroutines', 'exchange', 'concurrency', 'DSP', 'OpenRTB'],
      summary: 'Sending a BidRequest to N DSPs concurrently and collecting responses within tmax.',
      pattern: 'Fan-out/fan-in',
      visual:
        'Spawn N goroutines (one per DSP), each POSTing BidRequest. Collect responses on a buffered channel. Cancel remaining goroutines after deadline. Fan-in: gather all bids received before cutoff.',
      memorize:
        'Fan-out: go httpPost(ctx, dsp) for each DSP. Fan-in: select{ case r:=<-ch, case <-ctx.Done() }. Buffered channel cap=N so goroutines never block. Drain channel after deadline.',
      scene:
        'A restaurant firing orders to the entire kitchen simultaneously: one goroutine per station. The expediter (fan-in) collects dishes as they\'re ready. When the guest\'s patience (deadline) runs out, whatever arrived on the pass goes out — the rest gets bin\'d.',
      time: 'O(N) goroutines, O(tmax) wall-clock',
      space: 'O(N) buffered channel + goroutines',
      code: `package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type BidRequest struct {
	ID   string \`json:"id"\`
	TMax int    \`json:"tmax"\`
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
	ImpID string  \`json:"impid"\`
	Price float64 \`json:"price"\`
}

type DSPResult struct {
	DSPID string
	Resp  *BidResponse
	Err   error
}

// callDSP sends the BidRequest to one DSP and sends the result on ch.
// It respects ctx cancellation for early termination.
func callDSP(ctx context.Context, dspID, endpoint string, req *BidRequest, ch chan<- DSPResult) {
	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 0} // ctx carries the deadline
	resp, err := client.Do(httpReq)
	if err != nil {
		ch <- DSPResult{DSPID: dspID, Err: err}
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent {
		ch <- DSPResult{DSPID: dspID} // explicit no-bid
		return
	}

	var br BidResponse
	if err := json.NewDecoder(resp.Body).Decode(&br); err != nil {
		ch <- DSPResult{DSPID: dspID, Err: err}
		return
	}
	ch <- DSPResult{DSPID: dspID, Resp: &br}
}

// FanOut sends req to all dsps concurrently and returns all bids received
// before the context deadline expires.
func FanOut(ctx context.Context, req *BidRequest, dsps map[string]string) []Bid {
	ch := make(chan DSPResult, len(dsps)) // buffered — goroutines never block on send

	var wg sync.WaitGroup
	for id, endpoint := range dsps {
		wg.Add(1)
		go func(id, ep string) {
			defer wg.Done()
			callDSP(ctx, id, ep, req, ch)
		}(id, endpoint)
	}

	// Close channel after all goroutines finish so the drain loop terminates.
	go func() { wg.Wait(); close(ch) }()

	var allBids []Bid
	for r := range ch {
		if r.Resp == nil {
			continue
		}
		for _, sb := range r.Resp.SeatBid {
			allBids = append(allBids, sb.Bid...)
		}
	}
	return allBids
}

func main() {
	req := &BidRequest{ID: "req-001", TMax: 80}

	// In a real exchange, dsps map would come from a registry.
	// Use placeholder URLs here for demo.
	dsps := map[string]string{
		"dsp-a": "http://dsp-a.internal/bid",
		"dsp-b": "http://dsp-b.internal/bid",
	}

	ctx, cancel := context.WithTimeout(context.Background(),
		time.Duration(req.TMax)*time.Millisecond)
	defer cancel()

	start := time.Now()
	bids := FanOut(ctx, req, dsps)
	fmt.Printf("Collected %d bids in %v\\n", len(bids), time.Since(start).Round(time.Millisecond))
}
`,
      quiz: [
        {
          id: 'ortb-fanout-buffered',
          prompt: 'Why must the channel used for DSP results have a buffer equal to the number of DSPs?',
          choices: [
            { label: 'Buffered channel — goroutines send without blocking after deadline', correct: true },
            { label: 'Must-buffer claim — unbuffered channels work across goroutines too' },
            { label: 'Ordered results claim — buffered channels don\'t guarantee arrival order' },
            { label: 'No unbuffered claim — unbuffered channels are valid in production' },
          ],
          explain:
            'After the context deadline fires, the fan-in loop may stop reading the channel. If the channel is unbuffered (or has a smaller buffer), goroutines trying to send their result will block forever — a goroutine leak. A buffer of cap=N means each goroutine can always complete its send and exit, even if nobody is reading the channel anymore.',
        },
        {
          id: 'ortb-fanout-smart-selection',
          prompt: 'A production exchange has 50 registered DSPs but only fans out to 5–10 per auction. What criterion is most commonly used to choose which DSPs to invite?',
          choices: [
            { label: 'Targeting + history — win rate, fill rate, geo/format match per DSP', correct: true },
            { label: 'Alphabetical claim — DSP selection by name ignores targeting quality' },
            { label: 'Round-robin claim — rotation ignores DSP targeting match quality' },
            { label: 'Pre-paid claim — floor prepayment does not determine DSP selection' },
          ],
          explain:
            'Fanning out to all 50 DSPs multiplies latency risk and compute cost. Smart DSP selection scores each DSP on predicted win probability for this impression type (based on recent performance, targeting overlap, and capacity signal). Only the top-N DSPs are invited. This is also called "demand prediction" or "DSP scoring." Well-run exchanges fan out to 5–15 DSPs.',
        },
        {
          id: 'ortb-fanout-goroutine-lifetime',
          prompt: 'After context deadline expires and your fan-in loop exits, DSP goroutines that haven\'t finished yet will:',
          choices: [
            { label: 'Complete + send — exits normally; buffered channel absorbs the result', correct: true },
            { label: 'Hang-forever claim — ctx cancels pending HTTP calls immediately' },
            { label: 'Runtime kill claim — Go runtime doesn\'t kill goroutines on ctx done' },
            { label: 'Panic claim — goroutines send to buffered channel, which isn\'t closed' },
          ],
          explain:
            'Context cancellation signals the http.Client to abort the in-flight request, so slow DSP goroutines will unblock quickly with a context error. They then try to send the error result to the buffered channel — this succeeds immediately since the buffer has capacity. Once they\'ve sent, the goroutines exit. The channel is closed by the WaitGroup-tracking goroutine after all N workers finish.',
        },
      ],
      design: {
        prompt:
          'Your exchange fans out to 10 DSPs and must return to the SSP in 100 ms. One DSP consistently responds in 90–95 ms (close to tmax but usually under). How do you handle this DSP without missing the overall deadline?',
        answer:
          '1. Hedged requests: send the request to the slow DSP\'s primary endpoint at t=0; if no response by t=50 ms, simultaneously send to its backup endpoint. First response wins. This halves the effective tail latency.\n2. Per-DSP deadline: set a per-DSP context deadline at tmax-10ms (90 ms) rather than the full tmax. Returns the bid 10 ms before you need to respond to the SSP.\n3. Circuit breaker: track the DSP\'s p99 latency over a rolling window. If p99 > 80% of tmax, temporarily exclude the DSP from auctions and reset after 30 seconds.\n4. Capacity admission: some exchanges allow DSPs to publish a capacity signal (qps_limit). Fan out only when the DSP has available capacity.\n5. Async billing: don\'t block response on billing/nurl calls — fire them in background goroutines after the winner is selected.',
      },
      keyPoints: [
        'Fan-out: one goroutine per DSP, all launched simultaneously within the tmax context.',
        'Channel buffer must equal number of DSPs to prevent goroutine leaks after deadline.',
        'Smart DSP selection (score by win rate + targeting) reduces fan-out N from 50 → 5–10.',
        'Context cancellation propagates to http.Client, aborting in-flight HTTP calls on deadline.',
        'Drain the results channel fully after deadline using the WaitGroup + close pattern.',
      ],
    },
    {
      id: 'ortb-exchange-hedged',
      title: 'Hedged Requests & Timeout Enforcement',
      difficulty: 'Hard',
      tags: ['hedged-requests', 'timeout', 'latency', 'p99', 'circuit-breaker'],
      summary: 'Cut tail latency by sending backup requests to slow DSPs; enforce hard deadlines.',
      pattern: 'Hedged requests',
      visual:
        'Send to primary at t=0. If no response by t=hedge_ms, send to backup. Return whichever responds first. Cancel the other. Result: p99 latency ≈ hedge_delay + min(primary_p50, backup_p50).',
      memorize:
        'Hedge = send backup at hedge_ms if primary silent. First response wins. Cancel loser. hedge_ms ≈ primary_p50 + 10 ms. Latency gain: cuts p99 to p50+hedge.',
      scene:
        'Ordering pizza: if delivery hasn\'t arrived in 40 minutes, call a second shop. Whichever shows up first, you eat. Cancel the other order.',
      time: 'O(1) wall-clock improvement: p99 → p50 + hedge_delay',
      space: 'O(1) extra goroutine per hedged request',
      code: `package main

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// DSPCall simulates calling a DSP endpoint with variable latency.
// In production this would be an HTTP POST with JSON body.
type DSPCall func(ctx context.Context) (float64, error)

// simulateDSP returns a DSPCall that responds after a random latency.
func simulateDSP(name string, p50, jitter time.Duration) DSPCall {
	return func(ctx context.Context) (float64, error) {
		latency := p50 + time.Duration(rand.Int63n(int64(jitter)))
		select {
		case <-ctx.Done():
			return 0, fmt.Errorf("%s: %w", name, ctx.Err())
		case <-time.After(latency):
			return 3.14, nil // mock CPM
		}
	}
}

// HedgedCall sends call to primary; if no response within hedgeDelay, also
// sends to backup. Returns the first successful response.
func HedgedCall(ctx context.Context, primary, backup DSPCall, hedgeDelay time.Duration) (float64, error) {
	type result struct {
		val float64
		err error
	}
	ch := make(chan result, 2) // buffer 2 so both goroutines can send and exit

	var once sync.Once
	var wg sync.WaitGroup

	launch := func(call DSPCall) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			v, err := call(ctx)
			once.Do(func() { ch <- result{v, err} }) // only first winner sends
		}()
	}

	// Always start primary immediately.
	launch(primary)

	// Start backup after hedgeDelay if primary hasn't responded.
	hedgeTimer := time.NewTimer(hedgeDelay)
	defer hedgeTimer.Stop()

	go func() {
		select {
		case <-hedgeTimer.C:
			launch(backup) // send hedge
		case <-ctx.Done():
		}
	}()

	// Wait for first result or context cancellation.
	select {
	case r := <-ch:
		go func() { wg.Wait() }() // allow loser goroutine to finish
		return r.val, r.err
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func main() {
	rand.Seed(42)

	primary := simulateDSP("primary", 60*time.Millisecond, 30*time.Millisecond) // p50=60ms, sometimes 90ms
	backup  := simulateDSP("backup",  20*time.Millisecond, 10*time.Millisecond) // p50=20ms (fast replica)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	start := time.Now()
	cpm, err := HedgedCall(ctx, primary, backup, 40*time.Millisecond)
	elapsed := time.Since(start)

	fmt.Printf("CPM=%.2f err=%v elapsed=%v\\n", cpm, err, elapsed.Round(time.Millisecond))
}
`,
      quiz: [
        {
          id: 'ortb-hedge-latency-math',
          prompt: 'Your DSP has p50=30ms and p99=90ms responses. You hedge at t=40ms with a backup replica that has p50=25ms. The effective p99 of the hedged call is approximately:',
          choices: [
            { label: '65 ms — hedge_delay + backup_p50 = 40 + 25 ms', correct: true },
            { label: '30 ms claim — hedging affects p50 by adding backup requests' },
            { label: '90 ms claim — hedging reduces p99 for requests past hedge_delay' },
            { label: '115 ms claim — hedging improves p99; not primary_p99 + backup_p50' },
          ],
          explain:
            'If the primary takes longer than 40 ms (the p99 tail), the backup kicks in at t=40 ms. The backup adds its own p50 latency (25 ms), making the effective completion time ~65 ms for those requests. Requests where the primary responds before 40 ms still see primary latency (~30 ms). Net effect: p99 drops from 90 ms to ~65 ms.',
        },
        {
          id: 'ortb-hedge-cost',
          prompt: 'What is the main cost of hedged requests at scale?',
          choices: [
            { label: 'Extra load — tail requests always fire two DSP calls', correct: true },
            { label: 'Double wins claim — only one bid wins; slower goroutine is dropped' },
            { label: 'Keep-alive claim — hedged requests work fine with HTTP/1.1 keep-alive' },
            { label: 'GC block claim — a timer goroutine does not prevent GC from running' },
          ],
          explain:
            'When a primary response is slow, the backup call fires — adding an extra HTTP request to the DSP for each tail-latency event. If p99 tail is 5% of traffic and you hedge 5% of requests, you add ~5% load on DSP endpoints. In exchange integrations, it\'s polite to inform DSPs that you hedge and only count one win per hedged pair. The DSP will receive two requests but should only process one win notice.',
        },
        {
          id: 'ortb-hedge-sync-once',
          prompt: 'sync.Once in the hedged request implementation ensures:',
          choices: [
            { label: 'First completes — sync.Once ensures only one goroutine sends the result', correct: true },
            { label: 'Primary wins claim — whichever finishes first wins; not always primary' },
            { label: 'Both run claim — both goroutines run; slower result is discarded' },
            { label: 'Concurrent-safe claim — sync.Once is safe for concurrent use' },
          ],
          explain:
            'sync.Once.Do executes its argument function exactly once across all goroutines that call it. In the hedged implementation, both the primary and backup goroutines try to send their result via once.Do. The first to succeed sends; the second\'s once.Do is a no-op. This guarantees exactly one result in the channel regardless of which goroutine finishes first.',
        },
      ],
      design: {
        prompt:
          'You want to add a circuit breaker to your exchange\'s DSP fan-out to automatically exclude consistently slow or erroring DSPs from auctions. What metrics would you track and what would your state machine look like?',
        answer:
          'Metrics per DSP (rolling 60-second window): (a) timeout rate = requests timing out / total requests, (b) error rate = HTTP 5xx + connection errors / total, (c) p99 latency.\n\nCircuit breaker states:\n- Closed (normal): DSP is included in auctions. Monitor metrics.\n- Open (tripped): DSP is excluded. Tripped when timeout_rate > 20% OR error_rate > 10% OR p99 > 90% of tmax. Duration: 30 seconds.\n- Half-open (probe): after open duration, send 1% of traffic to DSP. If success rate > 90% for 10 requests, close. Else reopen for another 30 seconds.\n\nGo implementation: atomic counters per DSP in a sliding window (ring buffer of per-second buckets). A background goroutine evaluates thresholds every second and updates the circuit state in an atomic.Value.',
      },
      keyPoints: [
        'Hedge at the primary\'s p50 + small buffer; backup fires only if primary misses the hedge delay.',
        'Effective p99 ≈ hedge_delay + backup_p50 (much better than raw primary p99).',
        'Use sync.Once so only the first goroutine to finish writes to the result channel.',
        'Buffer the result channel = 2 to prevent goroutine leaks (winner + loser can both send).',
        'Inform DSPs about hedging in integration contracts; they should expect dual requests in the tail.',
      ],
    },
    {
      id: 'ortb-exchange-auction',
      title: 'First/Second-Price Auction Logic',
      difficulty: 'Medium',
      tags: ['auction', 'first-price', 'second-price', 'winner', 'clearing-price', 'floor'],
      summary: 'Implement exchange-side auction: collect bids, enforce floor, select winner, compute clearing price.',
      pattern: 'Auction engine',
      visual:
        'Sort bids descending by price. First-price: winner.ClearingPrice = winner.Bid. Second-price: winner.ClearingPrice = max(floor, second.Bid). Reject bids < floor.',
      memorize:
        'Filter bids ≥ floor. Sort descending. Winner = bids[0]. FP clearing = bids[0].price. SP clearing = max(floor, bids[1].price if exists else floor). Fire nurl with \${AUCTION_PRICE}=clearing.',
      scene:
        'An art auction: auctioneer removes bidders below reserve price (floor), then in first-price the highest bidder pays their bid; in second-price the highest bidder pays just above the second-highest — the auctioneer adjusts the hammer price accordingly.',
      time: 'O(N log N) sort of bids',
      space: 'O(N)',
      code: `package main

import (
	"fmt"
	"sort"
)

// AuctionType mirrors the OpenRTB "at" field.
type AuctionType int

const (
	FirstPrice  AuctionType = 1
	SecondPrice AuctionType = 2
)

// BidEntry represents one bid received from a DSP.
type BidEntry struct {
	DSPID string
	ImpID string
	Price float64 // CPM in USD
	AdM   string
}

// AuctionResult is returned to the exchange after settlement.
type AuctionResult struct {
	Winner        *BidEntry
	ClearingPrice float64
	Losers        []BidEntry
}

// RunAuction selects a winner from eligible bids given floor and auction type.
func RunAuction(bids []BidEntry, floor float64, at AuctionType) *AuctionResult {
	// Filter: remove bids below floor.
	eligible := bids[:0]
	for _, b := range bids {
		if b.Price >= floor {
			eligible = append(eligible, b)
		}
	}
	if len(eligible) == 0 {
		return nil // no fill
	}

	// Sort descending by price.
	sort.Slice(eligible, func(i, j int) bool {
		return eligible[i].Price > eligible[j].Price
	})

	winner := eligible[0]
	var clearingPrice float64

	switch at {
	case FirstPrice:
		clearingPrice = winner.Price
	case SecondPrice:
		clearingPrice = floor
		if len(eligible) > 1 {
			clearingPrice = eligible[1].Price
		}
	default:
		clearingPrice = winner.Price
	}

	result := &AuctionResult{
		Winner:        &eligible[0],
		ClearingPrice: clearingPrice,
	}
	if len(eligible) > 1 {
		result.Losers = eligible[1:]
	}
	return result
}

func main() {
	bids := []BidEntry{
		{DSPID: "dsp-a", ImpID: "imp-1", Price: 5.00},
		{DSPID: "dsp-b", ImpID: "imp-1", Price: 3.50},
		{DSPID: "dsp-c", ImpID: "imp-1", Price: 1.20},
		{DSPID: "dsp-d", ImpID: "imp-1", Price: 0.80}, // below floor
	}
	floor := 1.00

	fmt.Println("=== First-Price Auction ===")
	if r := RunAuction(bids, floor, FirstPrice); r != nil {
		fmt.Printf("Winner: %s bid=$%.2f pays=$%.2f\\n",
			r.Winner.DSPID, r.Winner.Price, r.ClearingPrice)
	}

	fmt.Println("\\n=== Second-Price Auction ===")
	if r := RunAuction(bids, floor, SecondPrice); r != nil {
		fmt.Printf("Winner: %s bid=$%.2f pays=$%.2f\\n",
			r.Winner.DSPID, r.Winner.Price, r.ClearingPrice)
		for _, l := range r.Losers {
			fmt.Printf("  Loser: %s bid=$%.2f\\n", l.DSPID, l.Price)
		}
	}
}
`,
      quiz: [
        {
          id: 'ortb-auction-tie',
          prompt: 'Two DSPs submit identical bid prices in a first-price auction. How should the exchange resolve the tie?',
          choices: [
            { label: 'Random selection among tied bids — ensures fairness and prevents gaming', correct: true },
            { label: 'First bid received wins — simpler implementation' },
            { label: 'Largest seat ID claim — seat ID ordering is not standard tie-breaking' },
            { label: 'Both bids win — exchange serves two ads simultaneously' },
          ],
          explain:
            'Random tie-breaking is the industry standard because deterministic tie-breaking (first received, seat ID order, etc.) can be exploited — a DSP could time or craft bids to systematically win ties. Random selection across tied bids provides fairness and removes the incentive for gaming.',
        },
        {
          id: 'ortb-auction-floor-enforcement',
          prompt: 'A DSP bids $1.20 CPM and the Imp.bidfloor is $1.50 CPM. The exchange should:',
          choices: [
            { label: 'Reject below-floor — invalid bid; floor enforcement is independent', correct: true },
            { label: 'Bump clearing claim — exchange never bumps below-floor bids\' price' },
            { label: 'Conditional accept claim — below-floor bids are always rejected' },
            { label: 'Publisher forward claim — exchange enforces floor independently' },
          ],
          explain:
            'The floor price is a hard constraint set by the publisher (via SSP). Any bid below floor is rejected before the auction even runs. This is non-negotiable — accepting below-floor bids would violate publisher monetisation guarantees and SSP contracts. The exchange must enforce this before running sort/selection logic.',
        },
        {
          id: 'ortb-auction-deal-priority',
          prompt: 'In an auction where both a PMP deal bid ($3.00 CPM) and an open auction bid ($5.00 CPM) compete, which wins?',
          choices: [
            { label: 'Deal type determines priority — PG/preferred win outright; PMP competes', correct: true },
            { label: 'The open auction bid always wins — highest price wins' },
            { label: 'The deal bid always wins — deals have guaranteed priority' },
            { label: 'Separate auctions claim — exchange runs a unified deal-priority auction' },
          ],
          explain:
            'Deal hierarchy: Programmatic Guaranteed > Preferred Deal (fixed-price, first-look) > Private Marketplace (PMP spot auction competing with open). A PMP spot auction deal at $3.00 competes in the same open auction and loses to $5.00. A Preferred Deal at $3.00 wins against a $5.00 open bid because the buyer has paid for first-look access. Programmatic Guaranteed is pre-sold at a fixed CPM and bypasses auction entirely.',
        },
      ],
      design: {
        prompt:
          'Your exchange processes 1 million auctions per second. Describe the data path from receiving a BidRequest to returning the winning markup to the SSP, including how you handle auction results for billing reconciliation.',
        answer:
          '1. Receive BidRequest from SSP via HTTP POST; validate and enrich (5 ms).\n2. DSP selection: score 50 registered DSPs, select top 5–10 for this impression (O(N) from in-process cache).\n3. Fan-out: POST BidRequest to selected DSPs with per-DSP deadline (tmax - 10ms).\n4. Collect bids in buffered channel; at deadline, close collection.\n5. Auction: filter eligible bids (price ≥ floor), sort, select winner, compute clearing price (O(N log N), N ≈ 10).\n6. Return winning markup (adm) to SSP in JSON BidResponse.\n7. In background goroutine: call winner\'s nurl with \${AUCTION_PRICE}; call losers\' lurl (optional).\n8. Write result to ring buffer; background worker batches to Kafka (win + bids + clearing price) for billing reconciliation.\n9. Billing: on burl call from exchange renderer, record spend event; reconcile daily with DSP-side counts.',
      },
      keyPoints: [
        'Filter bids below floor before sorting — floor enforcement is a hard constraint.',
        'First-price: clearing = winner\'s bid. Second-price: clearing = max(floor, second-highest bid).',
        'Tie-breaking should be random to prevent gaming.',
        'Deal priority: Programmatic Guaranteed > Preferred Deal > PMP > Open Auction.',
        'Fire nurl (win) and lurl (loss) in background goroutines — never block the SSP response on these.',
      ],
    },
    {
      id: 'ortb-exchange-floors',
      title: 'Floor Prices, Deals & Private Marketplace',
      difficulty: 'Medium',
      tags: ['floor', 'PMP', 'deals', 'preferred-deal', 'programmatic-guaranteed', 'bidfloor'],
      summary: 'Publisher floor pricing, PMP deal types, and how deals are modelled in OpenRTB.',
      pattern: 'Floor + deal hierarchy',
      visual:
        'Imp.bidfloor = open auction floor. Imp.pmp.deals[].bidfloor = per-deal floor. Deal types: preferred (guaranteed first-look), PMP spot (compete + floor), programmatic guaranteed (pre-sold).',
      memorize:
        'Open floor = Imp.bidfloor. Deal floor = deal.bidfloor (usually higher). Deal types: PG=pre-sold, PD=first-look, PMP=compete. DealID in Bid flags the winning deal. private_auction=1 blocks open bids.',
      scene:
        'A venue\'s ticket pricing: floor is the minimum ticket price. Deals are corporate packages: PG = season pass (you got it before the show); preferred deal = early-access invite before box office opens; PMP = you bid at a special section with higher reserve, but others can bid too.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// Deal types (inferred from usage; ORTB doesn't have a formal "type" field but
// convention distinguishes by at=4 (fixed price) or at=1/2 plus wseat).
const (
	DealTypePG        = "programmatic_guaranteed" // at=4, fixed CPM, guaranteed impressions
	DealTypePreferred = "preferred_deal"           // first-look, fixed CPM, non-guaranteed
	DealTypePMP       = "pmp"                      // spot auction with private floor + wseat
)

type Deal struct {
	ID          string   \`json:"id"\`
	BidFloor    float64  \`json:"bidfloor,omitempty"\`
	BidFloorCur string   \`json:"bidfloorcur,omitempty"\`
	AT          int      \`json:"at,omitempty"\`    // 1=FP, 2=SP, 4=fixed-price
	WSeat       []string \`json:"wseat,omitempty"\` // eligible buyer seats for this deal
	WADomains   []string \`json:"wadomain,omitempty"\`
}

type PMP struct {
	PrivateAuction int    \`json:"private_auction,omitempty"\` // 1 = deal-only auction
	Deals          []Deal \`json:"deals,omitempty"\`
}

type Impression struct {
	ID           string  \`json:"id"\`
	BidFloor     float64 \`json:"bidfloor,omitempty"\`
	BidFloorCur  string  \`json:"bidfloorcur,omitempty"\`
	PMP          *PMP    \`json:"pmp,omitempty"\`
}

// selectDeal returns the deal the bid should reference, or "" for open auction.
func selectDeal(imp Impression, buyerSeat string, bidCPM float64) string {
	if imp.PMP == nil {
		return "" // no deals on this impression
	}
	for _, d := range imp.PMP.Deals {
		// Check seat eligibility.
		eligible := len(d.WSeat) == 0
		for _, s := range d.WSeat {
			if s == buyerSeat {
				eligible = true
				break
			}
		}
		if !eligible {
			continue
		}
		// Check deal floor.
		if d.BidFloor > 0 && bidCPM < d.BidFloor {
			continue
		}
		return d.ID // return first matching deal
	}
	// Check if open auction is allowed.
	if imp.PMP.PrivateAuction == 1 {
		return "" // no deal matched and open auction not allowed
	}
	return "" // open auction
}

func main() {
	imp := Impression{
		ID:          "imp-1",
		BidFloor:    1.00,
		BidFloorCur: "USD",
		PMP: &PMP{
			PrivateAuction: 0, // open auction allowed alongside deals
			Deals: []Deal{
				{
					ID:       "deal-vip",
					BidFloor: 5.00,
					AT:       1, // first-price
					WSeat:    []string{"seat-abc", "seat-xyz"},
				},
				{
					ID:       "deal-general",
					BidFloor: 3.00,
					AT:       2, // second-price
					WSeat:    []string{}, // any seat
				},
			},
		},
	}

	scenarios := []struct {
		seat string
		cpm  float64
	}{
		{"seat-abc", 6.00},  // eligible for VIP deal
		{"seat-other", 3.50}, // eligible for general deal
		{"seat-other", 2.00}, // below all deal floors, falls to open auction
	}

	for _, s := range scenarios {
		deal := selectDeal(imp, s.seat, s.cpm)
		if deal == "" {
			fmt.Printf("seat=%s cpm=%.2f → open auction\\n", s.seat, s.cpm)
		} else {
			fmt.Printf("seat=%s cpm=%.2f → deal: %s\\n", s.seat, s.cpm, deal)
		}
	}

	b, _ := json.MarshalIndent(imp.PMP, "", "  ")
	fmt.Println("\\nPMP object:", string(b))
}
`,
      quiz: [
        {
          id: 'ortb-floor-bidfloorcur',
          prompt: 'The Imp.bidfloorcur field is set to "EUR" and bidfloor is 2.00. A DSP bids 2.50 in USD. What should the exchange do?',
          choices: [
            { label: 'FX conversion — convert DSP bid to floor currency before comparison', correct: true },
            { label: 'Accept the bid — 2.50 > 2.00 regardless of currency' },
            { label: 'Reject the bid — currency mismatch is always a hard rejection' },
            { label: 'Static rate claim — real-time FX rates should be used, not static' },
          ],
          explain:
            'When bidfloorcur differs from the BidResponse.cur, the exchange must normalize to a common currency before floor comparison. Most exchanges use real-time FX rates cached from a financial data source. DSPs should match their bid currency to the bidfloorcur to avoid ambiguity, or rely on the exchange to advertise the floor in the same currency they bid in.',
        },
        {
          id: 'ortb-pmp-dealid-bid',
          prompt: 'A DSP\'s Bid includes a dealid that does not match any deal in Imp.pmp.deals. The exchange should:',
          choices: [
            { label: 'Reject invalid deal — dealid must match a valid BidRequest deal', correct: true },
            { label: 'Accept DSP price claim — exchange validates dealid against BidRequest' },
            { label: 'Open auction claim — unknown dealid bids must be rejected or demoted' },
            { label: 'Dynamic deal claim — exchanges don\'t create deals on the fly' },
          ],
          explain:
            'A dealid in a Bid must reference an existing deal in the corresponding Imp.pmp.deals array. A dealid that doesn\'t match is likely a DSP bug (stale deal ID, wrong impression). Exchanges should reject or flag such bids to protect deal integrity. Treating it as an open auction bid would violate the deal contract with the publisher.',
        },
        {
          id: 'ortb-floor-dynamic',
          prompt: 'Dynamic floors set by SSPs per-auction (different from static publisher floors) primarily benefit:',
          choices: [
            { label: 'Publishers benefit — floors adjust to demand, capturing higher revenue', correct: true },
            { label: 'DSPs — dynamic floors give predictable CPMs for campaign planning' },
            { label: 'Exchanges — dynamic floors reduce the number of invalid bids to process' },
            { label: 'Advertisers — dynamic floors ensure creatives always pass brand safety' },
          ],
          explain:
            'Dynamic floors (also called "optimised floors" or "price floors optimization") are SSP/exchange-generated floors that adjust per-auction based on predicted demand, user data, contextual signals, and historical prices. When demand is high (prime news event, sport), the floor rises to capture more revenue for the publisher. When demand is low, floors stay at the base to maintain fill rate.',
        },
      ],
      design: {
        prompt:
          'A publisher wants to offer their premium inventory via three deal types simultaneously: Programmatic Guaranteed (100k impressions/day for Advertiser A), Preferred Deal (first-look for Advertiser B), and PMP for a select buyer group. How do you model this in OpenRTB and enforce priority?',
        answer:
          'Model: create one Deal entry per agreement in Imp.pmp.deals, differentiated by AT and WSeat:\n- PG deal: at=4 (fixed price), wseat=[seat-A], bidfloor=agreed_CPM. Exchange pre-allocates 100k imps from inventory reservation system. When this impression is served, check reservation first — if the PG campaign has remaining quota, bypass auction and return PG creative directly.\n- Preferred deal: at=1 or at=2, wseat=[seat-B], bidfloor=preferred_CPM. Exchange gives seat-B a "first look" by sending BidRequest before open auction; if seat-B bids above preferred floor, they win. Only if they pass does the impression go to open auction.\n- PMP: at=1 or at=2, wseat=[seat-C, seat-D, ...], bidfloor=pmp_floor. These seats compete in a private auction with a higher floor.\nPriority order enforced by exchange: PG reservation → Preferred Deal → PMP spot → Open Auction.',
      },
      keyPoints: [
        'bidfloor + bidfloorcur define the minimum acceptable CPM in specified currency.',
        'Deal types: Programmatic Guaranteed (pre-sold, at=4), Preferred (first-look), PMP spot (auction with floor + whitelist).',
        'private_auction=1 means only deal-eligible bids accepted; open auction bids rejected.',
        'Bid.dealid must reference a valid deal from Imp.pmp.deals; mismatches are rejected.',
        'Dynamic floors (SSP-set per-auction) increase publisher yield at peak demand.',
      ],
    },
  ],
};
