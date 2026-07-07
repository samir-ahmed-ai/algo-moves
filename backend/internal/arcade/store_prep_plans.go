package arcade

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
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

func (s *Store) ListPrepPlans(ctx context.Context, ownerID string) ([]PrepPlanSummary, error) {
	rows, err := s.pool.Query(ctx, `
		select p.id, p.title, p.updated_at,
		       count(i.item_id)                                  as item_count,
		       count(i.item_id) filter (where i.completed = true) as completed_count
		from public.prep_plans p
		left join public.prep_plan_items i on i.plan_id = p.id
		where p.owner_profile_id = $1
		group by p.id, p.title, p.updated_at
		order by p.created_at desc
		limit 200`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PrepPlanSummary{}
	for rows.Next() {
		var v PrepPlanSummary
		if err := rows.Scan(&v.ID, &v.Title, &v.UpdatedAt, &v.ItemCount, &v.CompletedCount); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) CreatePrepPlan(ctx context.Context, ownerID, title string) (*PrepPlan, error) {
	var plan PrepPlan
	err := s.pool.QueryRow(ctx, `
		insert into public.prep_plans (owner_profile_id, title)
		values ($1, $2)
		returning id, owner_profile_id, title, notes, created_at, updated_at`,
		ownerID, title).Scan(
		&plan.ID, &plan.OwnerProfileID, &plan.Title, &plan.Notes, &plan.CreatedAt, &plan.UpdatedAt)
	if err != nil {
		return nil, err
	}
	plan.Items = []PrepPlanItem{}
	return &plan, nil
}

func (s *Store) GetPrepPlan(ctx context.Context, id, ownerID string) (*PrepPlan, error) {
	var plan PrepPlan
	err := s.pool.QueryRow(ctx, `
		select id, owner_profile_id, title, notes, created_at, updated_at
		from public.prep_plans
		where id = $1 and owner_profile_id = $2`, id, ownerID).Scan(
		&plan.ID, &plan.OwnerProfileID, &plan.Title, &plan.Notes, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx, `
		select item_id, position, completed
		from public.prep_plan_items
		where plan_id = $1
		order by position asc`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	plan.Items = []PrepPlanItem{}
	for rows.Next() {
		var it PrepPlanItem
		if err := rows.Scan(&it.ItemID, &it.Position, &it.Completed); err != nil {
			return nil, err
		}
		plan.Items = append(plan.Items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &plan, nil
}

// UpdatePrepPlan performs a full-state save: updates plan metadata and replaces
// the item list atomically inside a transaction.
//
// title and notes may be nil to leave them unchanged. itemIDs and completedSet
// together define the new ordered item list; omitting itemIDs (nil) leaves items
// unchanged. The bool return is false when id is not found or not owned by ownerID.
func (s *Store) UpdatePrepPlan(
	ctx context.Context,
	id, ownerID string,
	title, notes *string,
	itemIDs []string,
	completedSet map[string]bool,
) (*PrepPlan, bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var plan PrepPlan
	err = tx.QueryRow(ctx, `
		update public.prep_plans
		set title      = coalesce($3, title),
		    notes      = coalesce($4, notes),
		    updated_at = now()
		where id = $1 and owner_profile_id = $2
		returning id, owner_profile_id, title, notes, created_at, updated_at`,
		id, ownerID, title, notes).Scan(
		&plan.ID, &plan.OwnerProfileID, &plan.Title, &plan.Notes, &plan.CreatedAt, &plan.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	if itemIDs != nil {
		if _, err := tx.Exec(ctx, `delete from public.prep_plan_items where plan_id = $1`, id); err != nil {
			return nil, false, err
		}
		plan.Items = make([]PrepPlanItem, 0, len(itemIDs))
		for pos, itemID := range itemIDs {
			completed := completedSet[itemID]
			if _, err := tx.Exec(ctx, `
				insert into public.prep_plan_items (plan_id, item_id, position, completed)
				values ($1, $2, $3, $4)`, id, itemID, pos, completed); err != nil {
				return nil, false, err
			}
			plan.Items = append(plan.Items, PrepPlanItem{ItemID: itemID, Position: pos, Completed: completed})
		}
	} else {
		rows, err := tx.Query(ctx, `
			select item_id, position, completed
			from public.prep_plan_items
			where plan_id = $1
			order by position asc`, id)
		if err != nil {
			return nil, false, err
		}
		plan.Items = []PrepPlanItem{}
		for rows.Next() {
			var it PrepPlanItem
			if err := rows.Scan(&it.ItemID, &it.Position, &it.Completed); err != nil {
				rows.Close()
				return nil, false, err
			}
			plan.Items = append(plan.Items, it)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, false, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	return &plan, true, nil
}

// DeletePrepPlan removes an owner-held plan (cascade deletes its items).
// The bool is false when id is not found or not owned by ownerID.
func (s *Store) DeletePrepPlan(ctx context.Context, id, ownerID string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		delete from public.prep_plans where id = $1 and owner_profile_id = $2`, id, ownerID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
