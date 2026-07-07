package arcade

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"algomoves/gameserver/internal/arcade/ai"
	"algomoves/gameserver/internal/platform"
)

const maxResumeTitle = 200

func (s *Service) aiClient() *ai.Client {
	if s == nil {
		return nil
	}
	if s.ai == nil {
		s.ai = ai.NewClient()
	}
	return s.ai
}

func requireSignedIn(p *platform.Profile) (int, string) {
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
func (s *Service) HandleResumes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := s.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		list, err := s.Store().ListResumes(ctx, p.ID)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		platform.WriteJSON(w, http.StatusOK, list)

	case http.MethodPost:
		if code, msg := requireSignedIn(p); code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		if err := r.ParseMultipartForm(maxResumeFileBytes + 1<<20); err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "invalid multipart form")
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "missing file field")
			return
		}
		defer file.Close()

		data, err := io.ReadAll(io.LimitReader(file, maxResumeFileBytes+1))
		if err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "read failed")
			return
		}
		if len(data) > maxResumeFileBytes {
			platform.WriteErr(w, http.StatusBadRequest, "file too large (max 5MB)")
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
			platform.WriteErr(w, http.StatusBadRequest, err.Error())
			return
		}

		client := s.aiClient()
		if client == nil || !client.Enabled() {
			platform.WriteErr(w, http.StatusServiceUnavailable, "OPENAI_API_KEY not configured")
			return
		}
		mapping, err := client.ParseResume(ctx, rawText)
		if err != nil {
			platform.WriteErr(w, http.StatusBadGateway, "resume parse failed")
			return
		}

		isPublic := true
		if v := strings.ToLower(strings.TrimSpace(r.FormValue("isPublic"))); v == "false" || v == "0" {
			isPublic = false
		}

		resume, err := s.Store().CreateResume(ctx, p.ID, title, filename, contentType, data, rawText, mapping, isPublic)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "create failed")
			return
		}
		platform.WriteJSON(w, http.StatusOK, resume)

	default:
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// HandleResume routes /api/resumes/{id} and its sub-paths (directory, customize, variants).
func (s *Service) HandleResume(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rest := strings.TrimPrefix(r.URL.Path, "/api/resumes/")
	if rest == "" {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	// Directory listing: /api/resumes/directory
	if rest == "directory" {
		if r.Method != http.MethodGet {
			platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		p, code, msg := s.ProfileFromRequest(ctx, r)
		if code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		if code, msg := requireSignedIn(p); code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		list, err := s.Store().ListResumeDirectory(ctx)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		platform.WriteJSON(w, http.StatusOK, list)
		return
	}

	parts := strings.Split(rest, "/")
	id := parts[0]
	if id == "" {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	if len(parts) == 2 {
		switch parts[1] {
		case "customize":
			s.handleResumeCustomize(w, r, id)
			return
		case "variants":
			s.handleResumeVariants(w, r, id)
			return
		}
	}
	if len(parts) > 1 {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	p, code, msg := s.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		resume, err := s.Store().GetResume(ctx, id)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if resume == nil {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		if resume.OwnerProfileID != p.ID && !resume.IsPublic {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		if resume.OwnerProfileID != p.ID {
			resume.RawText = ""
		}
		platform.WriteJSON(w, http.StatusOK, resume)

	case http.MethodPut:
		if code, msg := requireSignedIn(p); code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    *string         `json:"title"`
			Mapping  json.RawMessage `json:"mapping"`
			IsPublic *bool           `json:"isPublic"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if body.Title != nil {
			t := sanitizeResumeTitle(*body.Title)
			body.Title = &t
		}
		resume, ok, err := s.Store().UpdateResume(ctx, id, p.ID, body.Title, body.Mapping, body.IsPublic)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, resume)

	case http.MethodDelete:
		if code, msg := requireSignedIn(p); code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		ok, err := s.Store().DeleteResume(ctx, id, p.ID)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "delete failed")
			return
		}
		if !ok {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})

	default:
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *Service) handleResumeVariants(w http.ResponseWriter, r *http.Request, resumeID string) {
	if r.Method != http.MethodGet {
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	p, code, msg := s.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}
	list, err := s.Store().ListResumeVariants(ctx, resumeID, p.ID)
	if err != nil {
		platform.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	platform.WriteJSON(w, http.StatusOK, list)
}

func (s *Service) handleResumeCustomize(w http.ResponseWriter, r *http.Request, resumeID string) {
	if r.Method != http.MethodPost {
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx := r.Context()
	p, code, msg := s.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		platform.WriteErr(w, code, msg)
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
		platform.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	focus := strings.ToLower(strings.TrimSpace(body.Focus))
	if focus == "" {
		platform.WriteErr(w, http.StatusBadRequest, "focus required")
		return
	}
	targetRole := strings.TrimSpace(body.TargetRole)
	mode := strings.ToLower(strings.TrimSpace(body.Mode))
	if mode != "ai" {
		mode = "rules"
	}

	resume, err := s.Store().GetResume(ctx, resumeID)
	if err != nil {
		platform.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if resume == nil {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	if resume.OwnerProfileID != p.ID && !resume.IsPublic {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	var customized json.RawMessage
	switch mode {
	case "ai":
		client := s.aiClient()
		if client == nil || !client.Enabled() {
			platform.WriteErr(w, http.StatusServiceUnavailable, "OPENAI_API_KEY not configured")
			return
		}
		customized, err = client.RewriteForFocus(ctx, resume.Mapping, focus, targetRole)
		if err != nil {
			platform.WriteErr(w, http.StatusBadGateway, "ai rewrite failed")
			return
		}
	default:
		customized, err = ReorderMappingForFocus(resume.Mapping, focus)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "customize failed")
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
		variant, err := s.Store().CreateResumeVariant(ctx, resume.ID, p.ID, label, focus, targetRole, mode, customized)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "save variant failed")
			return
		}
		resp["variant"] = variant
	}

	platform.WriteJSON(w, http.StatusOK, resp)
}
