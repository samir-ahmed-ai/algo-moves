package platform

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return strings.TrimSpace(r.Header.Get("X-Session-Token"))
}

func (s *Service) ProfileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string) {
	if pid := s.profileIDFromContext(ctx); pid != "" {
		p, err := s.store.ProfileByID(ctx, pid)
		if err != nil {
			return nil, http.StatusInternalServerError, "database error"
		}
		if p == nil {
			return nil, http.StatusUnauthorized, "invalid session token"
		}
		return p, 0, ""
	}
	token := BearerToken(r)
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

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func WriteErr(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
