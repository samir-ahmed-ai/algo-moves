package prep

import (
	"context"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
)

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func (r *Repository) ListPrepPlans(ctx context.Context, ownerID string) ([]PrepPlanSummary, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListPrepPlanSummaries(ctx, uid)
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
			UpdatedAt:      database.PgTimestamptzTime(row.UpdatedAt),
		}
	}
	return out, nil
}

func (r *Repository) CreatePrepPlan(ctx context.Context, ownerID, title string) (*PrepPlan, error) {
	uid, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.CreatePrepPlan(ctx, postgres.CreatePrepPlanParams{
		OwnerProfileID: uid,
		Title:          title,
	})
	if err != nil {
		return nil, err
	}
	plan := prepPlanFromCreate(row)
	return &plan, nil
}

func (r *Repository) GetPrepPlan(ctx context.Context, id, ownerID string) (*PrepPlan, error) {
	planID, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, err
	}
	header, err := r.db.Q.GetPrepPlanHeader(ctx, postgres.GetPrepPlanHeaderParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	plan := prepPlanFromHeader(header)
	items, err := r.db.Q.ListPrepPlanItems(ctx, planID)
	if err != nil {
		return nil, err
	}
	plan.Items = prepItemsFromRows(items)
	return &plan, nil
}

func (r *Repository) UpdatePrepPlan(
	ctx context.Context,
	id, ownerID string,
	title, notes *string,
	itemIDs []string,
	completedSet map[string]bool,
) (*PrepPlan, bool, error) {
	planID, err := database.ParseUUID(id)
	if err != nil {
		return nil, false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return nil, false, err
	}

	tx, err := r.db.Pool().Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	qtx := r.db.Q.WithTx(tx)
	header, err := qtx.UpdatePrepPlanMeta(ctx, postgres.UpdatePrepPlanMetaParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
		Title:          database.OptionalText(title),
		Notes:          database.OptionalText(notes),
	})
	if database.IsNoRows(err) {
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
			if err := qtx.InsertPrepPlanItem(ctx, postgres.InsertPrepPlanItemParams{
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

func (r *Repository) DeletePrepPlan(ctx context.Context, id, ownerID string) (bool, error) {
	planID, err := database.ParseUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := database.ParseUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := r.db.Q.DeletePrepPlan(ctx, postgres.DeletePrepPlanParams{
		ID:             planID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
