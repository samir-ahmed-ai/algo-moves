package content

import (
	"algomoves.dev/shared/httputil"
	"net/http"
	"strings"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) HandleContentCatalog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	courses, err := h.repo.ContentCatalog(r.Context())
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if courses == nil {
		courses = []ContentCourse{}
	}
	httputil.WriteJSON(w, http.StatusOK, courses)
}

// handleContentProblem: GET /api/content/problems/{id} — one problem with
// solutions, tags and quiz.
func (h *Handler) HandleContentProblem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		httputil.WriteErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/content/problems/")
	if id == "" || strings.Contains(id, "/") {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	p, err := h.repo.ContentProblemByID(r.Context(), id)
	if err != nil {
		httputil.WriteErr(w, http.StatusInternalServerError, "query failed")
		return
	}
	if p == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, p)
}
