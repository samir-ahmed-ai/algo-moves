package learning

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/profile"
)

const (
	maxProgressPush  = 5000
	maxReviewsPush   = 5000
	maxAttemptsBatch = 500
	maxNotesPush     = 2000
	maxBookmarks     = 5000
	maxEnrollments   = 500
	maxNoteBody      = 50_000
	defaultLimit     = 50
	maxLimit         = 200
)

var validAttemptKinds = map[string]bool{"quiz": true, "reassemble": true, "recall": true}

func requireSignedIn(p *profile.Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

// Store is the data access surface for learner state.
type Store interface {
	ListProgress(ctx context.Context, ownerID string) ([]ProblemProgressDTO, error)
	UpsertProgress(ctx context.Context, ownerID string, items []ProblemProgressDTO) ([]ProblemProgressDTO, error)
	InsertAttempts(ctx context.Context, ownerID string, items []AttemptDTO) error
	ListMistakes(ctx context.Context, ownerID string, limit int) ([]AttemptDTO, error)
	ListReviews(ctx context.Context, ownerID string) ([]ReviewCardDTO, error)
	ListDueReviews(ctx context.Context, ownerID string, at time.Time, limit int) ([]ReviewCardDTO, error)
	UpsertReviews(ctx context.Context, ownerID string, cards []ReviewCardDTO) ([]ReviewCardDTO, error)
	ListNotes(ctx context.Context, ownerID string) ([]NoteDTO, error)
	UpsertNotes(ctx context.Context, ownerID string, notes []NoteDTO) ([]NoteDTO, error)
	DeleteNote(ctx context.Context, ownerID, itemID, kind string) (bool, error)
	ListBookmarks(ctx context.Context, ownerID string) ([]string, error)
	ReplaceBookmarks(ctx context.Context, ownerID string, itemIDs []string) ([]string, error)
	ListEnrollments(ctx context.Context, ownerID string) ([]EnrollmentDTO, error)
	UpsertEnrollments(ctx context.Context, ownerID string, items []EnrollmentDTO) ([]EnrollmentDTO, error)
}

type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/progress", h.handleGetProgress)
	mux.HandleFunc("PUT /api/progress", h.handlePutProgress)
	mux.HandleFunc("POST /api/progress/attempts", h.handlePostAttempts)
	mux.HandleFunc("GET /api/progress/mistakes", h.handleGetMistakes)
	mux.HandleFunc("GET /api/reviews", h.handleGetReviews)
	mux.HandleFunc("PUT /api/reviews", h.handlePutReviews)
	mux.HandleFunc("GET /api/reviews/due", h.handleGetDueReviews)
	mux.HandleFunc("GET /api/notes", h.handleGetNotes)
	mux.HandleFunc("PUT /api/notes", h.handlePutNotes)
	mux.HandleFunc("DELETE /api/notes/{itemId}", h.handleDeleteNote)
	mux.HandleFunc("GET /api/bookmarks", h.handleGetBookmarks)
	mux.HandleFunc("PUT /api/bookmarks", h.handlePutBookmarks)
	mux.HandleFunc("GET /api/enrollments", h.handleGetEnrollments)
	mux.HandleFunc("PUT /api/enrollments", h.handlePutEnrollments)
}

// owner resolves the signed-in profile id, writing the appropriate error and
// returning ok=false when the caller is unauthenticated or anonymous.
func (h *Handler) owner(w http.ResponseWriter, r *http.Request) (string, bool) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return "", false
	}
	if code, msg := requireSignedIn(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return "", false
	}
	return p.ID, true
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		httputil.WriteErr(w, http.StatusBadRequest, "invalid json")
		return false
	}
	return true
}

func limitParam(r *http.Request) int {
	n, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil || n <= 0 {
		return defaultLimit
	}
	if n > maxLimit {
		return maxLimit
	}
	return n
}

/* ------------------------------------------------------------- progress */

func (h *Handler) handleGetProgress(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListProgress(r.Context(), owner)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"problems": list})
}

