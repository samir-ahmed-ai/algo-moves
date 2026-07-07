// Package arcade wires domain HTTP handlers into a single deployable API surface.
package arcade

import (
	"context"
	"net/http"

	"algomoves/gameserver/internal/canvas"
	"algomoves/gameserver/internal/content"
	"algomoves/gameserver/internal/games"
	"algomoves/gameserver/internal/interview"
	"algomoves/gameserver/internal/arcade/ai"
	"algomoves/gameserver/internal/platform"
	"algomoves/gameserver/internal/prep"
)

// Service is the public facade over platform persistence and domain handlers.
type Service struct {
	*platform.Service
	ai *ai.Client
	games     *games.Handler
	interview *interview.Handler
	content   *content.Handler
	canvas    *canvas.Handler
	prep      *prep.Handler
}

// Open connects optional Postgres persistence and domain handlers.
func Open(ctx context.Context) (*Service, error) {
	svc, err := platform.Open(ctx)
	if err != nil || svc == nil {
		return nil, err
	}
	return &Service{
		Service:   svc,
		games:     games.NewHandler(svc.Store(), svc),
		interview: interview.NewHandler(svc.Store(), svc),
		content:   content.NewHandler(svc.Store()),
		canvas:    canvas.NewHandler(svc.Store(), svc),
		prep:      prep.NewHandler(svc.Store(), svc),
	}, nil
}

func (s *Service) BootstrapPlatformAdmin(ctx context.Context) {
	platform.BootstrapPlatformAdmin(ctx, s.Store())
}

func (s *Service) SessionMiddleware(next http.Handler) http.Handler {
	return s.Service.SessionMiddleware(next)
}

type route struct {
	pattern string
	handler http.HandlerFunc
}

func (s *Service) Register(mux *http.ServeMux) {
	for _, r := range s.routes() {
		mux.HandleFunc(r.pattern, r.handler)
	}
}

func (s *Service) routes() []route {
	return []route{
		{"/api/auth/guest", s.HandleGuest},
		{"/api/auth/signup", s.HandleSignup},
		{"/api/auth/login", s.HandleLogin},
		{"/api/auth/logout", s.HandleLogout},
		{"/api/auth/me", s.HandleMe},
		{"/api/profiles/", s.HandleProfiles},
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
		{"/api/resumes", s.HandleResumes},
		{"/api/resumes/", s.HandleResume},
	}
}
