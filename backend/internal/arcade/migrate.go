package arcade

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

//go:embed seeds/content_seed.sql
var contentSeedSQL []byte

// Migrate applies embedded SQL migrations in lexical order. Idempotent statements
// (create if not exists, or replace) are safe to re-run on deploy.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := fs.Glob(migrationFS, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(entries)
	for _, name := range entries {
		body, err := migrationFS.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if _, err := pool.Exec(ctx, string(body)); err != nil {
			return fmt.Errorf("apply %s: %w", name, err)
		}
	}
	return nil
}

// SeedAchievements loads the achievement catalog. The SQL is inlined so the
// Docker image stays self-contained; keep in sync with db/seed.sql.
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

// SeedContent reloads the learning catalog from the embedded export. The SQL
// truncates and repopulates content tables, so it is safe to re-run on deploy.
func SeedContent(ctx context.Context, pool *pgxpool.Pool) error {
	if len(contentSeedSQL) == 0 {
		return fmt.Errorf("embedded content seed is empty — run export-content-sql and sync backend/internal/arcade/seeds/")
	}
	if _, err := pool.Exec(ctx, string(contentSeedSQL)); err != nil {
		return fmt.Errorf("apply content seed: %w", err)
	}
	return nil
}
