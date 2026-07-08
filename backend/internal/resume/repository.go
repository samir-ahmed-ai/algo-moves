package resume

import (
	"context"
	"encoding/json"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
)

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func (r *Repository) ListResumes(ctx context.Context, ownerID string) ([]ResumeSummary, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListResumeSummaries(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]ResumeSummary, len(rows))
	for i, row := range rows {
		out[i] = ResumeSummary{
			ID:               row.ID,
			Title:            row.Title,
			OriginalFilename: row.OriginalFilename,
			IsPublic:         row.IsPublic,
			UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
		}
	}
	return out, nil
}

func (r *Repository) ListResumeDirectory(ctx context.Context) ([]ResumeDirectoryEntry, error) {
	rows, err := r.db.Q.ListPublicResumeDirectory(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ResumeDirectoryEntry, len(rows))
	for i, row := range rows {
		out[i] = ResumeDirectoryEntry{
			ID:               row.ID,
			Title:            row.Title,
			OriginalFilename: row.OriginalFilename,
			UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
			OwnerProfileID:   row.OwnerProfileID,
			OwnerDisplayName: row.OwnerDisplayName,
			OwnerAvatarSeed:  row.OwnerAvatarSeed,
		}
	}
	return out, nil
}

func (r *Repository) CreateResume(
	ctx context.Context,
	ownerID, title, filename, contentType string,
	fileBytes []byte,
	rawText string,
	mapping json.RawMessage,
	isPublic bool,
) (*Resume, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.CreateResume(ctx, postgres.CreateResumeParams{
		OwnerProfileID:   uid,
		Title:            title,
		OriginalFilename: filename,
		ContentType:      contentType,
		FileBytes:        fileBytes,
		RawText:          rawText,
		Mapping:          []byte(mapping),
		IsPublic:         isPublic,
	})
	if err != nil {
		return nil, err
	}
	res := resumeFromCreate(row)
	return &res, nil
}

func (r *Repository) GetResume(ctx context.Context, id string) (*Resume, error) {
	resumeID, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetResumeByID(ctx, resumeID)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	res := resumeFromGet(row)
	return &res, nil
}

func (r *Repository) GetResumeForOwner(ctx context.Context, id, ownerID string) (*Resume, error) {
	resumeID, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetResumeByIDForOwner(ctx, postgres.GetResumeByIDForOwnerParams{
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	res := resumeFromOwner(row)
	return &res, nil
}

func (r *Repository) UpdateResume(
	ctx context.Context,
	id, ownerID string,
	title *string,
	mapping json.RawMessage,
	isPublic *bool,
) (*Resume, bool, error) {
	resumeID, err := database.ParseUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, false, err
	}

	var mappingBytes []byte
	if mapping != nil {
		mappingBytes = []byte(mapping)
	}

	row, err := r.db.Q.UpdateResume(ctx, postgres.UpdateResumeParams{
		Title:          database.OptionalText(title),
		Mapping:        mappingBytes,
		IsPublic:       optionalBool(isPublic),
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	res := resumeFromUpdate(row)
	return &res, true, nil
}

func (r *Repository) DeleteResume(ctx context.Context, id, ownerID string) (bool, error) {
	resumeID, err := database.ParseUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := r.db.Q.DeleteResume(ctx, postgres.DeleteResumeParams{
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (r *Repository) CreateResumeVariant(
	ctx context.Context,
	resumeID, ownerID, label, focus, targetRole, mode string,
	mapping json.RawMessage,
) (*ResumeVariant, error) {
	rid, err := database.ParseUUID(resumeID)
	if err != nil {
		return nil, err
	}
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.CreateResumeVariant(ctx, postgres.CreateResumeVariantParams{
		ResumeID:       rid,
		OwnerProfileID: uid,
		Label:          label,
		Focus:          focus,
		TargetRole:     targetRole,
		Mode:           mode,
		Mapping:        []byte(mapping),
	})
	if err != nil {
		return nil, err
	}
	v := variantFromCreate(row)
	return &v, nil
}

func (r *Repository) ListResumeVariants(ctx context.Context, resumeID, ownerID string) ([]ResumeVariant, error) {
	rid, err := database.ParseUUID(resumeID)
	if err != nil {
		return nil, err
	}
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListResumeVariants(ctx, postgres.ListResumeVariantsParams{
		ResumeID:       rid,
		OwnerProfileID: uid,
	})
	if err != nil {
		return nil, err
	}
	out := make([]ResumeVariant, len(rows))
	for i, row := range rows {
		out[i] = ResumeVariant{
			ID:             row.ID,
			ResumeID:       row.ResumeID,
			OwnerProfileID: row.OwnerProfileID,
			Label:          row.Label,
			Focus:          row.Focus,
			TargetRole:     row.TargetRole,
			Mode:           row.Mode,
			Mapping:        json.RawMessage(row.Mapping),
			CreatedAt:      database.PgTimestamptzTime(row.CreatedAt),
		}
	}
	return out, nil
}

func (r *Repository) DeleteResumeVariant(ctx context.Context, variantID, ownerID string) (bool, error) {
	vid, err := database.ParseUUID(variantID)
	if err != nil {
		return false, err
	}
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := r.db.Q.DeleteResumeVariant(ctx, postgres.DeleteResumeVariantParams{
		ID:             vid,
		OwnerProfileID: uid,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
