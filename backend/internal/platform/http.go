package platform

import (
	"context"
	"encoding/json"
	"net/http"
)

func (s *Service) ProfileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string) {
	pid := s.profileIDFromContext(ctx)
	if pid == "" {
		return nil, http.StatusUnauthorized, "missing session"
	}
	p, err := s.store.ProfileByID(ctx, pid)
	if err != nil {
		return nil, http.StatusInternalServerError, "database error"
	}
	if p == nil {
		return nil, http.StatusUnauthorized, "invalid session"
	}
	return p, 0, ""
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func WriteErr(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
