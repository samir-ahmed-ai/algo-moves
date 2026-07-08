// Package auth handles login, signup, guest sessions, and session middleware.
package auth

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"algomoves.dev/shared/config"
	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
	"github.com/alexedwards/scs/postgresstore"
	"github.com/alexedwards/scs/v2"
	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12
const sessionProfileKey = "profile_id"

// Handler manages auth HTTP handlers and session cookies.

// Store defines the data access methods required by the auth service.
type Store interface {
	SetAdmin(ctx context.Context, email string) (bool, error)
	ProfileByID(ctx context.Context, id string) (*profile.Profile, error)
	CreateEmailUser(ctx context.Context, email, passwordHash, displayName string) (*profile.GuestSession, error)
	ProfileByEmail(ctx context.Context, email string) (*profile.Profile, string, error)
	CreateGuest(ctx context.Context) (*profile.GuestSession, error)
}

type Handler struct {
	profiles Store
	sessions *scs.SessionManager
	sqlDB    *sql.DB
}

// NewHandler constructs an auth handler with optional session storage.
func NewHandler(profiles Store, databaseURL string) (*Handler, error) {
	svc := &Handler{profiles: profiles}
	if strings.TrimSpace(databaseURL) == "" {
		return svc, nil
	}
	sm, db, err := newSessionManager(databaseURL)
	if err != nil {
		return svc, err
	}
	svc.sessions = sm
	svc.sqlDB = db
	return svc, nil
}

// Close shuts down the session SQL connection.

func (s *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/signup", s.handleSignup)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/guest", s.handleGuest)
	mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	mux.HandleFunc("GET /api/auth/me", s.handleMe)
}

func (s *Handler) Close() {
	if s != nil && s.sqlDB != nil {
		s.sqlDB.Close()
	}
}

// ValidEmail performs basic email validation.
func ValidEmail(email string) bool {
	email = strings.TrimSpace(strings.ToLower(email))
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	at := strings.LastIndex(email, "@")
	if at < 1 || at >= len(email)-1 {
		return false
	}
	return strings.Contains(email[at+1:], ".")
}

func (s *Handler) maybePromotePlatformAdmin(ctx context.Context, email string) {
	adminEmail := strings.TrimSpace(strings.ToLower(os.Getenv("PLATFORM_ADMIN_EMAIL")))
	email = strings.TrimSpace(strings.ToLower(email))
	if adminEmail == "" || email != adminEmail {
		return
	}
	if _, err := s.profiles.SetAdmin(ctx, email); err != nil {
		return
	}
}

func (s *Handler) refreshSessionProfile(ctx context.Context, sess *profile.GuestSession) {
	if sess == nil {
		return
	}
	p, err := s.profiles.ProfileByID(ctx, sess.ProfileID)
	if err != nil || p == nil {
		return
	}
	sess.Profile = *p
}

func (s *Handler) handleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	password := body.Password
	if !ValidEmail(email) {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(password) < 8 {
		httputil.WriteErr(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not hash password")
		return
	}
	sess, err := s.profiles.CreateEmailUser(r.Context(), email, string(hash), body.DisplayName)
	if err != nil {
		if strings.Contains(err.Error(), "email already registered") {
			httputil.WriteErr(w, http.StatusConflict, "email already registered")
			return
		}
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not create account")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	s.refreshSessionProfile(r.Context(), sess)
	if _, err := s.issueSession(r.Context(), sess.ProfileID); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not create session")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, sess)
}

func (s *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	if !ValidEmail(email) {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	p, hash, err := s.profiles.ProfileByEmail(r.Context(), email)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		httputil.WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if hash == "" {
		httputil.WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		httputil.WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	sess := profile.GuestSession{
		ProfileID: p.ID,
		Profile:   *p,
	}
	s.refreshSessionProfile(r.Context(), &sess)
	if _, err := s.issueSession(r.Context(), p.ID); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not create session")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, sess)
}

func (s *Handler) handleGuest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	sess, err := s.profiles.CreateGuest(r.Context())
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not create guest profile")
		return
	}
	if _, err := s.issueSession(r.Context(), sess.ProfileID); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "could not create session")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, sess)
}

func (s *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.sessions != nil {
		_ = s.sessions.Destroy(r.Context())
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	pid := s.profileIDFromContext(r.Context())
	if pid == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	p, err := s.profiles.ProfileByID(r.Context(), pid)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, p)
}

// ProfileFromRequest implements Authenticator.
func (s *Handler) ProfileFromRequest(ctx context.Context, r *http.Request) (*profile.Profile, int, string) {
	pid := s.profileIDFromContext(ctx)
	if pid == "" {
		return nil, http.StatusUnauthorized, "missing session"
	}
	p, err := s.profiles.ProfileByID(ctx, pid)
	if err != nil {
		return nil, http.StatusInternalServerError, "database error"
	}
	if p == nil {
		return nil, http.StatusUnauthorized, "invalid session"
	}
	return p, 0, ""
}

// SessionMiddleware loads SCS sessions from the session cookie.
func (s *Handler) SessionMiddleware(next http.Handler) http.Handler {
	if s == nil || s.sessions == nil {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := ""
		if c, err := r.Cookie(s.sessions.Cookie.Name); err == nil {
			token = c.Value
		}

		ctx, err := s.sessions.Load(r.Context(), token)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "session error")
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

func crossSiteCookiesEnabled() bool {
	if config.Enabled("COOKIE_CROSS_SITE") {
		return true
	}
	return strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")) != ""
}

func newSessionManager(databaseURL string) (*scs.SessionManager, *sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	sm := scs.New()
	sm.Store = postgresstore.NewWithConfig(db, postgresstore.Config{
		CleanUpInterval: 5 * time.Minute,
		TableName:       "sessions",
	})
	sm.Lifetime = 30 * 24 * time.Hour
	sm.IdleTimeout = 7 * 24 * time.Hour
	sm.Cookie.Name = "algomoves_session"
	sm.Cookie.HttpOnly = true
	if crossSiteCookiesEnabled() {
		sm.Cookie.SameSite = http.SameSiteNoneMode
		sm.Cookie.Secure = true
	} else {
		sm.Cookie.SameSite = http.SameSiteLaxMode
		sm.Cookie.Secure = false
	}
	return sm, db, nil
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

func (s *Handler) issueSession(ctx context.Context, profileID string) (string, error) {
	loaded, err := s.sessions.Load(ctx, "")
	if err != nil {
		return "", err
	}
	s.sessions.Put(loaded, sessionProfileKey, profileID)
	token, _, err := s.sessions.Commit(loaded)
	return token, err
}

func (s *Handler) profileIDFromContext(ctx context.Context) string {
	if s == nil || s.sessions == nil {
		return ""
	}
	return s.sessions.GetString(ctx, sessionProfileKey)
}
