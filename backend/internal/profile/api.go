// Package profile serves profile, settings, and integration HTTP handlers.
package profile

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"algomoves.dev/shared/crypto"
	"algomoves.dev/shared/httputil"
)

const maxSettingsBytes = 64 * 1024

// Store defines the data access methods required by the profile handler.
type Store interface {
	UpdateProfile(ctx context.Context, id string, displayName, avatarSeed *string) (*Profile, error)
	ProfilesByIDs(ctx context.Context, ids []string) ([]Profile, error)
	ProfileByID(ctx context.Context, id string) (*Profile, error)
	GetProfileSettings(ctx context.Context, profileID string) (json.RawMessage, error)
	SetProfileSettings(ctx context.Context, profileID string, settings json.RawMessage) error
	OpenAIKeyStatus(ctx context.Context, profileID string) (OpenAIKeyIntegrationStatus, error)
	SetOpenAIKeyForProfile(ctx context.Context, profileID, key string) error
}

// Handler serves profile-related HTTP routes.
type Handler struct {
	repo Store
	auth Authenticator
}

// NewHandler constructs a profile HTTP handler.
func NewHandler(repo Store, authenticator Authenticator) *Handler {
	return &Handler{repo: repo, auth: authenticator}
}

func requireSignedInProfile(p *Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

// Register mounts the profile routes onto the given mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/profiles/me/integrations", h.handleProfileIntegrations)
	mux.HandleFunc("PUT /api/profiles/me/integrations", h.handleProfileIntegrations)
	mux.HandleFunc("GET /api/profiles/me/settings", h.handleProfileSettings)
	mux.HandleFunc("PUT /api/profiles/me/settings", h.handleProfileSettings)
	mux.HandleFunc("PATCH /api/profiles/me", h.handleUpdateMe)
	mux.HandleFunc("GET /api/profiles/{id}", h.handleGetProfile)
	mux.HandleFunc("GET /api/profiles", h.handleGetProfiles)
}

func (h *Handler) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		DisplayName *string `json:"display_name"`
		AvatarSeed  *string `json:"avatar_seed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	updated, err := h.repo.UpdateProfile(ctx, p.ID, body.DisplayName, body.AvatarSeed)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "update failed", "profile_id", p.ID)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, updated)
}

func (h *Handler) handleGetProfiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idsParam := r.URL.Query().Get("ids")
	if idsParam == "" {
		httputil.WriteErr(w, http.StatusBadRequest, "missing ids parameter")
		return
	}
	ids := strings.Split(idsParam, ",")
	list, err := h.repo.ProfilesByIDs(ctx, ids)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteErr(w, http.StatusBadRequest, "missing id")
		return
	}
	p, err := h.repo.ProfileByID(ctx, id)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed", "profile_id", id)
		return
	}
	if p == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, p)
}

// HandleProfileSettings serves GET/PUT /api/profiles/me/settings.
func (h *Handler) handleProfileSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedInProfile(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		raw, err := h.repo.GetProfileSettings(ctx, p.ID)
		if err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed", "profile_id", p.ID)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(raw)

	case http.MethodPut:
		r.Body = http.MaxBytesReader(w, r.Body, maxSettingsBytes)
		var raw json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		var obj map[string]any
		if err := json.Unmarshal(raw, &obj); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "settings must be a JSON object")
			return
		}
		if err := h.repo.SetProfileSettings(ctx, p.ID, raw); err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed", "profile_id", p.ID)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(raw)

	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// HandleProfileIntegrations serves GET/PUT /api/profiles/me/integrations.
func (h *Handler) handleProfileIntegrations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedInProfile(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		status, err := h.repo.OpenAIKeyStatus(ctx, p.ID)
		if err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed", "profile_id", p.ID)
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"openai": status,
		})

	case http.MethodPut:
		var body struct {
			OpenaiAPIKey *string `json:"openaiApiKey"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		var key string
		if body.OpenaiAPIKey != nil {
			key = strings.TrimSpace(*body.OpenaiAPIKey)
		}
		if err := crypto.ValidateOpenAIAPIKey(key); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := h.repo.SetOpenAIKeyForProfile(ctx, p.ID, key); err != nil {
			if IsSecretsEncryptionUnavailable(err) {
				httputil.WriteErr(w, http.StatusServiceUnavailable, "secret encryption not configured")
				return
			}
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed", "profile_id", p.ID)
			return
		}
		status, err := h.repo.OpenAIKeyStatus(ctx, p.ID)
		if err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed", "profile_id", p.ID)
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"openai": status,
		})

	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
