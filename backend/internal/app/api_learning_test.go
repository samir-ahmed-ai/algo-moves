package app

import (
	"context"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"algomoves/gameserver/internal/config"
)

// Integration test for server-side learner state — skipped unless DATABASE_URL is set.
func TestLearningProgressFlow(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")

	ctx := context.Background()
	svc, err := Open(ctx, config.Load())
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if svc == nil || !svc.Enabled() {
		t.Fatal("expected enabled service")
	}
	defer svc.Close()

	mux := http.NewServeMux()
	svc.Register(mux)
	// The real server wraps /api/ in the SCS session middleware; sessions panic
	// without it (transport/http/server.go).
	ts := httptest.NewServer(svc.SessionMiddleware(mux))
	defer ts.Close()

	client := newSignedUpClient(t, ts.URL)

	// --- progress: monotonic merge across two overlapping pushes ---
	first := doJSON(t, ts.URL, http.MethodPut, "/api/progress", client,
		`{"problems":[{"problemId":"two-sum","attempts":3,"correct":2,"streak":1,"bestStreak":2,"mastered":false,"lastAttemptAt":"2026-01-01T00:00:00Z"}]}`)
	if first.status != http.StatusOK {
		t.Fatalf("progress put#1 status: %d", first.status)
	}
	second := doJSON(t, ts.URL, http.MethodPut, "/api/progress", client,
		`{"problems":[{"problemId":"two-sum","attempts":2,"correct":1,"streak":5,"bestStreak":1,"mastered":true,"lastAttemptAt":"2026-02-01T00:00:00Z"}]}`)
	if second.status != http.StatusOK {
		t.Fatalf("progress put#2 status: %d", second.status)
	}

	get := doJSON(t, ts.URL, http.MethodGet, "/api/progress", client, "")
	row := firstProblem(t, get.body, "two-sum")
	assertNum(t, row, "attempts", 3)   // greatest(3,2)
	assertNum(t, row, "correct", 2)    // clamped to attempts, max(2,1)
	assertNum(t, row, "bestStreak", 2) // greatest(2,1)
	assertNum(t, row, "streak", 5)     // later attempt wins (2026-02 > 2026-01)
	if row["mastered"] != true {
		t.Fatalf("mastered should latch true, got %v", row["mastered"])
	}

	// --- reviews: higher-reps merge + due-queue ordering ---
	putReviews(t, ts.URL, client,
		`{"cards":[{"problemId":"two-sum","due":"2020-01-01T00:00:00Z","intervalDays":1,"reps":1,"fsrs":{"reps":1}}]}`)
	putReviews(t, ts.URL, client,
		`{"cards":[{"problemId":"two-sum","due":"2035-01-01T00:00:00Z","intervalDays":9,"reps":3,"fsrs":{"reps":3}}]}`)
	putReviews(t, ts.URL, client,
		`{"cards":[{"problemId":"binary-search","due":"2019-01-01T00:00:00Z","intervalDays":2,"reps":1,"fsrs":{}}]}`)

	// higher reps (3) wins → due promoted to the 2035 card.
	allReviews := doJSON(t, ts.URL, http.MethodGet, "/api/reviews", client, "")
	twoSumCard := firstProblem(t, allReviews.body, "two-sum")
	assertNum(t, twoSumCard, "reps", 3)
	if due, _ := twoSumCard["due"].(string); !strings.HasPrefix(due, "2035") {
		t.Fatalf("two-sum due should be the higher-reps card (2035), got %v", twoSumCard["due"])
	}

	// due-queue at "now" returns only the overdue binary-search card (two-sum due 2035).
	due := doJSON(t, ts.URL, http.MethodGet, "/api/reviews/due", client, "")
	cards := cardList(t, due.body)
	if len(cards) != 1 || cards[0]["problemId"] != "binary-search" {
		t.Fatalf("due-queue should be [binary-search], got %v", cards)
	}

	// --- attempts + mistakes ---
	att := doJSON(t, ts.URL, http.MethodPost, "/api/progress/attempts", client,
		`{"attempts":[{"id":"11111111-1111-1111-1111-111111111111","problemId":"two-sum","kind":"quiz","correct":false,"detail":{"picked":"O(n^2)"}}]}`)
	if att.status != http.StatusOK {
		t.Fatalf("attempts status: %d", att.status)
	}
	// idempotent replay — same id, no error, no duplicate.
	doJSON(t, ts.URL, http.MethodPost, "/api/progress/attempts", client,
		`{"attempts":[{"id":"11111111-1111-1111-1111-111111111111","problemId":"two-sum","kind":"quiz","correct":false}]}`)
	mistakes := doJSON(t, ts.URL, http.MethodGet, "/api/progress/mistakes", client, "")
	if ms, ok := mistakes.body["mistakes"].([]any); !ok || len(ms) != 1 {
		t.Fatalf("expected exactly 1 mistake after idempotent replay, got %v", mistakes.body["mistakes"])
	}

	// --- notes round-trip ---
	putNotes := doJSON(t, ts.URL, http.MethodPut, "/api/notes", client,
		`{"notes":[{"itemId":"two-sum","kind":"note","body":"use a hash map","updatedAt":"2026-03-01T00:00:00Z"}]}`)
	if putNotes.status != http.StatusOK {
		t.Fatalf("notes put status: %d", putNotes.status)
	}
	gotNotes := doJSON(t, ts.URL, http.MethodGet, "/api/notes", client, "")
	if ns, ok := gotNotes.body["notes"].([]any); !ok || len(ns) != 1 {
		t.Fatalf("expected 1 note, got %v", gotNotes.body["notes"])
	}

	// --- bookmarks full-set replace (removal propagates) ---
	doJSON(t, ts.URL, http.MethodPut, "/api/bookmarks", client, `{"itemIds":["a","b"]}`)
	replaced := doJSON(t, ts.URL, http.MethodPut, "/api/bookmarks", client, `{"itemIds":["b"]}`)
	if ids, ok := replaced.body["itemIds"].([]any); !ok || len(ids) != 1 || ids[0] != "b" {
		t.Fatalf("bookmarks replace should leave [b], got %v", replaced.body["itemIds"])
	}

	// --- enrollments upsert ---
	enr := doJSON(t, ts.URL, http.MethodPut, "/api/enrollments", client,
		`{"enrollments":[{"courseId":"graphs","lastItemId":"bfs","progress":0.5}]}`)
	if enr.status != http.StatusOK {
		t.Fatalf("enrollments put status: %d", enr.status)
	}
	gotEnr := doJSON(t, ts.URL, http.MethodGet, "/api/enrollments", client, "")
	erow := firstCourse(t, gotEnr.body, "graphs")
	if p, _ := erow["progress"].(float64); p != 0.5 {
		t.Fatalf("enrollment progress = %v (want 0.5)", erow["progress"])
	}

	// --- auth guards ---
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/progress", nil, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("unauth progress: %d (want 401)", r.status)
	}
	guest := newGuestClient(t, ts.URL)
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/progress", guest, ""); r.status != http.StatusUnauthorized {
		t.Fatalf("anonymous progress: %d (want 401)", r.status)
	}
}

