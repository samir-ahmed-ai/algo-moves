package arcade

import (
	"encoding/json"
	"net/http"
	"strings"
)

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
