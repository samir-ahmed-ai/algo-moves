package games

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

type Store interface {
	GameStats(ctx context.Context, profileID string) ([]map[string]any, error)
	MatchHistory(ctx context.Context, profileID string, limit int) ([]map[string]any, error)
	SubmitMatchResult(ctx context.Context, game, room, mode string, participants json.RawMessage, metadata json.RawMessage) (json.RawMessage, error)
	LeaderboardGame(ctx context.Context, game string, limit int) ([]map[string]any, error)
	LeaderboardGlobal(ctx context.Context, limit int) ([]map[string]any, error)
	LeaderboardRecent(ctx context.Context, since time.Time, game *string, limit int) ([]map[string]any, error)
	ListAchievements(ctx context.Context) ([]map[string]any, error)
	UnlockedAchievementIDs(ctx context.Context, profileID string) ([]string, error)
	UnlockAchievement(ctx context.Context, profileID, achID string) error
	UpsertRoom(ctx context.Context, row map[string]any) (map[string]any, error)
	GetRoom(ctx context.Context, code string) (map[string]any, error)
	ListPublicRooms(ctx context.Context, limit int) ([]map[string]any, error)
	TouchRoom(ctx context.Context, code string) error
	ListFriends(ctx context.Context, profileID string) ([]map[string]any, error)
	AddFriend(ctx context.Context, profileID, friendID, status string) error
	GetOrCreateDailyChallenge(ctx context.Context, date string) (map[string]any, error)
	SubmitDailyScore(ctx context.Context, profileID, date string, score int) error
	ListGames(ctx context.Context) ([]map[string]any, error)
	GetGame(ctx context.Context, id string) (map[string]any, error)
}

type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/stats/me", h.HandleStatsMe)
	mux.HandleFunc("GET /api/matches/me", h.HandleMatchesMe)
	mux.HandleFunc("POST /api/matches", h.HandleSubmitMatch)
	
	mux.HandleFunc("GET /api/leaderboard/game/{game}", h.HandleLeaderboardGame)
	mux.HandleFunc("GET /api/leaderboard/global", h.HandleLeaderboardGlobal)
	mux.HandleFunc("GET /api/leaderboard/recent", h.HandleLeaderboardRecent)
	
	mux.HandleFunc("GET /api/achievements", h.HandleAchievements)
	mux.HandleFunc("POST /api/achievements/{achID}", h.HandleAchievementAction)
	
	mux.HandleFunc("GET /api/rooms/public", h.HandleRoomsPublic)
	mux.HandleFunc("GET /api/rooms/{code}", h.HandleGetRoom)
	mux.HandleFunc("PUT /api/rooms/{code}", h.HandleUpsertRoom)
	mux.HandleFunc("POST /api/rooms/{code}/touch", h.HandleRoomTouch)
	
	mux.HandleFunc("GET /api/friends", h.HandleGetFriends)
	mux.HandleFunc("POST /api/friends", h.HandleAddFriend)
	
	mux.HandleFunc("GET /api/daily-challenge", h.HandleDailyChallenge)
	mux.HandleFunc("POST /api/daily-challenge/score", h.HandleDailyScore)
	
	mux.HandleFunc("GET /api/games", h.HandleListGames)
	mux.HandleFunc("GET /api/games/{id}", h.HandleGetGame)
}

func (h *Handler) HandleStatsMe(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	stats, err := h.repo.GameStats(r.Context(), p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if stats == nil {
		stats = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, stats)
}

func (h *Handler) HandleMatchesMe(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	limit := 25
	history, err := h.repo.MatchHistory(r.Context(), p.ID, limit)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if history == nil {
		history = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, history)
}

func (h *Handler) HandleSubmitMatch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		GameID       string          `json:"gameId"`
		RoomCode     *string         `json:"roomCode"`
		Mode         string          `json:"mode"`
		Participants json.RawMessage `json:"participants"`
		Metadata     json.RawMessage `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
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
	out, err := h.repo.SubmitMatchResult(r.Context(), body.GameID, room, body.Mode, body.Participants, meta)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "submit failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) HandleLeaderboardGame(w http.ResponseWriter, r *http.Request) {
	game := r.PathValue("game")
	rows, err := h.repo.LeaderboardGame(r.Context(), game, 50)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, rows)
}

func (h *Handler) HandleLeaderboardGlobal(w http.ResponseWriter, r *http.Request) {
	rows, err := h.repo.LeaderboardGlobal(r.Context(), 50)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, rows)
}

func (h *Handler) HandleLeaderboardRecent(w http.ResponseWriter, r *http.Request) {
	sinceStr := r.URL.Query().Get("since")
	since, err := time.Parse(time.RFC3339, sinceStr)
	if err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid since")
		return
	}
	var game *string
	if g := r.URL.Query().Get("game"); g != "" {
		game = &g
	}
	rows, err := h.repo.LeaderboardRecent(r.Context(), since, game, 50)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, rows)
}

func (h *Handler) HandleAchievements(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("unlocked") == "1" {
		p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		ids, err := h.repo.UnlockedAchievementIDs(r.Context(), p.ID)
		if err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, ids)
		return
	}
	list, err := h.repo.ListAchievements(r.Context())
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleAchievementAction(w http.ResponseWriter, r *http.Request) {
	achID := r.PathValue("achID")
	if achID == "" {
		httputil.WriteErr(w, http.StatusBadRequest, "missing achID")
		return
	}
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if err := h.repo.UnlockAchievement(r.Context(), p.ID, achID); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "unlock failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleRoomsPublic(w http.ResponseWriter, r *http.Request) {
	list, err := h.repo.ListPublicRooms(r.Context(), 20)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleRoomTouch(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if err := h.repo.TouchRoom(r.Context(), code); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "touch failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleGetRoom(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	row, err := h.repo.GetRoom(r.Context(), code)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if row == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, row)
}

func (h *Handler) HandleUpsertRoom(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	body["code"] = code
	row, err := h.repo.UpsertRoom(r.Context(), body)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "upsert failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, row)
}

func (h *Handler) HandleGetFriends(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	list, err := h.repo.ListFriends(r.Context(), p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleAddFriend(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		FriendProfileID string `json:"friend_profile_id"`
		Status          string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	status := body.Status
	if status == "" {
		status = "pending"
	}
	if err := h.repo.AddFriend(r.Context(), p.ID, body.FriendProfileID, status); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "add failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleDailyChallenge(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}
	row, err := h.repo.GetOrCreateDailyChallenge(r.Context(), date)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, row)
}

func (h *Handler) HandleDailyScore(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		Date  string `json:"date"`
		Score int    `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.repo.SubmitDailyScore(r.Context(), p.ID, body.Date, body.Score); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "submit failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleListGames(w http.ResponseWriter, r *http.Request) {
	games, err := h.repo.ListGames(r.Context())
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if games == nil {
		games = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, games)
}

func (h *Handler) HandleGetGame(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	game, err := h.repo.GetGame(r.Context(), id)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if game == nil {
		httputil.WriteErr(w, http.StatusNotFound, "game not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, game)
}
