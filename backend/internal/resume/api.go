package resume

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
	resumeopenai "algomoves/gameserver/internal/resume/openai"
)

const maxResumeTitle = 200
const errOpenAINotConfigured = "Add your OpenAI API key in Settings → Profile"

// Handler serves resume upload, CRUD, customization, and variant routes.
type Handler struct {
	repo     *Repository
	profiles *profile.Repository
	auth     profile.Authenticator
	ai       *resumeopenai.Client
}

func NewHandler(repo *Repository, profiles *profile.Repository, auth profile.Authenticator, ai *resumeopenai.Client) *Handler {
	return &Handler{repo: repo, profiles: profiles, auth: auth, ai: ai}
}

func (h *Handler) resolveAIClient(ctx context.Context, profileID string) (*resumeopenai.Client, error) {
	if key, ok, err := h.profiles.GetOpenAIKeyForProfile(ctx, profileID); err != nil {
		return nil, err
	} else if ok && key != "" {
		return resumeopenai.NewClientWithKey(key), nil
	}
	if h.ai != nil && h.ai.Enabled() {
		return h.ai, nil
	}
	return nil, nil
}

func requireSignedIn(p *profile.Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

func sanitizeResumeTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return "My Resume"
	}
	if len(title) > maxResumeTitle {
		title = title[:maxResumeTitle]
	}
	return title
}

// HandleResumes lists the caller's resumes (GET) or uploads and parses one (POST).
func (h *Handler) HandleResumes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		list, err := h.repo.ListResumes(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)

	case http.MethodPost:
		if code, msg := requireSignedIn(p); code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		if err := r.ParseMultipartForm(maxResumeFileBytes + 1<<20); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid multipart form")
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "missing file field")
			return
		}
		defer file.Close()

		data, err := io.ReadAll(io.LimitReader(file, maxResumeFileBytes+1))
		if err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "read failed")
			return
		}
		if len(data) > maxResumeFileBytes {
			httputil.WriteErr(w, http.StatusBadRequest, "file too large (max 5MB)")
			return
		}

		filename := ""
		contentType := ""
		if header != nil {
			filename = header.Filename
			contentType = header.Header.Get("Content-Type")
		}
		title := sanitizeResumeTitle(r.FormValue("title"))
		if title == "My Resume" && filename != "" {
			if dot := strings.LastIndex(filename, "."); dot > 0 {
				title = sanitizeResumeTitle(filename[:dot])
			}
		}

		rawText, err := ExtractResumeText(filename, contentType, data)
		if err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, err.Error())
			return
		}

		aiClient, err := h.resolveAIClient(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if aiClient == nil || !aiClient.Enabled() {
			httputil.WriteErr(w, http.StatusServiceUnavailable, errOpenAINotConfigured)
			return
		}
		mapping, err := aiClient.ParseResume(ctx, rawText)
		if err != nil {
			httputil.WriteErr(w, http.StatusBadGateway, "resume parse failed")
			return
		}

		isPublic := true
		if v := strings.ToLower(strings.TrimSpace(r.FormValue("isPublic"))); v == "false" || v == "0" {
			isPublic = false
		}

		resume, err := h.repo.CreateResume(ctx, p.ID, title, filename, contentType, data, rawText, mapping, isPublic)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "create failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, resume)

	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// HandleResume routes /api/resumes/{id} and its sub-paths (directory, customize, variants).
func (h *Handler) HandleResume(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rest := strings.TrimPrefix(r.URL.Path, "/api/resumes/")
	if rest == "" {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	if rest == "directory" {
		if r.Method != http.MethodGet {
			httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		if code, msg := requireSignedIn(p); code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		list, err := h.repo.ListResumeDirectory(ctx)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)
		return
	}

	parts := strings.Split(rest, "/")
	id := parts[0]
	if id == "" {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	if len(parts) == 2 {
		switch parts[1] {
		case "customize":
			h.handleCustomize(w, r, id)
			return
		case "variants":
			h.handleVariants(w, r, id)
			return
		}
	}
	if len(parts) == 3 && parts[1] == "variants" {
		h.handleVariantDelete(w, r, id, parts[2])
		return
	}
	if len(parts) > 1 {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		resume, err := h.repo.GetResume(ctx, id)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if resume == nil {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		if resume.OwnerProfileID != p.ID && !resume.IsPublic {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		if resume.OwnerProfileID != p.ID {
			resume.RawText = ""
		}
		httputil.WriteJSON(w, http.StatusOK, resume)

	case http.MethodPut:
		if code, msg := requireSignedIn(p); code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    *string         `json:"title"`
			Mapping  json.RawMessage `json:"mapping"`
			IsPublic *bool           `json:"isPublic"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if body.Title != nil {
			t := sanitizeResumeTitle(*body.Title)
			body.Title = &t
		}
		resume, ok, err := h.repo.UpdateResume(ctx, id, p.ID, body.Title, body.Mapping, body.IsPublic)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, resume)

	case http.MethodDelete:
		if code, msg := requireSignedIn(p); code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		ok, err := h.repo.DeleteResume(ctx, id, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "delete failed")
			return
		}
		if !ok {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})

	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) handleVariants(w http.ResponseWriter, r *http.Request, resumeID string) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	list, err := h.repo.ListResumeVariants(ctx, resumeID, p.ID)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) handleVariantDelete(w http.ResponseWriter, r *http.Request, resumeID, variantID string) {
	if r.Method != http.MethodDelete {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	_ = resumeID // variant ownership is enforced by owner_profile_id on delete
	ok, err := h.repo.DeleteResumeVariant(ctx, variantID, p.ID)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) handleCustomize(w http.ResponseWriter, r *http.Request, resumeID string) {
	if r.Method != http.MethodPost {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	var body struct {
		Focus      string `json:"focus"`
		TargetRole string `json:"targetRole"`
		Mode       string `json:"mode"`
		Save       bool   `json:"save"`
		Label      string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	focus := strings.ToLower(strings.TrimSpace(body.Focus))
	if focus == "" {
		httputil.WriteErr(w, http.StatusBadRequest, "focus required")
		return
	}
	targetRole := strings.TrimSpace(body.TargetRole)
	mode := strings.ToLower(strings.TrimSpace(body.Mode))
	if mode != "ai" {
		mode = "rules"
	}

	resume, err := h.repo.GetResume(ctx, resumeID)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if resume == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	if resume.OwnerProfileID != p.ID && !resume.IsPublic {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	var customized json.RawMessage
	switch mode {
	case "ai":
		aiClient, err := h.resolveAIClient(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if aiClient == nil || !aiClient.Enabled() {
			httputil.WriteErr(w, http.StatusServiceUnavailable, errOpenAINotConfigured)
			return
		}
		customized, err = aiClient.RewriteForFocus(ctx, resume.Mapping, focus, targetRole)
		if err != nil {
			httputil.WriteErr(w, http.StatusBadGateway, "ai rewrite failed")
			return
		}
	default:
		customized, err = ReorderMappingForFocus(resume.Mapping, focus)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "customize failed")
			return
		}
	}

	resp := map[string]any{
		"resumeId":   resume.ID,
		"focus":      focus,
		"targetRole": targetRole,
		"mode":       mode,
		"mapping":    customized,
	}

	if body.Save {
		label := strings.TrimSpace(body.Label)
		if label == "" {
			label = focus
			if targetRole != "" {
				label = focus + " — " + targetRole
			}
		}
		variant, err := h.repo.CreateResumeVariant(ctx, resume.ID, p.ID, label, focus, targetRole, mode, customized)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "save variant failed")
			return
		}
		resp["variant"] = variant
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}
