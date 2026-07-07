package platform

import (
	"context"
	"errors"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5"
)

func gameToMap(g arcadedb.Game) map[string]any {
	return map[string]any{
		"id": g.ID, "title": g.Title, "sortOrder": g.SortOrder, "active": g.Active, "createdAt": g.CreatedAt.Time,
	}
}

func (s *Store) ListGames(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.q.ListActiveGames(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(rows))
	for _, g := range rows {
		out = append(out, gameToMap(g))
	}
	return out, nil
}

func (s *Store) GetGame(ctx context.Context, id string) (map[string]any, error) {
	g, err := s.q.GetGameByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	m := gameToMap(g)
	return m, nil
}
