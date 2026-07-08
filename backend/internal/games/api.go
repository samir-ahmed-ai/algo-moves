package games

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

type Handler struct {
	repo *Repository
	auth profile.Authenticator
}

func NewHandler(repo *Repository, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) HandleStatsMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	stats, err := h.repo.GameStats(r.Context(), p.ID)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if stats == nil {
		stats = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, stats)
}

func (h *Handler) HandleMatchesMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	limit := 25
	history, err := h.repo.MatchHistory(r.Context(), p.ID, limit)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if history == nil {
		history = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, history)
}

func (h *Handler) HandleSubmitMatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
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
		httputil.WriteErr(w, http.StatusInternalServerError, "submit failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, out)
}

func (h *Handler) HandleLeaderboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	limit := 50
	path := strings.TrimPrefix(r.URL.Path, "/api/leaderboard/")
	switch {
	case strings.HasPrefix(path, "game/"):
		game := strings.TrimPrefix(path, "game/")
		rows, err := h.repo.LeaderboardGame(ctx, game, limit)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, rows)
	case path == "global":
		rows, err := h.repo.LeaderboardGlobal(ctx, limit)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, rows)
	case path == "recent":
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
		rows, err := h.repo.LeaderboardRecent(ctx, since, game, limit)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, rows)
	default:
		httputil.WriteErr(w, http.StatusNotFound, "not found")
	}
}

func (h *Handler) HandleAchievements(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if r.URL.Query().Get("unlocked") == "1" {
		p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		ids, err := h.repo.UnlockedAchievementIDs(r.Context(), p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, ids)
		return
	}
	list, err := h.repo.ListAchievements(r.Context())
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleAchievementAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	achID := strings.TrimPrefix(r.URL.Path, "/api/achievements/")
	if achID == "" || strings.Contains(achID, "/") {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if err := h.repo.UnlockAchievement(r.Context(), p.ID, achID); err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "unlock failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleRooms(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
	if path == "public" && r.Method == http.MethodGet {
		list, err := h.repo.ListPublicRooms(ctx, 20)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)
		return
	}
	if path == "" {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	parts := strings.Split(path, "/")
	code := parts[0]
	if len(parts) == 2 && parts[1] == "touch" && r.Method == http.MethodPost {
		if err := h.repo.TouchRoom(ctx, code); err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "touch failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	switch r.Method {
	case http.MethodGet:
		row, err := h.repo.GetRoom(ctx, code)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if row == nil {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, row)
	case http.MethodPut:
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		body["code"] = code
		row, err := h.repo.UpsertRoom(ctx, body)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "upsert failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, row)
	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleFriends(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		list, err := h.repo.ListFriends(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)
	case http.MethodPost:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
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
		if err := h.repo.AddFriend(ctx, p.ID, body.FriendProfileID, status); err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "add failed")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleDailyChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}
	row, err := h.repo.GetOrCreateDailyChallenge(r.Context(), date)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, row)
}

func (h *Handler) HandleDailyScore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
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
		httputil.WriteErr(w, http.StatusInternalServerError, "submit failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleGames(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/games")
	path = strings.Trim(path, "/")
	if path == "" {
		games, err := h.repo.ListGames(r.Context())
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if games == nil {
			games = []map[string]any{}
		}
		httputil.WriteJSON(w, http.StatusOK, games)
		return
	}
	game, err := h.repo.GetGame(r.Context(), path)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if game == nil {
		httputil.WriteErr(w, http.StatusNotFound, "game not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, game)
}
