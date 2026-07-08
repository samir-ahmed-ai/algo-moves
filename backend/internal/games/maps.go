package games

import "algomoves/gameserver/internal/database/postgres"

func gameToMap(g postgres.Game) map[string]any {
	return map[string]any{
		"id": g.ID, "title": g.Title, "sortOrder": g.SortOrder, "active": g.Active, "createdAt": g.CreatedAt.Time,
	}
}
