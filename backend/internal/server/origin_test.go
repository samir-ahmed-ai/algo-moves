package server

import (
	"net/http/httptest"
	"testing"
)

func TestAllowedOriginsFromEnv(t *testing.T) {
	tests := []struct {
		name string
		env  string
		want []string
	}{
		{"unset", "", nil},
		{"whitespace only", "   ", nil},
		{"single origin", "https://a.example", []string{"https://a.example"}},
		{
			"multiple with spacing",
			" https://a.example, https://b.example ,https://c.example",
			[]string{"https://a.example", "https://b.example", "https://c.example"},
		},
		{"drops empty entries", "https://a.example,,https://b.example", []string{"https://a.example", "https://b.example"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("ALLOWED_ORIGINS", tt.env)
			got := allowedOriginsFromEnv()
			if len(got) != len(tt.want) {
				t.Fatalf("allowedOriginsFromEnv(%q) = %v, want %v", tt.env, got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Fatalf("allowedOriginsFromEnv(%q) = %v, want %v", tt.env, got, tt.want)
				}
			}
		})
	}
}

func TestOriginAllowed(t *testing.T) {
	tests := []struct {
		name    string
		origin  string
		allowed []string
		want    bool
	}{
		{"empty allowlist permits any origin", "https://evil.example", nil, true},
		{"empty allowlist permits empty origin", "", nil, true},
		{"configured allowlist rejects empty origin", "", []string{"https://a.example"}, false},
		{"configured allowlist accepts exact match", "https://a.example", []string{"https://a.example"}, true},
		{"configured allowlist rejects mismatch", "https://evil.example", []string{"https://a.example"}, false},
		{"match is case-insensitive", "HTTPS://A.EXAMPLE", []string{"https://a.example"}, true},
		{"multiple entries, second matches", "https://b.example", []string{"https://a.example", "https://b.example"}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := originAllowed(tt.origin, tt.allowed); got != tt.want {
				t.Fatalf("originAllowed(%q, %v) = %v, want %v", tt.origin, tt.allowed, got, tt.want)
			}
		})
	}
}

func TestSetCORS(t *testing.T) {
	t.Run("no allowlist reflects origin for credentialed requests", func(t *testing.T) {
		w := httptest.NewRecorder()
		setCORS(w, "https://anything.example", nil)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://anything.example" {
			t.Fatalf("Access-Control-Allow-Origin = %q, want https://anything.example", got)
		}
		if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
			t.Fatalf("Access-Control-Allow-Credentials = %q, want true", got)
		}
		if got := w.Header().Get("Vary"); got != "Origin" {
			t.Fatalf("Vary = %q, want Origin", got)
		}
	})

	t.Run("no allowlist and no origin sets wildcard", func(t *testing.T) {
		w := httptest.NewRecorder()
		setCORS(w, "", nil)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
			t.Fatalf("Access-Control-Allow-Origin = %q, want *", got)
		}
		if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "" {
			t.Fatalf("Access-Control-Allow-Credentials = %q, want empty when wildcard is used", got)
		}
	})

	t.Run("allowlist echoes matching origin with Vary", func(t *testing.T) {
		w := httptest.NewRecorder()
		allowed := []string{"https://a.example"}
		setCORS(w, "https://a.example", allowed)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://a.example" {
			t.Fatalf("Access-Control-Allow-Origin = %q, want https://a.example", got)
		}
		if got := w.Header().Get("Vary"); got != "Origin" {
			t.Fatalf("Vary = %q, want Origin", got)
		}
		if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
			t.Fatalf("Access-Control-Allow-Credentials = %q, want true", got)
		}
	})

	t.Run("allowlist omits header for a non-matching origin", func(t *testing.T) {
		w := httptest.NewRecorder()
		allowed := []string{"https://a.example"}
		setCORS(w, "https://evil.example", allowed)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("Access-Control-Allow-Origin = %q, want empty for a disallowed origin", got)
		}
	})
}
