package learning

import (
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/database/postgres"
	"github.com/jackc/pgx/v5/pgtype"
)

// ProblemProgressDTO is the server mirror of the client ProblemStat.
type ProblemProgressDTO struct {
	ProblemID     string     `json:"problemId"`
	Attempts      int        `json:"attempts"`
	Correct       int        `json:"correct"`
	Streak        int        `json:"streak"`
	BestStreak    int        `json:"bestStreak"`
	Mastered      bool       `json:"mastered"`
	LastAttemptAt *time.Time `json:"lastAttemptAt,omitempty"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// ReviewCardDTO is one FSRS scheduling record. `Fsrs` is the opaque ts-fsrs Card blob.
type ReviewCardDTO struct {
	ProblemID    string          `json:"problemId"`
	Due          time.Time       `json:"due"`
	IntervalDays int             `json:"intervalDays"`
	Reps         int             `json:"reps"`
	Fsrs         json.RawMessage `json:"fsrs"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

// AttemptDTO is one row of the append-only attempt log. `ID` is client-generated.
type AttemptDTO struct {
	ID         string          `json:"id"`
	ProblemID  string          `json:"problemId"`
	Kind       string          `json:"kind"`
	Correct    bool            `json:"correct"`
	DurationMs *int            `json:"durationMs,omitempty"`
	Detail     json.RawMessage `json:"detail,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
}

// NoteDTO is a per-item note (kind 'note' or 'edge_cases').
type NoteDTO struct {
	ItemID    string    `json:"itemId"`
	Kind      string    `json:"kind"`
	Body      string    `json:"body"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// EnrollmentDTO is a course enrollment with resume position + completion.
type EnrollmentDTO struct {
	CourseID    string     `json:"courseId"`
	EnrolledAt  time.Time  `json:"enrolledAt"`
	LastItemID  string     `json:"lastItemId,omitempty"`
	Progress    float64    `json:"progress"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

/* -------------------------------------------------------- pgtype conversions */

func pgTime(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: !t.IsZero()}
}

func pgTimePtr(t *time.Time) pgtype.Timestamptz {
	if t == nil || t.IsZero() {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

func timePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	tt := t.Time.UTC()
	return &tt
}

// utc renders a stored timestamp in UTC so the client always receives `...Z` ISO
// strings, matching the FSRS Card serialization it round-trips.
func utc(t pgtype.Timestamptz) time.Time {
	return t.Time.UTC()
}

func pgInt4Ptr(v *int) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*v), Valid: true}
}

func intPtr(v pgtype.Int4) *int {
	if !v.Valid {
		return nil
	}
	n := int(v.Int32)
	return &n
}

func pgTextPtr(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

// jsonbIn defaults empty/omitted JSON to an empty object so the not-null jsonb
// columns always receive valid input.
func jsonbIn(raw json.RawMessage) []byte {
	if len(raw) == 0 {
		return []byte("{}")
	}
	return raw
}

func jsonbOut(b []byte) json.RawMessage {
	if len(b) == 0 {
		return json.RawMessage("{}")
	}
	return json.RawMessage(b)
}

/* -------------------------------------------------------- row -> DTO mappers */

func progressFromRow(r postgres.ListProblemProgressRow) ProblemProgressDTO {
	return ProblemProgressDTO{
		ProblemID:     r.ProblemID,
		Attempts:      int(r.Attempts),
		Correct:       int(r.Correct),
		Streak:        int(r.Streak),
		BestStreak:    int(r.BestStreak),
		Mastered:      r.Mastered,
		LastAttemptAt: timePtr(r.LastAttemptAt),
		UpdatedAt:     utc(r.UpdatedAt),
	}
}

func progressFromUpsert(r postgres.UpsertProblemProgressRow) ProblemProgressDTO {
	return ProblemProgressDTO{
		ProblemID:     r.ProblemID,
		Attempts:      int(r.Attempts),
		Correct:       int(r.Correct),
		Streak:        int(r.Streak),
		BestStreak:    int(r.BestStreak),
		Mastered:      r.Mastered,
		LastAttemptAt: timePtr(r.LastAttemptAt),
		UpdatedAt:     utc(r.UpdatedAt),
	}
}

func reviewFromRow(r postgres.ListReviewScheduleRow) ReviewCardDTO {
	return ReviewCardDTO{
		ProblemID:    r.ProblemID,
		Due:          utc(r.Due),
		IntervalDays: int(r.IntervalDays),
		Reps:         int(r.Reps),
		Fsrs:         jsonbOut(r.Fsrs),
		UpdatedAt:    utc(r.UpdatedAt),
	}
}

func reviewFromDue(r postgres.ListDueReviewsRow) ReviewCardDTO {
	return ReviewCardDTO{
		ProblemID:    r.ProblemID,
		Due:          utc(r.Due),
		IntervalDays: int(r.IntervalDays),
		Reps:         int(r.Reps),
		Fsrs:         jsonbOut(r.Fsrs),
		UpdatedAt:    utc(r.UpdatedAt),
	}
}

func reviewFromUpsert(r postgres.UpsertReviewCardRow) ReviewCardDTO {
	return ReviewCardDTO{
		ProblemID:    r.ProblemID,
		Due:          utc(r.Due),
		IntervalDays: int(r.IntervalDays),
		Reps:         int(r.Reps),
		Fsrs:         jsonbOut(r.Fsrs),
		UpdatedAt:    utc(r.UpdatedAt),
	}
}

func mistakeFromRow(r postgres.ListRecentMistakesRow) AttemptDTO {
	return AttemptDTO{
		ID:         r.ID,
		ProblemID:  r.ProblemID,
		Kind:       r.Kind,
		Correct:    r.Correct,
		DurationMs: intPtr(r.DurationMs),
		Detail:     jsonbOut(r.Detail),
		CreatedAt:  utc(r.CreatedAt),
	}
}

func noteFromRow(r postgres.ListNotesRow) NoteDTO {
	return NoteDTO{ItemID: r.ItemID, Kind: r.Kind, Body: r.Body, UpdatedAt: utc(r.UpdatedAt)}
}

func noteFromUpsert(r postgres.UpsertNoteRow) NoteDTO {
	return NoteDTO{ItemID: r.ItemID, Kind: r.Kind, Body: r.Body, UpdatedAt: utc(r.UpdatedAt)}
}

func enrollmentFromRow(r postgres.ListEnrollmentsRow) EnrollmentDTO {
	return EnrollmentDTO{
		CourseID:    r.CourseID,
		EnrolledAt:  utc(r.EnrolledAt),
		LastItemID:  r.LastItemID.String,
		Progress:    float64(r.Progress),
		CompletedAt: timePtr(r.CompletedAt),
		UpdatedAt:   utc(r.UpdatedAt),
	}
}

func enrollmentFromUpsert(r postgres.UpsertEnrollmentRow) EnrollmentDTO {
	return EnrollmentDTO{
		CourseID:    r.CourseID,
		EnrolledAt:  utc(r.EnrolledAt),
		LastItemID:  r.LastItemID.String,
		Progress:    float64(r.Progress),
		CompletedAt: timePtr(r.CompletedAt),
		UpdatedAt:   utc(r.UpdatedAt),
	}
}
