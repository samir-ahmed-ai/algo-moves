package interview

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

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

type Store interface {
	ListInterviewSessions(ctx context.Context, ownerProfileID string) ([]InterviewSummary, error)
	CreateInterviewSession(ctx context.Context, ownerProfileID, title string) (*InterviewSession, error)
	GetInterviewSessionByToken(ctx context.Context, token string) (*InterviewSession, error)
	GetInterviewSession(ctx context.Context, id string) (*InterviewSession, error)
	UpdateInterviewSession(ctx context.Context, id, ownerProfileID string, patch InterviewPatch) (*InterviewSession, bool, error)
	EndInterviewSession(ctx context.Context, id, ownerProfileID string) (*InterviewSession, bool, error)
	ReopenInterviewSession(ctx context.Context, id, ownerProfileID string) (*InterviewSession, bool, error)
	RotateInterviewToken(ctx context.Context, id, ownerProfileID string) (*InterviewSession, bool, error)
}

type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/interviews", h.HandleListInterviews)
	mux.HandleFunc("POST /api/interviews", h.HandleCreateInterview)
	mux.HandleFunc("GET /api/interviews/token/{token}", h.HandleGetInterviewByToken)
	mux.HandleFunc("GET /api/interviews/{id}", h.HandleGetInterview)
	mux.HandleFunc("PATCH /api/interviews/{id}", h.HandleUpdateInterview)
	mux.HandleFunc("POST /api/interviews/{id}/end", h.HandleEndInterview)
	mux.HandleFunc("POST /api/interviews/{id}/reopen", h.HandleReopenInterview)
	mux.HandleFunc("POST /api/interviews/{id}/rotate-token", h.HandleRotateToken)
}

func (h *Handler) HandleListInterviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	list, err := h.repo.ListInterviewSessions(ctx, p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleCreateInterview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	session, err := h.repo.CreateInterviewSession(ctx, p.ID, sanitizeInterviewTitle(body.Title))
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "create failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) HandleGetInterviewByToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.PathValue("token")
	session, err := h.repo.GetInterviewSessionByToken(ctx, token)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
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
}

func (h *Handler) HandleGetInterview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	id := r.PathValue("id")
	session, err := h.repo.GetInterviewSession(ctx, id)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if session == nil || session.OwnerProfileID == nil || *session.OwnerProfileID != p.ID {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) HandleUpdateInterview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	id := r.PathValue("id")
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
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "update failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) handleAction(w http.ResponseWriter, r *http.Request, actionFunc func(ctx context.Context, id, ownerProfileID string) (*InterviewSession, bool, error)) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	id := r.PathValue("id")
	session, ok, err := actionFunc(ctx, id, p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "update failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, session)
}

func (h *Handler) HandleEndInterview(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, h.repo.EndInterviewSession)
}

func (h *Handler) HandleReopenInterview(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, h.repo.ReopenInterviewSession)
}

func (h *Handler) HandleRotateToken(w http.ResponseWriter, r *http.Request) {
	h.handleAction(w, r, h.repo.RotateInterviewToken)
}
