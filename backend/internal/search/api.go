// Package search provides cross-domain full-text search over user-owned data.
package search

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"algomoves.dev/shared/httputil"
	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/profile"
)

const (
	defaultLimit = 20
	maxLimit     = 40
	minQueryLen  = 2
)

// Hit is one ranked search result.
type Hit struct {
	Kind     string  `json:"kind"`
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Subtitle string  `json:"subtitle,omitempty"`
	Score    float64 `json:"score"`
}

// Store runs owner-scoped FTS queries.
type Store interface {
	Search(ctx context.Context, ownerID, query string, limit int) ([]Hit, error)
}

// Handler serves GET /api/search.
type Handler struct {
	repo Store
	auth profile.Authenticator
}

func NewHandler(repo Store, auth profile.Authenticator) *Handler {
	return &Handler{repo: repo, auth: auth}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/search", h.handleSearch)
}

func requireSignedIn(p *profile.Profile) (int, string) {
	if p == nil || p.IsAnonymous {
		return http.StatusUnauthorized, "sign in required"
	}
	return 0, ""
}

func (h *Handler) handleSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	p, code, msg := h.auth.ProfileFromRequest(ctx, r)
	if code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}
	if code, msg := requireSignedIn(p); code != 0 {
		httputil.WriteErr(w, code, msg)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < minQueryLen {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"hits": []Hit{}})
		return
	}

	limit := defaultLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	hits, err := h.repo.Search(ctx, p.ID, q, limit)
	if err != nil {
		httputil.LogAndWriteErr(w, err, http.StatusInternalServerError, "search failed")
		return
	}
	if hits == nil {
		hits = []Hit{}
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"hits": hits})
}

// Repository implements Store with Postgres FTS + trigram fallback.
type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Search(ctx context.Context, ownerID, query string, limit int) ([]Hit, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = defaultLimit
	}

	const sql = `
with q as (
  select websearch_to_tsquery('english', $2) as tsq, $2::text as raw
),
hits as (
  select 'plan'::text as kind, id::text as id, title,
         left(coalesce(notes, ''), 120) as subtitle,
         greatest(ts_rank(search_vector, q.tsq), similarity(title, q.raw) * 0.5) as score
  from public.prep_plans, q
  where owner_profile_id = $1
    and (search_vector @@ q.tsq or title % q.raw)
  union all
  select 'resume', id::text, title,
         coalesce(nullif(original_filename, ''), 'resume'),
         greatest(ts_rank(search_vector, q.tsq), similarity(title, q.raw) * 0.5)
  from public.resumes, q
  where owner_profile_id = $1
    and (search_vector @@ q.tsq or title % q.raw)
  union all
  select 'interview', id::text, title,
         left(coalesce(notes, ''), 120),
         greatest(ts_rank(search_vector, q.tsq), similarity(title, q.raw) * 0.5)
  from public.interview_sessions, q
  where owner_profile_id = $1
    and (search_vector @@ q.tsq or title % q.raw)
  union all
  select 'canvas', id::text, title,
         'canvas',
         greatest(ts_rank(search_vector, q.tsq), similarity(title, q.raw) * 0.5)
  from public.canvases, q
  where owner_profile_id = $1
    and (search_vector @@ q.tsq or title % q.raw)
  union all
  select 'game', id::text, title,
         'game',
         greatest(ts_rank(search_vector, q.tsq), similarity(title, q.raw) * 0.5)
  from public.games, q
  where search_vector @@ q.tsq or title % q.raw
)
select kind, id, title, subtitle, score
from hits
order by score desc, title asc
limit $3
`
	rows, err := r.db.Pool().Query(ctx, sql, uid, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Hit, 0, limit)
	for rows.Next() {
		var h Hit
		if err := rows.Scan(&h.Kind, &h.ID, &h.Title, &h.Subtitle, &h.Score); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}
