package main

import (
	"context"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"algomoves.dev/realtime/hub"
	"algomoves/gameserver/internal/app"
	"algomoves/gameserver/internal/config"
	httptransport "algomoves/gameserver/internal/transport/http"
)

func main() {
	// Setup structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Load centralized configuration
	cfg := config.Load()

	addr := flag.String("addr", ":"+cfg.Port, "listen address, e.g. :8080")
	flag.Parse()

	ctx := context.Background()
	
	// Pass config to the app service
	api, err := app.Open(ctx, cfg)
	if err != nil {
		slog.Error("app database initialization failed", "error", err)
		os.Exit(1)
	}
	if api != nil {
		defer api.Close()
		api.BootstrapPlatformAdmin(ctx)
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           httptransport.Handler(hub.NewWithMaxRooms(cfg.MaxRooms), api),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("gameserver listening", "addr", *addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("gameserver shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
}
