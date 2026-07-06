import type { GoTopic } from '../go-course/types';

// OpenRTB course — Module 1: Ad Tech Foundations
export const adTechFoundations: GoTopic = {
  id: 'ad-tech-foundations',
  title: 'Ad Tech Foundations',
  icon: 'Layers',
  concepts: [
    {
      id: 'ortb-foundations-ecosystem',
      title: 'Programmatic Ad Tech Ecosystem',
      difficulty: 'Easy',
      tags: ['ad-tech', 'DSP', 'SSP', 'exchange', 'RTB', 'programmatic'],
      summary: 'Publishers, SSPs, ad exchanges, DSPs, bidders, and advertisers — how they interconnect.',
      pattern: 'Ecosystem roles',
      visual:
        'Publisher → SSP → Exchange ← DSP ← Bidder ← Advertiser; exchange runs auction, winner serves ad.',
      memorize:
        'PubSSP-Exchange-DSPBidAdv: publisher sells slots via SSP; exchange is the marketplace; DSP buys on behalf of advertiser; bidder is the decision engine inside DSP.',
      scene:
        'A busy stock market floor — the publisher is a stall owner, the SSP is their broker, the exchange is the trading floor, the DSP is a fund manager, and the bidder is the quant algorithm pressing the button.',
      time: 'O(N·DSPs) per auction',
      space: 'O(N·DSPs) in-flight',
      code: `package main

import "fmt"

// Minimal domain types mirroring a programmatic ad stack.

type Publisher struct{ ID, Domain string }
type Advertiser struct{ ID, Name string }

// SSP (Supply-Side Platform) manages publisher inventory.
type SSP struct {
	Publisher Publisher
	FloorCPM  float64 // publisher-set minimum price in USD CPM
}

// AdExchange orchestrates the auction between SSP and registered DSPs.
type AdExchange struct {
	SSPs []SSP
	DSPs []DSP
}

// DSP (Demand-Side Platform) bids on behalf of advertisers.
type DSP struct {
	ID          string
	Advertiser  Advertiser
	MaxBidCPM   float64
}

// Bid represents a single DSP bid for an impression.
type Bid struct {
	DSPID string
	CPM   float64
}

// RunAuction returns the winning bid or nil when no bid clears the floor.
func (ex *AdExchange) RunAuction(floor float64, bids []Bid) *Bid {
	var winner *Bid
	for i := range bids {
		b := &bids[i]
		if b.CPM < floor {
			continue
		}
		if winner == nil || b.CPM > winner.CPM {
			winner = b
		}
	}
	return winner
}

func main() {
	ex := AdExchange{
		DSPs: []DSP{
			{ID: "dsp-a", Advertiser: Advertiser{ID: "adv-1", Name: "Nike"}, MaxBidCPM: 3.50},
			{ID: "dsp-b", Advertiser: Advertiser{ID: "adv-2", Name: "Adidas"}, MaxBidCPM: 2.80},
		},
	}

	bids := []Bid{
		{DSPID: "dsp-a", CPM: 3.50},
		{DSPID: "dsp-b", CPM: 2.80},
	}

	winner := ex.RunAuction(1.00, bids)
	if winner != nil {
		fmt.Printf("Winner: %s at $%.2f CPM\\n", winner.DSPID, winner.CPM)
	} else {
		fmt.Println("No bids cleared the floor")
	}
}
`,
      quiz: [
        {
          id: 'ortb-ecosystem-ssp-role',
          prompt:
            'Which entity in the programmatic stack is responsible for packaging publisher inventory and setting floor prices before forwarding bid requests to the exchange?',
          choices: [
            { label: 'SSP — sell-side broker packaging publisher inventory and floors', correct: true },
            { label: 'DSP — demand-side buyer bidding for advertiser campaigns' },
            { label: 'Ad Exchange — neutral marketplace running auctions among DSPs' },
            { label: 'DMP — audience data warehouse; not an auction participant' },
          ],
          explain:
            'The SSP is the sell-side broker: it connects publisher ad slots to exchanges (and sometimes directly to DSPs), enforces floor prices, manages brand safety rules, and maximises publisher yield. The exchange sits downstream of the SSP and runs the actual auction among multiple DSPs.',
        },
        {
          id: 'ortb-ecosystem-header-bidding',
          prompt:
            'Header bidding differs from waterfall mediation primarily because:',
          choices: [
            {
              label: 'Parallel bidding — all demand sources compete in one unified auction',
              correct: true,
            },
            { label: 'Single DSP invited — incorrect; many DSPs bid concurrently' },
            { label: 'Fixed-price offer — publisher names price; demand sources accept or not' },
            { label: 'No JS wrapper claim — header bidding also uses a client-side JS wrapper' },
          ],
          explain:
            'Waterfall mediation tries demand sources one at a time in priority order, missing revenue if a lower-tier buyer would outbid a higher-tier one. Header bidding invites all connected buyers simultaneously via a JS wrapper (or server-side equivalent), then passes the highest bid to the ad server alongside direct deals, maximising yield.',
        },
        {
          id: 'ortb-ecosystem-bidder-vs-dsp',
          prompt: 'Which statement best describes the relationship between a bidder and a DSP?',
          choices: [
            { label: 'Bidder = decision engine — evaluates imps, returns bid prices for DSP', correct: true },
            { label: 'Synonyms claim — bidder and DSP are separate; bidder is one component' },
            { label: 'Exchange-side claim — the bidder lives inside the DSP, not the exchange' },
            { label: 'Third-party claim — bidders are built in-house by the DSP' },
          ],
          explain:
            'A DSP is the full platform: campaign management, audience targeting, budget management, reporting, and the bidder. The bidder specifically is the hot-path service that receives a BidRequest from an exchange, evaluates it against active campaigns, and returns a BidResponse in under 100 ms. Large DSPs may have many bidder pods behind a load balancer.',
        },
      ],
      design: {
        prompt:
          'You are asked to build the core of a minimal DSP. What are the five layers and their responsibilities?',
        answer:
          '1. Bidder layer — HTTP endpoint receiving OpenRTB BidRequests, making bid decisions in < 100 ms, returning BidResponse.\n2. Campaign management layer — stores campaign rules: targeting criteria, creative IDs, flight dates, budgets.\n3. Audience/data layer — user segment membership lookups (cookie/device ID → segments) used during bid evaluation.\n4. Pacing / budget layer — token-bucket or redis-based spend controls to avoid over-delivery.\n5. Reporting / analytics layer — aggregates win/impression/click events for billing and optimisation.',
      },
      keyPoints: [
        'Publisher monetises via SSP; advertiser buys via DSP; exchange is the neutral marketplace running the auction.',
        'Header bidding replaced waterfall to maximise publisher yield by parallelising demand.',
        'A bidder is the hot-path compute unit inside a DSP — it must respond within the exchange timeout (often 80–150 ms).',
        'ads.txt (publisher-side) and sellers.json (exchange-side) prevent domain spoofing and unauthorised reselling.',
        'CPM = cost per mille (cost per 1,000 impressions). The exchange works in CPM; DSPs bid CPM.',
      ],
    },
    {
      id: 'ortb-foundations-rtb-flow',
      title: 'The RTB Request-Response Flow',
      difficulty: 'Easy',
      tags: ['RTB', 'bid-request', 'bid-response', 'latency', 'OpenRTB'],
      summary: 'Step-by-step journey from page load to impression served, with sub-100 ms timing.',
      pattern: 'RTB pipeline',
      visual:
        'Browser loads page → ad tag fires → SSP builds BidRequest → exchange fans out → DSPs bid → winner picked → ad markup returned → creative rendered.',
      memorize:
        'Load → Tag → BidReq → FanOut(DSPs) → Bids → Auction → Win/BillNotice → Markup → Render. tmax caps DSP deadline; exchange enforces it.',
      scene:
        'A relay race: the publisher passes the baton (BidRequest) to the exchange, which splits into N lanes (DSPs). The first DSP to finish AND beat the floor wins; the exchange passes the baton to the creative renderer.',
      time: 'O(1) wall-clock, bounded by tmax (typically 80–120 ms)',
      space: 'O(N·DSPs) in-flight goroutines',
      code: `package main

import (
	"context"
	"fmt"
	"time"
)

// Simplified RTB flow timer showing key milestones within the 100 ms budget.

type Milestone struct {
	Name    string
	Elapsed time.Duration
}

func simulateRTBFlow(ctx context.Context) []Milestone {
	start := time.Now()
	var ms []Milestone

	record := func(name string) {
		ms = append(ms, Milestone{Name: name, Elapsed: time.Since(start)})
	}

	record("page load / ad tag fires")

	// SSP assembles and forwards BidRequest
	time.Sleep(3 * time.Millisecond)
	record("SSP builds & sends BidRequest")

	// Exchange routes to DSPs (in practice concurrent; serialised here for demo)
	time.Sleep(5 * time.Millisecond)
	record("Exchange fans out to DSPs")

	// DSP targeting + bid decision
	time.Sleep(40 * time.Millisecond)
	record("DSP bid decisions received")

	// Auction + winner selection
	time.Sleep(2 * time.Millisecond)
	record("Exchange picks winner")

	// Win notice fires asynchronously; markup returned to SSP
	time.Sleep(2 * time.Millisecond)
	record("Markup returned to SSP / browser")

	// Browser fetches creative and renders
	time.Sleep(20 * time.Millisecond)
	record("Creative rendered")

	return ms
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Millisecond)
	defer cancel()

	milestones := simulateRTBFlow(ctx)
	for _, m := range milestones {
		fmt.Printf("%6.1f ms  %s\\n", float64(m.Elapsed.Microseconds())/1000, m.Name)
	}
}
`,
      quiz: [
        {
          id: 'ortb-flow-tmax',
          prompt:
            'The tmax field in a BidRequest specifies:',
          choices: [
            { label: 'tmax — max milliseconds the exchange waits for DSP bids', correct: true },
            { label: 'Ad duration claim — tmax is max video length in seconds per ad' },
            { label: 'Browser timeout claim — tmax limits creative loading in the browser' },
            { label: 'Retry count claim — tmax counts SSP retries before no-billing' },
          ],
          explain:
            'tmax is an integer millisecond budget communicated from the exchange to the DSP. Bids arriving after tmax are discarded. A missing tmax means the exchange uses its own platform default. DSPs commonly target 50–80 ms internally to leave headroom for network RTT.',
        },
        {
          id: 'ortb-flow-nurl-timing',
          prompt:
            'When should the exchange fire the nurl (win notice URL) to the winning DSP?',
          choices: [
            { label: 'At auction time — fires as soon as winner is selected, before markup', correct: true },
            { label: 'After render claim — nurl fires only when browser displays creative' },
            { label: 'On click claim — nurl fires when the user clicks the ad unit' },
            { label: 'Billing period claim — nurl fires at end of each billing cycle' },
          ],
          explain:
            'The nurl is fired by the exchange to the winning bidder as soon as the auction result is known, in order to notify the DSP it won. This is separate from the burl (billing notice), which fires when an actual billing event is detected (e.g. impression rendered past a viewability threshold). Some exchanges call nurl and return markup in the same moment; others use burl for financial settlement.',
        },
        {
          id: 'ortb-flow-who-calls-pixel',
          prompt:
            'An impression-tracking pixel in the creative markup is called by:',
          choices: [
            { label: "End-user browser — fires impression pixel on creative render", correct: true },
            { label: 'Exchange server — fires pixel at end of the auction server-side' },
            { label: 'SSP server — fires pixel after returning markup to publisher' },
            { label: 'Bidder server — fires pixel after sending its BidResponse' },
          ],
          explain:
            'Impression pixels are HTML image tags or beacons embedded in the ad markup. The browser fires them (via HTTP GET to the tracking URL) when it renders the creative. This is why impression counts logged by the DSP\'s tracking server and the exchange\'s nurl-based counts can differ — browser rendering is client-side and best-effort.',
        },
      ],
      design: {
        prompt:
          'You have a 100 ms end-to-end SLA for your RTB stack. Break it down into time budgets for each component, and explain how you would enforce them.',
        answer:
          'Typical breakdown: ~3 ms SSP assembly + routing, ~5 ms exchange ingestion + fan-out, ~60 ms DSP bid window (tmax), ~2 ms auction + winner selection, ~5 ms markup return, ~25 ms browser creative fetch.\n\nEnforcement: set tmax=80 on BidRequests leaving the exchange to leave headroom for network; use context.WithDeadline in Go so all goroutines spawned for DSP calls are cancelled at the wall-clock cutoff; never block the hot path on DB writes (write-behind to Kafka); co-locate in-process caches for targeting data.',
      },
      keyPoints: [
        'The full RTB flow from ad tag to rendered creative must complete within ~100 ms; DSP decision window is typically 60–80 ms.',
        'tmax in the BidRequest tells the DSP the exchange\'s deadline in milliseconds; late bids are silently ignored.',
        'nurl (win notice) fires server-to-server at auction time; impression pixels fire browser-side at render time — counts can diverge.',
        'Exchange fans out BidRequests to multiple DSPs concurrently; Go goroutines are the natural fit.',
        'Losing DSPs receive HTTP 204 (no markup) or a loss notification via lurl if enabled.',
      ],
    },
    {
      id: 'ortb-foundations-auction-types',
      title: 'First-Price vs Second-Price Auctions',
      difficulty: 'Medium',
      tags: ['auction', 'first-price', 'second-price', 'clearing-price', 'programmatic'],
      summary: 'Vickrey second-price vs first-price mechanics and why the industry shifted.',
      pattern: 'Auction mechanics',
      visual:
        'Second-price: winner pays second-highest bid + ε (truthful bidding is dominant). First-price: winner pays their own bid (strategic shading required).',
      memorize:
        'SP = pay #2 (honest best). FP = pay your bid (shade down). Industry moved to FP ~2019. Use bid shading algorithms to adjust FP bids toward predicted clearing price.',
      scene:
        'Second-price: you bid $5 for a painting, rival bids $3 — you win and pay $3.01. First-price: same bids, but you pay $5. Smart bidders in first-price shade to $3.50 based on historical data.',
      time: 'O(N) to find winner and second-highest',
      space: 'O(1)',
      code: `package main

import (
	"fmt"
	"sort"
)

type Bid struct {
	BuyerID string
	CPM     float64
}

// FirstPriceAuction: winner pays their own bid (if above floor).
// Returns winning bid or nil.
func FirstPriceAuction(bids []Bid, floor float64) *Bid {
	var winner *Bid
	for i := range bids {
		b := &bids[i]
		if b.CPM < floor {
			continue
		}
		if winner == nil || b.CPM > winner.CPM {
			winner = b
		}
	}
	return winner
}

// SecondPriceAuction: winner pays max(second-highest bid, floor).
// Returns winner and clearing price.
func SecondPriceAuction(bids []Bid, floor float64) (*Bid, float64) {
	eligible := make([]Bid, 0, len(bids))
	for _, b := range bids {
		if b.CPM >= floor {
			eligible = append(eligible, b)
		}
	}
	if len(eligible) == 0 {
		return nil, 0
	}
	sort.Slice(eligible, func(i, j int) bool {
		return eligible[i].CPM > eligible[j].CPM
	})
	winner := &eligible[0]
	clearingPrice := floor
	if len(eligible) > 1 {
		clearingPrice = eligible[1].CPM
	}
	return winner, clearingPrice
}

func main() {
	bids := []Bid{
		{BuyerID: "dsp-a", CPM: 3.50},
		{BuyerID: "dsp-b", CPM: 2.80},
		{BuyerID: "dsp-c", CPM: 1.20},
	}
	floor := 1.00

	// First-price
	w1 := FirstPriceAuction(bids, floor)
	fmt.Printf("First-price  winner=%s  pays=$%.2f\\n", w1.BuyerID, w1.CPM)

	// Second-price
	w2, clearing := SecondPriceAuction(bids, floor)
	fmt.Printf("Second-price winner=%s  pays=$%.2f (bid=$%.2f)\\n",
		w2.BuyerID, clearing, w2.CPM)
}
`,
      quiz: [
        {
          id: 'ortb-auction-dominant-strategy',
          prompt:
            'In a second-price sealed-bid (Vickrey) auction, the dominant strategy is:',
          choices: [
            { label: 'Bid true value — you pay at most the second-highest bid anyway', correct: true },
            { label: 'Bid shading — shade below true value to cut the clearing price' },
            { label: 'Overbid strategy — bid above true value to beat rival buyers' },
            { label: 'Floor strategy — bid exactly floor price to minimise CPM spend' },
          ],
          explain:
            'In second-price auctions, bidding your true value is a dominant strategy: if you overbid you still pay the same clearing price, and if you underbid you may lose an impression you would have profitably won. This "truthfulness" property made second-price attractive theoretically, but in practice large buyers learned to shade even in second-price auctions.',
        },
        {
          id: 'ortb-auction-industry-shift',
          prompt:
            'Why did major exchanges (Google, AppNexus, Index Exchange) shift from second-price to first-price auctions around 2017–2019?',
          choices: [
            {
              label: 'Header bidding — multi-exchange pressure made SP clearing unpredictable',
              correct: true,
            },
            { label: 'IAB mandate claim — IAB did not mandate FP auctions in OpenRTB 2.5' },
            { label: 'Compute cost claim — second-price math is not too expensive at scale' },
            { label: 'Revenue claim — first-price does not always guarantee higher pub revenue' },
          ],
          explain:
            'With header bidding, the same impression entered multiple exchanges simultaneously; buyers had already mastered bid shading (paying less than their bid) making second-price a fiction. Exchanges moved to first-price for transparency and to align incentives: buyers pay what they bid, forcing the bid to reflect true value. Publishers benefited from higher clearing prices.',
        },
        {
          id: 'ortb-auction-at-field',
          prompt: 'In a BidRequest, the "at" field value of 1 means:',
          choices: [
            { label: 'at=1 — first-price auction; winner pays their submitted bid', correct: true },
            { label: 'at=2 — second-price auction; winner pays second-highest bid' },
            { label: 'at=3 — fixed-price deal at negotiated rate' },
            { label: 'at=4 — programmatic guaranteed at pre-negotiated price' },
          ],
          explain:
            'The OpenRTB spec defines "at" (auction type): 1 = first-price, 2 = second-price (default). Exchanges today almost universally use at=1 for open-auction inventory. Private marketplace deals may still use at=2 or negotiate clearing price separately.',
        },
      ],
      design: {
        prompt:
          'Your DSP sees first-price auctions with no clearing price feedback. How would you implement bid shading to maximise win rate without overpaying?',
        answer:
          'Bid shading predicts the clearing price and adjusts the bid toward it. Approach: (1) log (bid, won, clearing_price) tuples per exchange/publisher/geo/format bucket; (2) train a model (gradient boosting or isotonic regression) to predict P(win | bid, features) and E[clearing_price | win]; (3) optimise bid = max CPM such that ROI > threshold: solve argmax[value - clearing_price * P(win)] where clearing_price is predicted; (4) A/B test shaded vs full bids to validate lift in spend efficiency; (5) re-train on a rolling window (1–7 days) to handle market changes.',
      },
      keyPoints: [
        'First-price (at=1): winner pays their bid; strategic bid shading is necessary.',
        'Second-price (at=2): winner pays max(floor, second-highest bid); truthful bidding is dominant.',
        'Industry moved to first-price ~2019 driven by header bidding and bid-shading prevalence.',
        'Clearing price is exposed to the DSP via the ${AUCTION_PRICE} macro in nurl/burl.',
        'ORTB 2.4+ added the "at" field; most modern exchanges set at=1.',
      ],
    },
    {
      id: 'ortb-foundations-supply-chain',
      title: 'ads.txt, sellers.json & SupplyChain Object',
      difficulty: 'Medium',
      tags: ['ads.txt', 'sellers.json', 'schain', 'supply-chain', 'IVT', 'fraud'],
      summary: 'IAB standards for authorised reseller disclosure and supply path transparency.',
      pattern: 'Supply chain transparency',
      visual:
        'ads.txt lists authorised sellers for a domain; sellers.json identifies each seller; schain embeds the reseller hops in the BidRequest so buyers can audit the path.',
      memorize:
        'ads.txt (publisher file) → who can sell my inventory. sellers.json (exchange/SSP file) → who are my sellers. schain (BidRequest field) → the ordered list of hops from publisher to current exchange.',
      scene:
        'A certified organic food label: ads.txt is the farm\'s certificate of which retailers can stock the food; sellers.json is the retailer\'s directory of certified farms; schain is the trip ticket listing every hand the food passed through.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// SupplyChain (schain) object embedded in a BidRequest.source.schain.
// Each node represents one hop in the supply path (publisher → SSP → exchange).

type SChainNode struct {
	ASI    string  \`json:"asi"\`              // domain of the system (e.g. "pubmatic.com")
	SID    string  \`json:"sid"\`              // seller's account ID in the upstream system
	RID    string  \`json:"rid,omitempty"\`    // request ID — allows log correlation
	Name   string  \`json:"name,omitempty"\`
	Domain string  \`json:"domain,omitempty"\`
	HP     int     \`json:"hp"\`              // is this a direct buyer relationship? 1=yes
}

type SChain struct {
	Complete int          \`json:"complete"\` // 1 = full unbroken chain provided
	Nodes    []SChainNode \`json:"nodes"\`
	Ver      string       \`json:"ver"\` // spec version, e.g. "1.0"
}

func main() {
	// A supply chain with two hops:
	// publisher sells via PubMatic, PubMatic routes through AppNexus.
	chain := SChain{
		Complete: 1,
		Ver:      "1.0",
		Nodes: []SChainNode{
			{ASI: "pubmatic.com", SID: "pub-123", HP: 1, Name: "Publisher Co"},
			{ASI: "appnexus.com", SID: "apn-456", HP: 1},
		},
	}

	b, _ := json.MarshalIndent(chain, "", "  ")
	fmt.Println(string(b))

	// Validate: a complete chain must have at least one node with HP=1 (direct).
	direct := 0
	for _, n := range chain.Nodes {
		if n.HP == 1 {
			direct++
		}
	}
	fmt.Printf("\\nchain complete=%d  nodes=%d  direct-relationships=%d\\n",
		chain.Complete, len(chain.Nodes), direct)
}
`,
      quiz: [
        {
          id: 'ortb-adstxt-purpose',
          prompt: 'What does an ads.txt file published at a domain root (e.g. publisher.com/ads.txt) tell buyers?',
          choices: [
            { label: 'Authorised sellers — ad systems approved to sell publisher inventory', correct: true },
            { label: 'Advertiser blocklist — ads.txt does not list blocked advertisers' },
            { label: 'CPM floor claim — ads.txt does not encode price floors for formats' },
            { label: 'Privacy policy claim — ads.txt covers authorised sellers, not privacy' },
          ],
          explain:
            'ads.txt (Authorised Digital Sellers) is a plain-text file on the publisher\'s domain. Each line declares a supply chain entity (ASI domain, publisher account ID, and relationship: DIRECT or RESELLER) authorised to sell inventory on that domain. DSPs and buyers check ads.txt to verify they aren\'t buying spoofed or unauthorised inventory.',
        },
        {
          id: 'ortb-schain-complete',
          prompt:
            'A BidRequest arrives with schain.complete = 0. What should a cautious buyer do?',
          choices: [
            { label: 'Incomplete path — some hops undeclared; apply stricter price scrutiny', correct: true },
            { label: 'Reject the bid request entirely — complete=0 is always fraud' },
            { label: 'Skip schain claim — flags supply quality and trust, not merely optional' },
            { label: 'Set bid price to floor — complete=0 implies a guaranteed deal' },
          ],
          explain:
            'complete=1 means every intermediary in the supply chain declared itself. complete=0 means one or more hops are missing. This is not necessarily fraud (legacy SSPs may not support schain), but cautious buyers should de-prioritise such inventory, avoid premium CPMs, and apply additional verification steps.',
        },
        {
          id: 'ortb-sellersjson-vs-adstxt',
          prompt: 'How does sellers.json complement ads.txt?',
          choices: [
            {
              label: 'Publisher + exchange pair — bilateral verification of authorised sellers',
              correct: true,
            },
            { label: 'Supersedes claim — ads.txt is not deprecated in any OpenRTB spec' },
            { label: 'Both-publisher claim — sellers.json is published by the exchange' },
            { label: 'Roles swapped claim — sellers.json maps sellers; ads.txt authorises them' },
          ],
          explain:
            'ads.txt is on the publisher\'s server and says "exchange X has seller account Y for my domain." sellers.json is on the exchange\'s server and says "seller account Y corresponds to this known company." Buyers can cross-reference both to confirm that the entity claiming to sell publisher.com inventory matches the exchange\'s registered seller for that publisher.',
        },
      ],
      design: {
        prompt:
          'You are building an exchange and want to validate that every BidRequest you forward to DSPs represents legitimate, non-spoofed inventory. What supply chain validation steps would you implement?',
        answer:
          '1. Fetch and cache publisher ads.txt files (daily TTL). Reject requests where the SSP account+domain pair is not listed.\n2. Validate sellers.json from SSP domains to confirm the seller account IDs match registered companies.\n3. Enforce schain: require complete=1 for premium inventory tiers; log and flag complete=0 for review.\n4. Cross-check schain nodes against known ASI domains in your sellers registry.\n5. Apply IVT (Invalid Traffic) filtering via a fraud sidecar (e.g. Protected Audience API, DoubleVerify pre-bid).\n6. Log every supply path for post-campaign auditing and feedback to SSP partners.',
      },
      keyPoints: [
        'ads.txt is a publisher-side file listing authorised digital sellers for the domain.',
        'sellers.json is an exchange/SSP-side file mapping seller account IDs to company identities.',
        'schain (SupplyChain object) in BidRequest.source embeds the full ordered chain of intermediaries.',
        'complete=1 means all hops declared; complete=0 means the chain may be partial (buyer beware).',
        'Supply chain transparency is the primary defence against domain spoofing and unauthorised reselling.',
      ],
    },
  ],
};
