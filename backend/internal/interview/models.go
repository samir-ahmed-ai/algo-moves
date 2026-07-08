package interview

import (
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
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
		CreatedAt:        database.PgTimestamptzTime(createdAt),
		UpdatedAt:        database.PgTimestamptzTime(updatedAt),
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

func interviewFromCreate(row postgres.CreateInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromGet(row postgres.GetInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromGetByToken(row postgres.GetInterviewSessionByTokenRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromEnd(row postgres.EndInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromReopen(row postgres.ReopenInterviewSessionRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

func interviewFromRotate(row postgres.RotateInterviewTokenRow) *InterviewSession {
	return interviewFromSessionRow(
		row.ID, row.OwnerProfileID, row.RoomCode, row.Title, row.Status, row.GuestToken,
		row.GuestLinkEnabled, row.CanvasLocked, row.Canvas, row.Questions, row.Rubric,
		row.Notes, row.Recommendation, row.CreatedAt, row.UpdatedAt, row.EndedAt,
	)
}

const interviewCols = `id::text, owner_profile_id, room_code, title, status, guest_token,
	guest_link_enabled, canvas_locked, canvas, questions, notes, rubric,
	recommendation, created_at, updated_at, ended_at`
