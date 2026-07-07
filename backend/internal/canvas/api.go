package canvas

import (
	"algomoves/gameserver/internal/platform"
	"encoding/json"
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

// handleCanvases: list the caller's saved canvases (GET) or create one (POST).
func (h *Handler) HandleCanvases(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		list, err := h.store.ListCanvases(ctx, p.ID)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if list == nil {
			list = []map[string]any{}
		}
		platform.WriteJSON(w, http.StatusOK, list)
	case http.MethodPost:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    string          `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			title = "Untitled"
		}
		id, updated, err := h.store.CreateCanvas(ctx, p.ID, title, body.Doc, body.RoomCode)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		platform.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "title": title, "updatedAt": updated})
	default:
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleCanvas: fetch (GET, public), update (PUT) or delete (DELETE) one canvas
// by id. Writes are owner-guarded — a missing or unowned id is a 404.
func (h *Handler) HandleCanvas(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := strings.TrimPrefix(r.URL.Path, "/api/canvases/")
	if id == "" || strings.Contains(id, "/") {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		c, err := h.store.GetCanvas(ctx, id)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if c == nil {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, map[string]any{
			"id":             c.ID,
			"title":          c.Title,
			"doc":            c.Doc,
			"ownerProfileId": c.OwnerProfileID,
			"roomCode":       c.RoomCode,
			"updatedAt":      c.UpdatedAt,
		})
	case http.MethodPut:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    *string         `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			platform.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		updated, ok, err := h.store.UpdateCanvas(ctx, id, p.ID, body.Doc, body.Title, body.RoomCode)
		if err != nil {
			platform.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			platform.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		platform.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "updatedAt": updated})
	case http.MethodDelete:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			platform.WriteErr(w, code, msg)
			return
		}
		ok, err := h.store.DeleteCanvas(ctx, id, p.ID)
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
