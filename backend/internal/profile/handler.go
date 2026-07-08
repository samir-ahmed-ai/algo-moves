// Package profile serves profile, settings, and integration HTTP handlers.
package profile

import (
	"encoding/json"
	"net/http"
	"strings"

	"algomoves.dev/shared/crypto"
	"algomoves.dev/shared/httputil"
)

const maxSettingsBytes = 64 * 1024

// Handler serves profile-related HTTP routes.
type Handler struct {
	repo *Repository
	auth Authenticator
}

// NewHandler constructs a profile HTTP handler.
func NewHandler(repo *Repository, authenticator Authenticator) *Handler {
	return &Handler{repo: repo, auth: authenticator}
}

func requireSignedInProfile(p *Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

// HandleProfiles serves /api/profiles/* routes.
func (h *Handler) HandleProfiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/profiles/")
	if path == "me/integrations" {
		h.HandleProfileIntegrations(w, r)
		return
	}
	if path == "me/settings" {
		h.HandleProfileSettings(w, r)
		return
	}
	if path == "me" && r.Method == http.MethodPatch {
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
			httputil.WriteErr(w, http.StatusInternalServerError, "update failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, updated)
		return
	}
	if r.Method == http.MethodGet && strings.Contains(path, ",") {
		ids := strings.Split(path, ",")
		list, err := h.repo.ProfilesByIDs(ctx, ids)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)
		return
	}
	if r.Method == http.MethodGet && path != "" && !strings.Contains(path, "/") {
		p, err := h.repo.ProfileByID(ctx, path)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if p == nil {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, p)
		return
	}
	httputil.WriteErr(w, http.StatusNotFound, "not found")
}

// HandleProfileSettings serves GET/PUT /api/profiles/me/settings.
func (h *Handler) HandleProfileSettings(w http.ResponseWriter, r *http.Request) {
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
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
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
			httputil.WriteErr(w, http.StatusInternalServerError, "save failed")
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
func (h *Handler) HandleProfileIntegrations(w http.ResponseWriter, r *http.Request) {
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
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
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
			httputil.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		status, err := h.repo.OpenAIKeyStatus(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"openai": status,
		})

	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
