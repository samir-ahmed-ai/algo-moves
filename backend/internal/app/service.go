// Package app wires domain HTTP handlers into a single deployable API surface.
package app

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"algomoves/gameserver/internal/auth"
	"algomoves/gameserver/internal/canvas"
	"algomoves/gameserver/internal/config"
	"algomoves/gameserver/internal/content"
	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/games"
	"algomoves/gameserver/internal/interview"
	"algomoves/gameserver/internal/prep"
	"algomoves/gameserver/internal/profile"
	"algomoves/gameserver/internal/resume"
	resumeopenai "algomoves/gameserver/internal/resume/openai"
)

// Service is the composition root for durable REST APIs.
type Service struct {
	db        *database.DB
	auth      *auth.Handler
	profiles  *profile.Handler
	games     *games.Handler
	interview *interview.Handler
	content   *content.Handler
	canvas    *canvas.Handler
	prep      *prep.Handler
	resume    *resume.Handler
}

// Open connects optional Postgres persistence and domain handlers.
func Open(ctx context.Context, cfg config.Config) (*Service, error) {
	db, err := database.Open(ctx)
	if err != nil || db == nil {
		return nil, err
	}

	databaseURL := strings.TrimSpace(cfg.DatabaseURL)
	profileRepo := profile.NewRepository(db)
	authSvc, err := auth.NewHandler(profileRepo, databaseURL)
	if err != nil {
		slog.Warn("app: session manager disabled", "error", err)
	}

	gamesRepo := games.NewRepository(db)
	interviewRepo := interview.NewRepository(db)
	contentRepo := content.NewRepository(db)
	canvasRepo := canvas.NewRepository(db)
	prepRepo := prep.NewRepository(db)
	resumeRepo := resume.NewRepository(db)

	return &Service{
		db:        db,
		auth:      authSvc,
		profiles:  profile.NewHandler(profileRepo, authSvc),
		games:     games.NewHandler(gamesRepo, authSvc),
		interview: interview.NewHandler(interviewRepo, authSvc),
		content:   content.NewHandler(contentRepo),
		canvas:    canvas.NewHandler(canvasRepo, authSvc),
		prep:      prep.NewHandler(prepRepo, authSvc),
		resume:    resume.NewHandler(resumeRepo, profileRepo, authSvc, resumeopenai.NewClient()),
	}, nil
}

// Database returns the Postgres handle when persistence is enabled.
func (s *Service) Database() *database.DB {
	if s == nil {
		return nil
	}
	return s.db
}

// BootstrapPlatformAdmin ensures the configured admin account exists.
func (s *Service) BootstrapPlatformAdmin(ctx context.Context) {
	auth.BootstrapPlatformAdmin(ctx, profile.NewRepository(s.db))
}

// Enabled reports whether Postgres persistence is active.
func (s *Service) Enabled() bool { return s != nil && s.db != nil }

// Close shuts down database and session resources.
func (s *Service) Close() {
	if s == nil {
		return
	}
	if s.auth != nil {
		s.auth.Close()
	}
	if s.db != nil {
		s.db.Close()
	}
}

// SessionMiddleware wraps API routes with session loading.
func (s *Service) SessionMiddleware(next http.Handler) http.Handler {
	return s.auth.SessionMiddleware(next)
}

// Register mounts all /api/* routes on mux.
func (s *Service) Register(mux *http.ServeMux) {
	// Register domain-specific routes using 1.22 mux features
	s.profiles.Register(mux)
	s.games.Register(mux)
	s.canvas.Register(mux)
	s.interview.Register(mux)
	s.content.Register(mux)
	s.prep.Register(mux)
	s.resume.Register(mux)
	s.auth.Register(mux)
}
