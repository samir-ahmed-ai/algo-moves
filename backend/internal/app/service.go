// Package app wires domain HTTP handlers into a single deployable API surface.
package app

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"algomoves/gameserver/internal/auth"
	"algomoves/gameserver/internal/canvas"
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
	auth      *auth.Service
	profiles  *profile.Handler
	games     *games.Handler
	interview *interview.Handler
	content   *content.Handler
	canvas    *canvas.Handler
	prep      *prep.Handler
	resume    *resume.Handler
}

// Open connects optional Postgres persistence and domain handlers.
func Open(ctx context.Context) (*Service, error) {
	db, err := database.Open(ctx)
	if err != nil || db == nil {
		return nil, err
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	profileRepo := profile.NewRepository(db)
	authSvc, err := auth.NewService(profileRepo, databaseURL)
	if err != nil {
		log.Printf("app: session manager disabled: %v", err)
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

type route struct {
	pattern string
	handler http.HandlerFunc
}

// Register mounts all /api/* routes on mux.
func (s *Service) Register(mux *http.ServeMux) {
	for _, r := range s.routes() {
		mux.HandleFunc(r.pattern, r.handler)
	}
}

func (s *Service) routes() []route {
	return []route{
		{"/api/auth/guest", s.auth.HandleGuest},
		{"/api/auth/signup", s.auth.HandleSignup},
		{"/api/auth/login", s.auth.HandleLogin},
		{"/api/auth/logout", s.auth.HandleLogout},
		{"/api/auth/me", s.auth.HandleMe},
		{"/api/profiles/", s.profiles.HandleProfiles},
		{"/api/stats/me", s.games.HandleStatsMe},
		{"/api/matches/me", s.games.HandleMatchesMe},
		{"/api/matches", s.games.HandleSubmitMatch},
		{"/api/leaderboard/", s.games.HandleLeaderboard},
		{"/api/achievements", s.games.HandleAchievements},
		{"/api/achievements/", s.games.HandleAchievementAction},
		{"/api/rooms/", s.games.HandleRooms},
		{"/api/friends", s.games.HandleFriends},
		{"/api/daily-challenge", s.games.HandleDailyChallenge},
		{"/api/daily-challenge/score", s.games.HandleDailyScore},
		{"/api/games", s.games.HandleGames},
		{"/api/games/", s.games.HandleGames},
		{"/api/canvases", s.canvas.HandleCanvases},
		{"/api/canvases/", s.canvas.HandleCanvas},
		{"/api/interviews", s.interview.HandleInterviews},
		{"/api/interviews/", s.interview.HandleInterview},
		{"/api/content/catalog", s.content.HandleContentCatalog},
		{"/api/content/problems/", s.content.HandleContentProblem},
		{"/api/prep-plans", s.prep.HandlePrepPlans},
		{"/api/prep-plans/", s.prep.HandlePrepPlan},
		{"/api/resumes", s.resume.HandleResumes},
		{"/api/resumes/", s.resume.HandleResume},
	}
}
