package arcade

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return strings.TrimSpace(r.Header.Get("X-Session-Token"))
}

func (s *Service) profileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string) {
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

	// Legacy fallback: profiles.session_token column (pre-SCS tokens).
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
