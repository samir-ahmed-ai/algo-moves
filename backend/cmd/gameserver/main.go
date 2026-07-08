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

	"algomoves/gameserver/internal/app"
	"algomoves.dev/realtime/hub"
	httptransport "algomoves/gameserver/internal/transport/http"
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
	api, err := app.Open(ctx)
	if err != nil {
		log.Fatalf("app database: %v", err)
	}
	if api != nil {
		defer api.Close()
		api.BootstrapPlatformAdmin(ctx)
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           httptransport.Handler(hub.NewWithMaxRooms(maxRooms), api),
		ReadHeaderTimeout: 10 * time.Second,
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