func (h *Handler) handlePutProgress(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		Problems []ProblemProgressDTO `json:"problems"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.Problems) > maxProgressPush {
		httputil.WriteErr(w, http.StatusBadRequest, "too many rows")
		return
	}
	merged, err := h.repo.UpsertProgress(r.Context(), owner, body.Problems)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"problems": merged})
}

func (h *Handler) handlePostAttempts(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		Attempts []AttemptDTO `json:"attempts"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.Attempts) > maxAttemptsBatch {
		httputil.WriteErr(w, http.StatusBadRequest, "too many attempts")
		return
	}
	valid := make([]AttemptDTO, 0, len(body.Attempts))
	for _, a := range body.Attempts {
		if validAttemptKinds[a.Kind] {
			valid = append(valid, a)
		}
	}
	if err := h.repo.InsertAttempts(r.Context(), owner, valid); err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) handleGetMistakes(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListMistakes(r.Context(), owner, limitParam(r))
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"mistakes": list})
}

/* ------------------------------------------------------------- reviews */

func (h *Handler) handleGetReviews(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListReviews(r.Context(), owner)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"cards": list})
}

func (h *Handler) handlePutReviews(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		Cards []ReviewCardDTO `json:"cards"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.Cards) > maxReviewsPush {
		httputil.WriteErr(w, http.StatusBadRequest, "too many cards")
		return
	}
	merged, err := h.repo.UpsertReviews(r.Context(), owner, body.Cards)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"cards": merged})
}

func (h *Handler) handleGetDueReviews(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	at := time.Now()
	if raw := r.URL.Query().Get("at"); raw != "" {
		if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
			at = parsed
		}
	}
	list, err := h.repo.ListDueReviews(r.Context(), owner, at, limitParam(r))
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"cards": list})
}

/* ------------------------------------------------------------- notes */

func (h *Handler) handleGetNotes(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListNotes(r.Context(), owner)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"notes": list})
}

func (h *Handler) handlePutNotes(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		Notes []NoteDTO `json:"notes"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.Notes) > maxNotesPush {
		httputil.WriteErr(w, http.StatusBadRequest, "too many notes")
		return
	}
	for _, n := range body.Notes {
		if len(n.Body) > maxNoteBody {
			httputil.WriteErr(w, http.StatusBadRequest, "note too large")
			return
		}
	}
	merged, err := h.repo.UpsertNotes(r.Context(), owner, body.Notes)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"notes": merged})
}

func (h *Handler) handleDeleteNote(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	itemID := r.PathValue("itemId")
	kind := r.URL.Query().Get("kind")
	deleted, err := h.repo.DeleteNote(r.Context(), owner, itemID, kind)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "delete failed")
		return
	}
	if !deleted {
		httputil.WriteErr(w, http.StatusNotFound, "not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

/* ------------------------------------------------------------- bookmarks */

func (h *Handler) handleGetBookmarks(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListBookmarks(r.Context(), owner)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"itemIds": list})
}

func (h *Handler) handlePutBookmarks(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		ItemIDs []string `json:"itemIds"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.ItemIDs) > maxBookmarks {
		httputil.WriteErr(w, http.StatusBadRequest, "too many bookmarks")
		return
	}
	list, err := h.repo.ReplaceBookmarks(r.Context(), owner, body.ItemIDs)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"itemIds": list})
}

/* ------------------------------------------------------------- enrollments */

func (h *Handler) handleGetEnrollments(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	list, err := h.repo.ListEnrollments(r.Context(), owner)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "query failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"enrollments": list})
}

func (h *Handler) handlePutEnrollments(w http.ResponseWriter, r *http.Request) {
	owner, ok := h.owner(w, r)
	if !ok {
		return
	}
	var body struct {
		Enrollments []EnrollmentDTO `json:"enrollments"`
	}
	if !decode(w, r, &body) {
		return
	}
	if len(body.Enrollments) > maxEnrollments {
		httputil.WriteErr(w, http.StatusBadRequest, "too many enrollments")
		return
	}
	merged, err := h.repo.UpsertEnrollments(r.Context(), owner, body.Enrollments)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "save failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"enrollments": merged})
}
