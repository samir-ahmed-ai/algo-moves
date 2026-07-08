package canvas

import (
	"encoding/json"
	"net/http"
	"strings"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

type Handler struct {
	repo *Repository
	auth profile.Authenticator
}

func NewHandler(repo *Repository, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

// handleCanvases: list the caller's saved canvases (GET) or create one (POST).
func (h *Handler) HandleCanvases(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		list, err := h.repo.ListCanvases(ctx, p.ID)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if list == nil {
			list = []map[string]any{}
		}
		httputil.WriteJSON(w, http.StatusOK, list)
	case http.MethodPost:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    string          `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			title = "Untitled"
		}
		id, updated, err := h.repo.CreateCanvas(ctx, p.ID, title, body.Doc, body.RoomCode)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "title": title, "updatedAt": updated})
	default:
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleCanvas: fetch (GET, public), update (PUT) or delete (DELETE) one canvas
// by id. Writes are owner-guarded — a missing or unowned id is a 404.
func (h *Handler) HandleCanvas(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := strings.TrimPrefix(r.URL.Path, "/api/canvases/")
	if id == "" || strings.Contains(id, "/") {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		c, err := h.repo.GetCanvas(ctx, id)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
			return
		}
		if c == nil {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{
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
			httputil.WriteErr(w, code, msg)
			return
		}
		var body struct {
			Title    *string         `json:"title"`
			Doc      json.RawMessage `json:"doc"`
			RoomCode *string         `json:"roomCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		updated, ok, err := h.repo.UpdateCanvas(ctx, id, p.ID, body.Doc, body.Title, body.RoomCode)
		if err != nil {
			httputil.WriteErr(w, http.StatusInternalServerError, "save failed")
			return
		}
		if !ok {
			httputil.WriteErr(w, http.StatusNotFound, "not found")
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "updatedAt": updated})
	case http.MethodDelete:
		p, code, msg := h.auth.ProfileFromRequest(ctx, r)
		if code != 0 {
			httputil.WriteErr(w, code, msg)
			return
		}
		ok, err := h.repo.DeleteCanvas(ctx, id, p.ID)
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
