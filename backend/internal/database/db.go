// Package database manages Postgres connectivity, migrations, and shared DB access.
package database

import (
	"context"
	"log"
	"os"
	"strings"

	"algomoves/gameserver/db"
	"algomoves.dev/shared/config"
	"algomoves/gameserver/internal/database/postgres"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps a Postgres pool and generated queries.
type DB struct {
	pool *pgxpool.Pool
	Q    *postgres.Queries
}

// NewDB constructs a DB handle from an existing pool.
func NewDB(pool *pgxpool.Pool) *DB {
	return &DB{pool: pool, Q: postgres.New(pool)}
}

// Pool returns the underlying connection pool.
func (d *DB) Pool() *pgxpool.Pool {
	if d == nil {
		return nil
	}
	return d.pool
}

// Open connects to Postgres when DATABASE_URL is set.
func Open(ctx context.Context) (*DB, error) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		return nil, nil
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	if config.Enabled("RUN_MIGRATIONS") {
		if err := Migrate(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		if err := SeedAchievements(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("database: migrations and achievement seed applied")
	}
	if config.Enabled("RUN_CONTENT_SEED") {
		if err := SeedContent(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("database: learning content seed applied")
	}
	log.Printf("database: connected to postgres")
	return NewDB(pool), nil
}

// Close shuts down the connection pool.
func (d *DB) Close() {
	if d != nil && d.pool != nil {
		d.pool.Close()
	}
}

// SeedContent reloads the learning catalog from the embedded export.
func SeedContent(ctx context.Context, pool *pgxpool.Pool) error {
	if len(db.ContentSeedSQL) == 0 {
		return ErrEmptyContentSeed
	}
	if _, err := pool.Exec(ctx, string(db.ContentSeedSQL)); err != nil {
		return err
	}
	return nil
}
