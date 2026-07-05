package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"algomoves/gameserver/internal/arcade"
	"algomoves/gameserver/internal/hub"
	"algomoves/gameserver/internal/server"
)

// defaultMaxRooms bounds steady-state memory/goroutine growth: the /ws
// upgrade-rate limiter only caps burst rate, not how many rooms accumulate
// over the process lifetime. Override with MAX_ROOMS.
const defaultMaxRooms = 5000

func main() {
	defaultAddr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		defaultAddr = ":" + p
	}
	addr := flag.String("addr", defaultAddr, "listen address, e.g. :8080")
	flag.Parse()

	maxRooms := defaultMaxRooms
	if v := os.Getenv("MAX_ROOMS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxRooms = n
		} else {
			log.Printf("ignoring invalid MAX_ROOMS=%q, using default %d", v, defaultMaxRooms)
		}
	}

	ctx := context.Background()
	arc, err := arcade.Open(ctx)
	if err != nil {
		log.Fatalf("arcade database: %v", err)
	}
	if arc != nil {
		defer arc.Close()
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           server.Handler(hub.NewWithMaxRooms(maxRooms), arc),
		ReadHeaderTimeout: 10 * time.Second,
		// No overall write timeout: hijacked WebSocket connections are long-lived.
	}

	go func() {
		log.Printf("gameserver listening on %s", *addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Printf("gameserver shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
