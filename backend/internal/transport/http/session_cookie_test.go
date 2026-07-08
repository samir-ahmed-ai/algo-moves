package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"algomoves/gameserver/internal/app"
	"algomoves/gameserver/internal/config"

	"algomoves.dev/realtime/hub"
)

// Integration test — skipped unless DATABASE_URL is set.
func TestGuestSessionCookieCrossSite(t *testing.T) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	t.Setenv("DATABASE_URL", url)
	t.Setenv("RUN_MIGRATIONS", "true")
	t.Setenv("ALLOWED_ORIGINS", "https://app.example.com")
	t.Setenv("COOKIE_CROSS_SITE", "")

	ctx := context.Background()
	app, err := app.Open(ctx, config.Load())
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if app == nil || !app.Enabled() {
		t.Fatal("expected enabled arcade service")
	}
	defer app.Close()

	ts := httptest.NewServer(Handler(hub.New(), app, config.Config{WSRateLimit: 60, APIRateLimit: 120, TokenRateLimit: 30, NewRoomRateLimit: 20}))
	defer ts.Close()

	req, err := http.NewRequest(http.MethodPost, ts.URL+"/api/auth/guest", nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Origin", "https://app.example.com")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("guest: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("guest status: %d", res.StatusCode)
	}

	setCookie := res.Header.Get("Set-Cookie")
	if !strings.Contains(setCookie, "algomoves_session=") {
		t.Fatalf("Set-Cookie missing session name: %q", setCookie)
	}
	if !strings.Contains(setCookie, "SameSite=None") {
		t.Fatalf("Set-Cookie missing SameSite=None: %q", setCookie)
	}
	if !strings.Contains(setCookie, "Secure") {
		t.Fatalf("Set-Cookie missing Secure: %q", setCookie)
	}
}
