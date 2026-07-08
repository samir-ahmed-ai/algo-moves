package auth

import (
	"net/http"
	"testing"
)

func TestCrossSiteCookiesEnabled(t *testing.T) {
	tests := []struct {
		name     string
		env      map[string]string
		expected bool
	}{
		{
			name: "local dev defaults",
			env: map[string]string{
				"ALLOWED_ORIGINS":   "",
				"COOKIE_CROSS_SITE": "",
			},
			expected: false,
		},
		{
			name: "production allowlist",
			env: map[string]string{
				"ALLOWED_ORIGINS":   "https://algomove.up.railway.app",
				"COOKIE_CROSS_SITE": "",
			},
			expected: true,
		},
		{
			name: "explicit override",
			env: map[string]string{
				"ALLOWED_ORIGINS":   "",
				"COOKIE_CROSS_SITE": "true",
			},
			expected: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for k, v := range tt.env {
				t.Setenv(k, v)
			}
			if got := crossSiteCookiesEnabled(); got != tt.expected {
				t.Fatalf("crossSiteCookiesEnabled() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestSessionCookieFlagsFromEnv(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://algomove.up.railway.app")
	t.Setenv("COOKIE_CROSS_SITE", "")

	sm, db, err := newSessionManager("postgres://unused")
	if err != nil {
		t.Fatalf("newSessionManager: %v", err)
	}
	defer db.Close()

	if sm.Cookie.SameSite != http.SameSiteNoneMode {
		t.Fatalf("SameSite = %v, want None", sm.Cookie.SameSite)
	}
	if !sm.Cookie.Secure {
		t.Fatal("Secure = false, want true")
	}
}

func TestSessionCookieFlagsLocalDev(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "")
	t.Setenv("COOKIE_CROSS_SITE", "")

	sm, db, err := newSessionManager("postgres://unused")
	if err != nil {
		t.Fatalf("newSessionManager: %v", err)
	}
	defer db.Close()

	if sm.Cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("SameSite = %v, want Lax", sm.Cookie.SameSite)
	}
	if sm.Cookie.Secure {
		t.Fatal("Secure = true, want false")
	}
}
