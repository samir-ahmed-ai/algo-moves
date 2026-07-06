package arcade

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

func validEmail(email string) bool {
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

func (s *Service) maybePromotePlatformAdmin(ctx context.Context, email string) {
	adminEmail := strings.TrimSpace(strings.ToLower(os.Getenv("PLATFORM_ADMIN_EMAIL")))
	email = strings.TrimSpace(strings.ToLower(email))
	if adminEmail == "" || email != adminEmail {
		return
	}
	if _, err := s.store.SetAdmin(ctx, email); err != nil {
		return
	}
}

func (s *Service) refreshSessionProfile(ctx context.Context, sess *GuestSession) {
	if sess == nil {
		return
	}
	p, err := s.store.ProfileByID(ctx, sess.ProfileID)
	if err != nil || p == nil {
		return
	}
	sess.Profile = *p
}

func (s *Service) handleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	password := body.Password
	if !validEmail(email) {
		writeErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(password) < 8 {
		writeErr(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	sess, err := s.store.CreateEmailUser(r.Context(), email, string(hash), body.DisplayName)
	if err != nil {
		if strings.Contains(err.Error(), "email already registered") {
			writeErr(w, http.StatusConflict, "email already registered")
			return
		}
		writeErr(w, http.StatusInternalServerError, "could not create account")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	s.refreshSessionProfile(r.Context(), sess)
	writeJSON(w, http.StatusOK, sess)
}

func (s *Service) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	if !validEmail(email) {
		writeErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	p, hash, err := s.store.ProfileByEmail(r.Context(), email)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if hash == "" {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	token, updated, err := s.store.RotateSessionToken(r.Context(), p.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not create session")
		return
	}
	if updated == nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	sess := GuestSession{
		ProfileID:    updated.ID,
		SessionToken: token,
		Profile:      *updated,
	}
	s.refreshSessionProfile(r.Context(), &sess)
	writeJSON(w, http.StatusOK, sess)
}

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
