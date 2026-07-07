package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIPRateLimiterAllow(t *testing.T) {
	l := newIPRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !l.allow("1.2.3.4") {
			t.Fatalf("request %d should be allowed within the limit of 3", i)
		}
	}
	if l.allow("1.2.3.4") {
		t.Fatal("4th request should exceed the limit of 3")
	}
	// A distinct IP has its own independent budget.
	if !l.allow("5.6.7.8") {
		t.Fatal("a different IP should not be affected by another IP's limit")
	}
}

func TestIPRateLimiterWindowExpiry(t *testing.T) {
	l := newIPRateLimiter(1, 20*time.Millisecond)
	if !l.allow("1.2.3.4") {
		t.Fatal("first request should be allowed")
	}
	if l.allow("1.2.3.4") {
		t.Fatal("second request within the window should be rejected")
	}
	time.Sleep(30 * time.Millisecond)
	if !l.allow("1.2.3.4") {
		t.Fatal("request after the window elapsed should be allowed again")
	}
}

// TestIPRateLimiterSweepPrunesStaleIPs guards against limit.go's hits map
// growing forever with one entry per distinct source IP ever seen: once an
// IP's timestamps have all aged out of the window and enough time passes for
// a sweep to run, its entry must be pruned rather than lingering indefinitely.
func TestIPRateLimiterSweepPrunesStaleIPs(t *testing.T) {
	l := newIPRateLimiter(5, 10*time.Millisecond)
	for i := 0; i < 50; i++ {
		l.allow(string(rune('A' + i)))
	}

	l.mu.Lock()
	before := len(l.entries)
	l.mu.Unlock()
	if before != 50 {
		t.Fatalf("hits after 50 distinct IPs = %d, want 50", before)
	}

	time.Sleep(15 * time.Millisecond) // let every prior timestamp age out of the window

	// A request from a brand new IP should trigger sweepLocked (>= one window
	// has elapsed since the last sweep) and prune every stale entry, leaving
	// only the one just recorded.
	l.allow("fresh")

	l.mu.Lock()
	after := len(l.entries)
	l.mu.Unlock()
	if after != 1 {
		t.Fatalf("hits after sweep = %d, want 1 (only the fresh IP)", after)
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	l := newIPRateLimiter(2, time.Minute)
	calls := 0
	next := func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusOK)
	}
	h := rateLimit(next, l)

	req := httptest.NewRequest(http.MethodGet, "/new", nil)
	req.RemoteAddr = "9.9.9.9:1234"

	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		h(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d status = %d, want 200", i, w.Code)
		}
	}

	w := httptest.NewRecorder()
	h(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("3rd request status = %d, want 429", w.Code)
	}
	if calls != 2 {
		t.Fatalf("next handler called %d times, want 2 (3rd should be blocked before reaching it)", calls)
	}
}

func TestClientIP(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		want       string
	}{
		{"host and port", "1.2.3.4:5678", "1.2.3.4"},
		{"no port falls back to RemoteAddr verbatim", "not-a-host-port", "not-a-host-port"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tt.remoteAddr
			if got := clientIP(req); got != tt.want {
				t.Fatalf("clientIP(%q) = %q, want %q", tt.remoteAddr, got, tt.want)
			}
		})
	}
}
