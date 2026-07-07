import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 6: Reverse Proxy & Ad Serving
export const reverseProxy: GoTopic = {
  id: 'reverse-proxy',
  title: 'Reverse Proxy & Ad Serving',
  icon: 'Server',
  concepts: [
    {
      id: 'ortb-serving-reverse-proxy',
      title: 'Reverse Proxy with httputil',
      difficulty: 'Medium',
      tags: ['reverse-proxy', 'httputil', 'net/http', 'Director', 'ModifyResponse'],
      summary:
        'Using net/http/httputil.ReverseProxy to forward ad requests and transform responses.',
      pattern: 'httputil.ReverseProxy',
      visual:
        'ReverseProxy{Director: mutate req, Transport: forward, ModifyResponse: transform resp}. Director rewrites Host + URL. ModifyResponse rewrites body (inject tracking, macros).',
      memorize:
        'Director = mutate outgoing request (host, path, headers). Transport = HTTP client. ModifyResponse = transform response (inject pixels, substitute macros). ErrorHandler = on failure.',
      scene:
        'A hotel concierge: Director re-addresses your letter to the correct room (rewrites destination), transport carries it, ModifyResponse adds a "welcome to our hotel" sticker before delivery.',
      time: 'O(1) per request plus body copy',
      space: 'O(body_size)',
      code: `package main

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

// newAdProxy creates a reverse proxy that:
//   1. Forwards requests to the upstream ad server.
//   2. Injects a tracking pixel into HTML responses.
//   3. Logs errors gracefully instead of panicking.
func newAdProxy(upstream string) *httputil.ReverseProxy {
	target, err := url.Parse(upstream)
	if err != nil {
		log.Fatalf("invalid upstream URL: %v", err)
	}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			// Rewrite the request to target the upstream ad server.
			req.URL.Scheme = target.Scheme
			req.URL.Host = target.Host
			req.Host = target.Host
			// Forward the original path; strip internal routing prefix.
			req.URL.Path = strings.TrimPrefix(req.URL.Path, "/ad")
			if req.URL.Path == "" {
				req.URL.Path = "/"
			}
			// Remove the X-Forwarded-For header that the stdlib adds by default
			// to avoid leaking internal IP addresses to the ad server.
			req.Header.Del("X-Forwarded-For")
			req.Header.Set("X-Internal-Request", "1")
		},
		Transport: &http.Transport{
			MaxIdleConnsPerHost: 100,
			IdleConnTimeout:     30 * time.Second,
		},
		ModifyResponse: func(resp *http.Response) error {
			ct := resp.Header.Get("Content-Type")
			if !strings.Contains(ct, "text/html") {
				return nil // only inject into HTML responses
			}
			body, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				return err
			}
			// Inject a 1×1 impression pixel before </body>.
			pixel := \`<img src="https://track.example.com/imp?aid=123" width="1" height="1"/>\`
			modified := strings.Replace(string(body), "</body>", pixel+"</body>", 1)
			resp.Body = io.NopCloser(bytes.NewBufferString(modified))
			resp.ContentLength = int64(len(modified))
			resp.Header.Del("Content-Encoding") // pixel injection may change size
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error: %v", err)
			http.Error(w, "ad server unavailable", http.StatusBadGateway)
		},
	}
	return proxy
}

func main() {
	proxy := newAdProxy("https://ads.example.com")
	mux := http.NewServeMux()
	mux.Handle("/ad/", proxy)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Println("Ad proxy listening on :8080")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
`,
      quiz: [
        {
          id: 'ortb-proxy-director',
          prompt: 'In httputil.ReverseProxy, the Director function is called:',
          choices: [
            {
              label: 'Before forwarding — Director mutates the outgoing *http.Request',
              correct: true,
            },
            { label: 'After response claim — Director runs before forwarding, not after' },
            { label: 'Concurrent claim — Director runs before the upstream call, not during' },
            { label: 'Creation-time claim — Director is called per-request, not at creation' },
          ],
          explain:
            'Director is a function(req *http.Request) called synchronously before each upstream request is sent. It should rewrite req.URL.Host/Scheme/Path, modify headers, etc. ModifyResponse is the counterpart for transforming the response. Director must not be used for expensive work since it blocks the proxy goroutine.',
        },
        {
          id: 'ortb-proxy-xforwardedfor',
          prompt:
            'Why might an ad proxy strip or carefully control the X-Forwarded-For header forwarded to the ad server?',
          choices: [
            {
              label: 'IP leak prevention — strips internal proxy IPs before forwarding',
              correct: true,
            },
            { label: 'HTTPS-only claim — X-Forwarded-For is needed for HTTP and HTTPS alike' },
            { label: 'Caching claim — X-Forwarded-For does not cause ad server caching issues' },
            { label: 'Auto-strip claim — httputil.ReverseProxy does not strip X-Forwarded-For' },
          ],
          explain:
            'By default, httputil.ReverseProxy adds the client IP to X-Forwarded-For. If the proxy chain has multiple hops, internal IPs may be visible to the external ad server. The ad server may also use X-Forwarded-For for geotargeting — an internal IP would break geo. Best practice: set X-Forwarded-For to the original client IP only, stripping internal hops.',
        },
        {
          id: 'ortb-proxy-modifyresponse',
          prompt:
            'After ModifyResponse replaces resp.Body with a new buffer, what else must you update?',
          choices: [
            {
              label: 'ContentLength field — update to match new body size after replacement',
              correct: true,
            },
            { label: 'resp.StatusCode — ModifyResponse must return 200 OK' },
            { label: 'resp.Header["Transfer-Encoding"] — set to "identity"' },
            { label: 'Auto-recalc claim — proxy does not auto-recalculate Content-Length' },
          ],
          explain:
            "When you replace resp.Body, the Content-Length header still reflects the original body size. If the client uses Content-Length for buffering, it will read the wrong amount of data. Set resp.ContentLength = int64(len(newBody)) and delete Content-Encoding (since you've decompressed and re-encoded, any gzip/br encoding is now invalid).",
        },
      ],
      design: {
        prompt:
          'Your ad proxy handles 200k requests/second and must inject a different tracking pixel per advertiser into HTML ad markup. What performance concerns exist and how do you address them?',
        answer:
          '1. Body copy: every HTML response must be read into memory to inject the pixel. Use a bytes.Buffer from sync.Pool to avoid per-request heap allocations.\n2. String replacement: strings.Replace creates a new string. At 200k RPS even a small allocation (1 KB/req) = 200 MB/s allocation rate. Use bytes.Replace on []byte, not string, to avoid conversion overhead.\n3. Content-Encoding: compressed responses (gzip/br) must be decompressed before injection, then optionally re-compressed. This is CPU intensive. For latency-critical paths, set Accept-Encoding to "" in Director to disable compression from the upstream.\n4. Max body size: ad markup can be large. Apply io.LimitReader in ModifyResponse to cap memory use.\n5. Cache: for unchanging creatives, cache the pixel-injected result keyed by creative ID and version hash.',
      },
      keyPoints: [
        'Director mutates the outgoing request (host, headers, path) before forwarding.',
        'ModifyResponse transforms the upstream response (inject pixels, substitute macros).',
        'Always update ContentLength after replacing resp.Body in ModifyResponse.',
        'Pool bytes.Buffer in ModifyResponse to reduce allocations at high RPS.',
        'ErrorHandler should return a graceful error to the client, not panic.',
      ],
    },
    {
      id: 'ortb-serving-win-billing',
      title: 'Win Notice (nurl) & Billing Notice (burl)',
      difficulty: 'Medium',
      tags: ['nurl', 'burl', 'win-notice', 'billing', 'server-to-server', 'OpenRTB'],
      summary: 'Implementing exchange-side nurl + burl dispatch and DSP-side win/billing handlers.',
      pattern: 'Win + billing notice dispatch',
      visual:
        'Exchange: fire nurl in background goroutine after auction. DSP: HTTP GET handler logs win + clearing price. Exchange renderer: fire burl on impression render event. DSP: record spend at burl.',
      memorize:
        'nurl fires server-side at auction win; burl fires server-side at billing event (render/viewability). Never block SSP response on nurl/burl calls. Use fire-and-forget goroutines with independent timeout contexts.',
      scene:
        'Car sale: nurl = dealer calls to say "you won the bid!" burl = finance office charges your account when you pick up the car. The showroom floor (SSP) doesn\'t wait for either call — it just hands you the keys.',
      time: 'O(1) per notice',
      space: 'O(1)',
      code: `package main

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ---- Exchange side: dispatch nurl / burl ----

// FireNotice sends a GET request to noticeURL with macro substitutions.
// It is always called in a background goroutine — never block the auction response.
func FireNotice(noticeURL string, macros map[string]string) {
	u := noticeURL
	for k, v := range macros {
		u = strings.ReplaceAll(u, "${'+k+'}", url.QueryEscape(v))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		fmt.Printf("notice URL error: %v\\n", err)
		return
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Printf("notice fire error: %v\\n", err)
		return
	}
	resp.Body.Close()
	fmt.Printf("notice fired: %s status=%d\\n", u[:min(len(u), 80)], resp.StatusCode)
}

// OnAuctionWin fires the winner's nurl in a background goroutine.
// Returns immediately — the SSP response is not blocked.
func OnAuctionWin(winnerNURL string, auctionID string, clearingPrice float64) {
	if winnerNURL == "" {
		return
	}
	go FireNotice(winnerNURL, map[string]string{
		"AUCTION_ID":    auctionID,
		"AUCTION_PRICE": strconv.FormatFloat(clearingPrice, 'f', 6, 64),
		"AUCTION_CURRENCY": "USD",
	})
}

// OnBillingEvent fires the burl when the exchange renderer detects a billable impression.
func OnBillingEvent(bURL string, auctionID string, clearingPrice float64) {
	if bURL == "" {
		return
	}
	go FireNotice(bURL, map[string]string{
		"AUCTION_ID":    auctionID,
		"AUCTION_PRICE": strconv.FormatFloat(clearingPrice, 'f', 6, 64),
	})
}

// ---- DSP side: win + billing handlers ----

type WinEvent struct {
	AuctionID     string
	ClearingPrice float64
	Currency      string
}

func HandleWinNotice(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	priceStr := q.Get("p")
	if priceStr == "" {
		priceStr = q.Get("price")
	}
	price, _ := strconv.ParseFloat(priceStr, 64)
	event := WinEvent{
		AuctionID:     q.Get("aid"),
		ClearingPrice: price,
		Currency:      "USD",
	}
	// In production: write to a ring buffer → Kafka for async processing.
	fmt.Printf("[DSP] WIN: auction=%s clearing_price=%.4f\\n", event.AuctionID, event.ClearingPrice)
	w.WriteHeader(http.StatusOK)
}

func HandleBillingNotice(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	price, _ := strconv.ParseFloat(q.Get("p"), 64)
	fmt.Printf("[DSP] BILL: auction=%s spend=%.4f\\n", q.Get("aid"), price)
	// Record billable spend here — this is the authoritative cost signal.
	w.WriteHeader(http.StatusOK)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	// Exchange side simulation.
	nurl := "https://dsp.example.com/win?aid=\${AUCTION_ID}&p=\${AUCTION_PRICE}"
	burl := "https://dsp.example.com/bill?aid=\${AUCTION_ID}&p=\${AUCTION_PRICE}"

	OnAuctionWin(nurl, "req-001", 3.14)
	time.Sleep(10 * time.Millisecond) // let goroutine fire in demo

	OnBillingEvent(burl, "req-001", 3.14)
	time.Sleep(10 * time.Millisecond)

	fmt.Println("Notice dispatch complete (non-blocking)")
}
`,
      quiz: [
        {
          id: 'ortb-win-goroutine',
          prompt:
            'Why should nurl and burl calls always be made in fire-and-forget goroutines rather than in-line before responding to the SSP?',
          choices: [
            {
              label: 'Latency concern — nurl blocks on DSP network call, adding 10–50 ms',
              correct: true,
            },
            { label: 'Spec requirement claim — OpenRTB spec does not require goroutines' },
            { label: 'Reachability claim — nurl endpoint is reachable right after auction' },
            { label: 'HTTP client claim — Go HTTP client works in regular functions too' },
          ],
          explain:
            "nurl/burl are HTTP GETs to the DSP's tracking server. The DSP's server may have variable latency (10–100 ms). Doing this synchronously would add that latency to the SSP's critical path — adding to the user-visible time before the ad markup is returned. Fire-and-forget goroutines decouple notice delivery from the auction response path entirely.",
        },
        {
          id: 'ortb-win-retry',
          prompt:
            "A DSP's nurl endpoint returns HTTP 500. Should the exchange retry the nurl call?",
          choices: [
            {
              label: 'Yes + backoff — 2–3 retries with exponential backoff; revenue-critical',
              correct: true,
            },
            { label: 'Fire-and-forget claim — nurl needs only one attempt; no retry required' },
            { label: 'Double-billing claim — retrying nurl would double-bill the DSP' },
            { label: 'Yes — retry indefinitely until the DSP returns HTTP 200' },
          ],
          explain:
            "nurl delivery failures directly affect the DSP's revenue reporting — a missed nurl means the DSP doesn't know it won. Best practice: 2–3 retries with exponential backoff (e.g. 100 ms, 500 ms). Limit total retry window to ~5 seconds to avoid holding goroutines. Note: burl retries are more critical than nurl since burl = billable event; missing burl = revenue leak.",
        },
        {
          id: 'ortb-win-clearing-price',
          prompt:
            'The exchange fills \${AUCTION_PRICE} in the nurl with the clearing price. In a first-price auction, this equals:',
          choices: [
            {
              label: "Winner's bid price — what the winning DSP actually pays in first-price",
              correct: true,
            },
            { label: 'Second-highest bid — this is the clearing price in second-price auctions' },
            { label: 'Publisher floor — minimum CPM the publisher set for the slot' },
            { label: 'Average bid claim — clearing price is not an average of all bids' },
          ],
          explain:
            "In a first-price auction, the winner pays their bid — so \${AUCTION_PRICE} = winner's bid. In a second-price auction, \${AUCTION_PRICE} = clearing price = max(floor, second-highest bid). The DSP should always record the macro value (not their own bid) as their actual spend for accurate cost tracking.",
        },
      ],
      design: {
        prompt:
          'Your exchange must guarantee at-least-once delivery of burl (billing notice) calls even under exchange pod restarts. How would you implement this durably?',
        answer:
          "1. Write-ahead log: before responding to the SSP, append (burl_url, clearing_price, expiry_time) to a local write-ahead log (e.g. WAL file or embedded key-value store).\n2. Background worker: a separate goroutine reads from the WAL and fires bURL calls with retries (3 attempts, exponential backoff).\n3. On success: mark the entry as delivered and delete from WAL.\n4. On pod restart: on startup, scan the WAL for undelivered entries and re-fire them. Use entry expiry_time to drop stale entries (e.g. >1 hour).\n5. Exactly-once semantics: include a unique idempotency key in the burl query string (e.g. auction ID + imp ID). The DSP's billing handler must be idempotent — deduplicate by this key using a Redis SETNX with TTL.",
      },
      keyPoints: [
        'nurl fires server-to-server at auction win time; burl fires at billable impression event.',
        'Always fire nurl/burl in goroutines — never block the SSP response on notice delivery.',
        'Retry nurl/burl on 5xx with 2–3 attempts + exponential backoff; log failures.',
        'DSP billing handler must be idempotent — use auction ID as deduplication key.',
        "Clearing price in macros differs by auction type: FP = winner's bid, SP = second-highest.",
      ],
    },
    {
      id: 'ortb-serving-markup',
      title: 'Markup Serving & AUCTION_PRICE Macro',
      difficulty: 'Medium',
      tags: ['adm', 'AUCTION_PRICE', 'macros', 'markup', 'CDN', 'creative'],
      summary:
        'Two markup-serving modes (inline adm vs nurl), macro substitution, and creative delivery.',
      pattern: 'Markup serving modes',
      visual:
        'Mode 1: adm in BidResponse → exchange passes to publisher directly. Mode 2: nurl → exchange GETs markup from DSP → passes to publisher. In both cases, exchange substitutes \${AUCTION_PRICE} before delivery.',
      memorize:
        'adm = markup inline. nurl = fetch markup on win. Exchange substitutes macros in adm + nurl before returning to SSP. \${AUCTION_PRICE} must be URL-encoded in URLs, plain in adm bodies.',
      scene:
        'Dinner delivery: adm = "meal is inside the box, already prepared." nurl = "call the restaurant to collect the meal on win." Either way, the waiter (exchange) writes the final bill (\${AUCTION_PRICE}) on the receipt before handing it to the customer (SSP).',
      time: 'O(|markup|) for macro substitution',
      space: 'O(|markup|)',
      code:
        `package main

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// MacroValues holds all values available for substitution at auction time.
type MacroValues struct {
	AuctionID     string
	ImpID         string
	BidID         string
	SeatID        string
	AdID          string
	ClearingPrice float64
	Currency      string
	LossReason    int // for \${AUCTION_LOSS} in lurl
}

// SubstituteMarkup replaces OpenRTB macros in ad markup (HTML body).
// In markup bodies, macro values are used as-is (not URL-encoded).
func SubstituteMarkup(markup string, v MacroValues) string {
	priceStr := strconv.FormatFloat(v.ClearingPrice, 'f', 6, 64)
	r := strings.NewReplacer(
		"\${AUCTION_PRICE}",    priceStr,
		"\${AUCTION_ID}",       v.AuctionID,
		"\${AUCTION_IMP_ID}",   v.ImpID,
		"\${AUCTION_BID_ID}",   v.BidID,
		"\${AUCTION_SEAT_ID}",  v.SeatID,
		"\${AUCTION_AD_ID}",    v.AdID,
		"\${AUCTION_CURRENCY}", v.Currency,
	)
	return r.Replace(markup)
}

// SubstituteURL replaces OpenRTB macros in URLs.
// Macro values in URL context MUST be URL-encoded.
func SubstituteURL(rawURL string, v MacroValues) string {
	priceStr := strconv.FormatFloat(v.ClearingPrice, 'f', 6, 64)
	r := strings.NewReplacer(
		"\${AUCTION_PRICE}",    url.QueryEscape(priceStr),
		"\${AUCTION_ID}",       url.QueryEscape(v.AuctionID),
		"\${AUCTION_IMP_ID}",   url.QueryEscape(v.ImpID),
		"\${AUCTION_BID_ID}",   url.QueryEscape(v.BidID),
		"\${AUCTION_SEAT_ID}",  url.QueryEscape(v.SeatID),
		"\${AUCTION_AD_ID}",    url.QueryEscape(v.AdID),
		"\${AUCTION_CURRENCY}", url.QueryEscape(v.Currency),
		"\${AUCTION_LOSS}",     url.QueryEscape(strconv.Itoa(v.LossReason)),
	)
	return r.Replace(rawURL)
}

func main() {
	v := MacroValues{
		AuctionID:     "req-001",
		ImpID:         "imp-1",
		BidID:         "bid-abc",
		SeatID:        "seat-a",
		AdID:          "ad-5",
		ClearingPrice: 3.141592,
		Currency:      "USD",
	}

	// Inline markup with \${AUCTION_PRICE} used for a tracking call.
	adm := \`<div><img src="https://px.track.com/imp?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}" width="1" height="1"/>` +
        `<a href="https://click.track.com/click?bid=\${AUCTION_BID_ID}">Ad content</a></div>\`

	fmt.Println("=== Markup substitution ===")
	fmt.Println(SubstituteMarkup(adm, v))

	// URL-only macro substitution (for nurl / burl).
	nurl := "https://exchange.com/win?p=\${AUCTION_PRICE}&aid=\${AUCTION_ID}"
	lurl := "https://exchange.com/loss?reason=\${AUCTION_LOSS}&aid=\${AUCTION_ID}"

	fmt.Println("\\n=== URL substitution ===")
	fmt.Println("nurl:", SubstituteURL(nurl, v))
	v.LossReason = 1
	fmt.Println("lurl:", SubstituteURL(lurl, v))
}
`,
      quiz: [
        {
          id: 'ortb-markup-who-substitutes',
          prompt:
            'In the standard OpenRTB workflow, who performs \${AUCTION_PRICE} macro substitution?',
          choices: [
            {
              label: 'Exchange substitutes — replaces macros in adm/nurl before SSP delivery',
              correct: true,
            },
            { label: 'DSP substitutes claim — DSPs embed macros; exchange replaces them' },
            { label: "The publisher's browser — it replaces macros when the creative renders" },
            { label: 'SSP substitutes claim — SSP receives markup after exchange substitution' },
          ],
          explain:
            'The exchange owns the clearing price (which may differ from the submitted bid in second-price auctions) and therefore performs macro substitution. The DSP includes literal \${AUCTION_PRICE} in its adm/nurl — the exchange replaces it with the actual clearing price before forwarding to the SSP or calling the win notice URL.',
        },
        {
          id: 'ortb-markup-encoding',
          prompt:
            'When \${AUCTION_PRICE} appears inside a URL query parameter in adm markup, how should it be substituted?',
          choices: [
            {
              label: 'URL-encoded — percent-encode the substituted value in URL contexts',
              correct: true,
            },
            { label: 'Base64-encoded claim — base64 is not required; URL-encode is correct' },
            { label: 'Left raw claim — URL encoding required for macro values in URL context' },
            { label: 'HTML-entity claim — HTML entity encoding applies to markup, not macros' },
          ],
          explain:
            "The OpenRTB spec is explicit: when macros appear as URL parameters, values must be URL-encoded to avoid breaking the URL structure. Prices are numeric and don't contain special characters, but other macros (IDs with special chars) do. Apply consistent URL encoding for all macro values in URL contexts. In plain markup body text (non-URL context), use raw values.",
        },
        {
          id: 'ortb-markup-adm-vs-nurl-latency',
          prompt:
            'Serving markup via adm (inline in BidResponse) vs nurl (exchange fetches from DSP on win) — which has lower latency for the publisher?',
          choices: [
            {
              label: 'adm — markup is already in the BidResponse; no extra DSP round-trip',
              correct: true,
            },
            { label: 'nurl latency claim — nurl adds a DSP round-trip, not removes it' },
            { label: 'Equal claim — exchange does not buffer markup for either path' },
            { label: 'nurl browser claim — adm does not require a separate browser fetch' },
          ],
          explain:
            "With adm, the exchange has the markup in hand as soon as it selects the winner — no extra network call needed. With nurl, the exchange must make an additional HTTP GET to the DSP's server to retrieve the markup, adding 5–30 ms of DSP server latency. For low-latency exchange integrations, adm is preferred; nurl is used for dynamic creative generation or when markup is too large to embed in the BidResponse.",
        },
      ],
      design: {
        prompt:
          'Your exchange needs to support both adm (inline markup) and nurl (markup-on-win) from DSPs on the same auction. Design the markup retrieval logic.',
        answer:
          '1. Preference: if Bid.adm is non-empty, use it directly (fastest path). Substitute macros inline.\n2. Fallback to nurl: if adm is empty and nurl is present, make an HTTP GET to nurl with macro values in the URL. Set a 30 ms timeout for this call.\n3. Parallel markup fetch: for multi-impression auctions, fire all nurl calls concurrently (one goroutine per winning bid) to avoid serial latency stacking.\n4. Markup caching: if the DSP returns cache headers (Cache-Control: max-age=300) on nurl responses, cache the markup keyed by (dsp_id, creative_id) to avoid fetching the same creative repeatedly.\n5. Failure handling: if the nurl call fails or times out, the impression is a no-fill for that slot — log the creative ID and DSP for SLA tracking.',
      },
      keyPoints: [
        'adm: inline markup in BidResponse (lower latency). nurl: exchange fetches markup on win (dynamic).',
        'Exchange performs \${AUCTION_PRICE} macro substitution — not the DSP and not the browser.',
        'URL contexts require URL-encoded macro values; markup body contexts use raw values.',
        'After substitution, validate that the resulting URL is parseable before firing.',
        'adm + nurl can coexist: adm takes precedence; nurl is a fallback or dynamic-creative path.',
      ],
    },
    {
      id: 'ortb-serving-cdn',
      title: 'CDN Creatives & Creative Auditing',
      difficulty: 'Easy',
      tags: ['CDN', 'creative', 'IURL', 'crid', 'brand-safety', 'audit'],
      summary:
        'Hosting creatives on CDN, the iurl audit snapshot, and brand-safety classification.',
      pattern: 'CDN + creative audit',
      visual:
        'DSP hosts creative assets on CDN (low latency). Bid.iurl = a static snapshot URL for exchange auditing. Exchange checks crid + iurl in asynchronous audit pipeline (brand-safety, malware scan). New crid → audit queue; audited crid → approved/blocked.',
      memorize:
        'IURL = image URL for audit (not the live creative). CRID = stable creative ID. New CRID → audit. Approved CRIDs run immediately. Blocked CRIDs → no fill. CDN for static assets, DSP server only for dynamic (personalized) markup.',
      scene:
        "A billboard company reviewing submitted artwork: iurl is the proof PDF the artist sends for review. crid is the artwork reference number. The billboard (exchange) doesn't post the ad until the artwork is approved. If the artist changes the artwork but keeps the same reference number, that's fraud.",
      time: 'O(1) per bid; O(audit_pipeline) async',
      space: '—',
      code: `package main

import (
	"crypto/md5"
	"fmt"
	"sync"
	"time"
)

// CreativeStatus tracks audit results per creative.
type CreativeStatus int

const (
	StatusPending  CreativeStatus = iota
	StatusApproved                // safe to serve
	StatusBlocked                 // blocked: violates policy
	StatusAudit                   // under review
)

// CreativeRecord stores the audit state for a DSP creative.
type CreativeRecord struct {
	CrID       string
	DSPID      string
	IURL       string
	ADomains   []string
	Status     CreativeStatus
	SubmitTime time.Time
	Reason     string // for blocked status
}

// CreativeAuditStore is a thread-safe in-memory store for creative audit states.
type CreativeAuditStore struct {
	mu      sync.RWMutex
	records map[string]*CreativeRecord // key: dspID+":"+crid
}

func NewAuditStore() *CreativeAuditStore {
	return &CreativeAuditStore{records: make(map[string]*CreativeRecord)}
}

func (s *CreativeAuditStore) key(dspID, crid string) string {
	return dspID + ":" + crid
}

// Lookup returns the creative status. Unknown crids return StatusPending.
func (s *CreativeAuditStore) Lookup(dspID, crid string) CreativeStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if r, ok := s.records[s.key(dspID, crid)]; ok {
		return r.Status
	}
	return StatusPending
}

// Submit queues a new creative for audit if not already known.
func (s *CreativeAuditStore) Submit(cr CreativeRecord) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := s.key(cr.DSPID, cr.CrID)
	if _, exists := s.records[k]; exists {
		return false // already known, no action needed
	}
	cr.Status = StatusAudit
	cr.SubmitTime = time.Now()
	s.records[k] = &cr
	return true // new — enqueue for async audit
}

// Approve or block a creative after audit completes.
func (s *CreativeAuditStore) SetStatus(dspID, crid string, status CreativeStatus, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := s.key(dspID, crid)
	if r, ok := s.records[k]; ok {
		r.Status = status
		r.Reason = reason
	}
}

// IURLHash returns an MD5 hash of the IURL to detect markup changes.
func IURLHash(iurl string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(iurl)))[:8]
}

func main() {
	store := NewAuditStore()

	cr := CreativeRecord{
		CrID:     "banner-300x250-v2",
		DSPID:    "dsp-a",
		IURL:     "https://cdn.dsp-a.com/creatives/banner-300x250-v2.jpg",
		ADomains: []string{"nike.com"},
	}

	isNew := store.Submit(cr)
	fmt.Printf("Creative submitted (new=%t) crid=%s\\n", isNew, cr.CrID)
	fmt.Printf("Status: %d (1=audit)\\n", store.Lookup(cr.DSPID, cr.CrID))

	// Simulate async audit completion.
	store.SetStatus(cr.DSPID, cr.CrID, StatusApproved, "")
	fmt.Printf("After audit: status=%d (1=approved)\\n", store.Lookup(cr.DSPID, cr.CrID))

	// Hash used to detect if DSP changed markup with same crid (fraud signal).
	fmt.Printf("IURL hash: %s\\n", IURLHash(cr.IURL))
}
`,
      quiz: [
        {
          id: 'ortb-cdn-iurl',
          prompt: 'The Bid.iurl field contains:',
          choices: [
            {
              label: 'Audit snapshot — static creative image for brand-safety review',
              correct: true,
            },
            { label: 'Live creative URL — iurl is for audit only, not the served creative' },
            { label: 'Impression pixel — iurl is a creative snapshot, not a tracking pixel' },
            { label: 'Landing page — iurl is for audit, not the click-through destination' },
          ],
          explain:
            "iurl (Image URL) is a static snapshot of the creative intended for the exchange's audit pipeline — not the live creative served to users. The exchange's brand-safety crawler fetches this URL to scan for prohibited content, malware, or policy violations. It's separate from the actual adm creative markup.",
        },
        {
          id: 'ortb-cdn-crid-stability',
          prompt:
            'An exchange allows a DSP to skip creative audit for already-approved crid values. What attack does this create if crid is not stable?',
          choices: [
            {
              label: 'Creative substitution — approve benign then swap in malicious markup',
              correct: true,
            },
            { label: "Bid shading — the DSP underbids knowing the exchange won't re-check" },
            { label: 'Frequency cap bypass — recycled crids reset user impression counts' },
            { label: 'Price floor bypass — old crids have lower floor prices cached' },
          ],
          explain:
            "If a DSP changes creative markup but reuses an already-approved crid, the exchange's audit cache considers it safe and serves it immediately without re-review. This is a known attack: submit a benign ad to get the crid approved, then change the adm to serve malware or prohibited content. Defence: hash the adm or iurl on every bid and invalidate the approved status if the hash changes.",
        },
        {
          id: 'ortb-cdn-https',
          prompt: 'Why should CDN-hosted creative assets always be served over HTTPS?',
          choices: [
            {
              label: 'Mixed-content block — browsers block HTTP assets on HTTPS pages',
              correct: true,
            },
            { label: 'HTTP/2 speed claim — HTTPS speed gain is unrelated to ad serving policy' },
            { label: 'Spec requirement claim — OpenRTB 2.6 does not mandate HTTPS for all URLs' },
            { label: 'Ad-blocker claim — ad blockers target domains, not HTTP vs HTTPS' },
          ],
          explain:
            'Modern browsers (Chrome, Firefox, Safari) block "mixed content" — HTTP sub-resources loaded from an HTTPS page. Most publisher pages today are HTTPS. If a creative\'s image, video, or JavaScript is served over HTTP, the browser will silently block it and the ad won\'t render. This is why Imp.secure=1 exists: it signals that the publisher requires HTTPS-only creatives.',
        },
      ],
      design: {
        prompt:
          'Design an asynchronous creative audit pipeline for your exchange that scans new creatives for brand-safety violations without blocking bid serving.',
        answer:
          '1. Submission: when a new (dsp_id, crid) pair is first seen, write it to the audit queue (Kafka topic) with the iurl. Mark status = PENDING in the creative store.\n2. Auction behaviour: bids with PENDING crid are allowed to serve for a configurable grace period (e.g. 1 hour) to avoid penalising legitimate new creatives. After grace period, require APPROVED.\n3. Audit workers: consumer group reads from Kafka. Each worker: (a) fetches iurl, (b) runs content classifier (brand safety model + keyword scan), (c) checks for malware (JS sandbox scan), (d) writes APPROVED or BLOCKED to creative store.\n4. Creative store: Redis hash keyed by dsp_id:crid. Bidders read status in O(1) from a local in-process cache (refreshed every 30 seconds from Redis).\n5. Re-audit: hash iurl content on each bid; if hash changes for an approved crid, re-queue for audit.',
      },
      keyPoints: [
        'iurl = static image snapshot for exchange audit; not the live creative URL.',
        'crid must be stable per creative content; changing markup without rotating crid is a policy violation.',
        'Hash adm/iurl per bid to detect crid reuse with changed content.',
        'Creative audit is asynchronous; new crids get a grace period before approval is required.',
        'All CDN creative assets must be HTTPS to avoid mixed-content browser blocks.',
      ],
    },
  ],
};
