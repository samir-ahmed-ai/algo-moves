import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 3: BidResponse & Auction Settlement
export const bidResponse: GoTopic = {
  id: 'bid-response',
  title: 'BidResponse & Settlement',
  icon: 'ArrowLeft',
  concepts: [
    {
      id: 'ortb-bid-response-object',
      title: 'BidResponse & SeatBid Objects',
      difficulty: 'Easy',
      tags: ['BidResponse', 'SeatBid', 'OpenRTB', 'nbr', 'cur'],
      summary: 'Top-level BidResponse and the SeatBid grouping of bids by buyer seat.',
      pattern: 'BidResponse hierarchy',
      visual:
        'BidResponse{id, seatbid[], cur, nbr} → SeatBid{bid[], seat, group} → Bid{id, impid, price, adm, ...}.',
      memorize:
        'BidResponse wraps SeatBid[] (one per buyer seat); each SeatBid wraps Bid[]. nbr = no-bid reason (skip seatbid entirely for no-bid, return HTTP 204).',
      scene:
        'An auction house: BidResponse is the sealed-bid envelope; SeatBid is the section for one bidding firm; Bid is each individual lot offer from that firm.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// OpenRTB 2.6 BidResponse hierarchy.

type BidResponse struct {
	ID      string    \`json:"id"\`                // mirrors BidRequest.id
	SeatBid []SeatBid \`json:"seatbid,omitempty"\`
	BidID   string    \`json:"bidid,omitempty"\`   // bidder-generated ID for this response
	Cur     string    \`json:"cur,omitempty"\`     // currency for all bid prices (default "USD")
	CustomData string \`json:"customdata,omitempty"\` // opaque; exchange stores and returns
	NBR     *int      \`json:"nbr,omitempty"\`     // no-bid reason when returning empty seatbid
}

type SeatBid struct {
	Bid   []Bid  \`json:"bid"\`
	Seat  string \`json:"seat,omitempty"\`  // buyer seat / account ID
	Group int    \`json:"group,omitempty"\` // 1 = all bids in this seatbid must win or none win
}

type Bid struct {
	ID       string  \`json:"id"\`
	ImpID    string  \`json:"impid"\`           // must match an imp.id from the BidRequest
	Price    float64 \`json:"price"\`           // CPM in response currency
	AdID     string  \`json:"adid,omitempty"\`
	NURL     string  \`json:"nurl,omitempty"\`  // win notice URL
	BURL     string  \`json:"burl,omitempty"\`  // billing notice URL
	AdM      string  \`json:"adm,omitempty"\`   // ad markup (HTML, VAST, native JSON)
	ADomain  []string \`json:"adomain,omitempty"\` // advertiser domains
	Bundle   string  \`json:"bundle,omitempty"\`
	IURL     string  \`json:"iurl,omitempty"\`  // image URL for creative audit
	CID      string  \`json:"cid,omitempty"\`   // campaign ID
	CrID     string  \`json:"crid,omitempty"\`  // creative ID
	MType    int     \`json:"mtype,omitempty"\` // 1=banner, 2=video, 3=audio, 4=native
	DealID   string  \`json:"dealid,omitempty"\`
}

func main() {
	nbr := 3 // no-bid reason: known web spider
	noResp := BidResponse{ID: "req-001", NBR: &nbr}
	b, _ := json.MarshalIndent(noResp, "", "  ")
	fmt.Println("No-bid response:", string(b))

	resp := BidResponse{
		ID:  "req-002",
		Cur: "USD",
		SeatBid: []SeatBid{
			{
				Seat: "seat-abc",
				Bid: []Bid{
					{
						ID:      "bid-1",
						ImpID:   "imp-1",
						Price:   3.14,
						AdM:     "<div>Ad creative here</div>",
						ADomain: []string{"nike.com"},
						CrID:    "cr-banner-001",
						MType:   1, // banner
						NURL:    "https://exchange.com/win?p=\${AUCTION_PRICE}",
						BURL:    "https://dsp.com/bill?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}",
					},
				},
			},
		},
	}
	b2, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Println("\\nBid response:", string(b2))
}
`,
      quiz: [
        {
          id: 'ortb-resp-empty',
          prompt:
            'How should a DSP signal "no bid" for an entire BidRequest in the most network-efficient way?',
          choices: [
            { label: 'HTTP 204 — no body; most efficient no-bid signal', correct: true },
            { label: 'HTTP 200 + empty seatbid — valid but wastes JSON parsing overhead' },
            { label: 'HTTP 200 + nbr — valid when communicating a specific reason code' },
            { label: 'Drop connection — causes exchange timeout and logs a DSP error' },
          ],
          explain:
            'HTTP 204 No Content is the preferred no-bid signal — it requires no body parsing on the exchange side and is the most efficient. HTTP 200 with an empty seatbid or a non-zero nbr (no-bid reason) is also valid but wastes bandwidth on JSON parsing. Dropping the connection causes the exchange to wait until tmax and log a timeout error.',
        },
        {
          id: 'ortb-resp-seatbid-group',
          prompt: 'A SeatBid with group=1 containing two bids means:',
          choices: [
            { label: 'Package bid — all bids must win together or all are voided', correct: true },
            { label: 'First bid wins — only the first bid in each SeatBid can win' },
            { label: 'Package discount — exchange auctions bids together at lower price' },
            { label: 'Same imp claim — all bids must share the same impression ID' },
          ],
          explain:
            'group=1 in a SeatBid signals package bidding: the buyer wants to win all impressions in the SeatBid or none. This is used for sponsorships or campaigns that only make creative sense as a set. group=0 (default) means each bid is independent — a bidder may win some and lose others.',
        },
        {
          id: 'ortb-resp-mtype',
          prompt: 'Why is Bid.mtype important for a multi-format Imp?',
          choices: [
            {
              label: 'Format discriminator — tells exchange which adm type to render',
              correct: true,
            },
            { label: 'Max CPM claim — mtype sets the maximum CPM the bidder will pay' },
            { label: 'Deal type claim — mtype identifies PMP vs open-auction deal' },
            { label: 'MIME type claim — mtype specifies the MIME type of the creative file' },
          ],
          explain:
            'When an Imp offers multiple formats (e.g. Banner + Native), the exchange needs to know which format the winning creative matches to correctly render it. mtype=1 → render as banner HTML, mtype=2 → pass to VAST player, mtype=4 → render as native. Omitting mtype on a multi-format Imp response may cause the exchange to reject or mis-render the ad.',
        },
      ],
      design: {
        prompt:
          "Your DSP's bidder sometimes returns a bid for an imp.id that doesn't match any impression in the BidRequest. How would you design validation on the exchange side and on the DSP side to catch this?",
        answer:
          'Exchange side: index BidRequest.imp[] by ID into a map before fanning out. On BidResponse receipt, for each Bid.impid, check map.Get(impid) — reject the bid if not found. Log DSP + impid for diagnostics. Apply a per-DSP anomaly counter: if >1% of bids have invalid impids, throttle that DSP.\n\nDSP side: keep the original BidRequest in scope while building the response (use a closure or struct). Assert bid.ImpID == req.Imp[i].ID before returning. Add a unit test: construct a mock BidRequest with known imp IDs, call the bidder, assert all BidResponse.seatbid[].bid[].impid match.',
      },
      keyPoints: [
        'BidResponse.id must mirror BidRequest.id; SeatBid groups bids by buyer seat.',
        'HTTP 204 is the preferred no-bid response; nbr (no-bid reason) codes are 0–21+.',
        'Bid.impid must match an imp.id from the corresponding BidRequest.',
        'group=1 in SeatBid means package bidding — all bids must win or none win.',
        'Bid.mtype (1=banner, 2=video, 3=audio, 4=native) disambiguates multi-format responses.',
      ],
    },
    {
      id: 'ortb-bid-response-bid',
      title: 'The Bid Object Deep Dive',
      difficulty: 'Medium',
      tags: ['Bid', 'adm', 'nurl', 'burl', 'lurl', 'crid', 'adomain', 'OpenRTB'],
      summary: 'Every field of the OpenRTB Bid object and how exchanges and DSPs use them.',
      pattern: 'Bid object fields',
      visual:
        'Bid{impid, price, adm=markup, nurl=win-notice, burl=billing-notice, lurl=loss-notice, crid, adomain[], dealid, mtype}.',
      memorize:
        'adm = ad markup in response (or served on win via nurl). nurl = win notify URL. burl = billing event URL. lurl = loss notify URL. crid = creative ID for audit trail. adomain = advertiser domain for brand safety.',
      scene:
        'A sealed bid packet at an estate auction: adm is the cheque already inside, nurl is "call me when I win", burl is "charge my card when the item ships", lurl is "tell me I lost", crid is the bidder\'s credential number.',
      time: '—',
      space: '—',
      code: `package main

import (
	"fmt"
	"net/url"
	"strings"
)

// MacroSubstitute replaces OpenRTB price macros in a URL or markup string.
// The spec mandates URL-encoding for macro values that appear in query params.
func MacroSubstitute(s string, macros map[string]string) string {
	for k, v := range macros {
		s = strings.ReplaceAll(s, "${'+k+'}", v)
	}
	return s
}

// MacroSubstituteURL URL-encodes macro values before substitution so they
// don't break query string parsing in tracking URLs.
func MacroSubstituteURL(rawURL string, macros map[string]string) (string, error) {
	for k, v := range macros {
		rawURL = strings.ReplaceAll(rawURL, "${'+k+'}", url.QueryEscape(v))
	}
	_, err := url.Parse(rawURL)
	return rawURL, err
}

// Bid object — key fields with doc comments.
type Bid struct {
	ID      string   // bidder-generated, unique per bid
	ImpID   string   // must match a BidRequest.imp[].id
	Price   float64  // CPM in BidResponse.cur (default USD)

	AdM     string   // ad markup; mutually exclusive with nurl-based serving
	NURL    string   // exchange calls this to notify win — may contain \${AUCTION_PRICE}
	BURL    string   // exchange calls this on billing event
	LURL    string   // exchange calls this on loss (optional)

	ADomain []string // advertiser domains for brand safety (e.g. ["nike.com"])
	Bundle  string   // app bundle for app-attributed ads
	IURL    string   // image URL of creative for exchange audit
	CID     string   // campaign ID
	CrID    string   // creative ID — key for creative auditing/blocking
	CatTax  int      // taxonomy version for Cat field
	Cat     []string // content categories of the ad
	MType   int      // markup type: 1=banner, 2=video, 3=audio, 4=native
	DealID  string   // if won via a PMP deal, mirrors Deal.id
	W, H    int      // dimensions of the winning creative
}

func main() {
	bid := Bid{
		ID:      "bid-xyz-001",
		ImpID:   "imp-1",
		Price:   5.25,
		ADomain: []string{"sponsor.com"},
		CrID:    "banner-300x250-v3",
		MType:   1,
		NURL:    "https://exchange.example.com/win?bid=\${AUCTION_BID_ID}&p=\${AUCTION_PRICE}&cur=\${AUCTION_CURRENCY}",
		BURL:    "https://dsp.example.com/bill?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}&seat=\${AUCTION_SEAT_ID}",
	}

	macros := map[string]string{
		"AUCTION_PRICE":    "5.25",
		"AUCTION_BID_ID":   bid.ID,
		"AUCTION_CURRENCY": "USD",
		"AUCTION_ID":       "req-001",
		"AUCTION_SEAT_ID":  "seat-abc",
	}

	nurl, _ := MacroSubstituteURL(bid.NURL, macros)
	burl, _ := MacroSubstituteURL(bid.BURL, macros)

	fmt.Println("NURL after substitution:")
	fmt.Println(" ", nurl)
	fmt.Println("BURL after substitution:")
	fmt.Println(" ", burl)
}
`,
      quiz: [
        {
          id: 'ortb-bid-adm-vs-nurl',
          prompt: 'What is the key difference between serving markup via Bid.adm vs via Bid.nurl?',
          choices: [
            {
              label: 'adm = inline markup — nurl = win notice URL; exchange fetches markup',
              correct: true,
            },
            { label: 'Format split — adm is for banner; nurl is for video ads' },
            { label: 'Caller swap — nurl is called by browser; adm is called by exchange' },
            { label: 'Simultaneous claim — both deliver markup at the same time' },
          ],
          explain:
            "adm (ad markup) carries the creative inline in the JSON response — lower latency but larger payload. nurl (notice URL) is a callback the exchange fires after the auction to both notify the DSP of the win AND retrieve the markup from the DSP's server. nurl-based serving decouples win notification from markup delivery, enabling dynamic creative generation.",
        },
        {
          id: 'ortb-bid-burl-vs-nurl',
          prompt: 'nurl is called at auction time; when is burl called?',
          choices: [
            {
              label: 'On billable event — render or viewability threshold, not at auction',
              correct: true,
            },
            { label: 'Right after nurl — burl and nurl fire in the same HTTP request' },
            { label: 'On click — burl fires when the user clicks the ad unit' },
            { label: 'Billing period — burl fires at end of daily or weekly cycle' },
          ],
          explain:
            'burl (billing URL) is the financial signal: it fires when the exchange determines a billable impression has occurred. For display ads this is often render+3 seconds; for video it may be 50% viewability. burl fires independently of nurl — the DSP may receive nurl (won the auction) but not burl (impression never rendered), in which case no charge should be issued.',
        },
        {
          id: 'ortb-bid-crid-purpose',
          prompt: 'Why do exchanges store and check Bid.crid (creative ID)?',
          choices: [
            {
              label: 'Creative auditing — exchange scans and blocks per crid for brand safety',
              correct: true,
            },
            { label: 'Bid dedup claim — crid is not used to deduplicate bids per impression' },
            { label: 'Campaign billing — crid maps to campaign for billing purposes' },
            { label: 'Competitive sep — crid enforces competitive separation on page' },
          ],
          explain:
            "Exchanges maintain a creative library keyed by crid. New crid values trigger an audit pipeline (image classification, malware scan, brand-safety scoring). Publishers can then block specific creative IDs. Without a stable crid, an exchange can't track which creatives have been audited or blocked.",
        },
      ],
      design: {
        prompt:
          'Your exchange discovers that a DSP is submitting bids with the same crid but different adm (ad markup) on successive auctions, effectively bypassing creative auditing. How do you detect and prevent this?',
        answer:
          '1. Hash the adm on receipt and store as creative_hash keyed by (dsp_id, crid).\n2. On each bid: compare current adm hash to stored hash. If different, flag the creative as "modified" and route to re-audit queue.\n3. Block the bid from serving until the new creative passes audit (may be asynchronous).\n4. Rate-limit creative hash changes per DSP per hour to catch systematic bypass attempts.\n5. Log all crid hash changes to the audit trail; alert security team on >N changes/minute from a single DSP.\n6. Contractually require DSPs to rotate crid whenever creative content changes; SLA violation penalties for bypass attempts.',
      },
      keyPoints: [
        'adm = inline ad markup; nurl = win notice URL (exchange calls at win; may serve markup).',
        'burl = billing notice URL (exchange calls at billable event); separate from nurl.',
        'lurl = loss notice with \${AUCTION_LOSS} macro; called by exchange on non-winning bids.',
        'crid (creative ID) must be stable per creative; exchanges use it for audit and blocking.',
        'adomain[] lists advertiser domains for publisher brand-safety filtering.',
        'Price macros (\${AUCTION_PRICE}, etc.) must be URL-encoded when appearing in URL parameters.',
      ],
    },
    {
      id: 'ortb-bid-response-settlement',
      title: 'Win Notice, Billing Notice & Price Macros',
      difficulty: 'Medium',
      tags: ['nurl', 'burl', 'AUCTION_PRICE', 'macros', 'clearing-price', 'settlement'],
      summary: 'How exchanges notify DSPs of wins/billing events and substitute price macros.',
      pattern: 'Win + billing notification',
      visual:
        'Exchange calls nurl at auction win; \${AUCTION_PRICE} substituted with clearing price (URL-encoded). Exchange calls burl at billable event. DSP records spend at burl receipt, not nurl.',
      memorize:
        "nurl = win signal (possibly deliver markup). burl = spend signal (record cost here). \${AUCTION_PRICE} in URLs → clearing price in winner's currency. Always URL-encode before substituting into query params.",
      scene:
        'Buying a car at auction: nurl is the auctioneer yelling "Sold!" to you. burl is the finance office charging your card when you actually drive off the lot. \${AUCTION_PRICE} is the final hammer price written on the contract.',
      time: '—',
      space: '—',
      code: `package main

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// Standard OpenRTB price macros (subset).
const (
	MacroAuctionPrice    = "\${AUCTION_PRICE}"
	MacroAuctionID       = "\${AUCTION_ID}"
	MacroAuctionBidID    = "\${AUCTION_BID_ID}"
	MacroAuctionImpID    = "\${AUCTION_IMP_ID}"
	MacroAuctionSeatID   = "\${AUCTION_SEAT_ID}"
	MacroAuctionAdID     = "\${AUCTION_AD_ID}"
	MacroAuctionCurrency = "\${AUCTION_CURRENCY}"
	MacroAuctionLoss     = "\${AUCTION_LOSS}"
)

// AuctionResult holds the data available after auction settlement.
type AuctionResult struct {
	AuctionID     string
	BidID         string
	ImpID         string
	SeatID        string
	AdID          string
	ClearingPrice float64 // winning CPM after auction type applied
	Currency      string
}

// SubstituteURL replaces all recognised macros in u with URL-encoded values.
func SubstituteURL(u string, r AuctionResult) string {
	priceStr := strconv.FormatFloat(r.ClearingPrice, 'f', 6, 64)
	replacer := strings.NewReplacer(
		MacroAuctionPrice,    url.QueryEscape(priceStr),
		MacroAuctionID,       url.QueryEscape(r.AuctionID),
		MacroAuctionBidID,    url.QueryEscape(r.BidID),
		MacroAuctionImpID,    url.QueryEscape(r.ImpID),
		MacroAuctionSeatID,   url.QueryEscape(r.SeatID),
		MacroAuctionAdID,     url.QueryEscape(r.AdID),
		MacroAuctionCurrency, url.QueryEscape(r.Currency),
	)
	return replacer.Replace(u)
}

func main() {
	result := AuctionResult{
		AuctionID:     "req-001",
		BidID:         "bid-xyz",
		ImpID:         "imp-1",
		SeatID:        "seat-a",
		AdID:          "ad-5",
		ClearingPrice: 3.141592,
		Currency:      "USD",
	}

	nurl := "https://exchange.example.com/win?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}&bid=\${AUCTION_BID_ID}"
	burl := "https://dsp.example.com/bill?price=\${AUCTION_PRICE}&cur=\${AUCTION_CURRENCY}"

	fmt.Println("NURL:", SubstituteURL(nurl, result))
	fmt.Println("BURL:", SubstituteURL(burl, result))

	// Verify clearing price is recoverable from the URL
	q, _ := url.ParseQuery(strings.SplitN(SubstituteURL(nurl, result), "?", 2)[1])
	priceBack, _ := strconv.ParseFloat(q.Get("p"), 64)
	fmt.Printf("Recovered clearing price: %.6f\\n", priceBack)
}
`,
      quiz: [
        {
          id: 'ortb-settlement-who-calls',
          prompt: 'Who is responsible for calling the nurl after the auction?',
          choices: [
            {
              label: 'Exchange calls nurl — server-to-server win notification to DSP',
              correct: true,
            },
            { label: 'Browser fires nurl — nurl is a server-side call, not a browser pixel' },
            { label: 'DSP polls exchange — nurl is push, not poll' },
            { label: 'SSP calls nurl — the SSP triggers nurl before returning markup' },
          ],
          explain:
            'nurl is called server-to-server by the exchange immediately after it selects the auction winner, before returning the ad markup to the publisher. This is different from impression pixels (called by the browser). Server-to-server ensures the DSP gets the win signal even if the browser never renders the ad.',
        },
        {
          id: 'ortb-settlement-encode',
          prompt:
            'Why must \${AUCTION_PRICE} be URL-encoded when substituted into a query-string parameter?',
          choices: [
            {
              label: 'URL safety — special chars in other macros can break URL parsing',
              correct: true,
            },
            { label: 'Base64 claim — spec requires base64, not URL-encoding, for macros' },
            { label: 'HTTPS-only claim — URL encoding is not restricted to HTTPS URLs' },
            { label: 'Log-hiding claim — URL encoding does not prevent price appearing in logs' },
          ],
          explain:
            'Price values (numbers) are safe in URLs, but other macros like AUCTION_ID may contain characters that need encoding (spaces, +, &, etc.). More importantly, the AUCTION_PRICE itself may be in scientific notation in some implementations. The spec mandates URL-encoding for macro values in URL contexts to prevent malformed URLs. The receiving server URL-decodes the parameter before parsing the float.',
        },
        {
          id: 'ortb-settlement-second-price-clearing',
          prompt:
            'In a second-price auction, what does \${AUCTION_PRICE} contain in the nurl call?',
          choices: [
            {
              label: "Clearing price — max(floor, 2nd-highest bid), not the winner's bid",
              correct: true,
            },
            { label: "Winner's bid — AUCTION_PRICE equals the submitted bid in second-price" },
            { label: 'Floor price — AUCTION_PRICE equals the publisher-set floor value' },
            { label: 'Average bid — AUCTION_PRICE is the mean of all submitted bids' },
          ],
          explain:
            "In a second-price auction, \${AUCTION_PRICE} in the nurl is the clearing price (what the winner pays), which equals max(second-highest-bid, floor). In a first-price auction, clearing price equals the winner's bid. The DSP should record \${AUCTION_PRICE} (not their submitted bid) as their spend for accurate cost tracking.",
        },
      ],
      design: {
        prompt:
          'Your DSP receives nurl calls but burl calls are missing for ~30% of won impressions. What are the likely causes and how would you investigate?',
        answer:
          "1. Ad failed to render — browser blocked (ad blocker, mixed-content), creative error, or timeout. Check DSP-side impression pixel fire rate vs nurl rate for the same time window.\n2. Exchange burl policy — some exchanges only call burl after viewability threshold (50% in-view for 1 second); slow-loading ads may not meet it. Check exchange integration spec.\n3. Network failure — burl endpoint unreliable. Add retry + exponential backoff; check server error rate.\n4. Configuration error — burl field missing from some bids. Audit bidder code: ensure burl is populated for all bids, not just certain campaign types.\n5. Reporting reconciliation: expected discrepancy is 5–10% between nurl (auction win) and burl (billable impression). > 20% suggests a product issue. Compare with publisher's own impression count as a third data point.",
      },
      keyPoints: [
        'nurl: exchange calls at auction win (server-to-server); may serve markup from DSP.',
        'burl: exchange calls at billable event (typically impression render); DSP records spend here.',
        'lurl: optional loss notification with \${AUCTION_LOSS} macro (loss reason code).',
        "\${AUCTION_PRICE} = clearing price (second-price) or winner's bid (first-price).",
        'Always URL-encode macro values before substituting into query-string parameters.',
        '5–10% discrepancy between nurl wins and burl billings is normal; > 20% warrants investigation.',
      ],
    },
    {
      id: 'ortb-bid-response-nobid',
      title: 'No-Bid Codes & Timeout Handling',
      difficulty: 'Easy',
      tags: ['no-bid', 'nbr', 'timeout', 'HTTP-204', 'OpenRTB'],
      summary: 'HTTP 204 vs JSON no-bid, nbr reason codes, and graceful timeout behaviour.',
      pattern: 'No-bid + timeout protocol',
      visual:
        'No bid: HTTP 204 (preferred) or HTTP 200 + empty seatbid + optional nbr. Exchange timeout: treats as no-bid, logs timeout. nbr=7=blocked publisher, nbr=2=invalid request, nbr=8=unmatched user.',
      memorize:
        'HTTP 204 = fastest no-bid. nbr reason codes: 0=unknown, 2=invalid req, 3=known spider, 4=nonhuman, 5=datacenter, 6=unsupported format, 7=blocked pub, 8=unmatched user.',
      scene:
        'The auction clock runs out: a bidder who says nothing (no response / 204) is treated exactly like a bidder who shows up and shrugs (nbr + empty seatbid) — both lose. But shrugging politely (204) costs the exchange zero CPU vs shrugging with a JSON essay (200 + body).',
      time: 'O(1)',
      space: 'O(1)',
      code: `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// NoBidReason codes (OpenRTB spec Table 6.22).
type NoBidReason int

const (
	NBRUnknown           NoBidReason = 0
	NBRTechnicalError    NoBidReason = 1
	NBRInvalidRequest    NoBidReason = 2
	NBRKnownSpider       NoBidReason = 3
	NBRNonHumanTraffic   NoBidReason = 4
	NBRDatacenterProxy   NoBidReason = 5
	NBRUnsupportedFormat NoBidReason = 6
	NBRBlockedPublisher  NoBidReason = 7
	NBRUnmatchedUser     NoBidReason = 8
	NBRDailyCapMet       NoBidReason = 9
	NBRBidderExclusion   NoBidReason = 10
)

// respondNoBid writes the most appropriate no-bid HTTP response.
//
// Use HTTP 204 when you simply have no matching campaign. Use 200+nbr when
// you want to communicate a policy reason the exchange can log for diagnostics.
func respondNoBid(w http.ResponseWriter, reason *NoBidReason, reqID string) {
	if reason == nil {
		w.WriteHeader(http.StatusNoContent) // 204 — preferred for "no match"
		return
	}
	nbr := int(*reason)
	resp := struct {
		ID  string \`json:"id"\`
		NBR int    \`json:"nbr"\`
	}{ID: reqID, NBR: nbr}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func main() {
	fmt.Println("No-bid reason codes:")
	reasons := []NoBidReason{
		NBRUnknown, NBRTechnicalError, NBRInvalidRequest,
		NBRKnownSpider, NBRNonHumanTraffic, NBRDatacenterProxy,
		NBRUnsupportedFormat, NBRBlockedPublisher, NBRUnmatchedUser,
	}
	names := []string{
		"Unknown", "Technical Error", "Invalid Request",
		"Known Spider", "Non-Human Traffic", "Datacenter/Proxy",
		"Unsupported Format", "Blocked Publisher", "Unmatched User",
	}
	for i, r := range reasons {
		fmt.Printf("  nbr=%2d  %s\\n", r, names[i])
	}

	// Exchange timeout simulation
	fmt.Println("\\nIf no response arrives within tmax:")
	fmt.Println("  Exchange treats as no-bid (nbr=1 implicitly).")
	fmt.Println("  Exchange increments timeout counter for the DSP.")
	fmt.Println("  High timeout rate may trigger DSP throttling or removal from auction.")
}
`,
      quiz: [
        {
          id: 'ortb-nobid-http204',
          prompt:
            'A bidder has no matching campaign for an impression. The most efficient response is:',
          choices: [
            {
              label: 'HTTP 204 — preferred; no JSON parsing overhead for the exchange',
              correct: true,
            },
            { label: 'HTTP 200 + empty seatbid — valid but parses unnecessary JSON' },
            { label: 'HTTP 200 + nbr code — useful for communicating a specific reason' },
            { label: 'HTTP 400 claim — 400 signals request error, not a no-bid decision' },
          ],
          explain:
            'HTTP 204 has no body — the exchange can process it with zero JSON parsing overhead. It\'s preferred for the "no matching campaign" case which is the most common no-bid scenario (e.g. frequency capped, no audience match). HTTP 200 with structured JSON is useful when you want to communicate a specific reason code for exchange analytics.',
        },
        {
          id: 'ortb-nobid-timeout-consequence',
          prompt:
            'What typically happens to a DSP that consistently responds after the exchange tmax deadline?',
          choices: [
            {
              label: 'Timeout logged — persistent high rates risk DSP exclusion from auctions',
              correct: true,
            },
            { label: 'Advisory tmax — tmax is informational; exchange waits indefinitely' },
            { label: 'Floor raised — exchange bumps DSP bid floor to offset latency cost' },
            { label: 'Late-bid queue — late bids are queued for the next matching auction' },
          ],
          explain:
            'Exchanges enforce tmax strictly — late responses are discarded. DSPs with persistent timeouts waste exchange resources (open connections) and publisher revenue (no fill). Well-operated exchanges track p99 latency per DSP and may exclude DSPs that consistently miss tmax from auctions, or move them to a lower-priority tier.',
        },
        {
          id: 'ortb-nobid-reason-unmatched',
          prompt: 'A bidder returns nbr=8 (unmatched user). What does this indicate?',
          choices: [
            {
              label: 'nbr=8 — no cookie/device ID match; DSP cannot apply audience targeting',
              correct: true,
            },
            { label: 'Fraud IP claim — nbr=8 is for fraud block, not unmatched user' },
            { label: 'Opt-out claim — opt-out is nbr=0 or separate consent handling' },
            { label: 'Format claim — format incompatibility is nbr=6, not nbr=8' },
          ],
          explain:
            "nbr=8 means the DSP received the BidRequest but User.buyeruid was absent or unknown in its own user database — the DSP can't resolve the user to any audience segment. This is common in cookieless traffic or when cookie sync coverage is low. The exchange can use this signal to measure cookie sync health per DSP.",
        },
      ],
      design: {
        prompt:
          'Your bidder is getting 40% timeouts according to exchange reports, but internal monitoring shows p99 latency at 55 ms. The exchange tmax is 80 ms. How do you debug this?',
        answer:
          '1. Network RTT: measure one-way latency to exchange endpoint. If RTT is 30 ms each way, 55 ms internal + 60 ms network = 115 ms > 80 ms tmax. Co-locate with the exchange region.\n2. Clock skew: exchange measures from request received; bidder measures from processing start. Account for HTTP parsing overhead. Add timestamps at request receipt, decision start, and response send.\n3. Response buffering: ensure the HTTP response is flushed immediately (no Nagle algorithm delays). Use response.WriteHeader + flush explicitly.\n4. Connection pooling: check if TCP connection establishment is included in measured latency. Use persistent connections (HTTP keep-alive).\n5. Queue depth: under high load, requests may queue before processing. Profile with pprof under load. Add a request-received timestamp to detect queuing time.',
      },
      keyPoints: [
        'HTTP 204 is the most efficient no-bid; HTTP 200 + nbr is used for diagnostic reason codes.',
        'A timeout (no response by tmax) is treated as a no-bid; persistent timeouts risk DSP exclusion.',
        'nbr codes: 0=unknown, 3=spider, 4=non-human, 5=datacenter, 7=blocked publisher, 8=unmatched user.',
        'DSPs should set internal bid deadline to ~70% of tmax to leave network RTT headroom.',
        'High timeout rates signal latency or routing issues; exchanges track p99 per DSP and enforce SLAs.',
      ],
    },
  ],
};
