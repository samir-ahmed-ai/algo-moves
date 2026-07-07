package prep

import (
	"algomoves/gameserver/internal/platform"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

type Handler struct {
	store *platform.Store
	auth  platform.Authenticator
}

func NewHandler(store *platform.Store, auth platform.Authenticator) *Handler {
	return &Handler{store: store, auth: auth}
}

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

// handlePrepPlans: list the caller's plans (GET) or create one (POST).
func (h *Handler) HandlePrepPlans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		list, err := h.store.ListPrepPlans(ctx, p.ID)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		platform.WriteJSON(w, http.StatusOK, list)

	case http.MethodPost:
		var body struct {
			Title   string   `json:"title"`
			ItemIDs []string `json:"itemIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
			platform.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		title := sanitizePrepPlanTitle(body.Title)
		plan, err := h.store.CreatePrepPlan(ctx, p.ID, title)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "create failed")
			return
		}
		// If initial items were supplied, save them immediately.
		if len(body.ItemIDs) > 0 {
			if len(body.ItemIDs) > maxPrepPlanItems {
				body.ItemIDs = body.ItemIDs[:maxPrepPlanItems]
			}
			updated, ok, err := h.store.UpdatePrepPlan(ctx, plan.ID, p.ID, nil, nil, body.ItemIDs, nil)
			if err != nil {
				platform.WriteErr(w, http.StatusInternalServerError, "save failed")
				return
			}
			if ok {
				plan = updated
			}
		}
		platform.WriteJSON(w, http.StatusOK, plan)

	default:
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handlePrepPlan: item routes under /api/prep-plans/{id}.
//
//	{id}  GET    owner read (full plan + items)
//	{id}  PUT    owner full-state save
//	{id}  DELETE owner delete
func (h *Handler) HandlePrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := strings.TrimPrefix(r.URL.Path, "/api/prep-plans/")
	if id == "" || strings.Contains(id, "/") {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}

	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		platform.WriteErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		plan, err := h.store.GetPrepPlan(ctx, id, p.ID)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if plan == nil {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, plan)

	case http.MethodPut:
		var body struct {
			Title          *string  `json:"title"`
			Notes          *string  `json:"notes"`
			ItemIDs        []string `json:"itemIds"`
			CompletedItems []string `json:"completedItems"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if body.Title != nil {
			t := sanitizePrepPlanTitle(*body.Title)
			body.Title = &t
		}
		if body.Notes != nil && len(*body.Notes) > maxPrepPlanNotes {
			platform.WriteErr(w, http.StatusBadRequest, "notes too large")
			return
		}
		if len(body.ItemIDs) > maxPrepPlanItems {
			platform.WriteErr(w, http.StatusBadRequest, "too many items")
			return
		}
		completedSet := make(map[string]bool, len(body.CompletedItems))
		for _, cid := range body.CompletedItems {
			completedSet[cid] = true
		}
		plan, ok, err := h.store.UpdatePrepPlan(ctx, id, p.ID, body.Title, body.Notes, body.ItemIDs, completedSet)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, plan)

	case http.MethodDelete:
		ok, err := h.store.DeletePrepPlan(ctx, id, p.ID)
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
