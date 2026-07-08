//go:build integration

package app

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Integration test for yjs_documents persistence (same SQL Hocuspocus uses).
// Run: DATABASE_URL=postgres://... go test -tags=integration ./internal/app/ -run TestYjsDocuments
func TestYjsDocumentsRoundTrip(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL unset")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := Migrate(ctx, pool); err != nil {
		t.Fatal(err)
	}
	const name = "test-doc-integration"
	payload := []byte{0x01, 0x02, 0x03}
	if _, err := pool.Exec(ctx,
		`insert into public.yjs_documents (name, data, updated_at)
		 values ($1, $2, now())
		 on conflict (name) do update set data = excluded.data, updated_at = now()`,
		name, payload,
	); err != nil {
		t.Fatal(err)
	}
	var got []byte
	if err := pool.QueryRow(ctx, `select data from public.yjs_documents where name = $1`, name).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if len(got) != len(payload) || got[0] != payload[0] {
		t.Fatalf("got %v want %v", got, payload)
	}
	if _, err := pool.Exec(ctx, `delete from public.yjs_documents where name = $1`, name); err != nil {
		t.Fatal(err)
	}
}
