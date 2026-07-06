import type { GoTopic } from '../../go-course/types';

// OpenRTB course — Module 2: OpenRTB BidRequest
export const bidRequest: GoTopic = {
  id: 'bid-request',
  title: 'OpenRTB BidRequest',
  icon: 'ArrowRight',
  concepts: [
    {
      id: 'ortb-bid-request-object',
      title: 'Top-Level BidRequest Object',
      difficulty: 'Medium',
      tags: ['BidRequest', 'OpenRTB', 'tmax', 'imp', 'at', 'wseat'],
      summary: 'The root BidRequest struct: required fields, auction rules, and allowlists.',
      pattern: 'BidRequest root',
      visual:
        'BidRequest{id, imp[], site/app, device, user, at, tmax, cur[], wseat[], bcat[], badv[], regs, source} — id and at least one imp are required.',
      memorize:
        'id + imp[] required. at=1 first-price, at=2 second-price. tmax=ms deadline. bcat/badv block IAB cats/ad domains. cur prefers currencies (default USD).',
      scene:
        'A job-posting form: id is the requisition number, imp[] are the open positions, site/app is the company profile, device/user are candidate details, tmax is the application deadline, bcat/badv are the "we don\'t hire from X" rules.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// OpenRTB 2.6 top-level BidRequest — abbreviated to essential fields.
type BidRequest struct {
	ID     string       \`json:"id"\`              // exchange-generated, globally unique
	Imp    []Impression \`json:"imp"\`             // at least one required
	Site   *Site        \`json:"site,omitempty"\`
	App    *App         \`json:"app,omitempty"\`
	Device *Device      \`json:"device,omitempty"\`
	User   *User        \`json:"user,omitempty"\`
	At     int          \`json:"at,omitempty"\`    // 1=first-price, 2=second-price (default 2)
	TMax   int          \`json:"tmax,omitempty"\`  // max ms for DSP response
	WSeat  []string     \`json:"wseat,omitempty"\` // allowlist of buyer seats
	BSeat  []string     \`json:"bseat,omitempty"\` // blocklist of buyer seats
	Cur    []string     \`json:"cur,omitempty"\`   // preferred currencies; default USD
	BCat   []string     \`json:"bcat,omitempty"\`  // blocked IAB content categories
	BAdv   []string     \`json:"badv,omitempty"\`  // blocked advertiser domains
}

type Impression struct {
	ID     string  \`json:"id"\`
	BidFloor float64 \`json:"bidfloor,omitempty"\`
}

type Site struct{ Page string \`json:"page"\` }
type App  struct{ Bundle string \`json:"bundle"\` }
type Device struct {
	UA string \`json:"ua,omitempty"\`
	IP string \`json:"ip,omitempty"\`
}
type User struct{ ID string \`json:"id,omitempty"\` }

func main() {
	req := BidRequest{
		ID:   "req-001",
		At:   1, // first-price
		TMax: 100,
		Imp:  []Impression{{ID: "imp-1", BidFloor: 0.50}},
		Site: &Site{Page: "https://example.com/news"},
		Device: &Device{UA: "Mozilla/5.0", IP: "203.0.113.1"},
		BCat: []string{"IAB25", "IAB26"}, // illegal content, tobacco
		Cur:  []string{"USD"},
	}

	b, _ := json.MarshalIndent(req, "", "  ")
	fmt.Println(string(b))
}
`,
      quiz: [
        {
          id: 'ortb-req-required',
          prompt: 'Which fields in the top-level BidRequest are strictly required by the OpenRTB spec?',
          choices: [
            { label: 'id + imp[] — only required fields; everything else is optional', correct: true },
            { label: 'id + site/app + device — three objects always required' },
            { label: 'id + imp + tmax — deadline is mandatory in the spec' },
            { label: 'Required fields — user and auction type also required alongside id+imp' },
          ],
          explain:
            'Per the OpenRTB 2.6 spec §3.2.1: "id" (globally unique request ID) and at least one "imp" (impression) object are the only required fields. site vs app is highly recommended but technically optional. tmax, device, and user enrich the request but are not required.',
        },
        {
          id: 'ortb-req-at-default',
          prompt: 'If the "at" (auction type) field is absent from a BidRequest, what should a bidder assume?',
          choices: [
            { label: 'at=2 default — spec default is second-price when at is absent', correct: true },
            { label: 'First-price absence — absence means the newest format' },
            { label: 'Fixed-price deal — at is only omitted for guaranteed deals' },
            { label: 'Unknown — bidder must reject the request' },
          ],
          explain:
            'OpenRTB 2.6 §3.2.1 specifies at default = 2 (second-price). In practice, most exchanges today set at=1 explicitly (first-price). A well-behaved bidder should handle both, but per spec, absence → second-price.',
        },
        {
          id: 'ortb-req-bcat',
          prompt: 'The "bcat" field in a BidRequest contains:',
          choices: [
            { label: 'bcat — IAB content categories the buyer must not respond to', correct: true },
            { label: 'badv claim — blocked advertiser domain names go in badv, not bcat' },
            { label: 'bseat claim — blocked buyer seat IDs go in bseat, not bcat' },
            { label: 'Allow list claim — bcat is a blocklist, not an allow list' },
          ],
          explain:
            'bcat (blocked categories) contains IAB Tech Lab content category codes (e.g. IAB25 = Non-Standard Content, IAB26 = Illegal Content). These are publisher/exchange-enforced restrictions on creative categories. Separate fields handle blocked advertisers (badv) and blocked seats (bseat).',
        },
      ],
      design: {
        prompt:
          'Your exchange needs to validate every incoming BidRequest before fanning it out to DSPs. What validation steps would you apply and in what order?',
        answer:
          '1. Schema validation — ensure required fields (id, imp[]) are present; reject with 400 if missing.\n2. Semantic validation — check imp[].id uniqueness, bidfloor ≥ 0, tmax within acceptable bounds.\n3. Supply chain — verify schain.complete and cross-reference against ads.txt / sellers.json cache.\n4. Traffic quality — pass through IVT / fraud sidecar (unix domain socket for low latency).\n5. Publisher blocklist — check bcat / badv against exchange-level category & advertiser blocklists.\n6. Enrich — append missing device fields (carrier, geo) from IP lookup if publisher did not provide.\n7. Route — forward enriched request to selected DSPs within tmax budget.',
      },
      keyPoints: [
        'id and imp[] are the only required fields; everything else enriches the auction.',
        'at=1 first-price (common today), at=2 second-price (spec default). Always check this.',
        'tmax is in milliseconds; DSPs must reply before this wall-clock deadline.',
        'bcat blocks IAB content categories; badv blocks advertiser domains; bseat blocks buyer seats.',
        'Only site OR app should be present (not both); site for web, app for mobile/OTT.',
      ],
    },
    {
      id: 'ortb-bid-request-imp',
      title: 'Impression Object & Ad Formats',
      difficulty: 'Medium',
      tags: ['imp', 'banner', 'video', 'native', 'audio', 'pmp', 'OpenRTB'],
      summary: 'The Imp object describes the ad slot: format (banner/video/native/audio), floor price, and deals.',
      pattern: 'Impression + format union',
      visual:
        'Imp{id, banner|video|native|audio, bidfloor, bidfloorcur, secure, instl, tagid, pmp{deals[]}} — exactly one format sub-object should be set (or multiple for multi-format).',
      memorize:
        'Imp = the slot. banner = display. video = VAST. native = content-matched. audio = podcast. bidfloor = minimum CPM. pmp = private marketplace deals. secure=1 forces HTTPS creative.',
      scene:
        'A hotel reservation form: imp is the room, banner/video/native is the room type (standard/suite/penthouse), bidfloor is the rack rate, pmp.deals are pre-negotiated corporate rates only invited guests can use.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// Imp represents one ad slot in a BidRequest.
type Imp struct {
	ID           string   \`json:"id"\`
	Banner       *Banner  \`json:"banner,omitempty"\`
	Video        *Video   \`json:"video,omitempty"\`
	Native       *Native  \`json:"native,omitempty"\`
	BidFloor     float64  \`json:"bidfloor,omitempty"\`
	BidFloorCur  string   \`json:"bidfloorcur,omitempty"\`
	Secure       int      \`json:"secure,omitempty"\`  // 1 = HTTPS required
	Instl        int      \`json:"instl,omitempty"\`   // 1 = interstitial / full-screen
	TagID        string   \`json:"tagid,omitempty"\`
	PMP          *PMP     \`json:"pmp,omitempty"\`
}

type Banner struct {
	W      int    \`json:"w,omitempty"\`
	H      int    \`json:"h,omitempty"\`
	Format []Format \`json:"format,omitempty"\`
	Pos    int    \`json:"pos,omitempty"\` // 1=above fold, 3=below fold
}

type Format struct {
	W int \`json:"w"\`
	H int \`json:"h"\`
}

type Video struct {
	MIMEs       []string \`json:"mimes"\`
	MinDuration int      \`json:"minduration,omitempty"\`
	MaxDuration int      \`json:"maxduration,omitempty"\`
	Protocols   []int    \`json:"protocols,omitempty"\` // 2=VAST 2.0, 3=VAST 3.0, 5=VAST 2.0 wrapper
	W           int      \`json:"w,omitempty"\`
	H           int      \`json:"h,omitempty"\`
	Linearity   int      \`json:"linearity,omitempty"\` // 1=linear/in-stream
}

type Native struct {
	Request string \`json:"request"\` // serialised Native request JSON
	Ver     string \`json:"ver,omitempty"\`
}

type PMP struct {
	PrivateAuction int    \`json:"private_auction,omitempty"\` // 1=only deal bids allowed
	Deals          []Deal \`json:"deals,omitempty"\`
}

type Deal struct {
	ID          string   \`json:"id"\`
	BidFloor    float64  \`json:"bidfloor,omitempty"\`
	WSeat       []string \`json:"wseat,omitempty"\`
	AT          int      \`json:"at,omitempty"\`
}

func main() {
	imp := Imp{
		ID:          "imp-1",
		BidFloor:    1.50,
		BidFloorCur: "USD",
		Secure:      1,
		Banner: &Banner{
			W: 728, H: 90,
			Format: []Format{{W: 728, H: 90}, {W: 970, H: 90}},
			Pos:    1,
		},
		PMP: &PMP{
			Deals: []Deal{
				{ID: "deal-vip-001", BidFloor: 5.00, WSeat: []string{"dsp-a"}},
			},
		},
	}

	b, _ := json.MarshalIndent(imp, "", "  ")
	fmt.Println(string(b))
}
`,
      quiz: [
        {
          id: 'ortb-imp-format-multi',
          prompt: 'A publisher wants to accept either a 300×250 banner OR a 320×50 banner on the same slot. How should they express this in the Imp object?',
          choices: [
            { label: 'Banner.format array — lists all acceptable sizes for the slot', correct: true },
            { label: 'Two Imp objects — creates two independent auctions, not one slot' },
            { label: 'Largest declared — DSP does not auto-scale banners to smaller sizes' },
            { label: 'Two BidRequests — each BidRequest is a separate auction entirely' },
          ],
          explain:
            'The Banner.format array is the OpenRTB-standard way to express multiple acceptable sizes for a single slot. Setting Banner.w/h alongside format is also allowed (w/h is the preferred/default size). Using two Imp objects creates two independent auctions, which is a different thing.',
        },
        {
          id: 'ortb-imp-pmp',
          prompt: 'When Imp.pmp.private_auction = 1, a bidder that does NOT hold a deal for this impression should:',
          choices: [
            { label: 'No-bid required — only deal bids accepted when private_auction=1', correct: true },
            { label: 'Bid at floor — private_auction=1 just means a higher floor price' },
            { label: 'Bid normally — private_auction is a hint, not a hard rule' },
            { label: 'Call exchange API — to request a temporary deal on the fly' },
          ],
          explain:
            'When private_auction=1 (or "private_auction": 1), the exchange will only accept bids that reference a deal ID in the pmp.deals array. Non-deal bids are rejected regardless of price. A bidder without a valid deal should either not bid or return an empty SeatBid.',
        },
        {
          id: 'ortb-imp-secure',
          prompt: 'What must a bidder ensure when Imp.secure = 1?',
          choices: [
            { label: 'HTTPS required — all markup URLs (adm, nurl, pixels) must use HTTPS', correct: true },
            { label: 'TLS bid claim — the bid itself must be TLS-encrypted before sending' },
            { label: 'GDPR claim — secure=1 implies GDPR scope and consent requirement' },
            { label: 'Price flag claim — secure is a pricing flag, not a URL requirement' },
          ],
          explain:
            'secure=1 means the publisher page is served over HTTPS and therefore requires the ad markup to also be HTTPS. A bidder returning HTTP URLs in the creative (image, click tracker, pixel) will cause mixed-content browser errors and the ad will be blocked. Set secure=1 in your bidder to only return HTTPS markup.',
        },
      ],
      design: {
        prompt:
          'Design the bid decision logic for your DSP when you receive a multi-format Imp (Banner + Native in the same impression). How do you choose which format to bid with?',
        answer:
          'When both Banner and Native are present in the Imp, the DSP should: (1) evaluate each format independently against active campaigns — check if any campaign targets banner or native for the given site/app and audience; (2) calculate expected CPM for each format bid based on targeting match and historical win rates; (3) choose the format that maximises RPM (revenue per mille) for the advertiser; (4) include only one format in the Bid.mtype field (1=Banner, 4=Native) so the exchange knows which markup type you are delivering; (5) ensure adm (ad markup) matches the declared mtype.',
      },
      keyPoints: [
        'Imp represents one ad slot; a BidRequest may contain multiple Imp objects.',
        'Banner, Video, Native, Audio are format sub-objects; at least one must be present.',
        'Banner.format[] lists acceptable sizes; Video.mimes[] lists acceptable MIME types.',
        'bidfloor is the minimum CPM in bidfloorcur currency (default USD); bids below floor are rejected.',
        'pmp.deals[] enables private marketplace — when private_auction=1 only deal bids accepted.',
        'secure=1 requires all creative URLs to be HTTPS.',
      ],
    },
    {
      id: 'ortb-bid-request-site-app',
      title: 'Site, App, Device & User Context',
      difficulty: 'Medium',
      tags: ['site', 'app', 'device', 'user', 'geo', 'OpenRTB', 'context'],
      summary: 'Publisher context (Site/App) and buyer data (Device/User) objects that fuel targeting.',
      pattern: 'Context objects',
      visual:
        'Site{page, domain, publisher{id}} or App{bundle, storeurl, publisher{id}} + Device{ua, ip, os, geo{lat,lon,country}} + User{id, buyeruid, yob, gender, data[]}.',
      memorize:
        'Site for web, App for mobile/OTT. Device for HW/OS/IP. User for audience. Geo inside Device (physical location) or User (home/registration). buyeruid = DSP cookie match. eids = extended IDs (UID2, etc.).',
      scene:
        'Filling out a form to buy a concert ticket: Site/App is the venue, Device is the type of seat (VIP box vs general admission), User is your fan-club membership number and demographics.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

type Site struct {
	Page      string    \`json:"page,omitempty"\`
	Domain    string    \`json:"domain,omitempty"\`
	Cat       []string  \`json:"cat,omitempty"\`  // IAB content categories
	Publisher *Publisher \`json:"publisher,omitempty"\`
}

type App struct {
	Bundle    string    \`json:"bundle,omitempty"\`  // e.g. "com.example.app"
	StoreURL  string    \`json:"storeurl,omitempty"\`
	Ver       string    \`json:"ver,omitempty"\`
	Publisher *Publisher \`json:"publisher,omitempty"\`
}

type Publisher struct {
	ID     string \`json:"id,omitempty"\`
	Name   string \`json:"name,omitempty"\`
	Domain string \`json:"domain,omitempty"\`
}

type Geo struct {
	Lat     float64 \`json:"lat,omitempty"\`
	Lon     float64 \`json:"lon,omitempty"\`
	Country string  \`json:"country,omitempty"\` // ISO 3166-1 alpha-3
	Region  string  \`json:"region,omitempty"\`
	City    string  \`json:"city,omitempty"\`
	Type    int     \`json:"type,omitempty"\`    // 1=GPS, 2=IP, 3=user-provided
}

type Device struct {
	UA          string \`json:"ua,omitempty"\`
	IP          string \`json:"ip,omitempty"\`
	OS          string \`json:"os,omitempty"\`
	OSV         string \`json:"osv,omitempty"\`
	DeviceType  int    \`json:"devicetype,omitempty"\` // 1=mobile/tablet, 2=PC, 3=TV
	IFA         string \`json:"ifa,omitempty"\`        // IDFA/GAID
	Geo         *Geo   \`json:"geo,omitempty"\`
}

type User struct {
	ID       string    \`json:"id,omitempty"\`     // exchange-specific user ID
	BuyerUID string    \`json:"buyeruid,omitempty"\` // DSP user ID (cookie-synced)
	Yob      int       \`json:"yob,omitempty"\`     // year of birth
	Gender   string    \`json:"gender,omitempty"\`  // "M", "F", "O"
	Geo      *Geo      \`json:"geo,omitempty"\`     // home/registration location
	Data     []Segment \`json:"data,omitempty"\`
}

type Segment struct {
	ID   string    \`json:"id"\`
	Name string    \`json:"name,omitempty"\`
	Segment []struct {
		ID    string \`json:"id"\`
		Name  string \`json:"name,omitempty"\`
		Value string \`json:"value,omitempty"\`
	} \`json:"segment,omitempty"\`
}

func main() {
	device := Device{
		UA: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
		IP: "203.0.113.42",
		OS: "iOS", OSV: "17.0",
		DeviceType: 1,
		IFA: "6D92078A-8246-4BA4-AE5B-76104861E7DC",
		Geo: &Geo{Country: "USA", Region: "NY", City: "New York", Type: 2},
	}
	user := User{
		ID:       "exch-uid-9876",
		BuyerUID: "dsp-user-5432",
		Yob:      1990,
	}

	b, _ := json.MarshalIndent(map[string]any{"device": device, "user": user}, "", "  ")
	fmt.Println(string(b))
}
`,
      quiz: [
        {
          id: 'ortb-context-site-vs-app',
          prompt: 'Which BidRequest context object should be present for a mobile game served in-app?',
          choices: [
            { label: 'App — with bundle (reverse-domain package name) and optionally storeurl', correct: true },
            { label: 'Web-only claim — all inventory is web-based regardless of platform' },
            { label: 'Both present — Site and App may coexist in one BidRequest' },
            { label: 'Neither — in-app inventory uses the Dooh object instead' },
          ],
          explain:
            'App is for non-browser environments: iOS/Android apps, OTT/CTV apps. Site is for browser-based web inventory. Only one of the two should be present per BidRequest (the spec says both may be sent but that\'s a publisher error). Bundle is the app\'s package name (e.g. com.example.game) and is the primary identifier for app inventory.',
        },
        {
          id: 'ortb-context-buyeruid',
          prompt: 'What is the purpose of User.buyeruid in a BidRequest?',
          choices: [
            { label: "buyeruid — DSP's user ID obtained via cookie sync with the exchange", correct: true },
            { label: 'Exchange UID claim — exchange-assigned persistent user identifier' },
            { label: 'UID2 token claim — it holds the IAB UID2 token for cookieless identity' },
            { label: 'SSP account claim — it is the SSP account ID for the publisher' },
          ],
          explain:
            'buyeruid is populated by the exchange from its cookie sync table: when a user visits publisher.com, the exchange and DSP perform a pixel-based cookie sync to map exchange user IDs to DSP user IDs. The exchange then embeds the DSP\'s user ID in buyeruid so the DSP\'s bidder can look up that user\'s segments in its own database without a synchronous network call.',
        },
        {
          id: 'ortb-context-device-ifa',
          prompt: 'Device.ifa in an OpenRTB BidRequest contains:',
          choices: [
            { label: "Device.ifa — advertising identifier (IDFA on iOS, GAID on Android)", correct: true },
            { label: 'IP address claim — Device.ip holds IP, not Device.ifa' },
            { label: 'Fingerprint claim — Device.ifa is the ad ID, not a fingerprint hash' },
            { label: 'Carrier ID claim — carrier subscriber ID is in Device.carrier' },
          ],
          explain:
            'IFA (Identifier For Advertising) is the resettable advertising ID issued by the OS. On iOS it\'s IDFA (Identifier for Advertisers); on Android it\'s GAID (Google Advertising ID). Publishers set Device.lmt (limit ad tracking) = 1 when the user has opted out. With iOS 14.5+ (ATT framework), most users opt out, making IFA largely unavailable on iOS.',
        },
      ],
      design: {
        prompt:
          'Your DSP receives bid requests with User.buyeruid missing for ~40% of traffic (cookieless browsers, ATT-opted-out iOS). How do you handle audience targeting for this traffic?',
        answer:
          '1. Contextual targeting — use Site.page, Site.cat, App.bundle, Device.os, Geo.country/region for non-audience-based targeting. This works without cookies or device IDs.\n2. Probabilistic identity — hashed email (HEM) or UID2 token in User.eids when available (from CTV or logged-in environments).\n3. Cohort-based targeting — leverage Topics API (web) or SKAdNetwork (iOS) signals where available.\n4. Lookalike expansion — use first-party data segments from the advertiser\'s CRM to build lookalike models; bid on users who match on non-ID features.\n5. Adjust CPM floors — deprioritise unmatched traffic or apply lower CPMs since targeting fidelity is lower.',
      },
      keyPoints: [
        'Site for web inventory, App for in-app (bundle = package name); only one present per BidRequest.',
        'Device.ifa holds IDFA/GAID; Device.lmt=1 means the user opted out of ad tracking.',
        'User.id is exchange-side; User.buyeruid is DSP-side from cookie sync.',
        'Geo lives inside Device (physical/IP location) and optionally User (registration location).',
        'User.data[] carries audience segments (DMP third-party data); User.eids[] carries extended IDs (UID2, etc.).',
      ],
    },
    {
      id: 'ortb-bid-request-26-fields',
      title: 'OpenRTB 2.6 New Fields',
      difficulty: 'Hard',
      tags: ['OpenRTB-2.6', 'pod-bidding', 'podid', 'poddur', 'plcmt', 'CTV', 'channel'],
      summary: 'Pod bidding (poddur/podid/mincpmpersec), plcmt, and channel/network for CTV in 2.6.',
      pattern: 'ORTB 2.6 CTV additions',
      visual:
        'Video.podid groups a commercial break; Video.poddur = break length in sec; Video.mincpmpersec = minimum CPM per second; Video.plcmt replaces old Video.placement for in-stream/companion/interstitial.',
      memorize:
        'pod = commercial break. poddur = break total seconds. mincpmpersec = floor per second. plcmt values: 1=in-stream, 2=in-banner, 3=in-article, 4=in-feed, 5=interstitial/slider. channel + network = CTV content context.',
      scene:
        'A TV commercial break: podid names the break ("halftime"), poddur=120 means a 2-minute slot, mincpmpersec means "at least $0.05/sec" — a 30s ad must bid at least $1.50 CPM to enter.',
      time: '—',
      space: '—',
      code: `package main

import (
	"encoding/json"
	"fmt"
)

// OpenRTB 2.6 Video impression with pod bidding and plcmt fields.
type VideoImp struct {
	ID          string   \`json:"id"\`
	Video       *Video26 \`json:"video,omitempty"\`
	BidFloor    float64  \`json:"bidfloor,omitempty"\`
}

type Video26 struct {
	MIMEs         []string \`json:"mimes"\`
	MinDuration   int      \`json:"minduration,omitempty"\`
	MaxDuration   int      \`json:"maxduration,omitempty"\`
	Protocols     []int    \`json:"protocols,omitempty"\`
	W             int      \`json:"w,omitempty"\`
	H             int      \`json:"h,omitempty"\`
	// 2.6 pod bidding fields
	PodID         string   \`json:"podid,omitempty"\`         // identifies the ad pod / commercial break
	PodDur        int      \`json:"poddur,omitempty"\`        // total pod duration in seconds
	PodSeq        int      \`json:"podseq,omitempty"\`        // 1=first slot, 3=last slot, 2=middle
	MinCPMPerSec  float64  \`json:"mincpmpersec,omitempty"\` // floor: USD per second of ad duration
	MaxSeq        int      \`json:"maxseq,omitempty"\`        // max ads in pod
	// 2.6 placement clarification
	Plcmt         int      \`json:"plcmt,omitempty"\`
	// 1=in-stream (before/mid/post-roll), 2=in-banner, 3=in-article, 4=in-feed, 5=interstitial
}

// Content channel and network for CTV context (2.6 promoted from ext).
type Channel struct {
	ID   string \`json:"id,omitempty"\`
	Name string \`json:"name,omitempty"\`
	Domain string \`json:"domain,omitempty"\`
}
type Network struct {
	ID   string \`json:"id,omitempty"\`
	Name string \`json:"name,omitempty"\`
	Domain string \`json:"domain,omitempty"\`
}

func main() {
	// 120-second dynamic pod, at least $0.05/sec CPM floor
	imp := VideoImp{
		ID:       "pod-slot-1",
		BidFloor: 1.50,
		Video: &Video26{
			MIMEs:        []string{"video/mp4"},
			MinDuration:  15,
			MaxDuration:  30,
			Protocols:    []int{2, 3, 5},
			W: 1920, H: 1080,
			PodID:        "halftime-break",
			PodDur:       120,
			PodSeq:       1,
			MinCPMPerSec: 0.05,
			MaxSeq:       4,
			Plcmt:        1, // in-stream
		},
	}

	ch := Channel{Name: "ESPN", Domain: "espn.com"}
	nw := Network{Name: "Disney", Domain: "disney.com"}

	out := map[string]any{"imp": imp, "channel": ch, "network": nw}
	b, _ := json.MarshalIndent(out, "", "  ")
	fmt.Println(string(b))

	// Validate: a 30s bid must offer at least 30 * 0.05 = $1.50 CPM
	bidDuration := 30
	minBid := float64(bidDuration) * imp.Video.MinCPMPerSec
	fmt.Printf("\\n30s ad minimum bid: $%.2f CPM (floor $%.2f)\\n", minBid, imp.BidFloor)
}
`,
      quiz: [
        {
          id: 'ortb-26-mincpmpersec',
          prompt: 'A Video imp has mincpmpersec=0.08. A bidder wants to serve a 20-second ad. What is the minimum bid.price the exchange will accept?',
          choices: [
            { label: '$1.60 CPM — minimum bid for 20s ad at $0.08/sec (20 × $0.08)', correct: true },
            { label: '$0.08 CPM — mincpmpersec is per-impression not per-second' },
            { label: '$0.80 CPM — spec divides mincpmpersec by 10 claim' },
            { label: 'bidfloor enforced — mincpmpersec is advisory and not strictly enforced' },
          ],
          explain:
            'mincpmpersec is a per-second floor expressed as CPM per second. For a 20-second creative: min bid = 20 × $0.08 = $1.60 CPM. The exchange enforces this as the effective floor for duration-based bids in pod auctions, allowing buyers to optimise CPM-per-second rather than a flat floor.',
        },
        {
          id: 'ortb-26-plcmt',
          prompt: 'Video.plcmt=1 in OpenRTB 2.6 means the video ad will run:',
          choices: [
            { label: 'plcmt=1 — in-stream; pre/mid/post-roll alongside streaming video', correct: true },
            { label: 'In-banner claim — plcmt=2 is in-banner, not plcmt=1' },
            { label: 'Interstitial claim — plcmt=5 is interstitial, not plcmt=1' },
            { label: 'In-article claim — plcmt=3 is in-article, not plcmt=1' },
          ],
          explain:
            'OpenRTB 2.6 replaced the old Video.placement field (which had overlapping values) with Video.plcmt: 1=in-stream (user initiated, with audio, alongside streaming video), 2=in-banner, 3=in-article, 4=in-feed, 5=interstitial/slider/floating. In-stream is the most premium video placement and typically commands the highest CPMs.',
        },
        {
          id: 'ortb-26-podseq',
          prompt: 'Video.podseq in a dynamic ad pod can be set to indicate:',
          choices: [
            { label: 'Pod position — 1=first slot, 2=any middle, 3=last in the break', correct: true },
            { label: 'Pod sequence — sequence number of the pod within content stream' },
            { label: 'Min ads claim — minimum number of ads in the pod' },
            { label: 'Tie-break claim — bid rank used for tie-breaking within the pod' },
          ],
          explain:
            'podseq signals position constraints to buyers: podseq=1 means this slot is the first in the break (good for brand recall), podseq=3 means last (good for call-to-action), podseq=2 means any middle slot. This lets DSPs bid differently based on the competitive separation and recall value of each position within the pod.',
        },
      ],
      design: {
        prompt:
          'You are building a CTV SSP that supports dynamic ad pods. A publisher has a 90-second commercial break. How do you construct the OpenRTB BidRequests for this break, and how do you assemble the final pod from winning bids?',
        answer:
          '1. Construction: split the 90-second break into multiple Video Imp objects sharing the same podid. Set poddur=90 and mincpmpersec based on publisher floor. MaxSeq=3 (e.g. max 3 ads of 30s each). Send separate podseq=1, podseq=2, podseq=3 imps.\n2. Competitive separation: use bseat or deal constraints to ensure the same advertiser domain doesn\'t win two consecutive slots (competitive separation rules).\n3. Auction: run first-price auction per slot; the winning bids fill the pod. Sum of durations must not exceed poddur=90.\n4. Assembly: sort winning ads by podseq position; concatenate creative playback URLs into the VAST ad pod structure returned to the CTV player.\n5. Reconciliation: fire nurl per winning bid, track actual impression per slot with separate burl calls.',
      },
      keyPoints: [
        'Pod bidding in ORTB 2.6: poddur = break duration (seconds), mincpmpersec = CPM per second floor, podid = break identifier.',
        'Video.plcmt replaces Video.placement: 1=in-stream, 2=in-banner, 3=in-article, 4=in-feed, 5=interstitial.',
        'channel + network objects (promoted from ext) provide CTV channel/network name and domain.',
        'mincpmpersec × ad_duration = minimum effective CPM for a given creative length.',
        'podseq identifies position within break: 1=first, 2=middle, 3=last — affects competitive separation.',
      ],
    },
  ],
};
