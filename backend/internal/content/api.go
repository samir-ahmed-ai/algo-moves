package content

import (
	"algomoves/gameserver/internal/platform"
	"net/http"
	"strings"
)

type Handler struct {
	store *platform.Store
}

func NewHandler(store *platform.Store) *Handler {
	return &Handler{store: store}
}

func (h *Handler) HandleContentCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	courses, err := h.store.ContentCatalog(r.Context())
	if err != nil {
		platform.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if courses == nil {
		courses = []platform.ContentCourse{}
	}
	platform.WriteJSON(w, http.StatusOK, courses)
}

// handleContentProblem: GET /api/content/problems/{id} — one problem with
// solutions, tags and quiz.
func (h *Handler) HandleContentProblem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		platform.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/content/problems/")
	if id == "" || strings.Contains(id, "/") {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	p, err := h.store.ContentProblemByID(r.Context(), id)
	if err != nil {
		platform.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if p == nil {
		platform.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	platform.WriteJSON(w, http.StatusOK, p)
}
