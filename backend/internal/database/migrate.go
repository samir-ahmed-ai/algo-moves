package database

import (
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"algomoves/gameserver/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate applies embedded SQL migrations in lexical order.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := fs.Glob(db.Migrations, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(entries)
	for _, name := range entries {
		body, err := db.Migrations.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if _, err := pool.Exec(ctx, string(body)); err != nil {
			return fmt.Errorf("apply %s: %w", name, err)
		}
	}
	return nil
}

// SeedAchievements loads the achievement catalog.
func SeedAchievements(ctx context.Context, pool *pgxpool.Pool) error {
	const q = `
insert into public.achievements (id, title, description, icon, points, sort_order) values
  ('first-match',  'First Steps',     'Play your first match.',                 'sparkles', 5,  10),
  ('first-win',    'First Blood',     'Win your first match.',                  'trophy',   10, 20),
  ('streak-5',     'On Fire',         'Win 5 matches in a row.',                'flame',    25, 30),
  ('streak-10',    'Unstoppable',     'Win 10 matches in a row.',               'zap',      50, 40),
  ('all-rounder',  'All-Rounder',     'Play every game in the arcade.',         'grid',     30, 50),
  ('host',         'Host with the Most', 'Host a room others join.',            'crown',    15, 60),
  ('spectator',    'Backseat Gamer',  'Watch a match as a spectator.',          'eye',      10, 70),
  ('daily',        'Daily Grind',     'Complete a daily challenge.',            'calendar', 20, 80),
  ('social',       'Squad Up',        'Add your first friend.',                 'users',    15, 90)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  points = excluded.points,
  sort_order = excluded.sort_order`
	_, err := pool.Exec(ctx, strings.TrimSpace(q))
	return err
}
