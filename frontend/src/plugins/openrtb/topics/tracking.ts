import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 7: Clicks, Impressions & Tracking
export const tracking: GoTopic = {
  id: 'tracking',
  title: 'Clicks, Impressions & Tracking',
  icon: 'MousePointer',
  concepts: [
    {
      id: 'ortb-tracking-impressions',
      title: 'Impression Pixel Firing',
      difficulty: 'Easy',
      tags: ['impression', 'pixel', 'tracking', 'HTTP-GET', 'idempotent', 'deduplication'],
      summary:
        'How 1×1 impression pixels work, deduplication by impression ID, and server implementation.',
      pattern: 'Impression pixel',
      visual:
        'Creative renders → browser fires GET /imp?aid=xxx → server increments counter → returns 1×1 transparent GIF. Deduplicate by (impression_id, timestamp_window) to prevent double-counting.',
      memorize:
        'Pixel = GET request when browser renders img tag. Response = 1x1 transparent GIF (35 bytes). Server must respond < 50ms or browser may abandon. Deduplicate by impression ID in Redis.',
      scene:
        'A hotel lobby turnstile: every guest who walks in (impression renders) clicks the counter once. If a guest spins back and forth (page reload), the counter only increments for new entries (deduplication window).',
      time: 'O(1) per pixel fire',
      space: 'O(unique_impression_ids) for dedup store',
      code: `package main

import (
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// transparentGIF is a minimal 1×1 transparent GIF in 35 bytes.
var transparentGIF = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
	0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
	0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
	0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00,
	0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01,
	0x00, 0x3B,
}

// ImpressionTracker counts impressions and deduplicates within a time window.
type ImpressionTracker struct {
	total    atomic.Int64
	mu       sync.Mutex
	seen     map[string]time.Time // impression_id → first seen
	dedupTTL time.Duration
}

func NewTracker(dedupTTL time.Duration) *ImpressionTracker {
	t := &ImpressionTracker{
		seen:     make(map[string]time.Time),
		dedupTTL: dedupTTL,
	}
	// Periodically evict expired dedup entries to bound memory.
	go func() {
		tick := time.NewTicker(dedupTTL)
		defer tick.Stop()
		for range tick.C {
			t.evict()
		}
	}()
	return t
}

// Record returns true if this impression ID is new (not yet seen within TTL).
func (t *ImpressionTracker) Record(impID string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if _, seen := t.seen[impID]; seen {
		return false // duplicate
	}
	t.seen[impID] = time.Now()
	t.total.Add(1)
	return true
}

func (t *ImpressionTracker) evict() {
	t.mu.Lock()
	defer t.mu.Unlock()
	cutoff := time.Now().Add(-t.dedupTTL)
	for id, ts := range t.seen {
		if ts.Before(cutoff) {
			delete(t.seen, id)
		}
	}
}

func (t *ImpressionTracker) Total() int64 { return t.total.Load() }

// ServeHTTP handles GET /imp?aid=<auctionID>&iid=<impID>
func (t *ImpressionTracker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	impID := q.Get("iid")
	if impID == "" {
		impID = q.Get("aid") // fallback
	}

	isNew := t.Record(impID)
	if isNew {
		fmt.Printf("[impression] new: %s  total=%d\\n", impID, t.Total())
	} else {
		fmt.Printf("[impression] dup: %s\\n", impID)
	}

	w.Header().Set("Content-Type", "image/gif")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.WriteHeader(http.StatusOK)
	w.Write(transparentGIF) //nolint:errcheck
}

func main() {
	tracker := NewTracker(30 * time.Second)

	// Simulate pixel fires.
	ids := []string{"imp-1", "imp-2", "imp-1", "imp-3", "imp-2"} // imp-1 and imp-2 are duplicates
	for _, id := range ids {
		tracker.Record(id)
	}
	fmt.Printf("Total unique impressions: %d\\n", tracker.Total())

	// Start HTTP server (demo).
	http.Handle("/imp", tracker)
	srv := &http.Server{Addr: ":8081", ReadTimeout: 2 * time.Second, WriteTimeout: 2 * time.Second}
	go srv.ListenAndServe() //nolint:errcheck
	time.Sleep(50 * time.Millisecond)
	fmt.Println("Impression pixel server ready at http://localhost:8081/imp?iid=test")
	srv.Close() //nolint:errcheck
}
`,
      quiz: [
        {
          id: 'ortb-imp-pixel-when',
          prompt: 'An impression pixel embedded in ad markup is fired:',
          choices: [
            {
              label: 'Browser render — fires HTTP GET when it renders the <img> pixel tag',
              correct: true,
            },
            { label: 'Exchange server — fires the pixel on auction winner selection' },
            { label: 'DSP server — fires the pixel when it sends the BidResponse' },
            { label: 'SSP — fires the pixel when it delivers markup to the browser' },
          ],
          explain:
            'Impression pixels are HTML image tags (e.g. <img src="https://track.example.com/imp?id=...">). The browser fires an HTTP GET to the pixel URL when it renders the tag — typically during page load. This is a client-side event, which is why impression counts from pixels differ from exchange-side nurl counts (server-to-server).',
        },
        {
          id: 'ortb-imp-dedup',
          prompt: 'Why might a single ad impression fire the same pixel URL more than once?',
          choices: [
            {
              label: 'Browser re-render — preload, BFCache, or page reload re-renders markup',
              correct: true,
            },
            { label: 'Exchange fires — exchange fires pixel per DSP, not per impression render' },
            { label: 'Macro substitution — each substitution does not fire a separate pixel' },
            { label: 'Shared URL — multiple impressions do not share the same pixel URL' },
          ],
          explain:
            'Browser behaviour (preloading, BFCache, refresh) can trigger the same creative markup to render multiple times in a session. Without deduplication, the impression count would be inflated. DSPs deduplicate by impression ID + time window (e.g. same imp ID within 30 seconds counts as one). Exchanges do the same server-side for their own accounting.',
        },
        {
          id: 'ortb-imp-gif-response',
          prompt: 'Why does an impression tracking server return a 1×1 transparent GIF?',
          choices: [
            {
              label: 'Valid image — browser requires an image for <img>; 1x1 GIF is invisible',
              correct: true,
            },
            { label: 'Size claim — GIF is not the smallest HTTP response format available' },
            { label: 'Retry claim — 204 No Content does not cause browsers to retry' },
            { label: 'Metadata claim — transparent GIFs carry no DSP audience data' },
          ],
          explain:
            "An <img> tag requires an image response. If the server returns an error (4xx/5xx) or a non-image response, some browsers log console errors or mark the element as broken. A 1×1 transparent GIF (35 bytes) is invisible to users, satisfies the browser's image requirement, and signals a successful tracking event. Some modern trackers use HTTP 204 No Content via fetch() beacons instead of image pixels.",
        },
      ],
      design: {
        prompt:
          'Your impression tracking server must handle 500k pixel fires per second with < 1 ms response time. The primary goal is counting unique impressions (deduplication window: 60 seconds). How do you scale this?',
        answer:
          '1. Stateless pixel servers: multiple Go processes behind a load balancer. Each server is stateless — requests are routed without stickiness.\n2. Deduplication: use Redis SETNX with 60-second TTL per impression ID. Co-locate Redis with pixel servers to keep the RTT to Redis < 0.5 ms. Use a Redis cluster for horizontal scale.\n3. Write-behind counts: do not increment a global counter on every request (Mutex bottleneck). Instead, pixel servers batch impression IDs to a local ring buffer; a background goroutine flushes counts to Kafka every 100 ms.\n4. GIF response pooling: return the same pre-allocated []byte slice for every pixel response. No allocation per request.\n5. Connection reuse: configure http.Transport MaxIdleConnsPerHost and keep-alive. Browsers often reuse the same connection for multiple pixel fires on the same page.',
      },
      keyPoints: [
        'Impression pixels are <img> tags; the browser fires a GET request on render.',
        'Return a 1×1 transparent GIF (35 bytes) with no-cache headers.',
        'Deduplicate by impression ID + time window (60 s) to prevent double-counting.',
        'Pixel fires are best-effort and client-side; nurl is authoritative (server-to-server).',
        'Use Redis SETNX + TTL for distributed deduplication at scale.',
      ],
    },
    {
      id: 'ortb-tracking-clicks',
      title: 'Click Redirect Chains',
      difficulty: 'Medium',
      tags: ['click', 'redirect', 'tracking', 'HTTP-302', 'deduplication', 'attribution'],
      summary: 'Click tracking redirect chain: ad server → DSP tracker → advertiser landing page.',
      pattern: 'Click redirect chain',
      visual:
        'Click on ad → GET /click?bid=X → (record click) → 302 → /dsp-click?cid=Y → (DSP records) → 302 → advertiser.com/landing. All hops are logged for attribution.',
      memorize:
        'Click chain: exchange /click (record+redirect) → DSP /click (record+redirect) → advertiser landing. Always deduplicate clicks by click_id within window. Set redirect to 302 (Not Modified) not 301 (permanent).',
      scene:
        'An airport connecting flight: you board in NYC (ad server click handler), land in Chicago for a connection (DSP click handler), then arrive in LA (advertiser landing page). Each airport logs your flight number for attribution.',
      time: 'O(N·hops) latency',
      space: 'O(1)',
      code: `package main

import (
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// ClickTracker records clicks with deduplication and fires a 302 redirect.
type ClickTracker struct {
	mu    sync.Mutex
	seen  map[string]time.Time
	total int64
	ttl   time.Duration
}

func NewClickTracker(ttl time.Duration) *ClickTracker {
	return &ClickTracker{seen: make(map[string]time.Time), ttl: ttl}
}

// Record returns true if this click is new (not a duplicate).
func (ct *ClickTracker) Record(clickID string) bool {
	ct.mu.Lock()
	defer ct.mu.Unlock()
	if ts, seen := ct.seen[clickID]; seen && time.Since(ts) < ct.ttl {
		return false
	}
	ct.seen[clickID] = time.Now()
	ct.total++
	return true
}

// ServeHTTP: GET /click?cid=<clickID>&dest=<destinationURL>
func (ct *ClickTracker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	clickID := q.Get("cid")
	dest := q.Get("dest")

	if clickID == "" {
		http.Error(w, "missing cid", http.StatusBadRequest)
		return
	}
	if dest == "" {
		http.Error(w, "missing dest", http.StatusBadRequest)
		return
	}

	// Validate destination URL to prevent open redirect abuse.
	destURL, err := url.ParseRequestURI(dest)
	if err != nil || (destURL.Scheme != "http" && destURL.Scheme != "https") {
		http.Error(w, "invalid dest", http.StatusBadRequest)
		return
	}

	isNew := ct.Record(clickID)
	fmt.Printf("[click] cid=%s new=%t total=%d dest=%s\\n", clickID, isNew, ct.total, dest)

	// Use 302 (temporary redirect) — never 301 (permanent) for click tracking.
	// 301 responses are cached by browsers and bypass click tracking on repeat visits.
	http.Redirect(w, r, dest, http.StatusFound) // 302
}

func main() {
	tracker := NewClickTracker(30 * time.Second)

	// Simulate click chain: exchange click → DSP click → advertiser
	// In practice, each hop is a real HTTP redirect followed by the next server.
	clicks := []struct{ id, dest string }{
		{"click-001", "https://dsp.example.com/click?cid=click-001&dest=https%3A%2F%2Fadvertiser.com%2Flanding"},
		{"click-001", "https://dsp.example.com/click?cid=click-001&dest=https%3A%2F%2Fadvertiser.com%2Flanding"}, // duplicate
		{"click-002", "https://advertiser.com/landing"},
	}
	for _, c := range clicks {
		tracker.Record(c.id)
	}
	fmt.Printf("Total unique clicks: %d\\n", tracker.total)

	// Demonstrate redirect handler.
	mux := http.NewServeMux()
	mux.Handle("/click", tracker)
	srv := &http.Server{Addr: ":8082", ReadTimeout: 2 * time.Second}
	go srv.ListenAndServe() //nolint:errcheck
	time.Sleep(50 * time.Millisecond)
	fmt.Println("Click tracker ready. Try: /click?cid=test&dest=https://example.com")
	srv.Close() //nolint:errcheck
}
`,
      quiz: [
        {
          id: 'ortb-click-302-vs-301',
          prompt: 'A click tracking server must use HTTP 302 (not 301) for redirects. Why?',
          choices: [
            {
              label: '301 is cached permanently — repeat clicks bypass the tracker silently',
              correct: true,
            },
            { label: 'Speed claim — 302 is not faster; both redirects involve a round-trip' },
            { label: 'TLS claim — 301 and 302 both work on HTTP and HTTPS' },
            { label: 'Spec claim — OpenRTB does not mandate HTTP 302 for click redirects' },
          ],
          explain:
            'Browsers cache 301 (Moved Permanently) responses. On the second click of the same URL, the browser follows the cached redirect directly without contacting the click tracker, silently bypassing the attribution logging. HTTP 302 (Found / Temporary Redirect) is not cached by default, ensuring every click goes through the tracker. This is why all click tracking systems use 302.',
        },
        {
          id: 'ortb-click-openredirect',
          prompt:
            'A click tracking endpoint blindly redirects to any URL passed in a "dest" query parameter. The security vulnerability is:',
          choices: [
            {
              label: 'Open redirect — phishing URLs disguised under a trusted ad domain',
              correct: true,
            },
            { label: 'CSRF — the redirect forges requests on behalf of the user' },
            { label: 'SQL injection claim — this is an open redirect, not SQL injection' },
            { label: 'Clickjacking — the redirect embeds an iFrame on the target page' },
          ],
          explain:
            'An open redirect allows an attacker to use your trusted domain as a proxy for a malicious URL: "https://ads.trusted.com/click?dest=https://phishing.com". Browsers and security tools may not flag the initial trusted URL. Mitigation: validate the destination against an allowlist of advertiser domains, or sign the destination URL with an HMAC so it can\'t be tampered with.',
        },
        {
          id: 'ortb-click-attribution',
          prompt:
            'A user clicks an ad on Monday and converts on Wednesday. Last-click attribution would credit:',
          choices: [
            {
              label: 'The ad click on Monday — the last touchpoint before conversion',
              correct: true,
            },
            { label: 'The impression on Sunday (if any) — the first touchpoint' },
            { label: "The advertiser — conversions don't credit ad interactions" },
            { label: 'The SSP — it served the impression that led to the click' },
          ],
          explain:
            "Last-click attribution assigns 100% of conversion credit to the final click before the conversion event. It's the simplest model and the default for most DSPs. Modern attribution models (data-driven, time-decay, first-click, multi-touch) attempt to distribute credit across all touchpoints more fairly. The click tracking chain creates the log of touchpoints that attribution systems consume.",
        },
      ],
      design: {
        prompt:
          'You need to build a click tracking system that handles 50k clicks/second, deduplicates within a 5-minute window, and logs each unique click to a data warehouse for attribution. How would you design it?',
        answer:
          "1. Click handler: stateless Go HTTP server behind a load balancer. Parse cid + validate dest URL. Use distributed dedup key = cid, stored in Redis with 5-minute TTL (SETNX). If already seen, still redirect (don't penalise the user) but don't log.\n2. Write-behind logging: unique clicks go to a local ring buffer. Background goroutine batches them to Kafka (topic: clicks) every 50 ms.\n3. Data warehouse: Kafka consumer writes click events to BigQuery/Snowflake partitioned by day and advertiser_id for attribution joins.\n4. HMAC-signed click URLs: sign the dest parameter with an HMAC (secret rotated daily). Handler verifies signature before redirecting. Prevents open redirect abuse.\n5. Scale: Redis cluster (16 shards) for dedup at 50k RPS. Ring buffer per pod (size 10k) flushes to Kafka. Kafka partition by advertiser_id for ordered attribution.",
      },
      keyPoints: [
        'Click redirect chain: exchange click handler → DSP click handler → advertiser landing page.',
        'Always use HTTP 302 (temporary redirect); 301 is permanently cached and bypasses tracking.',
        'Validate destination URLs against an allowlist to prevent open redirect exploitation.',
        'Deduplicate clicks by click ID + time window to prevent double-attribution.',
        'Log clicks write-behind to Kafka for attribution; dedup in Redis at scale.',
      ],
    },
    {
      id: 'ortb-tracking-macros',
      title: 'Tracking Macros & Substitution',
      difficulty: 'Medium',
      tags: ['macros', 'AUCTION_PRICE', 'substitution', 'tracking', 'OpenRTB', 'URL-encoding'],
      summary: 'All OpenRTB standard macros, their substitution context, and safe URL encoding.',
      pattern: 'OpenRTB macro substitution',
      visual:
        '\${AUCTION_PRICE} → clearing CPM. \${AUCTION_ID} → request ID. \${AUCTION_LOSS} → loss reason. In URL context: URL-encode. In markup body: plain. Exchange substitutes, DSP provides template.',
      memorize:
        'Standard macros: AUCTION_PRICE, AUCTION_ID, AUCTION_IMP_ID, AUCTION_BID_ID, AUCTION_SEAT_ID, AUCTION_AD_ID, AUCTION_CURRENCY, AUCTION_LOSS. URL-encode in URL context. Exchange owns substitution.',
      scene:
        'A mail merge template: \${AUCTION_PRICE} is like ${FIRST_NAME} in a letter. The exchange is the mail-merge software that fills in the blanks before sending. The DSP writes the template, the exchange fills it.',
      time: 'O(|string| × |macros|)',
      space: 'O(|result_string|)',
      code: `package main

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// OpenRTB standard price macros (complete list).
// Source: OpenRTB 2.6 §7.2
var StandardMacros = []string{
	"AUCTION_ID",        // exchange-unique auction ID
	"AUCTION_BID_ID",    // bidder-generated bid ID
	"AUCTION_IMP_ID",    // impression ID within the auction
	"AUCTION_SEAT_ID",   // seat (account) ID of the buyer
	"AUCTION_AD_ID",     // ad ID, from Bid.adid
	"AUCTION_PRICE",     // clearing price in the response currency
	"AUCTION_CURRENCY",  // response currency (default USD)
	"AUCTION_MBR",       // member (DSP) ID, if applicable
	"AUCTION_LOSS",      // loss reason code (in lurl only)
}

// MacroSet holds all substitution values for one auction.
type MacroSet struct {
	AuctionID  string
	BidID      string
	ImpID      string
	SeatID     string
	AdID       string
	Price      float64
	Currency   string
	LossReason int
}

// Apply substitutes all macros in template.
// urlEncode should be true when template is a URL.
func (m MacroSet) Apply(template string, urlEncode bool) string {
	priceStr := strconv.FormatFloat(m.Price, 'f', 6, 64)
	lossStr  := strconv.Itoa(m.LossReason)

	values := map[string]string{
		"AUCTION_ID":       m.AuctionID,
		"AUCTION_BID_ID":   m.BidID,
		"AUCTION_IMP_ID":   m.ImpID,
		"AUCTION_SEAT_ID":  m.SeatID,
		"AUCTION_AD_ID":    m.AdID,
		"AUCTION_PRICE":    priceStr,
		"AUCTION_CURRENCY": m.Currency,
		"AUCTION_LOSS":     lossStr,
	}

	args := make([]string, 0, len(values)*2)
	for k, v := range values {
		val := v
		if urlEncode {
			val = url.QueryEscape(v)
		}
		args = append(args, "${'+k+'}", val)
	}
	return strings.NewReplacer(args...).Replace(template)
}

func main() {
	ms := MacroSet{
		AuctionID: "req-001", BidID: "bid-xyz", ImpID: "imp-1",
		SeatID: "seat-a", AdID: "ad-5", Price: 3.141592,
		Currency: "USD", LossReason: 0,
	}

	fmt.Println("=== Standard macros ===")
	for _, m := range StandardMacros {
		fmt.Printf("  \${%-20s} (in URL context)\n", m)
	}

	// URL substitution (nurl/burl/lurl).
	nurl := "https://dsp.example.com/win?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}&bid=\${AUCTION_BID_ID}&cur=\${AUCTION_CURRENCY}"
	fmt.Println("\n=== nurl substitution (URL-encoded) ===")
	fmt.Println(ms.Apply(nurl, true))

	// Markup body substitution (adm).
	adm := \`<img src="https://px.track.com/imp?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}"/>\`
	fmt.Println("\n=== adm substitution (not URL-encoded for body) ===")
	fmt.Println(ms.Apply(adm, false))

	// Loss notification.
	ms.LossReason = 1 // technical error
	lurl := "https://dsp.example.com/loss?reason=\${AUCTION_LOSS}&aid=\${AUCTION_ID}"
	fmt.Println("\n=== lurl substitution ===")
	fmt.Println(ms.Apply(lurl, true))
}
`,
      quiz: [
        {
          id: 'ortb-macro-lurl-use',
          prompt: 'The \${AUCTION_LOSS} macro is only valid in which field?',
          choices: [
            {
              label: 'Bid.lurl — loss notification URL, called by the exchange on bid loss',
              correct: true,
            },
            { label: 'Bid.nurl — win notice URL' },
            { label: 'Bid.adm — ad markup body' },
            { label: 'Bid.burl — billing notice URL' },
          ],
          explain:
            'AUCTION_LOSS contains the integer loss reason code (e.g. 1=internal error, 100=bid below floor, 200=creative filtered). It only has meaning in a loss notification context (lurl). Using it in nurl or burl is meaningless since those fire on win/billing events where there is no loss reason.',
        },
        {
          id: 'ortb-macro-when-substitute',
          prompt:
            'A DSP includes \${AUCTION_PRICE} in its Bid.adm markup. When is this macro replaced?',
          choices: [
            {
              label: 'Exchange on winner selection — only exchange knows the clearing price',
              correct: true,
            },
            { label: 'Browser on creative render — browser has no access to clearing price' },
            { label: 'DSP before BidResponse — DSP does not know the clearing price yet' },
            { label: 'SSP on exchange response — SSP receives markup after substitution' },
          ],
          explain:
            "The exchange is the only party that knows the clearing price at the time of substitution. The DSP doesn't know if it won or at what clearing price until the exchange notifies it. Therefore, macros in adm are substituted by the exchange before forwarding markup to the SSP, not by the DSP and not by the browser.",
        },
        {
          id: 'ortb-macro-missing',
          prompt:
            'Your exchange does not support the \${AUCTION_BID_ID} macro. The DSP includes it in a tracking URL. What happens?',
          choices: [
            {
              label: 'Literal macro — DSP tracking receives the unsubstituted placeholder',
              correct: true,
            },
            { label: 'HTTP 400 — the exchange rejects BidResponse with unsupported macro' },
            { label: 'Empty string — the exchange substitutes nothing for unknown macros' },
            { label: 'Param removed — the exchange strips unknown macros from URLs' },
          ],
          explain:
            'Exchanges only substitute macros they support. Unsupported macros are left as-is in the output URL. The DSP\'s tracking server then receives "\${AUCTION_BID_ID}" literally, which it will fail to parse as a bid ID. Well-designed DSP tracking parsers should handle missing/malformed parameters gracefully.',
        },
      ],
      design: {
        prompt:
          'Your exchange must validate that bid markup does not contain dangerous content in macro-substituted URLs (e.g. injected query parameters via a crafted \${AUCTION_ID}). How do you defend against this?',
        answer:
          '1. Macro values from the exchange are controlled (auction ID, bid ID, price) — they don\'t come from user input. However, if any macro value could be externally influenced (e.g. user-supplied data in an extension), sanitise before substitution.\n2. For macro values in URL paths or query parameters: apply url.QueryEscape uniformly. This encodes "&", "=", "?" and other injection characters.\n3. Post-substitution URL validation: after substitution, parse the complete URL with url.ParseRequestURI and validate the host against a known allowlist (e.g. DSP endpoint domains from integration config).\n4. Length limits: cap macro value length before substitution. A 10 KB auction ID in a URL is a sign of injection, not a legitimate value.\n5. Content Security Policy: for HTML markup (adm), apply a CSP validator that checks for script injection, data URIs, and external resource loads to untrusted domains.',
      },
      keyPoints: [
        '\${AUCTION_PRICE}: clearing price. \${AUCTION_ID}: request ID. \${AUCTION_LOSS}: loss reason (lurl only).',
        'Exchange performs all macro substitution; DSP provides templates with literal macro placeholders.',
        'URL context: values must be url.QueryEscape-encoded. Body context: raw string values.',
        'Unsupported macros are passed through literally — DSPs must handle unsubstituted macros gracefully.',
        'Macro injection risk: always URL-encode macro values in URL context to prevent parameter injection.',
      ],
    },
    {
      id: 'ortb-tracking-reconciliation',
      title: 'Billing Reconciliation & Discrepancy',
      difficulty: 'Medium',
      tags: ['reconciliation', 'discrepancy', 'billing', 'impression-counting', 'IAS', 'fraud'],
      summary:
        'Why exchange and DSP impression counts diverge, acceptable discrepancy, and reconciliation.',
      pattern: 'Discrepancy analysis',
      visual:
        'Exchange nurl count (server-side) vs DSP pixel count (client-side). Normal: 5-10% discrepancy. Above 20%: investigate. Causes: browser block, timeout, lost pixels, bot traffic, race conditions.',
      memorize:
        "Discrepancy sources: (1) nurl fired but pixel blocked (ad blocker), (2) pixel fired but nurl lost (network), (3) IVT (bots don't fire pixels), (4) race conditions, (5) timezone/window mismatch. Industry standard: ≤ 10% acceptable.",
      scene:
        'A warehouse inventory: the shipping manifest (exchange nurl = won the bid) and the delivery receipt (DSP pixel = user saw the ad) rarely match perfectly. Industry standard says within 10% is fine. Beyond 20%, something is broken.',
      time: '—',
      space: '—',
      code: `package main

import (
	"fmt"
	"math"
)

// ReconciliationReport computes impression discrepancy between two sources.
type ReconciliationReport struct {
	Period         string
	ExchangeCount  int64   // nurl-based count (authoritative for billing)
	DSPCount       int64   // pixel-based count from DSP's server
	ThirdPartyCount int64  // verification vendor count (IAS, DoubleVerify, Moat)
}

// Discrepancy returns the % discrepancy between exchange and DSP counts.
// Positive means exchange > DSP (exchange overcounting or DSP undercounting).
// Negative means DSP > exchange (unusual — may indicate duplicates on DSP side).
func (r ReconciliationReport) Discrepancy() float64 {
	if r.ExchangeCount == 0 {
		return 0
	}
	return (float64(r.ExchangeCount-r.DSPCount) / float64(r.ExchangeCount)) * 100
}

// Severity returns an advisory for the discrepancy level.
func (r ReconciliationReport) Severity() string {
	d := math.Abs(r.Discrepancy())
	switch {
	case d <= 5:
		return "Normal — within industry standard"
	case d <= 10:
		return "Acceptable — minor discrepancy"
	case d <= 20:
		return "Elevated — investigate root cause"
	default:
		return "CRITICAL — discrepancy exceeds 20%; billing dispute likely"
	}
}

// CommonCauses returns likely explanations for the discrepancy.
func (r ReconciliationReport) CommonCauses() []string {
	d := r.Discrepancy()
	if math.Abs(d) <= 5 {
		return []string{"Normal network and rendering variability"}
	}
	if d > 0 { // exchange > DSP
		return []string{
			"Ad blocker or browser privacy mode blocked the impression pixel",
			"Slow creative load — pixel fired after measurement window closed",
			"IVT (bot traffic): exchange counted bid wins; bots don't fire pixels",
			"Network errors between browser and DSP tracking server",
		}
	}
	// d < 0: DSP > exchange
	return []string{
		"Pixel duplication (page refresh, BFCache, prefetch)",
		"DSP counting multiple pixel fires per impression",
		"Timezone or reporting window mismatch",
	}
}

func main() {
	reports := []ReconciliationReport{
		{Period: "2026-07-01", ExchangeCount: 100000, DSPCount: 96000, ThirdPartyCount: 95800},
		{Period: "2026-07-02", ExchangeCount: 100000, DSPCount: 78000, ThirdPartyCount: 77500},
		{Period: "2026-07-03", ExchangeCount: 100000, DSPCount: 102000, ThirdPartyCount: 99500},
	}

	for _, r := range reports {
		fmt.Printf("Period: %s\\n", r.Period)
		fmt.Printf("  Exchange: %d | DSP: %d | 3P: %d\\n",
			r.ExchangeCount, r.DSPCount, r.ThirdPartyCount)
		fmt.Printf("  Discrepancy: %.1f%%  [%s]\\n", r.Discrepancy(), r.Severity())
		if math.Abs(r.Discrepancy()) > 5 {
			fmt.Printf("  Likely causes:\\n")
			for _, c := range r.CommonCauses() {
				fmt.Printf("    - %s\\n", c)
			}
		}
		fmt.Println()
	}
}
`,
      quiz: [
        {
          id: 'ortb-reconcile-authority',
          prompt:
            'When the exchange impression count and the DSP impression count differ for billing purposes, which is generally considered authoritative?',
          choices: [
            {
              label: 'Exchange authoritative — nurl/burl more reliable than client pixels',
              correct: true,
            },
            { label: 'DSP authoritative — it has first-hand knowledge of its own bids and wins' },
            { label: 'Third-party vendor — it is a neutral party for discrepancy resolution' },
            { label: 'Average counts — neither party is authoritative alone' },
          ],
          explain:
            "Exchange server-to-server counts (nurl/burl) are considered more authoritative than DSP pixel counts because they don't depend on browser rendering, user connectivity, or ad blockers. Standard industry agreements use exchange counts for billing settlement, with a contractual discrepancy allowance of 5–10% for DSP pixel undercounting.",
        },
        {
          id: 'ortb-reconcile-ivt',
          prompt:
            'Invalid traffic (IVT) — bots and non-human traffic — tends to create which type of discrepancy?',
          choices: [
            {
              label: 'Exchange overcounts — bots fire nurl but skip browser pixel render',
              correct: true,
            },
            { label: 'DSP overcounts — bots click repeatedly, inflating DSP pixel counts' },
            { label: 'Zero discrepancy claim — bots never perfectly replicate human pixels' },
            { label: 'Negative discrepancy — bots fire pixels without a corresponding bid win' },
          ],
          explain:
            'Sophisticated IVT (bots designed to inflate publisher revenue) triggers ad auctions and exchange nurl calls but may not execute JavaScript or fire browser pixels. This creates a gap where exchange counts are higher than DSP pixel counts. A large, sudden increase in exchange/DSP discrepancy is a strong IVT signal. Third-party verification vendors (IAS, DoubleVerify) specialise in detecting such patterns.',
        },
        {
          id: 'ortb-reconcile-window',
          prompt:
            'DSP reports 90,000 impressions and exchange reports 100,000 for the same day. The contract allows 10% discrepancy. Should the DSP pay for 100,000 or 90,000?',
          choices: [
            {
              label: '100,000 — exchange count authoritative; 10% within tolerance',
              correct: true,
            },
            { label: '90,000 — the DSP pays only for impressions it measured' },
            { label: '95,000 — the average of both counts as a compromise' },
            { label: 'Disputed — both parties must agree on a common third-party count first' },
          ],
          explain:
            "Standard contract terms (IAB guidelines) state that the exchange's server-side count is authoritative for billing, and a discrepancy of up to 10% is within the acceptable tolerance. The DSP pays for 100,000 impressions. If discrepancy were >10% (e.g. 90k vs 100k = 10% = borderline), the parties would typically negotiate or refer to a third-party verification vendor.",
        },
      ],
      design: {
        prompt:
          "You notice a 25% discrepancy between your exchange's nurl count and the DSP's pixel count for a specific publisher. Walk through your investigation process.",
        answer:
          '1. Scope the discrepancy: is it publisher-wide or specific to certain ad formats, placements, or devices? Filter by browser (ad-block rate varies hugely by demographics).\n2. Ad blocker analysis: compare desktop vs mobile. Desktop has 20–30% ad block rates; mobile is typically < 5%. High desktop % suggests ad blocking.\n3. Creative load time: measure time from nurl (exchange) to pixel fire. If creative takes > 5 seconds to load, some users close the tab before the pixel fires.\n4. IVT check: cross-reference with a third-party verification vendor (IAS/DV) report for the same publisher. High IVT = bot traffic inflating exchange counts.\n5. Publisher content: did the publisher launch a new placement? Some in-stream video placements have high nurl-to-pixel ratios due to user skipping before video loads.\n6. Technical check: verify DSP pixel is present in all ad markup variants (A/B test, different creative sizes). A missing pixel in one creative variant explains partial discrepancy.',
      },
      keyPoints: [
        'Exchange nurl/burl (server-to-server) is authoritative for billing; DSP pixels are client-side.',
        'Normal discrepancy: ≤ 5–10%. Elevated: 10–20%. Critical: > 20% warrants investigation.',
        'Main causes: ad blockers, slow creative load, IVT (bots), network loss, pixel deduplication differences.',
        'IVT creates high exchange/DSP gap: bots fire nurl (server-to-server) but skip browser pixels.',
        'Industry standard (IAB): exchange count governs billing within the contracted discrepancy tolerance.',
      ],
    },
  ],
};
