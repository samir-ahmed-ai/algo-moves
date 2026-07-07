package arcade

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Service bundles the arcade store and HTTP handlers.
type Service struct {
	store *Store
}

func (s *Service) Store() *Store {
	if s == nil {
		return nil
	}
	return s.store
}

func Open(ctx context.Context) (*Service, error) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		return nil, nil
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	if envEnabled("RUN_MIGRATIONS") {
		if err := Migrate(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		if err := SeedAchievements(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("arcade: migrations and achievement seed applied")
	}
	if envEnabled("RUN_CONTENT_SEED") {
		if err := SeedContent(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("arcade: learning content seed applied")
	}
	log.Printf("arcade: connected to postgres")
	return &Service{store: NewStore(pool)}, nil
}

func (s *Service) Enabled() bool { return s != nil && s.store != nil }

func (s *Service) Close() {
	if s != nil && s.store != nil && s.store.pool != nil {
		s.store.pool.Close()
	}
}

// Register mounts /api/* routes on mux. Handlers are wrapped for CORS by server.
func (s *Service) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/guest", s.handleGuest)
	mux.HandleFunc("/api/auth/signup", s.handleSignup)
	mux.HandleFunc("/api/auth/login", s.handleLogin)
	mux.HandleFunc("/api/auth/me", s.handleMe)
	mux.HandleFunc("/api/profiles/", s.handleProfiles)
	mux.HandleFunc("/api/stats/me", s.handleStatsMe)
	mux.HandleFunc("/api/matches/me", s.handleMatchesMe)
	mux.HandleFunc("/api/matches", s.handleSubmitMatch)
	mux.HandleFunc("/api/leaderboard/", s.handleLeaderboard)
	mux.HandleFunc("/api/achievements", s.handleAchievements)
	mux.HandleFunc("/api/achievements/", s.handleAchievementAction)
	mux.HandleFunc("/api/rooms/", s.handleRooms)
	mux.HandleFunc("/api/friends", s.handleFriends)
	mux.HandleFunc("/api/daily-challenge", s.handleDailyChallenge)
	mux.HandleFunc("/api/daily-challenge/score", s.handleDailyScore)
	mux.HandleFunc("/api/canvases", s.handleCanvases)
	mux.HandleFunc("/api/canvases/", s.handleCanvas)
	mux.HandleFunc("/api/interviews", s.handleInterviews)
	mux.HandleFunc("/api/interviews/", s.handleInterview)
	mux.HandleFunc("/api/content/catalog", s.handleContentCatalog)
	mux.HandleFunc("/api/content/problems/", s.handleContentProblem)
	mux.HandleFunc("/api/prep-plans", s.handlePrepPlans)
	mux.HandleFunc("/api/prep-plans/", s.handlePrepPlan)
}
