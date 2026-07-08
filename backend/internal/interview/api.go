package interview

import (
	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

type Handler struct {
	repo *Repository
	auth profile.Authenticator
}

func NewHandler(repo *Repository, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

// Advisory size bounds mirroring the interview-canvas reference.
const (
	maxInterviewCanvas = 2 << 20   // 2 MiB
	maxInterviewJSON   = 256 << 10 // 256 KiB (questions / rubric)
	maxInterviewNotes  = 100_000
	maxInterviewTitle  = 200
)

func sanitizeInterviewTitle(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "Untitled interview"
	}
	if len(s) > maxInterviewTitle {
		s = s[:maxInterviewTitle]
	}
	return s
}

// handleInterviews: list the caller's sessions (GET) or create one (POST).
func (h *Handler) HandleInterviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	switch r.Method {
	case http.MethodGet:
		list, err := h.repo.ListInterviewSessions(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, list)
	case http.MethodPost:
		var body struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		session, err := h.repo.CreateInterviewSession(ctx, p.ID, sanitizeInterviewTitle(body.Title))
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "create failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, session)
	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleInterview: item routes under /api/interviews/.
//
//	token/{token}          GET   public sanitized read (guest join)
//	{id}                   GET   owner full read
//	{id}                   PATCH owner partial update
//	{id}/end|reopen|rotate-token  POST owner actions
func (h *Handler) HandleInterview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	path := strings.TrimPrefix(r.URL.Path, "/api/interviews/")
	if path == "" {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	parts := strings.Split(path, "/")

	// Public guest read by token — no auth.
	if parts[0] == "token" {
		if len(parts) != 2 || r.Method != http.MethodGet {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		session, err := h.repo.GetInterviewSessionByToken(ctx, parts[1])
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		// Disabled / ended / missing links are indistinguishable to guests.
		if session == nil || !session.GuestLinkEnabled || session.Status != "active" {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
			"id":           session.ID,
			"title":        session.Title,
			"status":       session.Status,
			"canvasLocked": session.CanvasLocked,
			"roomCode":     session.RoomCode,
			"canvas":       session.Canvas,
		})
		return
	}

	// Everything else is owner-guarded.
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	id := parts[0]

	// Action sub-routes: {id}/end | {id}/reopen | {id}/rotate-token
	if len(parts) == 2 {
		if r.Method != http.MethodPost {
			httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		var (
			session *InterviewSession
			ok      bool
			err     error
		)
		switch parts[1] {
		case "end":
			session, ok, err = h.repo.EndInterviewSession(ctx, id, p.ID)
		case "reopen":
			session, ok, err = h.repo.ReopenInterviewSession(ctx, id, p.ID)
		case "rotate-token":
			session, ok, err = h.repo.RotateInterviewToken(ctx, id, p.ID)
		default:
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "update failed")
			return
		}
		if !ok {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, session)
		return
	}
	if len(parts) != 1 {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		session, err := h.repo.GetInterviewSession(ctx, id)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if session == nil || session.OwnerProfileID == nil || *session.OwnerProfileID != p.ID {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, session)
	case http.MethodPatch:
		var body struct {
			Title            *string         `json:"title"`
			Canvas           json.RawMessage `json:"canvas"`
			Questions        json.RawMessage `json:"questions"`
			Notes            *string         `json:"notes"`
			Rubric           json.RawMessage `json:"rubric"`
			Recommendation   *string         `json:"recommendation"`
			CanvasLocked     *bool           `json:"canvasLocked"`
			GuestLinkEnabled *bool           `json:"guestLinkEnabled"`
			RoomCode         *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if len(body.Canvas) > maxInterviewCanvas {
			httputil.WriteErr(w, http.StatusBadRequest, "canvas too large")
			return
		}
		if len(body.Questions) > maxInterviewJSON || len(body.Rubric) > maxInterviewJSON {
			httputil.WriteErr(w, http.StatusBadRequest, "payload too large")
			return
		}
		if body.Notes != nil && len(*body.Notes) > maxInterviewNotes {
			httputil.WriteErr(w, http.StatusBadRequest, "notes too large")
			return
		}
		if body.Title != nil {
			t := sanitizeInterviewTitle(*body.Title)
			body.Title = &t
		}
		patch := InterviewPatch{
			Title:            body.Title,
			Canvas:           body.Canvas,
			Questions:        body.Questions,
			Notes:            body.Notes,
			Rubric:           body.Rubric,
			Recommendation:   body.Recommendation,
			CanvasLocked:     body.CanvasLocked,
			GuestLinkEnabled: body.GuestLinkEnabled,
			RoomCode:         body.RoomCode,
		}
		if patch.IsEmpty() {
			httputil.WriteErr(w, http.StatusBadRequest, "no fields to update")
			return
		}
		session, ok, err := h.repo.UpdateInterviewSession(ctx, id, p.ID, patch)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "update failed")
			return
		}
		if !ok {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, session)
	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
