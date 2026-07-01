// Command gameserver is the realtime backend for Algo Moves' two-player games.
// It exposes a single WebSocket endpoint that pairs players into rooms and
// relays messages between them. It has no database and no external dependencies
// — rooms live in memory for the life of a match.
//
// Endpoints:
//
//	GET /ws?room=CODE&name=NAME  upgrade to a game-room WebSocket
//	GET /new                     mint a fresh unused room code -> {"code":"ABCD"}
//	GET /healthz                 liveness probe -> {"status":"ok","rooms":N}
//	GET /                        plain-text banner
//
// Configure the listen address with -addr or the PORT environment variable.
package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"algomoves/gameserver/internal/hub"
	"algomoves/gameserver/internal/server"
)

func main() {
	defaultAddr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		defaultAddr = ":" + p
	}
	addr := flag.String("addr", defaultAddr, "listen address, e.g. :8080")
	flag.Parse()

	srv := &http.Server{
		Addr:              *addr,
		Handler:           server.Handler(hub.New()),
		ReadHeaderTimeout: 10 * time.Second,
		// No overall write timeout: hijacked WebSocket connections are long-lived.
	}

	log.Printf("gameserver listening on %s", *addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
