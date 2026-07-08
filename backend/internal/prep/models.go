package prep

import (
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
)

// PrepPlan is a named, owner-held ordered collection of problem item ids.
type PrepPlan struct {
	ID             string         `json:"id"`
	OwnerProfileID string         `json:"ownerProfileId"`
	Title          string         `json:"title"`
	Notes          string         `json:"notes"`
	Items          []PrepPlanItem `json:"items"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

// PrepPlanSummary is a lightweight row for list views (no items slice).
type PrepPlanSummary struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	ItemCount      int       `json:"itemCount"`
	CompletedCount int       `json:"completedCount"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// PrepPlanItem is one problem slot in an ordered plan.
type PrepPlanItem struct {
	ItemID    string `json:"itemId"`
	Position  int    `json:"position"`
	Completed bool   `json:"completed"`
}

func prepPlanFromHeader(row postgres.GetPrepPlanHeaderRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      database.PgTimestamptzTime(row.UpdatedAt),
		Items:          []PrepPlanItem{},
	}
}

func prepPlanFromCreate(row postgres.CreatePrepPlanRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      database.PgTimestamptzTime(row.UpdatedAt),
		Items:          []PrepPlanItem{},
	}
}

func prepPlanFromUpdate(row postgres.UpdatePrepPlanMetaRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      database.PgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      database.PgTimestamptzTime(row.UpdatedAt),
	}
}

func prepItemsFromRows(rows []postgres.ListPrepPlanItemsRow) []PrepPlanItem {
	out := make([]PrepPlanItem, len(rows))
	for i, row := range rows {
		out[i] = PrepPlanItem{
			ItemID:    row.ItemID,
			Position:  int(row.Position),
			Completed: row.Completed,
		}
	}
	return out
}
