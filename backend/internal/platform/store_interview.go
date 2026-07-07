package platform

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5/pgtype"
)

// InterviewSession is a durable interview whiteboard session.
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

// InterviewSummary is a lightweight row for list views.
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

func interviewFromSessionRow(
	id string,
	owner pgtype.UUID,
	room pgtype.Text,
	title, status, guestToken string,
	guestLinkEnabled, canvasLocked bool,
	canvas, questions, rubric []byte,
	notes, recommendation string,
	createdAt, updatedAt, endedAt pgtype.Timestamptz,
) *InterviewSession {
	v := InterviewSession{
		ID:               id,
		Title:            title,
		Status:           status,
		GuestToken:       guestToken,
		GuestLinkEnabled: guestLinkEnabled,
		CanvasLocked:     canvasLocked,
		Canvas:           json.RawMessage(canvas),
		Questions:        json.RawMessage(questions),
		Notes:            notes,
		Rubric:           json.RawMessage(rubric),
		Recommendation:   recommendation,
		CreatedAt:        pgTimestamptzTime(createdAt),
		UpdatedAt:        pgTimestamptzTime(updatedAt),
	}
	if owner.Valid {
		s := owner.String()
		v.OwnerProfileID = &s
	}
	if room.Valid {
		s := room.String
		v.RoomCode = &s
	}
	if endedAt.Valid {
		t := endedAt.Time
		v.EndedAt = &t
	}
	if len(v.Canvas) == 0 {
		v.Canvas = json.RawMessage(`{}`)
	}
	if len(v.Questions) == 0 {
		v.Questions = json.RawMessage(`[]`)
	}
	if len(v.Rubric) == 0 {
		v.Rubric = json.RawMessage(`[]`)
	}
	return &v
}

func interviewFromCreate(row arcadedb.CreateInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromGet(row arcadedb.GetInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromGetByToken(row arcadedb.GetInterviewSessionByTokenRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromEnd(row arcadedb.EndInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromReopen(row arcadedb.ReopenInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromRotate(row arcadedb.RotateInterviewTokenRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

const interviewCols = `id::text, owner_profile_id, room_code, title, status, guest_token,
	guest_link_enabled, canvas_locked, canvas, questions, notes, rubric,
	recommendation, created_at, updated_at, ended_at`

func (s *Store) CreateInterviewSession(ctx context.Context, ownerID, title string) (*InterviewSession, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, err
	}
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := s.q.CreateInterviewSession(ctx, arcadedb.CreateInterviewSessionParams{
		OwnerProfileID: uid,
		Title:          title,
		GuestToken:     token,
	})
	if err != nil {
		return nil, err
	}
	return interviewFromCreate(row), nil
}

func (s *Store) ListInterviewSessions(ctx context.Context, ownerID string) ([]InterviewSummary, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListInterviewSummaries(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]InterviewSummary, len(rows))
	for i, row := range rows {
		v := InterviewSummary{
			ID:               row.ID,
			Title:            row.Title,
			Status:           row.Status,
			GuestLinkEnabled: row.GuestLinkEnabled,
			CanvasLocked:     row.CanvasLocked,
			UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
		}
		if row.RoomCode.Valid {
			s := row.RoomCode.String
			v.RoomCode = &s
		}
		out[i] = v
	}
	return out, nil
}

func (s *Store) GetInterviewSession(ctx context.Context, id string) (*InterviewSession, error) {
	uid, err := parseCanvasUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := s.q.GetInterviewSession(ctx, uid)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return interviewFromGet(row), nil
}

func (s *Store) GetInterviewSessionByToken(ctx context.Context, token string) (*InterviewSession, error) {
	row, err := s.q.GetInterviewSessionByToken(ctx, token)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return interviewFromGetByToken(row), nil
}

// UpdateInterviewSession applies a partial patch via dynamic SQL (fields vary per call).
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

	row := s.pool.QueryRow(ctx, q, args...)
	var (
		sid, title, status, guestToken, notes, recommendation string
		owner                                                 pgtype.UUID
		room                                                  pgtype.Text
		guestLinkEnabled, canvasLocked                        bool
		canvas, questions, rubric                             []byte
		createdAt, updatedAt, endedAt                         pgtype.Timestamptz
	)
	err := row.Scan(
		&sid, &owner, &room, &title, &status, &guestToken,
		&guestLinkEnabled, &canvasLocked, &canvas, &questions, &notes, &rubric,
		&recommendation, &createdAt, &updatedAt, &endedAt,
	)
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromSessionRow(
		sid, owner, room, title, status, guestToken,
		guestLinkEnabled, canvasLocked, canvas, questions, rubric,
		notes, recommendation, createdAt, updatedAt, endedAt,
	)
	return v, true, nil
}

func (s *Store) EndInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := s.q.EndInterviewSession(ctx, arcadedb.EndInterviewSessionParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromEnd(row)
	return v, true, nil
}

func (s *Store) ReopenInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := s.q.ReopenInterviewSession(ctx, arcadedb.ReopenInterviewSessionParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromReopen(row)
	return v, true, nil
}

func (s *Store) RotateInterviewToken(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, false, err
	}
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := s.q.RotateInterviewToken(ctx, arcadedb.RotateInterviewTokenParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
		GuestToken:     token,
	})
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromRotate(row)
	return v, true, nil
}
