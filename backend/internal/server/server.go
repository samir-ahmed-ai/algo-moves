// Package server wires the HTTP routes for the game backend onto a hub. It is
// split out from main so the full request path (handshake, routing, relay) can
// be exercised by integration tests over a real socket.
package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"algomoves/gameserver/internal/hub"
	"algomoves/gameserver/internal/ws"
)

// Handler returns the HTTP handler serving /ws, /new, /healthz and /.
func Handler(h *hub.Hub) http.Handler {
	allowed := allowedOriginsFromEnv()
	wsLimit := newIPRateLimiter(60, time.Minute)
	newLimit := newIPRateLimiter(20, time.Minute)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", rateLimit(wsHandler(h, allowed), wsLimit))
	mux.HandleFunc("/new", corsJSON(newCodeHandler(h), allowed, newLimit))
	mux.HandleFunc("/healthz", corsJSON(healthHandler(h), allowed, nil))
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
		name := SanitizeName(r.URL.Query().Get("name"))
		pid := sanitizePid(r.URL.Query().Get("pid"))

		conn, err := ws.Upgrade(w, r)
		if err != nil {
			log.Printf("upgrade failed from %s: %v", r.RemoteAddr, err)
			return
		}
		log.Printf("room %s: %s connected from %s", code, name, conn.RemoteAddr())
		hub.Serve(h, conn, code, name, pid)
		log.Printf("room %s: %s disconnected", code, name)
	}
}

func newCodeHandler(h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, map[string]any{"code": h.FreshCode()})
	}
}

func healthHandler(h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, map[string]any{"status": "ok", "rooms": h.RoomCount()})
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
// it, and answers CORS preflight requests.
func corsJSON(next http.HandlerFunc, allowed []string, limiter *ipRateLimiter) http.HandlerFunc {
	handler := next
	if limiter != nil {
		handler = rateLimit(next, limiter)
	}
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && !originAllowed(origin, allowed) {
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

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

// SanitizeName trims a display name and caps its length so a peer cannot inject
// huge or control-laden strings into the other player's UI.
func SanitizeName(raw string) string {
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
