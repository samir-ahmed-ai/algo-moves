package platform

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/alexedwards/scs/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service bundles the Postgres store, session manager, and platform HTTP handlers.
type Service struct {
	store    *Store
	sessions *scs.SessionManager
	sqlDB    *sql.DB
}

func (s *Service) Store() *Store {
	if s == nil {
		return nil
	}
	return s.store
}

// Open connects to Postgres when DATABASE_URL is set.
func Open(ctx context.Context) (*Service, error) {
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
	if EnvEnabled("RUN_MIGRATIONS") {
		if err := Migrate(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		if err := SeedAchievements(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("platform: migrations and achievement seed applied")
	}
	if EnvEnabled("RUN_CONTENT_SEED") {
		if err := SeedContent(ctx, pool); err != nil {
			pool.Close()
			return nil, err
		}
		log.Printf("platform: learning content seed applied")
	}
	log.Printf("platform: connected to postgres")
	svc := &Service{store: NewStore(pool)}
	if sm, db, err := newSessionManager(url); err != nil {
		log.Printf("platform: session manager disabled: %v", err)
	} else {
		svc.sessions = sm
		svc.sqlDB = db
	}
	return svc, nil
}

func (s *Service) Enabled() bool { return s != nil && s.store != nil }

func (s *Service) Close() {
	if s != nil {
		if s.sqlDB != nil {
			s.sqlDB.Close()
		}
		if s.store != nil {
			s.store.Pool().Close()
		}
	}
}
