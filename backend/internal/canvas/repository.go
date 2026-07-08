package canvas

import (
	"context"
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
)

type Canvas struct {
	ID             string          `json:"id"`
	OwnerProfileID *string         `json:"ownerProfileId"`
	RoomCode       *string         `json:"roomCode"`
	Title          string          `json:"title"`
	Doc            json.RawMessage `json:"doc"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func canvasDocBytes(doc json.RawMessage) []byte {
	if len(doc) == 0 {
		return []byte("{}")
	}
	return []byte(doc)
}

func (r *Repository) CreateCanvas(ctx context.Context, ownerID, title string, doc json.RawMessage, roomCode *string) (string, time.Time, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return "", time.Time{}, err
	}
	row, err := r.db.Q.CreateCanvas(ctx, postgres.CreateCanvasParams{
		OwnerProfileID: uid,
		Title:          title,
		Doc:            canvasDocBytes(doc),
		RoomCode:       database.OptionalText(roomCode),
	})
	if err != nil {
		return "", time.Time{}, err
	}
	return row.ID, database.PgTimestamptzTime(row.UpdatedAt), nil
}

func (r *Repository) GetCanvas(ctx context.Context, id string) (*Canvas, error) {
	canvasID, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetCanvas(ctx, canvasID)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return canvasFromRow(row)
}

func canvasFromRow(row postgres.GetCanvasRow) (*Canvas, error) {
	c := Canvas{
		ID:        row.ID,
		Title:     row.Title,
		Doc:       json.RawMessage(row.Doc),
		UpdatedAt: database.PgTimestamptzTime(row.UpdatedAt),
	}
	if row.OwnerProfileID.Valid {
		s := row.OwnerProfileID.String()
		c.OwnerProfileID = &s
	}
	if row.RoomCode.Valid {
		s := row.RoomCode.String
		c.RoomCode = &s
	}
	return &c, nil
}

func (r *Repository) UpdateCanvas(ctx context.Context, id, ownerID string, doc json.RawMessage, title, roomCode *string) (time.Time, bool, error) {
	canvasID, err := database.ParseUUID(id)
	if err != nil {
		return time.Time{}, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return time.Time{}, false, err
	}
	updated, err := r.db.Q.UpdateCanvas(ctx, postgres.UpdateCanvasParams{
		Doc:            canvasDocBytes(doc),
		Title:          database.OptionalText(title),
		RoomCode:       database.OptionalText(roomCode),
		ID:             canvasID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}
	return database.PgTimestamptzTime(updated), true, nil
}

func (r *Repository) ListCanvases(ctx context.Context, ownerID string) ([]map[string]any, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListCanvases(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = listCanvasToMap(row)
	}
	return out, nil
}

func (r *Repository) DeleteCanvas(ctx context.Context, id, ownerID string) (bool, error) {
	canvasID, err := database.ParseUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := r.db.Q.DeleteCanvas(ctx, postgres.DeleteCanvasParams{
		ID:             canvasID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func listCanvasToMap(c postgres.ListCanvasesRow) map[string]any {
	return map[string]any{
		"id":         c.ID,
		"title":      c.Title,
		"room_code":  database.PgTextString(c.RoomCode),
		"updated_at": database.PgTimestamptzRFC3339(c.UpdatedAt),
	}
}
