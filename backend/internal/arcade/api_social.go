package arcade

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

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
