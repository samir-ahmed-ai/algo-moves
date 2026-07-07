package arcade

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
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

// handlePrepPlans: list the caller's plans (GET) or create one (POST).
func (s *Service) handlePrepPlans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := s.profileFromRequest(ctx, r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		list, err := s.store.ListPrepPlans(ctx, p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, list)

	case http.MethodPost:
		var body struct {
			Title   string   `json:"title"`
			ItemIDs []string `json:"itemIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil && !errors.Is(err, io.EOF) {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		title := sanitizePrepPlanTitle(body.Title)
		plan, err := s.store.CreatePrepPlan(ctx, p.ID, title)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "create failed")
			return
		}
		// If initial items were supplied, save them immediately.
		if len(body.ItemIDs) > 0 {
			if len(body.ItemIDs) > maxPrepPlanItems {
				body.ItemIDs = body.ItemIDs[:maxPrepPlanItems]
			}
			updated, ok, err := s.store.UpdatePrepPlan(ctx, plan.ID, p.ID, nil, nil, body.ItemIDs, nil)
			if err != nil {
				writeErr(w, http.StatusInternalServerError, "save failed")
				return
			}
			if ok {
				plan = updated
			}
		}
		writeJSON(w, http.StatusOK, plan)

	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handlePrepPlan: item routes under /api/prep-plans/{id}.
//
//	{id}  GET    owner read (full plan + items)
//	{id}  PUT    owner full-state save
//	{id}  DELETE owner delete
func (s *Service) handlePrepPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := strings.TrimPrefix(r.URL.Path, "/api/prep-plans/")
	if id == "" || strings.Contains(id, "/") {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}

	p, code, msg := s.profileFromRequest(ctx, r)
	if code != 0 {
		writeErr(w, code, msg)
		return
	}

	switch r.Method {
	case http.MethodGet:
		plan, err := s.store.GetPrepPlan(ctx, id, p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if plan == nil {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, plan)

	case http.MethodPut:
		var body struct {
			Title          *string  `json:"title"`
			Notes          *string  `json:"notes"`
			ItemIDs        []string `json:"itemIds"`
			CompletedItems []string `json:"completedItems"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if body.Title != nil {
			t := sanitizePrepPlanTitle(*body.Title)
			body.Title = &t
		}
		if body.Notes != nil && len(*body.Notes) > maxPrepPlanNotes {
			writeErr(w, http.StatusBadRequest, "notes too large")
			return
		}
		if len(body.ItemIDs) > maxPrepPlanItems {
			writeErr(w, http.StatusBadRequest, "too many items")
			return
		}
		completedSet := make(map[string]bool, len(body.CompletedItems))
		for _, cid := range body.CompletedItems {
			completedSet[cid] = true
		}
		plan, ok, err := s.store.UpdatePrepPlan(ctx, id, p.ID, body.Title, body.Notes, body.ItemIDs, completedSet)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, plan)

	case http.MethodDelete:
		ok, err := s.store.DeletePrepPlan(ctx, id, p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "delete failed")
			return
		}
		if !ok {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})

	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
