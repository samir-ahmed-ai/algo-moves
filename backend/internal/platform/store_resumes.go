package platform

import (
	"context"
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5/pgtype"
)

// Resume is a user-uploaded resume with structured mapping.
type Resume struct {
	ID               string          `json:"id"`
	OwnerProfileID   string          `json:"ownerProfileId"`
	Title            string          `json:"title"`
	OriginalFilename string          `json:"originalFilename"`
	ContentType      string          `json:"contentType"`
	RawText          string          `json:"rawText,omitempty"`
	Mapping          json.RawMessage `json:"mapping"`
	IsPublic         bool            `json:"isPublic"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// ResumeSummary is a lightweight list row.
type ResumeSummary struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	OriginalFilename string    `json:"originalFilename"`
	IsPublic         bool      `json:"isPublic"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// ResumeDirectoryEntry is a public resume row with owner info.
type ResumeDirectoryEntry struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	OriginalFilename string    `json:"originalFilename"`
	UpdatedAt        time.Time `json:"updatedAt"`
	OwnerProfileID   string    `json:"ownerProfileId"`
	OwnerDisplayName string    `json:"ownerDisplayName"`
	OwnerAvatarSeed  string    `json:"ownerAvatarSeed"`
}

// ResumeVariant is a saved customized resume.
type ResumeVariant struct {
	ID             string          `json:"id"`
	ResumeID       string          `json:"resumeId"`
	OwnerProfileID string          `json:"ownerProfileId"`
	Label          string          `json:"label"`
	Focus          string          `json:"focus"`
	TargetRole     string          `json:"targetRole"`
	Mode           string          `json:"mode"`
	Mapping        json.RawMessage `json:"mapping"`
	CreatedAt      time.Time       `json:"createdAt"`
}

func resumeFromCreate(row arcadedb.CreateResumeRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromGet(row arcadedb.GetResumeByIDRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromOwner(row arcadedb.GetResumeByIDForOwnerRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromUpdate(row arcadedb.UpdateResumeRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
	}
}

func variantFromCreate(row arcadedb.CreateResumeVariantRow) ResumeVariant {
	return ResumeVariant{
		ID:             row.ID,
		ResumeID:       row.ResumeID,
		OwnerProfileID: row.OwnerProfileID,
		Label:          row.Label,
		Focus:          row.Focus,
		TargetRole:     row.TargetRole,
		Mode:           row.Mode,
		Mapping:        json.RawMessage(row.Mapping),
		CreatedAt:      pgTimestamptzTime(row.CreatedAt),
	}
}

func (s *Store) ListResumes(ctx context.Context, ownerID string) ([]ResumeSummary, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListResumeSummaries(ctx, uid)
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
			UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
		}
	}
	return out, nil
}

func (s *Store) ListResumeDirectory(ctx context.Context) ([]ResumeDirectoryEntry, error) {
	rows, err := s.q.ListPublicResumeDirectory(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ResumeDirectoryEntry, len(rows))
	for i, row := range rows {
		out[i] = ResumeDirectoryEntry{
			ID:               row.ID,
			Title:            row.Title,
			OriginalFilename: row.OriginalFilename,
			UpdatedAt:        pgTimestamptzTime(row.UpdatedAt),
			OwnerProfileID:   row.OwnerProfileID,
			OwnerDisplayName: row.OwnerDisplayName,
			OwnerAvatarSeed:  row.OwnerAvatarSeed,
		}
	}
	return out, nil
}

func (s *Store) CreateResume(
	ctx context.Context,
	ownerID, title, filename, contentType string,
	fileBytes []byte,
	rawText string,
	mapping json.RawMessage,
	isPublic bool,
) (*Resume, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := s.q.CreateResume(ctx, arcadedb.CreateResumeParams{
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

func (s *Store) GetResume(ctx context.Context, id string) (*Resume, error) {
	resumeID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := s.q.GetResumeByID(ctx, resumeID)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	res := resumeFromGet(row)
	return &res, nil
}

func (s *Store) GetResumeForOwner(ctx context.Context, id, ownerID string) (*Resume, error) {
	resumeID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := s.q.GetResumeByIDForOwner(ctx, arcadedb.GetResumeByIDForOwnerParams{
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	res := resumeFromOwner(row)
	return &res, nil
}

func (s *Store) UpdateResume(
	ctx context.Context,
	id, ownerID string,
	title *string,
	mapping json.RawMessage,
	isPublic *bool,
) (*Resume, bool, error) {
	resumeID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, false, err
	}

	var mappingBytes []byte
	if mapping != nil {
		mappingBytes = []byte(mapping)
	}

	row, err := s.q.UpdateResume(ctx, arcadedb.UpdateResumeParams{
		Title:          optionalText(title),
		Mapping:        mappingBytes,
		IsPublic:       optionalBool(isPublic),
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	res := resumeFromUpdate(row)
	return &res, true, nil
}

func (s *Store) DeleteResume(ctx context.Context, id, ownerID string) (bool, error) {
	resumeID, err := parseCanvasUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := s.q.DeleteResume(ctx, arcadedb.DeleteResumeParams{
		ID:             resumeID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (s *Store) CreateResumeVariant(
	ctx context.Context,
	resumeID, ownerID, label, focus, targetRole, mode string,
	mapping json.RawMessage,
) (*ResumeVariant, error) {
	rid, err := parseCanvasUUID(resumeID)
	if err != nil {
		return nil, err
	}
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := s.q.CreateResumeVariant(ctx, arcadedb.CreateResumeVariantParams{
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

func (s *Store) ListResumeVariants(ctx context.Context, resumeID, ownerID string) ([]ResumeVariant, error) {
	rid, err := parseCanvasUUID(resumeID)
	if err != nil {
		return nil, err
	}
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListResumeVariants(ctx, arcadedb.ListResumeVariantsParams{
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
			CreatedAt:      pgTimestamptzTime(row.CreatedAt),
		}
	}
	return out, nil
}

func optionalBool(v *bool) pgtype.Bool {
	if v == nil {
		return pgtype.Bool{Valid: false}
	}
	return pgtype.Bool{Bool: *v, Valid: true}
}
