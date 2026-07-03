package arcade

import (
	"context"
	"encoding/json"
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
