package interview

import (
	"context"
	"strconv"
	"strings"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
	"github.com/jackc/pgx/v5/pgtype"
)

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreateInterviewSession(ctx context.Context, ownerID, title string) (*InterviewSession, error) {
	token, err := database.NewSessionToken()
	if err != nil {
		return nil, err
	}
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.CreateInterviewSession(ctx, postgres.CreateInterviewSessionParams{
		OwnerProfileID: uid,
		Title:          title,
		GuestToken:     token,
	})
	if err != nil {
		return nil, err
	}
	return interviewFromCreate(row), nil
}

func (r *Repository) ListInterviewSessions(ctx context.Context, ownerID string) ([]InterviewSummary, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListInterviewSummaries(ctx, uid)
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
			UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
		}
		if row.RoomCode.Valid {
			s := row.RoomCode.String
			v.RoomCode = &s
		}
		out[i] = v
	}
	return out, nil
}

func (r *Repository) GetInterviewSession(ctx context.Context, id string) (*InterviewSession, error) {
	uid, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetInterviewSession(ctx, uid)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return interviewFromGet(row), nil
}

func (r *Repository) GetInterviewSessionByToken(ctx context.Context, token string) (*InterviewSession, error) {
	row, err := r.db.Q.GetInterviewSessionByToken(ctx, token)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return interviewFromGetByToken(row), nil
}

// UpdateInterviewSession applies a partial patch via dynamic SQL (fields vary per call).

func (r *Repository) UpdateInterviewSession(ctx context.Context, id, ownerID string, p InterviewPatch) (*InterviewSession, bool, error) {
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

	row := r.db.Pool().QueryRow(ctx, q, args...)
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
	if database.IsNoRows(err) {
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

func (r *Repository) EndInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	planID, err := database.ParseUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := r.db.Q.EndInterviewSession(ctx, postgres.EndInterviewSessionParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromEnd(row)
	return v, true, nil
}

func (r *Repository) ReopenInterviewSession(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	planID, err := database.ParseUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := r.db.Q.ReopenInterviewSession(ctx, postgres.ReopenInterviewSessionParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromReopen(row)
	return v, true, nil
}

func (r *Repository) RotateInterviewToken(ctx context.Context, id, ownerID string) (*InterviewSession, bool, error) {
	token, err := database.NewSessionToken()
	if err != nil {
		return nil, false, err
	}
	planID, err := database.ParseUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, false, err
	}
	row, err := r.db.Q.RotateInterviewToken(ctx, postgres.RotateInterviewTokenParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
		GuestToken:     token,
	})
	if database.IsNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	v := interviewFromRotate(row)
	return v, true, nil
}
