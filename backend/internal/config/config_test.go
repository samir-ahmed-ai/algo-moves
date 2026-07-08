package config

import (
	"os"
	"testing"
)

func TestLoad(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("MAX_ROOMS", "100")
	os.Setenv("DATABASE_URL", "postgres://foo")
	os.Setenv("ALLOWED_ORIGINS", "http://localhost:3000, http://example.com ")
	defer os.Clearenv()

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected 9090, got %s", cfg.Port)
	}
	if cfg.MaxRooms != 100 {
		t.Errorf("expected 100, got %d", cfg.MaxRooms)
	}
	if cfg.DatabaseURL != "postgres://foo" {
		t.Errorf("expected postgres://foo, got %s", cfg.DatabaseURL)
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[1] != "http://example.com" {
		t.Errorf("unexpected allowed origins: %v", cfg.AllowedOrigins)
	}
	if cfg.WSRateLimit != 60 {
		t.Errorf("expected 60, got %d", cfg.WSRateLimit)
	}
}
