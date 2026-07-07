package arcade

import (
	"context"
	"time"

	"algomoves/gameserver/internal/arcade/arcadedb"
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

func prepPlanFromHeader(row arcadedb.GetPrepPlanHeaderRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      pgTimestamptzTime(row.UpdatedAt),
		Items:          []PrepPlanItem{},
	}
}

func prepPlanFromCreate(row arcadedb.CreatePrepPlanRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      pgTimestamptzTime(row.UpdatedAt),
		Items:          []PrepPlanItem{},
	}
}

func prepPlanFromUpdate(row arcadedb.UpdatePrepPlanMetaRow) PrepPlan {
	return PrepPlan{
		ID:             row.ID,
		OwnerProfileID: row.OwnerProfileID,
		Title:          row.Title,
		Notes:          row.Notes,
		CreatedAt:      pgTimestamptzTime(row.CreatedAt),
		UpdatedAt:      pgTimestamptzTime(row.UpdatedAt),
	}
}

func prepItemsFromRows(rows []arcadedb.ListPrepPlanItemsRow) []PrepPlanItem {
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

func (s *Store) ListPrepPlans(ctx context.Context, ownerID string) ([]PrepPlanSummary, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListPrepPlanSummaries(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]PrepPlanSummary, len(rows))
	for i, row := range rows {
		out[i] = PrepPlanSummary{
			ID:             row.ID,
			Title:          row.Title,
			ItemCount:      int(row.ItemCount),
			CompletedCount: int(row.CompletedCount),
			UpdatedAt:      pgTimestamptzTime(row.UpdatedAt),
		}
	}
	return out, nil
}

func (s *Store) CreatePrepPlan(ctx context.Context, ownerID, title string) (*PrepPlan, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := s.q.CreatePrepPlan(ctx, arcadedb.CreatePrepPlanParams{
		OwnerProfileID: uid,
		Title:          title,
	})
	if err != nil {
		return nil, err
	}
	plan := prepPlanFromCreate(row)
	return &plan, nil
}

func (s *Store) GetPrepPlan(ctx context.Context, id, ownerID string) (*PrepPlan, error) {
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	header, err := s.q.GetPrepPlanHeader(ctx, arcadedb.GetPrepPlanHeaderParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	plan := prepPlanFromHeader(header)
	items, err := s.q.ListPrepPlanItems(ctx, planID)
	if err != nil {
		return nil, err
	}
	plan.Items = prepItemsFromRows(items)
	return &plan, nil
}

func (s *Store) UpdatePrepPlan(
	ctx context.Context,
	id, ownerID string,
	title, notes *string,
	itemIDs []string,
	completedSet map[string]bool,
) (*PrepPlan, bool, error) {
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, false, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	qtx := s.q.WithTx(tx)
	header, err := qtx.UpdatePrepPlanMeta(ctx, arcadedb.UpdatePrepPlanMetaParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
		Title:          optionalText(title),
		Notes:          optionalText(notes),
	})
	if isNoRows(err) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	plan := prepPlanFromUpdate(header)

	if itemIDs != nil {
		if err := qtx.DeletePrepPlanItems(ctx, planID); err != nil {
			return nil, false, err
		}
		plan.Items = make([]PrepPlanItem, 0, len(itemIDs))
		for pos, itemID := range itemIDs {
			completed := completedSet[itemID]
			if err := qtx.InsertPrepPlanItem(ctx, arcadedb.InsertPrepPlanItemParams{
				PlanID:    planID,
				ItemID:    itemID,
				Position:  int32(pos),
				Completed: completed,
			}); err != nil {
				return nil, false, err
			}
			plan.Items = append(plan.Items, PrepPlanItem{ItemID: itemID, Position: pos, Completed: completed})
		}
	} else {
		items, err := qtx.ListPrepPlanItems(ctx, planID)
		if err != nil {
			return nil, false, err
		}
		plan.Items = prepItemsFromRows(items)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	return &plan, true, nil
}

func (s *Store) DeletePrepPlan(ctx context.Context, id, ownerID string) (bool, error) {
	planID, err := parseCanvasUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := s.q.DeletePrepPlan(ctx, arcadedb.DeletePrepPlanParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
