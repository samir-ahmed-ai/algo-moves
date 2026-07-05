package arcade

import (
	"encoding/json"
	"net/http"
	"strings"
)

// handleCanvases: list the caller's saved canvases (GET) or create one (POST).
func (s *Service) handleCanvases(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		list, err := s.store.ListCanvases(ctx, p.ID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if list == nil {
			list = []map[string]any{}
		}
		writeJSON(w, http.StatusOK, list)
	case http.MethodPost:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		var body struct {
			Title    string          `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			title = "Untitled"
		}
		id, updated, err := s.store.CreateCanvas(ctx, p.ID, title, body.Doc, body.RoomCode)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"id": id, "title": title, "updatedAt": updated})
	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleCanvas: fetch (GET, public), update (PUT) or delete (DELETE) one canvas
// by id. Writes are owner-guarded — a missing or unowned id is a 404.
func (s *Service) handleCanvas(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := strings.TrimPrefix(r.URL.Path, "/api/canvases/")
	if id == "" || strings.Contains(id, "/") {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		c, err := s.store.GetCanvas(ctx, id)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if c == nil {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"id":             c.ID,
			"title":          c.Title,
			"doc":            c.Doc,
			"ownerProfileId": c.OwnerProfileID,
			"roomCode":       c.RoomCode,
			"updatedAt":      c.UpdatedAt,
		})
	case http.MethodPut:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		var body struct {
			Title    *string         `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		updated, ok, err := s.store.UpdateCanvas(ctx, id, p.ID, body.Doc, body.Title, body.RoomCode)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"id": id, "updatedAt": updated})
	case http.MethodDelete:
		p, code, msg := s.profileFromRequest(ctx, r)
		if code != 0 {
			writeErr(w, code, msg)
			return
		}
		ok, err := s.store.DeleteCanvas(ctx, id, p.ID)
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
