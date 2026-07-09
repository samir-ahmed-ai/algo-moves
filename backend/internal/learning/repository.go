package learning

import (
	"context"
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
)

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

/* ------------------------------------------------------------- progress */

func (r *Repository) ListProgress(ctx context.Context, ownerID string) ([]ProblemProgressDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListProblemProgress(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]ProblemProgressDTO, len(rows))
	for i, row := range rows {
		out[i] = progressFromRow(row)
	}
	return out, nil
}

func (r *Repository) UpsertProgress(ctx context.Context, ownerID string, items []ProblemProgressDTO) ([]ProblemProgressDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.db.Q.WithTx(tx)

	out := make([]ProblemProgressDTO, 0, len(items))
	for _, it := range items {
		row, err := qtx.UpsertProblemProgress(ctx, postgres.UpsertProblemProgressParams{
			ProfileID:     uid,
			ProblemID:     it.ProblemID,
			Attempts:      int32(it.Attempts),
			Correct:       int32(it.Correct),
			Streak:        int32(it.Streak),
			BestStreak:    int32(it.BestStreak),
			Mastered:      it.Mastered,
			LastAttemptAt: pgTimePtr(it.LastAttemptAt),
		})
		if err != nil {
			return nil, err
		}
		out = append(out, progressFromUpsert(row))
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

/* ------------------------------------------------------------- attempts */

func (r *Repository) InsertAttempts(ctx context.Context, ownerID string, items []AttemptDTO) error {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return err
	}
	for _, it := range items {
		aid, err := database.ParseUUID(it.ID)
		if err != nil {
			continue // skip a malformed client id rather than fail the whole batch
		}
		if err := r.db.Q.InsertProblemAttempt(ctx, postgres.InsertProblemAttemptParams{
			ID:         aid,
			ProfileID:  uid,
			ProblemID:  it.ProblemID,
			Kind:       it.Kind,
			Correct:    it.Correct,
			DurationMs: pgInt4Ptr(it.DurationMs),
			Detail:     jsonbIn(it.Detail),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListMistakes(ctx context.Context, ownerID string, limit int) ([]AttemptDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListRecentMistakes(ctx, postgres.ListRecentMistakesParams{
		ProfileID: uid,
		Lim:       int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]AttemptDTO, len(rows))
	for i, row := range rows {
		out[i] = mistakeFromRow(row)
	}
	return out, nil
}

/* ------------------------------------------------------------- reviews */

func (r *Repository) ListReviews(ctx context.Context, ownerID string) ([]ReviewCardDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListReviewSchedule(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]ReviewCardDTO, len(rows))
	for i, row := range rows {
		out[i] = reviewFromRow(row)
	}
	return out, nil
}

func (r *Repository) ListDueReviews(ctx context.Context, ownerID string, at time.Time, limit int) ([]ReviewCardDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListDueReviews(ctx, postgres.ListDueReviewsParams{
		ProfileID: uid,
		At:        pgTime(at),
		Lim:       int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]ReviewCardDTO, len(rows))
	for i, row := range rows {
		out[i] = reviewFromDue(row)
	}
	return out, nil
}

func (r *Repository) UpsertReviews(ctx context.Context, ownerID string, cards []ReviewCardDTO) ([]ReviewCardDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.db.Q.WithTx(tx)

	out := make([]ReviewCardDTO, 0, len(cards))
	for _, c := range cards {
		row, err := qtx.UpsertReviewCard(ctx, postgres.UpsertReviewCardParams{
			ProfileID:    uid,
			ProblemID:    c.ProblemID,
			Due:          pgTime(c.Due),
			IntervalDays: int32(c.IntervalDays),
			Reps:         int32(c.Reps),
			Fsrs:         jsonbIn(c.Fsrs),
		})
		if err != nil {
			return nil, err
		}
		out = append(out, reviewFromUpsert(row))
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

/* ------------------------------------------------------------- notes */

func (r *Repository) ListNotes(ctx context.Context, ownerID string) ([]NoteDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListNotes(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]NoteDTO, len(rows))
	for i, row := range rows {
		out[i] = noteFromRow(row)
	}
	return out, nil
}

func (r *Repository) UpsertNotes(ctx context.Context, ownerID string, notes []NoteDTO) ([]NoteDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.db.Q.WithTx(tx)

	out := make([]NoteDTO, 0, len(notes))
	for _, n := range notes {
		updated := n.UpdatedAt
		if updated.IsZero() {
			updated = time.Now()
		}
		row, err := qtx.UpsertNote(ctx, postgres.UpsertNoteParams{
			ProfileID: uid,
			ItemID:    n.ItemID,
			Kind:      normalizeNoteKind(n.Kind),
			Body:      n.Body,
			UpdatedAt: pgTime(updated),
		})
		if err != nil {
			return nil, err
		}
		out = append(out, noteFromUpsert(row))
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repository) DeleteNote(ctx context.Context, ownerID, itemID, kind string) (bool, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := r.db.Q.DeleteNote(ctx, postgres.DeleteNoteParams{
		ProfileID: uid,
		ItemID:    itemID,
		Kind:      normalizeNoteKind(kind),
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

/* ------------------------------------------------------------- bookmarks */

func (r *Repository) ListBookmarks(ctx context.Context, ownerID string) ([]string, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	return r.db.Q.ListBookmarks(ctx, uid)
}

func (r *Repository) ReplaceBookmarks(ctx context.Context, ownerID string, itemIDs []string) ([]string, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.db.Q.WithTx(tx)

	if err := qtx.DeleteBookmarksForOwner(ctx, uid); err != nil {
		return nil, err
	}
	seen := make(map[string]bool, len(itemIDs))
	for _, id := range itemIDs {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		if err := qtx.InsertBookmark(ctx, postgres.InsertBookmarkParams{ProfileID: uid, ItemID: id}); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.db.Q.ListBookmarks(ctx, uid)
}

/* ------------------------------------------------------------- enrollments */

func (r *Repository) ListEnrollments(ctx context.Context, ownerID string) ([]EnrollmentDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListEnrollments(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]EnrollmentDTO, len(rows))
	for i, row := range rows {
		out[i] = enrollmentFromRow(row)
	}
	return out, nil
}

func (r *Repository) UpsertEnrollments(ctx context.Context, ownerID string, items []EnrollmentDTO) ([]EnrollmentDTO, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.db.Q.WithTx(tx)

	out := make([]EnrollmentDTO, 0, len(items))
	for _, e := range items {
		row, err := qtx.UpsertEnrollment(ctx, postgres.UpsertEnrollmentParams{
			ProfileID:   uid,
			CourseID:    e.CourseID,
			LastItemID:  pgTextPtr(e.LastItemID),
			Progress:    float32(clamp01(e.Progress)),
			CompletedAt: pgTimePtr(e.CompletedAt),
		})
		if err != nil {
			return nil, err
		}
		out = append(out, enrollmentFromUpsert(row))
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func normalizeNoteKind(kind string) string {
	if kind == "edge_cases" {
		return "edge_cases"
	}
	return "note"
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
