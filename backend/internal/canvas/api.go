package canvas

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

type Store interface {
	ListCanvases(ctx context.Context, profileID string) ([]map[string]any, error)
	CreateCanvas(ctx context.Context, ownerProfileID, title string, doc json.RawMessage, roomCode *string) (string, time.Time, error)
	GetCanvas(ctx context.Context, id string) (*Canvas, error)
	UpdateCanvas(ctx context.Context, id, ownerProfileID string, doc json.RawMessage, title *string, roomCode *string) (time.Time, bool, error)
	DeleteCanvas(ctx context.Context, id, ownerProfileID string) (bool, error)
}

type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/canvases", h.HandleListCanvases)
	mux.HandleFunc("POST /api/canvases", h.HandleCreateCanvas)
	mux.HandleFunc("GET /api/canvases/{id}", h.HandleGetCanvas)
	mux.HandleFunc("PUT /api/canvases/{id}", h.HandleUpdateCanvas)
	mux.HandleFunc("DELETE /api/canvases/{id}", h.HandleDeleteCanvas)
}

func (h *Handler) HandleListCanvases(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	list, err := h.repo.ListCanvases(r.Context(), p.ID)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if list == nil {
		list = []map[string]any{}
	}
	httputil.WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleCreateCanvas(w http.ResponseWriter, r *http.Request) {
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
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
	id, updated, err := h.repo.CreateCanvas(r.Context(), p.ID, title, body.Doc, body.RoomCode)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "title": title, "updatedAt": updated})
}

func (h *Handler) HandleGetCanvas(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	c, err := h.repo.GetCanvas(r.Context(), id)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
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
}

func (h *Handler) HandleUpdateCanvas(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
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
	updated, ok, err := h.repo.UpdateCanvas(r.Context(), id, p.ID, body.Doc, body.Title, body.RoomCode)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	if !ok {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"id": id, "updatedAt": updated})
}

func (h *Handler) HandleDeleteCanvas(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, code, msg := h.auth.ProfileFromRequest(r.Context(), r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	ok, err := h.repo.DeleteCanvas(r.Context(), id, p.ID)
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
