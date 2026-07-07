import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 8: Creatives & Ad Tags
export const creativesTags: GoTopic = {
  id: 'creatives-tags',
  title: 'Creatives & Ad Tags',
  icon: 'FileCode',
  concepts: [
    {
      id: 'ortb-creative-banner',
      title: 'Banner HTML & MRAID',
      difficulty: 'Easy',
      tags: ['banner', 'HTML', 'MRAID', 'creative', 'SafeFrame', 'adm'],
      summary:
        'Banner creative markup in adm: plain HTML, MRAID for mobile rich media, and SafeFrame.',
      pattern: 'Banner creative',
      visual:
        'Bid.adm contains HTML markup. Browser renders in iframe/SafeFrame. MRAID API for mobile in-app expandable/interstitial. Mtype=1 (banner). Creative in CDN. Secure=1 → HTTPS URLs only.',
      memorize:
        'Banner adm = HTML string. MRAID = rich media API for in-app (expand, close, getVersion). SafeFrame = sandboxed iframe for web. mtype=1. Secure creative = all HTTPS URLs in adm.',
      scene:
        'A digital billboard: the adm is the poster artwork (HTML). MRAID is the mechanism that lets a folded poster expand to full-size on mobile. SafeFrame is the protective glass that lets people see the poster without touching the electrical wiring.',
      time: '—',
      space: '—',
      code: `package main

import (
	"fmt"
	"strings"
)

// BannerCreative represents a banner ad creative with its markup and metadata.
type BannerCreative struct {
	CrID       string
	Width      int
	Height     int
	AdMarkup   string // HTML string for Bid.adm
	IsSecure   bool
	IsMRAID    bool
}

// ValidateMarkup performs basic security checks on banner HTML markup.
// In production, use a full HTML parser and allowlist-based sanitiser.
func ValidateMarkup(markup string, requireSecure bool) error {
	lower := strings.ToLower(markup)

	// Block JavaScript URL schemes that bypass CSP.
	if strings.Contains(lower, "javascript:") {
		return fmt.Errorf("forbidden: javascript: URL scheme detected")
	}

	// Block data URIs (can embed executable content).
	if strings.Contains(lower, "data:text/html") || strings.Contains(lower, "data:application") {
		return fmt.Errorf("forbidden: data: URI with active content detected")
	}

	// Require HTTPS for all URLs when secure=1.
	if requireSecure {
		for _, token := range []string{"src=\"http:", "src='http:", "href=\"http:", "href='http:"} {
			if strings.Contains(lower, token) {
				return fmt.Errorf("security violation: HTTP URL in secure creative: %s", token)
			}
		}
	}

	return nil
}

// GenerateMRAIDTag creates a basic MRAID-compliant HTML tag for in-app rich media.
// MRAID 3.0 is the standard for mobile in-app creatives.
func GenerateMRAIDTag(cdnBase, crID string, w, h int) string {
	return fmt.Sprintf(\`<html><head>
<meta name="viewport" content="width=device-width"/>
<script src="mraid.js"></script>
</head>
<body style="margin:0;padding:0;background:transparent;">
<div id="ad-%s" style="width:%dpx;height:%dpx;overflow:hidden;">
  <img src="%s/%s/banner.jpg" width="%d" height="%d" alt="Advertisement"/>
  <img src="https://px.track.com/imp?crid=%s" width="1" height="1"/>
</div>
<script>
  if (typeof mraid !== 'undefined') {
    mraid.addEventListener('ready', function() {
      // MRAID API available — in-app environment detected.
      document.getElementById('ad-%s').addEventListener('click', function() {
        mraid.open('https://advertiser.example.com/landing');
      });
    });
  }
</script>
</body></html>\`, crID, w, h, cdnBase, crID, w, h, crID, crID)
}

func main() {
	// Standard display banner (728×90).
	banner := BannerCreative{
		CrID:  "banner-728x90-v1",
		Width: 728, Height: 90,
		IsSecure: true,
		AdMarkup: \`<div style="width:728px;height:90px;">
  <a href="https://click.track.com/click?cid=xyz&dest=https%3A%2F%2Fadvertiser.com">
    <img src="https://cdn.example.com/banner-728x90.jpg" width="728" height="90"/>
  </a>
  <img src="https://px.track.com/imp?crid=banner-728x90-v1" width="1" height="1"/>
</div>\`,
	}

	err := ValidateMarkup(banner.AdMarkup, banner.IsSecure)
	fmt.Printf("Banner validation: err=%v\\n", err)

	// Test an insecure URL.
	insecure := \`<img src="http://cdn.example.com/ad.jpg"/>\`
	err = ValidateMarkup(insecure, true)
	fmt.Printf("Insecure markup validation: err=%v\\n", err)

	// MRAID creative.
	mraidTag := GenerateMRAIDTag("https://cdn.example.com/creatives", "mraid-300x250-v2", 300, 250)
	fmt.Printf("\\nMRAID tag length: %d bytes\\n", len(mraidTag))
	fmt.Println("First 200 chars:", mraidTag[:200])
}
`,
      quiz: [
        {
          id: 'ortb-banner-mraid',
          prompt:
            'MRAID (Mobile Rich Media Ad Interface Definitions) is needed for banner ads because:',
          choices: [
            {
              label: 'Native SDK bridge — MRAID gives in-app WebView expand/close/open APIs',
              correct: true,
            },
            { label: 'iOS requirement — MRAID is not mandatory for all iOS banner ads' },
            { label: 'HTTPS enforcement — MRAID does not handle HTTPS policy for creatives' },
            { label: 'Video standard claim — VAST handles video; MRAID covers rich-media' },
          ],
          explain:
            'In mobile apps, the WebView (where HTML ads run) is sandboxed. MRAID is a JavaScript API that provides access to native device features: expand(), close(), getVersion(), addEventListener("ready"), getState(), open(url). Without MRAID, a banner ad can\'t expand to full-screen, detect when it\'s in view, or open the native browser reliably. The SDK (MoPub, Google Mobile Ads) injects the MRAID script into the WebView.',
        },
        {
          id: 'ortb-banner-safeframe',
          prompt: 'What does a SafeFrame provide for banner ads on web pages?',
          choices: [
            {
              label: 'Isolated iframe — prevents creative accessing publisher DOM or cookies',
              correct: true,
            },
            { label: 'Slot overflow claim — SafeFrame sandboxes; it does not enlarge the slot' },
            { label: 'Server-side render claim — SafeFrame is browser-side, not server-side' },
            { label: 'Encryption claim — SafeFrame is an iframe sandbox, not encryption' },
          ],
          explain:
            "SafeFrame is an IAB standard for a sandboxed iframe with a controlled communication channel ($sf.ext API). It prevents creative JavaScript from accessing the parent page's DOM, cookies, or localStorage — protecting user privacy and publisher page security. Publishers use SafeFrame as a secure container for third-party ad creatives.",
        },
        {
          id: 'ortb-banner-mtype',
          prompt:
            'A bid response sets mtype=1. What should the exchange/publisher ad server do with the adm?',
          choices: [
            {
              label: 'Render as banner HTML — mtype=1 routes adm to iframe or SafeFrame',
              correct: true,
            },
            { label: 'Pass to VAST player — mtype=2 routes adm to a video player instead' },
            { label: 'Parse as native — mtype=4 routes adm to the native JSON parser' },
            { label: 'Send to MRAID — MRAID handles in-app rich-media, not audio playback' },
          ],
          explain:
            'mtype values: 1=banner (render HTML in iframe), 2=video (pass VAST XML to video player), 3=audio, 4=native (parse native JSON). The exchange/ad server must inspect mtype to know how to handle the adm. Without mtype on a multi-format impression, the server would have to guess the creative type, risking misrendering.',
        },
      ],
      design: {
        prompt:
          'A DSP submits a banner creative with an adm containing an inline <script> tag loading a third-party JavaScript file. Should the exchange allow this? What risks does it create and how would you mitigate them?',
        answer:
          'Risks: (1) Malicious JavaScript — could steal cookies, mine crypto, redirect users. (2) Data exfiltration — scripts can read page content if not in SafeFrame. (3) Slow loading — large external JS degrades page performance. (4) Bidstream data leakage — third-party scripts may read targeting context.\n\nMitigation: (1) Require all creatives to run in SafeFrame (sandboxed iframe). (2) Audit the creative during the asynchronous audit pipeline — run the creative in a sandboxed browser and check for network calls to blocklisted domains. (3) Apply a Content Security Policy (CSP) to the SafeFrame: script-src nonce-xxx — allows only scripts with a matching nonce. (4) Use a CSP parser in the exchange pipeline to flag creatives with inline scripts or external JS loading from unknown domains before approval. (5) Whitelist trusted third-party measurement scripts (IAS, DoubleVerify, MOAT) and block all others by default.',
      },
      keyPoints: [
        'Banner adm is an HTML string; rendered by browser in an iframe or SafeFrame.',
        'MRAID provides JavaScript API for native in-app features (expand, close, open URL).',
        'SafeFrame sandboxes the creative from the publisher page DOM and cookies.',
        'mtype=1 signals banner; exchange routes adm to banner renderer (not VAST/native parser).',
        'All URLs in secure creatives must be HTTPS; validate with a content security scanner.',
      ],
    },
    {
      id: 'ortb-creative-vast',
      title: 'VAST Video Ad Serving Template',
      difficulty: 'Hard',
      tags: ['VAST', 'video', 'VPAID', 'InLine', 'Wrapper', 'tracking-events'],
      summary:
        'VAST XML structure: Ad, InLine/Wrapper, Impression, Linear, MediaFiles, TrackingEvents.',
      pattern: 'VAST XML structure',
      visual:
        'VAST{Ad{InLine{Impression[],Creatives{Creative{Linear{Duration, MediaFiles[],TrackingEvents[]}}}}}}. Wrapper wraps another VAST URL for ad podding. TrackingEvents fire on: start, firstQuartile, midpoint, thirdQuartile, complete.',
      memorize:
        'VAST = XML served as adm (mtype=2). InLine = self-contained ad. Wrapper = redirect to another VAST URL. Tracking quartile events: start, 25%, 50%, 75%, complete. MediaFile = actual video URL. Impression = view tracking.',
      scene:
        'A Russian nesting doll of TV commercials: VAST is the outermost doll. Wrapper peels open to reveal another VAST (the inner doll, another ad server). InLine is the innermost doll — the actual video file and all its tracking hooks.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/xml"
	"fmt"
)

// Minimal VAST 4.x type definitions for InLine ads.

type VAST struct {
	XMLName xml.Name \`xml:"VAST"\`
	Version string   \`xml:"version,attr"\`
	Ads     []Ad     \`xml:"Ad"\`
}

type Ad struct {
	ID     string \`xml:"id,attr,omitempty"\`
	Inline *Inline \`xml:"InLine"\`
}

type Inline struct {
	AdSystem   string     \`xml:"AdSystem"\`
	AdTitle    string     \`xml:"AdTitle"\`
	Impression []CDATA    \`xml:"Impression"\`
	Creatives  []Creative \`xml:"Creatives>Creative"\`
}

type Creative struct {
	ID     string  \`xml:"id,attr,omitempty"\`
	Linear *Linear \`xml:"Linear"\`
}

type Linear struct {
	Duration     string         \`xml:"Duration"\` // HH:MM:SS
	MediaFiles   []MediaFile    \`xml:"MediaFiles>MediaFile"\`
	TrackingEvents []TrackingEvent \`xml:"TrackingEvents>Tracking"\`
	VideoClicks  *VideoClicks   \`xml:"VideoClicks"\`
}

type MediaFile struct {
	Delivery string \`xml:"delivery,attr"\` // progressive or streaming
	Type     string \`xml:"type,attr"\`     // MIME type
	Width    int    \`xml:"width,attr"\`
	Height   int    \`xml:"height,attr"\`
	URL      string \`xml:",chardata"\`
}

type TrackingEvent struct {
	Event string \`xml:"event,attr"\` // start, firstQuartile, midpoint, thirdQuartile, complete
	URL   string \`xml:",chardata"\`
}

type VideoClicks struct {
	ClickThrough string \`xml:"ClickThrough"\`
	ClickTracking []string \`xml:"ClickTracking"\`
}

type CDATA struct {
	URL string \`xml:",chardata"\`
}

func main() {
	vast := VAST{
		Version: "4.2",
		Ads: []Ad{{
			ID: "ad-001",
			Inline: &Inline{
				AdSystem: "ExampleDSP v1.0",
				AdTitle:  "Nike Air Max Campaign",
				Impression: []CDATA{
					{URL: "https://px.track.com/vast-imp?aid=req-001&p=3.14"},
				},
				Creatives: []Creative{{
					ID: "cr-video-30s",
					Linear: &Linear{
						Duration: "00:00:30",
						MediaFiles: []MediaFile{{
							Delivery: "progressive",
							Type:     "video/mp4",
							Width:    1920, Height: 1080,
							URL: "https://cdn.example.com/nike-air-30s-1080p.mp4",
						}},
						TrackingEvents: []TrackingEvent{
							{Event: "start",          URL: "https://track.example.com/vast?event=start&aid=req-001"},
							{Event: "firstQuartile",  URL: "https://track.example.com/vast?event=q1&aid=req-001"},
							{Event: "midpoint",       URL: "https://track.example.com/vast?event=mid&aid=req-001"},
							{Event: "thirdQuartile",  URL: "https://track.example.com/vast?event=q3&aid=req-001"},
							{Event: "complete",       URL: "https://track.example.com/vast?event=complete&aid=req-001"},
						},
						VideoClicks: &VideoClicks{
							ClickThrough: "https://click.example.com/click?dest=https%3A%2F%2Fnike.com",
						},
					},
				}},
			},
		}},
	}

	out, _ := xml.MarshalIndent(vast, "", "  ")
	fmt.Println(xml.Header + string(out))
}
`,
      quiz: [
        {
          id: 'ortb-vast-inline-vs-wrapper',
          prompt: 'A VAST Wrapper ad differs from a VAST InLine ad in that:',
          choices: [
            {
              label: 'Wrapper chains — VASTAdTagURI redirect; InLine has the actual assets',
              correct: true,
            },
            { label: 'HTML5 vs Flash claim — both InLine and Wrapper support HTML5 video' },
            { label: 'Tracking events claim — InLine also supports TrackingEvents elements' },
            { label: 'Position claim — Wrapper and InLine do not encode ad break positions' },
          ],
          explain:
            'VAST Wrapper chains multiple ad servers: the first VAST document is a Wrapper with a VASTAdTagURI pointing to the next VAST (another Wrapper or an InLine). The chain terminates at an InLine which contains the actual MediaFiles (video URLs) and creative. This allows ad verification vendors, third-party measurement, and multiple ad-server hops. Publishers typically limit wrapper chains to 3–5 levels to control latency.',
        },
        {
          id: 'ortb-vast-tracking-quartile',
          prompt:
            'A user starts a 30-second video ad but closes the player at the 20-second mark. Which tracking events should fire?',
          choices: [
            {
              label: '3 quartile events fire — start, firstQuartile, midpoint; complete missed',
              correct: true,
            },
            { label: 'Start+complete events claim — quartile events are required by VAST spec' },
            { label: 'complete on close claim — complete fires at 100%, not on player close' },
            { label: 'firstQuartile claim — player stops at 20s, past the 25% mark' },
          ],
          explain:
            "VAST tracking events are fired at specific percentage marks of the ad duration: start (first frame), firstQuartile (25%), midpoint (50%), thirdQuartile (75%), complete (100%). At 20 seconds of a 30-second ad, the player has passed 66%, so start (0%), firstQuartile (7.5s), and midpoint (15s) fire. thirdQuartile fires at 22.5s — the user closed at 20s so it doesn't fire. complete doesn't fire.",
        },
        {
          id: 'ortb-vast-mtype',
          prompt: 'When a DSP returns VAST XML in Bid.adm, what must Bid.mtype be set to?',
          choices: [
            { label: '2 — video', correct: true },
            { label: '1 — banner' },
            { label: '4 — native' },
            { label: '3 — audio, since VAST handles audio too' },
          ],
          explain:
            'mtype=2 signals video (VAST/VPAID). The exchange/publisher ad server routes mtype=2 adm to the video player framework (IMA SDK, Prebid Video, etc.) which knows how to parse and execute VAST XML. Without mtype, the ad server would have to detect the content type by parsing the adm string, which is error-prone.',
        },
      ],
      design: {
        prompt:
          'A publisher uses a VAST Wrapper chain where each hop adds 20–30 ms latency (DNS + TLS + HTTP). With a 5-hop chain, this adds 100–150 ms before the video starts playing. How would you reduce this latency?',
        answer:
          "1. Limit chain depth: enforce a maximum wrapper chain depth (e.g. 3 hops) in the SSP's VAST parser. Reject chains > 3 hops and treat as no-fill.\n2. Server-side chain resolution: instead of the browser/player resolving each VAST hop, have the exchange resolve the chain server-side and return the final InLine VAST to the player. Eliminates all wrapper DNS/TLS overhead.\n3. VAST pre-fetch: start resolving VAST before the ad break starts (pre-fetch during content playback). The player buffers the resolved VAST so by break time it's already resolved.\n4. HTTPS + HTTP/2: all VAST hops over HTTPS with HTTP/2 multiplexing reduces TLS handshake overhead.\n5. CDN caching: intermediate VAST Wrappers that don't change per request (e.g. verification layers) can be served from CDN with short TTLs (30–60 seconds).",
      },
      keyPoints: [
        'VAST InLine: contains actual ad assets (MediaFiles, tracking, clickthrough). Wrapper: redirects to another VAST URL.',
        'Quartile tracking events: start (0%), firstQuartile (25%), midpoint (50%), thirdQuartile (75%), complete (100%).',
        'mtype=2 in Bid signals VAST/video; exchange routes to video player, not banner renderer.',
        'Wrapper chains add latency (DNS+TLS per hop); limit chain depth to 3 in publisher policy.',
        'Impression pixel in VAST (<Impression>) fires when the player starts the ad (not at completion).',
      ],
    },
    {
      id: 'ortb-creative-native',
      title: 'Native Ad Markup',
      difficulty: 'Medium',
      tags: ['native', 'OpenRTB-native', 'assets', 'title', 'image', 'link', 'mtype'],
      summary:
        'OpenRTB Native spec: request/response JSON, asset types, and rendering by publisher.',
      pattern: 'Native markup',
      visual:
        'BidRequest.Imp.Native.request = serialised Native request JSON. BidResponse.Bid.adm = serialised Native response JSON. Assets: title, img (icon/main), data (sponsored by, desc, rating). Link = click destination.',
      memorize:
        'Native request = JSON in Imp.native.request. Native response = JSON in Bid.adm (mtype=4). Assets: TITLE (text), IMG (iconType=1/mainType=3), DATA (desc, sponsored). link.url = click destination. imptrackers[] for impression.',
      scene:
        'A puzzle box: the native request lists the pieces needed (title, image, description). The DSP provides each piece (asset). The publisher assembles the puzzle (renders the native ad) to match its own design system — no two publishers show it identically.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// OpenRTB Native 1.2 — abbreviated key structures.

// NativeRequest is serialised to JSON in Imp.native.request.
type NativeRequest struct {
	Ver     string       \`json:"ver,omitempty"\`     // "1.2"
	Layout  int          \`json:"layout,omitempty"\`  // deprecated; use plcmttype
	PlcmtType int        \`json:"plcmttype,omitempty"\` // 1=feed, 2=atomic, 3=outside-core, 4=recommendation
	Assets  []NativeAssetReq \`json:"assets"\`
}

type NativeAssetReq struct {
	ID       int          \`json:"id"\`
	Required int          \`json:"required,omitempty"\` // 1=required
	Title    *TitleAsset  \`json:"title,omitempty"\`
	Img      *ImageAsset  \`json:"img,omitempty"\`
	Data     *DataAsset   \`json:"data,omitempty"\`
}

type TitleAsset struct{ Len int \`json:"len"\` }
type ImageAsset struct {
	Type   int \`json:"type,omitempty"\` // 1=icon, 3=main image
	WMin   int \`json:"wmin,omitempty"\`
	HMin   int \`json:"hmin,omitempty"\`
}
type DataAsset struct {
	Type int \`json:"type"\` // 1=sponsored, 2=desc, 12=cta
	Len  int \`json:"len,omitempty"\`
}

// NativeResponse is serialised to JSON in Bid.adm (mtype=4).
type NativeResponse struct {
	Native NativeResponseBody \`json:"native"\`
}

type NativeResponseBody struct {
	Ver        string          \`json:"ver,omitempty"\`
	Assets     []NativeAssetResp \`json:"assets"\`
	Link       NativeLink      \`json:"link"\`
	ImpTrackers []string       \`json:"imptrackers,omitempty"\`
}

type NativeAssetResp struct {
	ID    int               \`json:"id"\`
	Title *TitleResp        \`json:"title,omitempty"\`
	Img   *ImageResp        \`json:"img,omitempty"\`
	Data  *DataResp         \`json:"data,omitempty"\`
}

type TitleResp struct{ Text string \`json:"text"\` }
type ImageResp struct{ URL string \`json:"url"\`; W, H int \`json:"w,h"\` }
type DataResp  struct{ Value string \`json:"value"\` }
type NativeLink struct {
	URL           string   \`json:"url"\`
	ClickTrackers []string \`json:"clicktrackers,omitempty"\`
}

func main() {
	// Request: publisher asks for title (max 25 chars), main image, description, and sponsored label.
	nativeReq := NativeRequest{
		Ver: "1.2",
		PlcmtType: 1, // in-feed
		Assets: []NativeAssetReq{
			{ID: 1, Required: 1, Title: &TitleAsset{Len: 25}},
			{ID: 2, Required: 1, Img: &ImageAsset{Type: 3, WMin: 600, HMin: 400}},
			{ID: 3, Required: 0, Data: &DataAsset{Type: 2, Len: 90}},   // description
			{ID: 4, Required: 1, Data: &DataAsset{Type: 1}},             // sponsored by
		},
	}

	reqJSON, _ := json.MarshalIndent(nativeReq, "", "  ")
	fmt.Println("=== Native Request (goes in Imp.native.request) ===")
	fmt.Println(string(reqJSON))

	// Response: DSP fills in the requested assets.
	nativeResp := NativeResponse{
		Native: NativeResponseBody{
			Ver: "1.2",
			Assets: []NativeAssetResp{
				{ID: 1, Title: &TitleResp{Text: "Air Max — Just Do It"}},
				{ID: 2, Img:   &ImageResp{URL: "https://cdn.nike.com/native/main.jpg", W: 1200, H: 800}},
				{ID: 3, Data:  &DataResp{Value: "Experience the next generation of running shoes."}},
				{ID: 4, Data:  &DataResp{Value: "Nike"}},
			},
			Link: NativeLink{
				URL: "https://click.track.com/click?dest=https%3A%2F%2Fnike.com%2Fair-max",
				ClickTrackers: []string{"https://px.track.com/click?crid=native-001"},
			},
			ImpTrackers: []string{"https://px.track.com/imp?crid=native-001&aid=req-001"},
		},
	}

	respJSON, _ := json.MarshalIndent(nativeResp, "", "  ")
	fmt.Println("\n=== Native Response (goes in Bid.adm, mtype=4) ===")
	fmt.Println(string(respJSON))
}
`,
      quiz: [
        {
          id: 'ortb-native-who-renders',
          prompt:
            'Who is responsible for rendering a native ad from the OpenRTB Native response JSON?',
          choices: [
            {
              label: 'Publisher renders — assembles native assets into its own page design',
              correct: true,
            },
            { label: 'DSP pre-renders claim — DSPs supply raw JSON, not pre-rendered HTML' },
            { label: 'Exchange converts claim — exchange passes native JSON as-is to the SSP' },
            { label: 'Browser built-in claim — browsers have no native ad rendering support' },
          ],
          explain:
            "This is the defining property of native advertising: the publisher controls rendering. The native JSON provides raw assets (title text, image URL, description, link) and the publisher's template styles them to match its editorial look and feel. Two publishers showing the same native ad will present it differently.",
        },
        {
          id: 'ortb-native-asset-type',
          prompt: 'In a NativeAsset request, ImageAsset.type=3 means:',
          choices: [
            { label: 'Main image — large hero image for the native ad unit', correct: true },
            { label: 'Icon image — the small brand logo (type=1 is icon)' },
            { label: 'Background image — type=3 is main image, not background' },
            { label: 'Audit screenshot — iurl handles creative audit, not ImageAsset.type' },
          ],
          explain:
            'OpenRTB Native image type codes: 1=Icon (brand logo, typically square, 50×50 to 100×100), 3=Main image (hero image, typically 600×400 or larger). The DSP must provide images matching the requested type and minimum dimensions.',
        },
        {
          id: 'ortb-native-imptrackers',
          prompt: 'In a NativeResponse, imptrackers[] contains:',
          choices: [
            {
              label: 'Client-side imp pixels — publisher fires these on native unit render',
              correct: true,
            },
            { label: 'Win-notice URLs — exchange fires win notices, not imptrackers' },
            { label: 'Click destinations — link.url handles click URLs, not imptrackers' },
            { label: 'Asset cache URLs — imptrackers are tracking pixels, not CDN cache URLs' },
          ],
          explain:
            'imptrackers is an array of URLs the publisher (or SDK) must fire as 1×1 pixel GETs when the native unit is rendered. This gives the DSP and third-party measurement vendors a client-side impression signal, separate from the exchange-side win notice. Publishers must fire all imptrackers in the response.',
        },
      ],
      design: {
        prompt:
          "A publisher's native template requires a 15-character title and a 600×315 image. A DSP submits a native bid with a 25-character title and a 1200×628 image. How should the publisher/exchange handle this?",
        answer:
          '1. Title truncation: if the native spec says publisher needs max 15 chars and the DSP provides 25, the publisher should truncate to 15 characters with an ellipsis ("...") as per the OpenRTB Native spec guidelines. Don\'t reject the bid — truncation is allowed for excess length.\n2. Image scaling: publishers are responsible for resizing/cropping images to their display dimensions. A 1200×628 image can be scaled down to 600×315 (same 1.91:1 aspect ratio). The publisher\'s native template CSS handles this.\n3. Exchange validation: if an asset marked required=1 in the request is missing from the response, the exchange should reject the bid (invalid native response). For size mismatches, accept and let the publisher handle rendering.\n4. Required vs optional: if an optional asset (required=0) is missing, publishers use a fallback (e.g. no description text). Never reject a bid for missing optional assets.',
      },
      keyPoints: [
        'Native request (JSON) lives in Imp.native.request; native response (JSON) lives in Bid.adm with mtype=4.',
        'Publisher renders native assets using its own templates — DSP provides raw data, not HTML.',
        'Asset types: title (text, len limit), img (icon type=1, main type=3), data (sponsored type=1, desc type=2).',
        'imptrackers[] in native response must be fired by the publisher on ad render.',
        'Required=1 assets missing from the response → reject bid. Required=0 missing → allowed, publisher uses fallback.',
      ],
    },
  ],
};
