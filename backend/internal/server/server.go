// Package server wires the HTTP routes for the game backend onto a hub. It is
// split out from main so the full request path (handshake, routing, relay) can
// be exercised by integration tests over a real socket.
package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"algomoves/gameserver/internal/arcade"
	"algomoves/gameserver/internal/hub"
	"algomoves/gameserver/internal/ws"
)

// Handler returns the HTTP handler serving /ws, /new, /healthz, /api/* and /.
func Handler(h *hub.Hub, arc *arcade.Service) http.Handler {
	allowed := allowedOriginsFromEnv()
	wsLimit := newIPRateLimiter(60, time.Minute)
	newLimit := newIPRateLimiter(20, time.Minute)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", rateLimit(wsHandler(h, allowed), wsLimit))
	// /new mints a room code, so — like /ws — it requires a recognised Origin
	// whenever ALLOWED_ORIGINS is configured; a request with no Origin header at
	// all is rejected rather than silently allowed through.
	mux.HandleFunc("/new", corsJSON(newCodeHandler(h), allowed, newLimit, true))
	// /healthz stays permissive of a missing Origin even when ALLOWED_ORIGINS is
	// configured: it exists for infra liveness probes (e.g. Railway's
	// healthcheckPath) that are plain HTTP clients and never send an Origin
	// header, not for browsers.
	mux.HandleFunc("/healthz", corsJSON(healthHandler(h, arc), allowed, nil, false))
	if arc != nil && arc.Enabled() {
		apiMux := http.NewServeMux()
		arc.Register(apiMux)
		mux.Handle("/api/", corsAPI(allowed, apiMux))
	}
	mux.HandleFunc("/", bannerHandler)
	return mux
}

func wsHandler(h *hub.Hub, allowed []string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !originAllowed(r.Header.Get("Origin"), allowed) {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("room")))
		if code == "" || len(code) > 12 {
			http.Error(w, "missing or invalid room code", http.StatusBadRequest)
			return
		}
		name := sanitizeName(r.URL.Query().Get("name"))
		pid := sanitizePid(r.URL.Query().Get("pid"))
		opts := hub.JoinOptions{
			Capacity:    parseCapacity(r.URL.Query().Get("cap")),
			AsSpectator: r.URL.Query().Get("role") == "spectator",
		}

		conn, err := ws.Upgrade(w, r)
		if err != nil {
			log.Printf("upgrade failed from %s: %v", r.RemoteAddr, err)
			return
		}
		log.Printf("room %s: %s connected from %s", code, name, conn.RemoteAddr())
		hub.Serve(h, conn, code, name, pid, opts)
		log.Printf("room %s: %s disconnected", code, name)
	}
}

func newCodeHandler(h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, map[string]any{"code": h.FreshCode()})
	}
}

func healthHandler(h *hub.Hub, arc *arcade.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body := map[string]any{"status": "ok", "rooms": h.RoomCount()}
		if arc != nil && arc.Enabled() {
			body["arcade"] = true
		}
		writeJSON(w, body)
	}
}

func bannerHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("Algo Moves game server. Connect a client to /ws?room=CODE&name=NAME\n"))
}

// corsJSON wraps a handler so the static frontend (a different origin) can call
// it, and answers CORS preflight requests. When requireOrigin is true, a
// request with no Origin header at all is rejected as soon as ALLOWED_ORIGINS
// is configured — mirroring wsHandler's stricter originAllowed check — instead
// of silently bypassing the allowlist the way a bare `origin != ""` guard
// would. Pass false for endpoints (like /healthz) that must stay reachable by
// non-browser clients that never send Origin.
func corsJSON(next http.HandlerFunc, allowed []string, limiter *ipRateLimiter, requireOrigin bool) http.HandlerFunc {
	handler := next
	if limiter != nil {
		handler = rateLimit(next, limiter)
	}
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		rejected := false
		if requireOrigin {
			rejected = !originAllowed(origin, allowed)
		} else {
			rejected = origin != "" && !originAllowed(origin, allowed)
		}
		if rejected {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		setCORS(w, origin, allowed)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		handler(w, r)
	}
}

// corsAPI wraps the /api subtree so the static frontend can call arcade endpoints.
func corsAPI(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		rejected := !originAllowed(origin, allowed)
		if rejected {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		setCORS(w, origin, allowed)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Session-Token")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

// sanitizeName trims a display name and caps its length so a peer cannot inject
// huge or control-laden strings into the other player's UI.
func sanitizeName(raw string) string {
	name := strings.TrimSpace(raw)
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, name)
	runes := []rune(name)
	if len(runes) > 24 {
		runes = runes[:24]
	}
	return string(runes)
}

// parseCapacity reads the optional ?cap= room-size hint. A missing or invalid
// value yields 0, which the hub reads as "use the default capacity"; the hub
// clamps any out-of-range number to its own [min,max] bounds.
func parseCapacity(raw string) int {
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

// sanitizePid keeps only URL-safe id characters and caps the length; the pid is
// an opaque reconnect token minted by the client.
func sanitizePid(raw string) string {
	pid := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
			return r
		default:
			return -1
		}
	}, raw)
	if len(pid) > 40 {
		pid = pid[:40]
	}
	return pid
}
