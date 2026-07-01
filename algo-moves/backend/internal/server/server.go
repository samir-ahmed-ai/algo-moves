// Package server wires the HTTP routes for the game backend onto a hub. It is
// split out from main so the full request path (handshake, routing, relay) can
// be exercised by integration tests over a real socket.
package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"algomoves/gameserver/internal/hub"
	"algomoves/gameserver/internal/ws"
)

// Handler returns the HTTP handler serving /ws, /new, /healthz and /.
func Handler(h *hub.Hub) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsHandler(h))
	mux.HandleFunc("/new", corsJSON(newCodeHandler(h)))
	mux.HandleFunc("/healthz", corsJSON(healthHandler(h)))
	mux.HandleFunc("/", bannerHandler)
	return mux
}

func wsHandler(h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("room")))
		if code == "" || len(code) > 12 {
			http.Error(w, "missing or invalid room code", http.StatusBadRequest)
			return
		}
		name := SanitizeName(r.URL.Query().Get("name"))

		conn, err := ws.Upgrade(w, r)
		if err != nil {
			log.Printf("upgrade failed from %s: %v", r.RemoteAddr, err)
			return
		}
		log.Printf("room %s: %s connected from %s", code, name, conn.RemoteAddr())
		hub.Serve(h, conn, code, name)
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
func corsJSON(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
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