/* ------------------------------------------------------------- helpers */

func newSignedUpClient(t *testing.T, base string) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar}
	email := fmt.Sprintf("learner-%d@example.com", time.Now().UnixNano())
	payload := fmt.Sprintf(`{"email":%q,"password":"correct horse battery","display_name":"Learner"}`, email)
	res, err := client.Post(base+"/api/auth/signup", "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("signup post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("signup status: %d", res.StatusCode)
	}
	return client
}

func putReviews(t *testing.T, base string, client *http.Client, body string) {
	t.Helper()
	if r := doJSON(t, base, http.MethodPut, "/api/reviews", client, body); r.status != http.StatusOK {
		t.Fatalf("reviews put status: %d", r.status)
	}
}

func firstProblem(t *testing.T, body map[string]any, id string) map[string]any {
	t.Helper()
	key := "problems"
	if _, ok := body["cards"]; ok {
		key = "cards"
	}
	list, _ := body[key].([]any)
	for _, raw := range list {
		row, _ := raw.(map[string]any)
		if row["problemId"] == id {
			return row
		}
	}
	t.Fatalf("no %q row for problemId %q in %v", key, id, body)
	return nil
}

func firstCourse(t *testing.T, body map[string]any, id string) map[string]any {
	t.Helper()
	list, _ := body["enrollments"].([]any)
	for _, raw := range list {
		row, _ := raw.(map[string]any)
		if row["courseId"] == id {
			return row
		}
	}
	t.Fatalf("no enrollment for courseId %q in %v", id, body)
	return nil
}

func cardList(t *testing.T, body map[string]any) []map[string]any {
	t.Helper()
	list, _ := body["cards"].([]any)
	out := make([]map[string]any, 0, len(list))
	for _, raw := range list {
		row, _ := raw.(map[string]any)
		out = append(out, row)
	}
	return out
}

func assertNum(t *testing.T, row map[string]any, field string, want float64) {
	t.Helper()
	got, _ := row[field].(float64)
	if got != want {
		t.Fatalf("%s = %v, want %v", field, row[field], want)
	}
}
