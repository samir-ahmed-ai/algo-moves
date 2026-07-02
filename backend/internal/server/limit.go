package server

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// ipRateLimiter tracks request timestamps per client IP within a sliding window.
type ipRateLimiter struct {
	mu        sync.Mutex
	hits      map[string][]time.Time
	max       int
	window    time.Duration
	lastSweep time.Time
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

	// Opportunistically sweep out IPs with no requests inside the current
	// window, at most once per window. Without this, hits grows by one entry
	// per distinct source IP ever seen and is never pruned, even long after
	// that IP stops sending requests entirely.
	if now.Sub(l.lastSweep) >= l.window {
		l.sweepLocked(cutoff)
		l.lastSweep = now
	}

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

// sweepLocked removes every IP whose recorded hits are all older than cutoff.
// Callers must hold l.mu.
func (l *ipRateLimiter) sweepLocked(cutoff time.Time) {
	for ip, times := range l.hits {
		fresh := times[:0]
		for _, t := range times {
			if t.After(cutoff) {
				fresh = append(fresh, t)
			}
		}
		if len(fresh) == 0 {
			delete(l.hits, ip)
		} else {
			l.hits[ip] = fresh
		}
	}
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
