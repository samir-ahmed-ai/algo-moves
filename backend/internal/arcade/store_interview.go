package arcade

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// InterviewSession is a durable interview whiteboard session. canvas/questions/
// rubric are opaque JSON the backend never inspects.
type InterviewSession struct {
	ID               string          `json:"id"`
	OwnerProfileID   *string         `json:"ownerProfileId"`
	RoomCode         *string         `json:"roomCode"`
	Title            string          `json:"title"`
	Status           string          `json:"status"`
	GuestToken       string          `json:"guestToken"`
	GuestLinkEnabled bool            `json:"guestLinkEnabled"`
	CanvasLocked     bool            `json:"canvasLocked"`
	Canvas           json.RawMessage `json:"canvas"`
	Questions        json.RawMessage `json:"questions"`
	Notes            string          `json:"notes"`
	Rubric           json.RawMessage `json:"rubric"`
	Recommendation   string          `json:"recommendation"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
	EndedAt          *time.Time      `json:"endedAt"`
}

// InterviewSummary is a lightweight row for list views (no heavy JSON fields).
type InterviewSummary struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	Status           string    `json:"status"`
	RoomCode         *string   `json:"roomCode"`
	GuestLinkEnabled bool      `json:"guestLinkEnabled"`
	CanvasLocked     bool      `json:"canvasLocked"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// InterviewPatch carries partial-update fields; nil means "leave unchanged".
type InterviewPatch struct {
	Title            *string
	Canvas           json.RawMessage
	Questions        json.RawMessage
	Notes            *string
	Rubric           json.RawMessage
	Recommendation   *string
	CanvasLocked     *bool
	GuestLinkEnabled *bool
	RoomCode         *string
}

func (p InterviewPatch) IsEmpty() bool {
	return p.Title == nil && p.Canvas == nil && p.Questions == nil && p.Notes == nil &&
		p.Rubric == nil && p.Recommendation == nil && p.CanvasLocked == nil &&
		p.GuestLinkEnabled == nil && p.RoomCode == nil
}

const interviewCols = `id, owner_profile_id, room_code, title, status, guest_token,
	guest_link_enabled, canvas_locked, canvas, questions, notes, rubric,
	recommendation, created_at, updated_at, ended_at`

func scanInterview(row pgx.Row) (*InterviewSession, error) {
	var v InterviewSession
	err := row.Scan(&v.ID, &v.OwnerProfileID, &v.RoomCode, &v.Title, &v.Status, &v.GuestToken,
		&v.GuestLinkEnabled, &v.CanvasLocked, &v.Canvas, &v.Questions, &v.Notes, &v.Rubric,
		&v.Recommendation, &v.CreatedAt, &v.UpdatedAt, &v.EndedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// Normalize empty jsonb so clients always get [] / {} not null.
	if len(v.Canvas) == 0 {
		v.Canvas = json.RawMessage(`{}`)
	}
	if len(v.Questions) == 0 {
		v.Questions = json.RawMessage(`[]`)
	}
	if len(v.Rubric) == 0 {
		v.Rubric = json.RawMessage(`[]`)
	}
	return &v, nil
}

func (s *Store) CreateInterviewSession(ctx context.Context, ownerID, title string) (*InterviewSession, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, err
	}
	return scanInterview(s.pool.QueryRow(ctx, `
		insert into public.interview_sessions (owner_profile_id, title, guest_token)
		values ($1, $2, $3)
		returning `+interviewCols, ownerID, title, token))
}

func (s *Store) ListInterviewSessions(ctx context.Context, ownerID string) ([]InterviewSummary, error) {
	rows, err := s.pool.Query(ctx, `
		select id, title, status, room_code, guest_link_enabled, canvas_locked, updated_at
		from public.interview_sessions
		where owner_profile_id = $1
		order by created_at desc limit 200`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []InterviewSummary{}
	for rows.Next() {
		var v InterviewSummary
		if err := rows.Scan(&v.ID, &v.Title, &v.Status, &v.RoomCode, &v.GuestLinkEnabled, &v.CanvasLocked, &v.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) GetInterviewSession(ctx context.Context, id string) (*InterviewSession, error) {
	return scanInterview(s.pool.QueryRow(ctx,
		`select `+interviewCols+` from public.interview_sessions where id = $1`, id))
}

func (s *Store) GetInterviewSessionByToken(ctx context.Context, token string) (*InterviewSession, error) {
	return scanInterview(s.pool.QueryRow(ctx,
		`select `+interviewCols+` from public.interview_sessions where guest_token = $1`, token))
}

// UpdateInterviewSession applies a partial patch to an owner-held session. The
// bool is false when the id is missing or not owned by ownerID.
func (s *Store) UpdateInterviewSession(ctx context.Context, id, ownerID string, p InterviewPatch) (*InterviewSession, bool, error) {
	sets := []string{}
	args := []any{}
	add := func(clause string, val any) {
		args = append(args, val)
		sets = append(sets, clause+" = $"+strconv.Itoa(len(args)))
	}
	if p.Title != nil {
		add("title", *p.Title)
	}
	if p.Canvas != nil {
		add("canvas", string(p.Canvas))
		sets[len(sets)-1] += "::jsonb"
	}
	if p.Questions != nil {
		add("questions", string(p.Questions))
		sets[len(sets)-1] += "::jsonb"
	}
	if p.Notes != nil {
		add("notes", *p.Notes)
	}
	if p.Rubric != nil {
		add("rubric", string(p.Rubric))
		sets[len(sets)-1] += "::jsonb"
	}
	if p.Recommendation != nil {
		add("recommendation", *p.Recommendation)
	}
	if p.CanvasLocked != nil {
		add("canvas_locked", *p.CanvasLocked)
	}
	if p.GuestLinkEnabled != nil {
		add("guest_link_enabled", *p.GuestLinkEnabled)
	}
	if p.RoomCode != nil {
		add("room_code", *p.RoomCode)
	}
	sets = append(sets, "updated_at = now()")
	args = append(args, id, ownerID)
	q := `update public.interview_sessions set ` + strings.Join(sets, ", ") +
		` where id = $` + strconv.Itoa(len(args)-1) + ` and owner_profile_id = $` + strconv.Itoa(len(args)) +
		` returning ` + interviewCols
	v, err := scanInterview(s.pool.QueryRow(ctx, q, args...))
	if err != nil {
		return nil, false, err
	}
	return v, v != nil, nil
}

func (s *Store) EndInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	v, err := scanInterview(s.pool.QueryRow(ctx, `
		update public.interview_sessions set status = 'ended', ended_at = now(), updated_at = now()
		where id = $1 and owner_profile_id = $2 returning `+interviewCols, id, ownerID))
	if err != nil {
		return nil, false, err
	}
	return v, v != nil, nil
}

func (s *Store) ReopenInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	v, err := scanInterview(s.pool.QueryRow(ctx, `
		update public.interview_sessions set status = 'active', ended_at = null, updated_at = now()
		where id = $1 and owner_profile_id = $2 returning `+interviewCols, id, ownerID))
	if err != nil {
		return nil, false, err
	}
	return v, v != nil, nil
}

func (s *Store) RotateInterviewToken(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, false, err
	}
	v, err := scanInterview(s.pool.QueryRow(ctx, `
		update public.interview_sessions set guest_token = $3, updated_at = now()
		where id = $1 and owner_profile_id = $2 returning `+interviewCols, id, ownerID, token))
	if err != nil {
		return nil, false, err
	}
	return v, v != nil, nil
}
