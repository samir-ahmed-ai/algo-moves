package platform

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/alexedwards/scs/postgresstore"
	"github.com/alexedwards/scs/v2"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const sessionProfileKey = "profile_id"

func newSessionManager(databaseURL string) (*scs.SessionManager, *sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	sm := scs.New()
	sm.Store = postgresstore.NewWithConfig(db, postgresstore.Config{
		CleanUpInterval: 5 * time.Minute,
		TableName:       "sessions",
	})
	sm.Lifetime = 30 * 24 * time.Hour
	sm.IdleTimeout = 7 * 24 * time.Hour
	sm.Cookie.Name = "algomoves_session"
	sm.Cookie.HttpOnly = true
	sm.Cookie.SameSite = http.SameSiteLaxMode
	sm.Cookie.Secure = false
	return sm, db, nil
}

// SessionMiddleware loads SCS sessions from Bearer tokens or the session cookie.
func (s *Service) SessionMiddleware(next http.Handler) http.Handler {
	if s == nil || s.sessions == nil {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := BearerToken(r)
		if token == "" {
			if c, err := r.Cookie(s.sessions.Cookie.Name); err == nil {
				token = c.Value
			}
		}

		ctx, err := s.sessions.Load(r.Context(), token)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "session error")
			return
		}

		sr := r.WithContext(ctx)
		sw := &sessionResponseWriter{ResponseWriter: w, request: sr, sessions: s.sessions}
		next.ServeHTTP(sw, sr)
		if !sw.written {
			sw.commit()
		}
	})
}

type sessionResponseWriter struct {
	http.ResponseWriter
	request  *http.Request
	sessions *scs.SessionManager
	written  bool
}

func (sw *sessionResponseWriter) Write(b []byte) (int, error) {
	if !sw.written {
		sw.commit()
		sw.written = true
	}
	return sw.ResponseWriter.Write(b)
}

func (sw *sessionResponseWriter) WriteHeader(code int) {
	if !sw.written {
		sw.commit()
		sw.written = true
	}
	sw.ResponseWriter.WriteHeader(code)
}

func (sw *sessionResponseWriter) commit() {
	ctx := sw.request.Context()
	switch sw.sessions.Status(ctx) {
	case scs.Modified:
		token, expiry, err := sw.sessions.Commit(ctx)
		if err != nil {
			return
		}
		sw.sessions.WriteSessionCookie(ctx, sw.ResponseWriter, token, expiry)
	case scs.Destroyed:
		sw.sessions.WriteSessionCookie(ctx, sw.ResponseWriter, "", time.Time{})
	}
}

func (s *Service) issueSession(ctx context.Context, profileID string) (string, error) {
	loaded, err := s.sessions.Load(ctx, "")
	if err != nil {
		return "", err
	}
	s.sessions.Put(loaded, sessionProfileKey, profileID)
	token, _, err := s.sessions.Commit(loaded)
	return token, err
}

func (s *Service) profileIDFromContext(ctx context.Context) string {
	if s == nil || s.sessions == nil {
		return ""
	}
	return s.sessions.GetString(ctx, sessionProfileKey)
}
