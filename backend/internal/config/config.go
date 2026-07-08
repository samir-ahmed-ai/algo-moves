package config

import (
	"log/slog"
	"os"
	"strconv"
)

// Config holds the application configuration.
type Config struct {
	Port        string
	MaxRooms    int
	DatabaseURL string
}

// Load reads configuration from the environment, applying defaults.
func Load() Config {
	cfg := Config{
		Port:     "8080",
		MaxRooms: 5000,
	}

	if p := os.Getenv("PORT"); p != "" {
		cfg.Port = p
	}

	if v := os.Getenv("MAX_ROOMS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.MaxRooms = n
		} else {
			slog.Warn("ignoring invalid MAX_ROOMS, using default", "value", v, "default", cfg.MaxRooms)
		}
	}

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")

	return cfg
}
