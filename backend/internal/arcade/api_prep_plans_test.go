package arcade

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// Integration test for interview prep plans — skipped unless DATABASE_URL is set.
func TestArcadePrepPlanFlow(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")

	ctx := context.Background()
	svc, err := Open(ctx)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if svc == nil || !svc.Enabled() {
		t.Fatal("expected enabled arcade service")
	}
	defer svc.Close()

	mux := http.NewServeMux()
	svc.Register(mux)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	client := newGuestClient(t, ts.URL)

	// Create with an initial title only.
	create := doJSON(t, ts.URL, http.MethodPost, "/api/prep-plans", client, `{"title":"Comcast interview"}`)
	if create.status != http.StatusOK {
		t.Fatalf("create status: %d", create.status)
	}
	id, _ := create.body["id"].(string)
	if id == "" {
		t.Fatal("create: missing id")
	}
	if create.body["title"] != "Comcast interview" {
		t.Fatalf("create: title = %v", create.body["title"])
	}
	if items, ok := create.body["items"].([]any); !ok || len(items) != 0 {
		t.Fatalf("create: expected empty items, got %v", create.body["items"])
	}

	// Full-state save: ordered items with one completed.
	upd := doJSON(t, ts.URL, http.MethodPut, "/api/prep-plans/"+id, client,
		`{"title":"Comcast prep","notes":"focus arrays","itemIds":["two-sum","lru-cache","merge-intervals"],"completedItems":["lru-cache"]}`)
	if upd.status != http.StatusOK {
		t.Fatalf("update status: %d", upd.status)
	}
	if upd.body["title"] != "Comcast prep" || upd.body["notes"] != "focus arrays" {
		t.Fatalf("update: unexpected metadata %v", upd.body)
	}

	// Get — verify order preserved and completed flag applied.
	get := doJSON(t, ts.URL, http.MethodGet, "/api/prep-plans/"+id, client, "")
	if get.status != http.StatusOK {
		t.Fatalf("get status: %d", get.status)
	}
	items, ok := get.body["items"].([]any)
	if !ok || len(items) != 3 {
		t.Fatalf("get: expected 3 items, got %v", get.body["items"])
	}
	wantOrder := []string{"two-sum", "lru-cache", "merge-intervals"}
	for i, raw := range items {
		it, _ := raw.(map[string]any)
		if it["itemId"] != wantOrder[i] {
			t.Fatalf("get: item %d = %v, want %s", i, it["itemId"], wantOrder[i])
		}
		wantDone := it["itemId"] == "lru-cache"
		if it["completed"] != wantDone {
			t.Fatalf("get: item %q completed = %v, want %v", it["itemId"], it["completed"], wantDone)
		}
	}

	// List — summary carries counts, not the items array.
	list := doJSONList(t, ts.URL, http.MethodGet, "/api/prep-plans", client, "")
	if list.status != http.StatusOK {
		t.Fatalf("list status: %d", list.status)
	}
	found := false
	for _, row := range list.body {
		if row["id"] == id {
			found = true
			if row["itemCount"] != float64(3) {
				t.Fatalf("list: itemCount = %v (want 3)", row["itemCount"])
			}
			if row["completedCount"] != float64(1) {
				t.Fatalf("list: completedCount = %v (want 1)", row["completedCount"])
			}
			if _, has := row["items"]; has {
				t.Fatal("list: items should not be present in summary")
			}
		}
	}
	if !found {
		t.Fatal("list: created plan not returned")
	}

	// Owner guard — a different guest cannot read, update, or delete.
	other := newGuestClient(t, ts.URL)
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/prep-plans/"+id, other, ""); r.status != http.StatusNotFound {
		t.Fatalf("get by other: %d (want 404)", r.status)
	}
	if r := doJSON(t, ts.URL, http.MethodPut, "/api/prep-plans/"+id, other, `{"title":"hijack"}`); r.status != http.StatusNotFound {
		t.Fatalf("update by other: %d (want 404)", r.status)
	}
	if r := doJSON(t, ts.URL, http.MethodDelete, "/api/prep-plans/"+id, other, ""); r.status != http.StatusNotFound {
		t.Fatalf("delete by other: %d (want 404)", r.status)
	}

	// Unauthenticated — 401.
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/prep-plans", nil, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("list without session: %d (want 401)", r.status)
	}

	// Missing plan — 404.
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/prep-plans/00000000-0000-0000-0000-000000000000", client, ""); r.status != http.StatusNotFound {
		t.Fatalf("get missing: %d (want 404)", r.status)
	}

	// Delete, then confirm it is gone.
	del := doJSON(t, ts.URL, http.MethodDelete, "/api/prep-plans/"+id, client, "")
	if del.status != http.StatusOK || del.body["ok"] != true {
		t.Fatalf("delete: status %d body %v", del.status, del.body)
	}
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/prep-plans/"+id, client, ""); r.status != http.StatusNotFound {
		t.Fatalf("get after delete: %d (want 404)", r.status)
	}
}
