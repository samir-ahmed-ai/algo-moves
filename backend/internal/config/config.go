package config

import (
	"log/slog"
	"os"
	"strings"
	"strconv"
)

// Config holds the application configuration.
type Config struct {
	Port        string
	MaxRooms    int
	DatabaseURL string
	AllowedOrigins []string
	WSRateLimit int
	NewRoomRateLimit int
	APIRateLimit int
	TokenRateLimit int
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

	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		for _, o := range strings.Split(origins, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				o = strings.TrimSuffix(o, "/")
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
			}
		}
	}

	cfg.WSRateLimit = 60
	cfg.NewRoomRateLimit = 20
	cfg.APIRateLimit = 120
	cfg.TokenRateLimit = 30


	return cfg
}
