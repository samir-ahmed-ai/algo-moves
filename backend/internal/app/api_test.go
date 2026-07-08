package app

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"algomoves/gameserver/internal/config"
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
	svc, err := Open(ctx, config.Load())
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

	// Create guest session (SCS cookie issued on response).
	client := newGuestClient(t, ts.URL)

	// Fetch profile with session cookie.
	res2, err := client.Get(ts.URL + "/api/auth/me")
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
	svc, err := Open(ctx, config.Load())
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

	// Create
	create := doJSON(t, ts.URL, http.MethodPost, "/api/canvases", client,
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
	get := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/"+id, client, "")
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
	list := doJSONList(t, ts.URL, http.MethodGet, "/api/canvases", client, "")
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
	upd := doJSON(t, ts.URL, http.MethodPut, "/api/canvases/"+id, client,
		`{"title":"Renamed","doc":{"nodes":[]}}`)
	if upd.status != http.StatusOK {
		t.Fatalf("update status: %d", upd.status)
	}
	if upd.body["id"] != id {
		t.Fatalf("update: id = %v", upd.body["id"])
	}

	// Owner guard — a different guest cannot update or delete.
	other := newGuestClient(t, ts.URL)
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
	missing := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/00000000-0000-0000-0000-000000000000", client, "")
	if missing.status != http.StatusNotFound {
		t.Fatalf("get missing status: %d (want 404)", missing.status)
	}

	// Delete
	del := doJSON(t, ts.URL, http.MethodDelete, "/api/canvases/"+id, client, "")
	if del.status != http.StatusOK {
		t.Fatalf("delete status: %d", del.status)
	}
	if del.body["ok"] != true {
		t.Fatalf("delete: ok = %v", del.body["ok"])
	}

	// Gone after delete.
	gone := doJSON(t, ts.URL, http.MethodGet, "/api/canvases/"+id, client, "")
	if gone.status != http.StatusNotFound {
		t.Fatalf("get after delete status: %d (want 404)", gone.status)
	}
}

// Integration test for durable interview sessions — skipped unless DATABASE_URL is set.
func TestArcadeInterviewFlow(t *testing.T) {
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
		t.Fatal("expected enabled arcade service")
	}
	defer svc.Close()

	mux := http.NewServeMux()
	svc.Register(mux)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	client := newGuestClient(t, ts.URL)

	// Create
	create := doJSON(t, ts.URL, http.MethodPost, "/api/interviews", client, `{"title":"Onsite"}`)
	if create.status != http.StatusOK {
		t.Fatalf("create status: %d", create.status)
	}
	id, _ := create.body["id"].(string)
	if id == "" {
		t.Fatal("create: missing id")
	}
	if create.body["status"] != "active" {
		t.Fatalf("create: status = %v", create.body["status"])
	}
	guestToken, _ := create.body["guestToken"].(string)
	if guestToken == "" {
		t.Fatal("create: missing guestToken")
	}
	if create.body["guestLinkEnabled"] != true {
		t.Fatalf("create: guestLinkEnabled = %v", create.body["guestLinkEnabled"])
	}

	// Get (owner) — full fields present.
	get := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/"+id, client, "")
	if get.status != http.StatusOK {
		t.Fatalf("get status: %d", get.status)
	}
	if _, ok := get.body["notes"]; !ok {
		t.Fatal("get: notes missing from owner view")
	}
	if get.body["guestToken"] != guestToken {
		t.Fatalf("get: guestToken = %v", get.body["guestToken"])
	}

	// List — summary omits heavy fields.
	list := doJSONList(t, ts.URL, http.MethodGet, "/api/interviews", client, "")
	if list.status != http.StatusOK {
		t.Fatalf("list status: %d", list.status)
	}
	found := false
	for _, row := range list.body {
		if row["id"] == id {
			found = true
			if _, has := row["canvas"]; has {
				t.Fatal("list: canvas should not be present in summary")
			}
			if _, has := row["notes"]; has {
				t.Fatal("list: notes should not be present in summary")
			}
		}
	}
	if !found {
		t.Fatal("list: created session not returned")
	}

	// Patch — partial update.
	upd := doJSON(t, ts.URL, http.MethodPatch, "/api/interviews/"+id, client,
		`{"title":"Renamed","canvas":{"els":[]},"notes":"hi","canvasLocked":true,"roomCode":"WXYZ"}`)
	if upd.status != http.StatusOK {
		t.Fatalf("patch status: %d", upd.status)
	}
	if upd.body["title"] != "Renamed" || upd.body["notes"] != "hi" || upd.body["canvasLocked"] != true {
		t.Fatalf("patch: unexpected body %v", upd.body)
	}

	// Public token GET — sanitized, no private fields.
	pub := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/token/"+guestToken, nil, "")
	if pub.status != http.StatusOK {
		t.Fatalf("public status: %d", pub.status)
	}
	if pub.body["roomCode"] != "WXYZ" {
		t.Fatalf("public: roomCode = %v", pub.body["roomCode"])
	}
	if _, ok := pub.body["canvas"]; !ok {
		t.Fatal("public: canvas missing")
	}
	for _, k := range []string{"guestToken", "notes", "rubric", "questions", "recommendation"} {
		if _, leaked := pub.body[k]; leaked {
			t.Fatalf("public: leaked private field %q", k)
		}
	}

	// Disable guest link — public GET 404s.
	if r := doJSON(t, ts.URL, http.MethodPatch, "/api/interviews/"+id, client, `{"guestLinkEnabled":false}`); r.status != http.StatusOK {
		t.Fatalf("disable link status: %d", r.status)
	}
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/token/"+guestToken, nil, ""); r.status != http.StatusNotFound {
		t.Fatalf("public after disable: %d (want 404)", r.status)
	}
	// Re-enable for the end/reopen checks.
	doJSON(t, ts.URL, http.MethodPatch, "/api/interviews/"+id, client, `{"guestLinkEnabled":true}`)

	// End — status ended, public GET 404 (not served when ended).
	end := doJSON(t, ts.URL, http.MethodPost, "/api/interviews/"+id+"/end", client, "")
	if end.status != http.StatusOK || end.body["status"] != "ended" {
		t.Fatalf("end: status %d body %v", end.status, end.body)
	}
	if end.body["endedAt"] == nil {
		t.Fatal("end: endedAt should be set")
	}
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/token/"+guestToken, nil, ""); r.status != http.StatusNotFound {
		t.Fatalf("public after end: %d (want 404)", r.status)
	}

	// Reopen.
	reopen := doJSON(t, ts.URL, http.MethodPost, "/api/interviews/"+id+"/reopen", client, "")
	if reopen.status != http.StatusOK || reopen.body["status"] != "active" {
		t.Fatalf("reopen: status %d body %v", reopen.status, reopen.body)
	}

	// Rotate token — old token no longer resolves.
	rot := doJSON(t, ts.URL, http.MethodPost, "/api/interviews/"+id+"/rotate-token", client, "")
	newToken, _ := rot.body["guestToken"].(string)
	if rot.status != http.StatusOK || newToken == "" || newToken == guestToken {
		t.Fatalf("rotate: status %d token %q", rot.status, newToken)
	}
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/token/"+guestToken, nil, ""); r.status != http.StatusNotFound {
		t.Fatalf("public with old token: %d (want 404)", r.status)
	}

	// Owner guard — another guest cannot see or mutate.
	other := newGuestClient(t, ts.URL)
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/"+id, other, ""); r.status != http.StatusNotFound {
		t.Fatalf("get by other: %d (want 404)", r.status)
	}
	if r := doJSON(t, ts.URL, http.MethodPatch, "/api/interviews/"+id, other, `{"notes":"x"}`); r.status != http.StatusNotFound {
		t.Fatalf("patch by other: %d (want 404)", r.status)
	}
	if r := doJSON(t, ts.URL, http.MethodPost, "/api/interviews/"+id+"/end", other, ""); r.status != http.StatusNotFound {
		t.Fatalf("end by other: %d (want 404)", r.status)
	}

	// Missing id — 404.
	if r := doJSON(t, ts.URL, http.MethodGet, "/api/interviews/00000000-0000-0000-0000-000000000000", client, ""); r.status != http.StatusNotFound {
		t.Fatalf("get missing: %d (want 404)", r.status)
	}
}

