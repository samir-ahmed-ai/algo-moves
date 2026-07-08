package content

import (
	"context"
	"net/http"

	"algomoves.dev/shared/httputil"
)

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
	mux.HandleFunc("GET /api/content/catalog", h.HandleContentCatalog)
	mux.HandleFunc("GET /api/content/problems/{id}", h.HandleContentProblem)
}

func (h *Handler) HandleContentCatalog(w http.ResponseWriter, r *http.Request) {
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
func (h *Handler) HandleContentProblem(w http.ResponseWriter, r *http.Request) {
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
