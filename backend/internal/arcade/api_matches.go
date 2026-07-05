package arcade

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

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
