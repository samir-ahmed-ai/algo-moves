package arcade

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// Integration test — skipped unless DATABASE_URL is set and RUN_MIGRATIONS=true.
func TestArcadeGuestFlow(t *testing.T) {
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

	// Create guest
	res, err := http.Post(ts.URL+"/api/auth/guest", "application/json", nil)
	if err != nil {
		t.Fatalf("guest post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("guest status: %d", res.StatusCode)
	}
	var sess struct {
		ProfileID    string `json:"profile_id"`
		SessionToken string `json:"session_token"`
	}
	if err := json.NewDecoder(res.Body).Decode(&sess); err != nil {
		t.Fatalf("decode guest: %v", err)
	}
	if sess.ProfileID == "" || sess.SessionToken == "" {
		t.Fatal("missing guest session fields")
	}

	// Fetch profile with token
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.SessionToken)
	res2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer res2.Body.Close()
	if res2.StatusCode != http.StatusOK {
		t.Fatalf("me status: %d", res2.StatusCode)
	}

	// Leaderboard should be empty but reachable
	res3, err := http.Get(ts.URL + "/api/leaderboard/global")
	if err != nil {
		t.Fatalf("leaderboard: %v", err)
	}
	defer res3.Body.Close()
	if res3.StatusCode != http.StatusOK {
		t.Fatalf("leaderboard status: %d", res3.StatusCode)
	}
}

// Integration test for durable canvas persistence — skipped unless DATABASE_URL is set.
func TestArcadeCanvasFlow(t *testing.T) {
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

	token := newGuestToken(t, ts.URL)

	// Create
	create := doJSON(t, ts.URL, http.MethodPost, "/api/canvases", token,
		`{"title":"Sketch","doc":{"nodes":[1,2,3]},"roomCode":"ABCD"}`)
	if create.status != http.StatusOK {
		t.Fatalf("create status: %d", create.status)
	}
	id, _ := create.body["id"].(string)
	if id == "" {
		t.Fatal("create: missing id")
	}
	if create.body["title"] != "Sketch" {
		t.Fatalf("create: title = %v", create.body["title"])
	}

	// Get
	get := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/"+id, token, "")
	if get.status != http.StatusOK {
		t.Fatalf("get status: %d", get.status)
	}
	if get.body["id"] != id {
		t.Fatalf("get: id = %v", get.body["id"])
	}
	if get.body["roomCode"] != "ABCD" {
		t.Fatalf("get: roomCode = %v", get.body["roomCode"])
	}
	if _, ok := get.body["doc"].(map[string]any); !ok {
		t.Fatalf("get: doc not an object: %v", get.body["doc"])
	}

	// List
	list := doJSONList(t, ts.URL, http.MethodGet, "/api/canvases", token, "")
	if list.status != http.StatusOK {
		t.Fatalf("list status: %d", list.status)
	}
	found := false
	for _, row := range list.body {
		if row["id"] == id {
			found = true
			if _, hasDoc := row["doc"]; hasDoc {
				t.Fatal("list: doc should not be present in summary")
			}
		}
	}
	if !found {
		t.Fatal("list: created canvas not returned")
	}

	// Update
	upd := doJSON(t, ts.URL, http.MethodPut, "/api/canvases/"+id, token,
		`{"title":"Renamed","doc":{"nodes":[]}}`)
	if upd.status != http.StatusOK {
		t.Fatalf("update status: %d", upd.status)
	}
	if upd.body["id"] != id {
		t.Fatalf("update: id = %v", upd.body["id"])
	}

	// Owner guard — a different guest cannot update or delete.
	other := newGuestToken(t, ts.URL)
	updOther := doJSON(t, ts.URL, http.MethodPut, "/api/canvases/"+id, other,
		`{"doc":{}}`)
	if updOther.status != http.StatusNotFound {
		t.Fatalf("update by other status: %d (want 404)", updOther.status)
	}
	delOther := doJSON(t, ts.URL, http.MethodDelete, "/api/canvases/"+id, other, "")
	if delOther.status != http.StatusNotFound {
		t.Fatalf("delete by other status: %d (want 404)", delOther.status)
	}

	// Missing canvas — 404.
	missing := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/00000000-0000-0000-0000-000000000000", token, "")
	if missing.status != http.StatusNotFound {
		t.Fatalf("get missing status: %d (want 404)", missing.status)
	}

	// Delete
	del := doJSON(t, ts.URL, http.MethodDelete, "/api/canvases/"+id, token, "")
	if del.status != http.StatusOK {
		t.Fatalf("delete status: %d", del.status)
	}
	if del.body["ok"] != true {
		t.Fatalf("delete: ok = %v", del.body["ok"])
	}

	// Gone after delete.
	gone := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/"+id, token, "")
	if gone.status != http.StatusNotFound {
		t.Fatalf("get after delete status: %d (want 404)", gone.status)
	}
}

func newGuestToken(t *testing.T, base string) string {
	t.Helper()
	res, err := http.Post(base+"/api/auth/guest", "application/json", nil)
	if err != nil {
		t.Fatalf("guest post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("guest status: %d", res.StatusCode)
	}
	var sess struct {
		SessionToken string `json:"session_token"`
	}
	if err := json.NewDecoder(res.Body).Decode(&sess); err != nil {
		t.Fatalf("decode guest: %v", err)
	}
	if sess.SessionToken == "" {
		t.Fatal("missing session token")
	}
	return sess.SessionToken
}

type jsonResult struct {
	status int
	body   map[string]any
}

type jsonListResult struct {
	status int
	body   []map[string]any
}

func doJSON(t *testing.T, base, method, path, token, payload string) jsonResult {
	t.Helper()
	var reader io.Reader
	if payload != "" {
		reader = strings.NewReader(payload)
	}
	req, err := http.NewRequest(method, base+path, reader)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	if payload != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	out := jsonResult{status: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&out.body)
	return out
}

func doJSONList(t *testing.T, base, method, path, token, payload string) jsonListResult {
	t.Helper()
	req, err := http.NewRequest(method, base+path, nil)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	out := jsonListResult{status: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&out.body)
	return out
}
