package server

import (
	"net/http"
	"strings"
)

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
	// Credentialed requests (SCS cookies) require a reflected origin — never "*".
	if len(allowed) == 0 {
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Add("Vary", "Origin")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		return
	}
	if originAllowed(origin, allowed) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Add("Vary", "Origin")
	}
}