func newGuestClient(t *testing.T, base string) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("parse base: %v", err)
	}
	client := &http.Client{Jar: jar}
	res, err := client.Post(base+"/api/auth/guest", "application/json", nil)
	if err != nil {
		t.Fatalf("guest post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("guest status: %d", res.StatusCode)
	}
	var sess struct {
		ProfileID string `json:"profile_id"`
	}
	if err := json.NewDecoder(res.Body).Decode(&sess); err != nil {
		t.Fatalf("decode guest: %v", err)
	}
	if sess.ProfileID == "" {
		t.Fatal("missing profile_id")
	}
	if len(jar.Cookies(u)) == 0 {
		t.Fatal("missing session cookie")
	}
	return client
}

type jsonResult struct {
	status int
	body   map[string]any
}

type jsonListResult struct {
	status int
	body   []map[string]any
}

func doJSON(t *testing.T, base, method, path string, client *http.Client, payload string) jsonResult {
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
	httpClient := client
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	res, err := httpClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	out := jsonResult{status: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&out.body)
	return out
}

func doJSONList(t *testing.T, base, method, path string, client *http.Client, payload string) jsonListResult {
	t.Helper()
	req, err := http.NewRequest(method, base+path, nil)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	httpClient := client
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	res, err := httpClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	out := jsonListResult{status: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&out.body)
	return out
}

// Integration test — skipped unless DATABASE_URL is set.
func TestContentCatalogSeed(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")
	t.Setenv("RUN_CONTENT_SEED", "true")

	ctx := context.Background()
	svc, err := Open(ctx, config.Load())
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

	res, err := http.Get(ts.URL + "/api/content/catalog")
	if err != nil {
		t.Fatalf("catalog get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("catalog status: %d", res.StatusCode)
	}
	var catalog []map[string]any
	if err := json.NewDecoder(res.Body).Decode(&catalog); err != nil {
		t.Fatalf("decode catalog: %v", err)
	}
	if len(catalog) == 0 {
		t.Fatal("expected non-empty content catalog after RUN_CONTENT_SEED")
	}
}
