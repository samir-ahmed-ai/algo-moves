// Interview API routes inherit corsAPI origin checks and per-IP rate limits
// (see server.go). These tests verify the allowlist and token lookup budget.
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInterviewAPIOriginRejectedWhenAllowlisted(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://good.example")
	mux := http.NewServeMux()
	mux.Handle("/api/", corsAPI([]string{"https://good.example"}, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))
	ts := httptest.NewServer(mux)
	defer ts.Close()

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/interviews/token/abc", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET token: %v", err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("missing Origin status = %d, want 403", res.StatusCode)
	}

	req2, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/interviews/token/abc", nil)
	req2.Header.Set("Origin", "https://good.example")
	res2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatalf("GET token with origin: %v", err)
	}
	res2.Body.Close()
	if res2.StatusCode != http.StatusOK {
		t.Fatalf("allowed Origin status = %d, want 200", res2.StatusCode)
	}
}

func TestInterviewTokenLookupRateLimit(t *testing.T) {
	allowed := []string{"https://good.example"}
	mux := http.NewServeMux()
	mux.Handle("/api/", corsAPI(allowed, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))
	ts := httptest.NewServer(mux)
	defer ts.Close()

	for i := 0; i < 31; i++ {
		req, _ := http.NewRequest(http.MethodGet, ts.URL+"/api/interviews/token/abc", nil)
		req.Header.Set("Origin", "https://good.example")
		req.RemoteAddr = "10.0.0.1:1234"
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request %d: %v", i, err)
		}
		res.Body.Close()
		if i < 30 && res.StatusCode != http.StatusOK {
			t.Fatalf("request %d status = %d, want 200", i, res.StatusCode)
		}
		if i == 30 && res.StatusCode != http.StatusTooManyRequests {
			t.Fatalf("request 31 status = %d, want 429", res.StatusCode)
		}
	}
}
