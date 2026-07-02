package server

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// ipRateLimiter tracks request timestamps per client IP within a sliding window.
type ipRateLimiter struct {
	mu      sync.Mutex
	hits    map[string][]time.Time
	max     int
	window  time.Duration
}

func newIPRateLimiter(max int, window time.Duration) *ipRateLimiter {
	return &ipRateLimiter{
		hits:   make(map[string][]time.Time),
		max:    max,
		window: window,
	}
}

func (l *ipRateLimiter) allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	prev := l.hits[ip]
	kept := prev[:0]
	for _, t := range prev {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.max {
		l.hits[ip] = kept
		return false
	}
	l.hits[ip] = append(kept, now)
	return true
}

func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

func rateLimit(next http.HandlerFunc, limiter *ipRateLimiter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if limiter != nil && !limiter.allow(clientIP(r)) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}
