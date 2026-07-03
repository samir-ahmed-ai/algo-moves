package arcade

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Service bundles the arcade store and HTTP handlers.
type Service struct {
	store *Store
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
	if os.Getenv("RUN_MIGRATIONS") == "1" || os.Getenv("RUN_MIGRATIONS") == "true" {
		if err := Migrate(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		if err := SeedAchievements(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("arcade: migrations and seed applied")
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
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return strings.TrimSpace(r.Header.Get("X-Session-Token"))
}

func (s *Service) profileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string) {
	token := bearerToken(r)
	if token == "" {
		return nil, http.StatusUnauthorized, "missing session token"
	}
	p, err := s.store.ProfileByToken(ctx, token)
	if err != nil {
		return nil, http.StatusInternalServerError, "database error"
	}
	if p == nil {
		return nil, http.StatusUnauthorized, "invalid session token"
	}
	return p, 0, ""
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Service) handleGuest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	sess, err := s.store.CreateGuest(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not create guest profile")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (s *Service) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := s.profileFromRequest(r.Context(), r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Service) handleProfiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/profiles/")
	if path == "me" && r.Method == http.MethodPatch {
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		var body struct {
			DisplayName *string `json:"display_name"`
			AvatarSeed  *string `json:"avatar_seed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		updated, err := s.store.UpdateProfile(ctx, p.ID, body.DisplayName, body.AvatarSeed)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "update failed")
			return
		}
		writeJSON(w, http.StatusOK, updated)
		return
	}
	if r.Method == http.MethodGet && strings.Contains(path, ",") {
		ids := strings.Split(path, ",")
		list, err := s.store.ProfilesByIDs(ctx, ids)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, list)
		return
	}
	if r.Method == http.MethodGet && path != "" && !strings.Contains(path, "/") {
		p, err := s.store.ProfileByID(ctx, path)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if p == nil {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, p)
		return
	}
	writeErr(w, http.StatusNotFound, "not found")
}

func (s *Service) handleStatsMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := s.profileFromRequest(r.Context(), r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}
	stats, err := s.store.GameStats(r.Context(), p.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if stats == nil {
		stats = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, stats)
}

func (s *Service) handleMatchesMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := s.profileFromRequest(r.Context(), r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}
	limit := 25
	history, err := s.store.MatchHistory(r.Context(), p.ID, limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if history == nil {
		history = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, history)
}

func (s *Service) handleSubmitMatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		GameID       string          `json:"gameId"`
		RoomCode     *string         `json:"roomCode"`
		Mode         string          `json:"mode"`
		Participants json.RawMessage `json:"participants"`
		Metadata     json.RawMessage `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	room := ""
	if body.RoomCode != nil {
		room = *body.RoomCode
	}
	meta := body.Metadata
	if meta == nil {
		meta = json.RawMessage(`{}`)
	}
	out, err := s.store.SubmitMatchResult(r.Context(), body.GameID, room, body.Mode, body.Participants, meta)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "submit failed")
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Service) handleLeaderboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	limit := 50
	path := strings.TrimPrefix(r.URL.Path, "/api/leaderboard/")
	switch {
	case strings.HasPrefix(path, "game/"):
		game := strings.TrimPrefix(path, "game/")
		rows, err := s.store.LeaderboardGame(ctx, game, limit)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	case path == "global":
		rows, err := s.store.LeaderboardGlobal(ctx, limit)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	case path == "recent":
		sinceStr := r.URL.Query().Get("since")
		since, err := time.Parse(time.RFC3339, sinceStr)
		if err != nil {
			writeErr(w, http.StatusBadRequest, "invalid since")
			return
		}
		var game *string
		if g := r.URL.Query().Get("game"); g != "" {
			game = &g
		}
		rows, err := s.store.LeaderboardRecent(ctx, since, game, limit)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	default:
		writeErr(w, http.StatusNotFound, "not found")
	}
}

func (s *Service) handleAchievements(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if r.URL.Query().Get("unlocked") == "1" {
		p, code, msg := s.profileFromRequest(r.Context(), r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		ids, err := s.store.UnlockedAchievementIDs(r.Context(), p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, ids)
		return
	}
	list, err := s.store.ListAchievements(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Service) handleAchievementAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	achID := strings.TrimPrefix(r.URL.Path, "/api/achievements/")
	if achID == "" || strings.Contains(achID, "/") {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	p, code, msg := s.profileFromRequest(r.Context(), r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}
	if err := s.store.UnlockAchievement(r.Context(), p.ID, achID); err != nil {
		writeErr(w, http.StatusInternalServerError, "unlock failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) handleRooms(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
	if path == "public" && r.Method == http.MethodGet {
		list, err := s.store.ListPublicRooms(ctx, 20)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, list)
		return
	}
	if path == "" {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	parts := strings.Split(path, "/")
	code := parts[0]
	if len(parts) == 2 && parts[1] == "touch" && r.Method == http.MethodPost {
		if err := s.store.TouchRoom(ctx, code); err != nil {
			writeErr(w, http.StatusInternalServerError, "touch failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	switch r.Method {
	case http.MethodGet:
		row, err := s.store.GetRoom(ctx, code)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if row == nil {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, row)
	case http.MethodPut:
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		body["code"] = code
		row, err := s.store.UpsertRoom(ctx, body)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "upsert failed")
			return
		}
		writeJSON(w, http.StatusOK, row)
	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Service) handleFriends(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		list, err := s.store.ListFriends(ctx, p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, list)
	case http.MethodPost:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		var body struct {
			FriendProfileID string `json:"friend_profile_id"`
			Status          string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		status := body.Status
		if status == "" {
			status = "pending"
		}
		if err := s.store.AddFriend(ctx, p.ID, body.FriendProfileID, status); err != nil {
			writeErr(w, http.StatusInternalServerError, "add failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Service) handleDailyChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}
	row, err := s.store.GetOrCreateDailyChallenge(r.Context(), date)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	writeJSON(w, http.StatusOK, row)
}

func (s *Service) handleDailyScore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := s.profileFromRequest(r.Context(), r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}
	var body struct {
		Date  string `json:"date"`
		Score int    `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := s.store.SubmitDailyScore(r.Context(), p.ID, body.Date, body.Score); err != nil {
		writeErr(w, http.StatusInternalServerError, "submit failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
