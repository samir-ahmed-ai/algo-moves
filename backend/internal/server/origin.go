package server

import (
	"net/http"
	"os"
	"strings"
)

// allowedOriginsFromEnv reads ALLOWED_ORIGINS (comma-separated). An empty value
// means allow any origin — the LAN-dev default.
func allowedOriginsFromEnv() []string {
	raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if o := strings.TrimSpace(p); o != "" {
			out = append(out, o)
		}
	}
	return out
}

func originAllowed(origin string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	if origin == "" {
		return false
	}
	for _, a := range allowed {
		if strings.EqualFold(origin, a) {
			return true
		}
	}
	return false
}

func setCORS(w http.ResponseWriter, origin string, allowed []string) {
	if len(allowed) == 0 {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		return
	}
	if originAllowed(origin, allowed) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Add("Vary", "Origin")
	}
}
