package platform

import (
	"encoding/json"
	"net/http"
	"strings"
)

func requireSignedInProfile(p *Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

// HandleProfileIntegrations serves GET/PUT /api/profiles/me/integrations.
func (s *Service) HandleProfileIntegrations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := s.ProfileFromRequest(ctx, r)
	if code != 0 {
		WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedInProfile(p); code != 0 {
		WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		status, err := s.store.OpenAIKeyStatus(ctx, p.ID)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{
			"openai": status,
		})

	case http.MethodPut:
		var body struct {
			OpenaiAPIKey *string `json:"openaiApiKey"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		var key string
		if body.OpenaiAPIKey != nil {
			key = strings.TrimSpace(*body.OpenaiAPIKey)
		}
		if err := ValidateOpenAIAPIKey(key); err != nil {
			WriteErr(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := s.store.SetOpenAIKeyForProfile(ctx, p.ID, key); err != nil {
			if IsSecretsEncryptionUnavailable(err) {
				WriteErr(w, http.StatusServiceUnavailable, "secret encryption not configured")
				return
			}
			WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		status, err := s.store.OpenAIKeyStatus(ctx, p.ID)
		if err != nil {
			WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{
			"openai": status,
		})

	default:
		WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
