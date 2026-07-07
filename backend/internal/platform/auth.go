package platform

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

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

func (s *Service) HandleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	password := body.Password
	if !ValidEmail(email) {
		WriteErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(password) < 8 {
		WriteErr(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		WriteErr(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	sess, err := s.store.CreateEmailUser(r.Context(), email, string(hash), body.DisplayName)
	if err != nil {
		if strings.Contains(err.Error(), "email already registered") {
			WriteErr(w, http.StatusConflict, "email already registered")
			return
		}
		WriteErr(w, http.StatusInternalServerError, "could not create account")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	s.refreshSessionProfile(r.Context(), sess)
	if token, err := s.issueSession(r.Context(), sess.ProfileID); err == nil && token != "" {
		sess.SessionToken = token
		_, _, _ = s.store.RotateSessionToken(r.Context(), sess.ProfileID)
	}
	WriteJSON(w, http.StatusOK, sess)
}

func (s *Service) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(body.Email))
	if !ValidEmail(email) {
		WriteErr(w, http.StatusBadRequest, "invalid email")
		return
	}
	p, hash, err := s.store.ProfileByEmail(r.Context(), email)
	if err != nil {
		WriteErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if hash == "" {
		WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	s.maybePromotePlatformAdmin(r.Context(), email)
	token, updated, err := s.store.RotateSessionToken(r.Context(), p.ID)
	if err != nil {
		WriteErr(w, http.StatusInternalServerError, "could not create session")
		return
	}
	if updated == nil {
		WriteErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	sess := GuestSession{
		ProfileID:    updated.ID,
		SessionToken: token,
		Profile:      *updated,
	}
	s.refreshSessionProfile(r.Context(), &sess)
	if scsToken, err := s.issueSession(r.Context(), updated.ID); err == nil && scsToken != "" {
		sess.SessionToken = scsToken
	}
	WriteJSON(w, http.StatusOK, sess)
}

func (s *Service) HandleGuest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	sess, err := s.store.CreateGuest(r.Context())
	if err != nil {
		WriteErr(w, http.StatusInternalServerError, "could not create guest profile")
		return
	}
	if token, err := s.issueSession(r.Context(), sess.ProfileID); err == nil && token != "" {
		sess.SessionToken = token
	}
	WriteJSON(w, http.StatusOK, sess)
}

func (s *Service) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if s.sessions != nil {
		_ = s.sessions.Destroy(r.Context())
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	p, code, msg := s.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		WriteErr(w, code, msg)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

func (s *Service) HandleProfiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/profiles/")
	if path == "me" && r.Method == http.MethodPatch {
		p, code, msg := s.ProfileFromRequest(ctx, r)
		if code != 0 {
			WriteErr(w, code, msg)
			return
		}
		var body struct {
			DisplayName *string `json:"display_name"`
			AvatarSeed  *string `json:"avatar_seed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		updated, err := s.store.UpdateProfile(ctx, p.ID, body.DisplayName, body.AvatarSeed)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "update failed")
			return
		}
		WriteJSON(w, http.StatusOK, updated)
		return
	}
	if r.Method == http.MethodGet && strings.Contains(path, ",") {
		ids := strings.Split(path, ",")
		list, err := s.store.ProfilesByIDs(ctx, ids)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		WriteJSON(w, http.StatusOK, list)
		return
	}
	if r.Method == http.MethodGet && path != "" && !strings.Contains(path, "/") {
		p, err := s.store.ProfileByID(ctx, path)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if p == nil {
			WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		WriteJSON(w, http.StatusOK, p)
		return
	}
	WriteErr(w, http.StatusNotFound, "not found")
}
