package resume

import (
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
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

func resumeFromCreate(row postgres.CreateResumeRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromGet(row postgres.GetResumeByIDRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromOwner(row postgres.GetResumeByIDForOwnerRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
	}
}

func resumeFromUpdate(row postgres.UpdateResumeRow) Resume {
	return Resume{
		ID:               row.ID,
		OwnerProfileID:   row.OwnerProfileID,
		Title:            row.Title,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		RawText:          row.RawText,
		Mapping:          json.RawMessage(row.Mapping),
		IsPublic:         row.IsPublic,
		CreatedAt:        database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:        database.PgTimestamptzTime(row.UpdatedAt),
	}
}

func variantFromCreate(row postgres.CreateResumeVariantRow) ResumeVariant {
	return ResumeVariant{
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
