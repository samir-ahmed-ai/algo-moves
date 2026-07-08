// Package prep manages study plans, daily questions, and user preparation tracking.
package prep

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

const maxPrepPlanTitle = 200
const maxPrepPlanNotes = 50_000
const maxPrepPlanItems = 500

func sanitizePrepPlanTitle(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "Untitled plan"
	}
	if len(s) > maxPrepPlanTitle {
		s = s[:maxPrepPlanTitle]
	}
	return s
}

// Store defines the data access methods required by this domain.
type Store interface {
	ListPrepPlans(ctx context.Context, ownerID string) ([]PrepPlanSummary, error)
	CreatePrepPlan(ctx context.Context, ownerID, title string) (*PrepPlan, error)
	GetPrepPlan(ctx context.Context, id, ownerID string) (*PrepPlan, error)
	UpdatePrepPlan(ctx context.Context, id, ownerID string, title, notes *string, itemIDs []string, completedItems map[string]bool) (*PrepPlan, bool, error)
	DeletePrepPlan(ctx context.Context, id, ownerID string) (bool, error)
}

type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/prep-plans", h.handleListPrepPlans)
	mux.HandleFunc("POST /api/prep-plans", h.handleCreatePrepPlan)
	mux.HandleFunc("GET /api/prep-plans/{id}", h.handleGetPrepPlan)
	mux.HandleFunc("PUT /api/prep-plans/{id}", h.handleUpdatePrepPlan)
	mux.HandleFunc("DELETE /api/prep-plans/{id}", h.handleDeletePrepPlan)
}

func (h *Handler) handleListPrepPlans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	list, err := h.repo.ListPrepPlans(ctx, p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) handleCreatePrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		Title   string   `json:"title"`
		ItemIDs []string `json:"itemIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	title := sanitizePrepPlanTitle(body.Title)
	plan, err := h.repo.CreatePrepPlan(ctx, p.ID, title)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "create failed")
		return
	}
	// If initial items were supplied, save them immediately.
	if len(body.ItemIDs) > 0 {
		if len(body.ItemIDs) > maxPrepPlanItems {
			body.ItemIDs = body.ItemIDs[:maxPrepPlanItems]
		}
		updated, ok, err := h.repo.UpdatePrepPlan(ctx, plan.ID, p.ID, nil, nil, body.ItemIDs, nil)
		if err != nil {
			httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
			return
		}
		if ok {
			plan = updated
		}
	}
	httputil.WriteJSON(w, http.StatusOK, plan)
}

func (h *Handler) handleGetPrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	plan, err := h.repo.GetPrepPlan(ctx, id, p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if plan == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, plan)
}

func (h *Handler) handleUpdatePrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	var body struct {
		Title          *string  `json:"title"`
		Notes          *string  `json:"notes"`
		ItemIDs        []string `json:"itemIds"`
		CompletedItems []string `json:"completedItems"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.Title != nil {
		t := sanitizePrepPlanTitle(*body.Title)
		body.Title = &t
	}
	if body.Notes != nil && len(*body.Notes) > maxPrepPlanNotes {
		httputil.WriteErr(w, http.StatusBadRequest, "notes too large")
		return
	}
	if len(body.ItemIDs) > maxPrepPlanItems {
		httputil.WriteErr(w, http.StatusBadRequest, "too many items")
		return
	}
	completedSet := make(map[string]bool, len(body.CompletedItems))
	for _, cid := range body.CompletedItems {
		completedSet[cid] = true
	}
	plan, ok, err := h.repo.UpdatePrepPlan(ctx, id, p.ID, body.Title, body.Notes, body.ItemIDs, completedSet)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, plan)
}

func (h *Handler) handleDeletePrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	ok, err := h.repo.DeletePrepPlan(ctx, id, p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "delete failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
