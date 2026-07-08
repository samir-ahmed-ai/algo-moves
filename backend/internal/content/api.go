// Package content provides static and dynamic algorithmic challenges, courses, and resources.
package content

import (
	"context"
	"net/http"

	"algomoves.dev/shared/httputil"
)

// Store defines the data access methods required by this domain.
type Store interface {
	ContentCatalog(ctx context.Context) ([]ContentCourse, error)
	ContentProblemByID(ctx context.Context, id string) (*ContentProblem, error)
}

type Handler struct {
	repo Store
}

func NewHandler(repo Store) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/content/catalog", h.handleContentCatalog)
	mux.HandleFunc("GET /api/content/problems/{id}", h.handleContentProblem)
}

func (h *Handler) handleContentCatalog(w http.ResponseWriter, r *http.Request) {
	courses, err := h.repo.ContentCatalog(r.Context())
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if courses == nil {
		courses = []ContentCourse{}
	}
	httputil.WriteJSON(w, http.StatusOK, courses)
}

// handleContentProblem: GET /api/content/problems/{id} — one problem with
// solutions, tags and quiz.
func (h *Handler) handleContentProblem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		httputil.WriteErr(w, http.StatusBadRequest, "missing id")
		return
	}
	p, err := h.repo.ContentProblemByID(r.Context(), id)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	if p == nil {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, p)
}
