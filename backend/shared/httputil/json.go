package httputil

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// WriteJSON sends a JSON payload.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteErr sends a simple JSON error object.
func WriteErr(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}

// LogAndWriteErr logs the internal error structuredly and returns a safe public message.
func LogAndWriteErr(w http.ResponseWriter, err error, status int, publicMsg string, args ...any) {
	slog.Error("http handler error", append([]any{"error", err, "status", status}, args...)...)
	WriteErr(w, status, publicMsg)
}
