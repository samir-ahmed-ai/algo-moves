package server

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ipLimiterEntry struct {
	lim      *rate.Limiter
	lastSeen time.Time
}

// ipRateLimiter tracks per-IP token buckets (golang.org/x/time/rate).
type ipRateLimiter struct {
	mu        sync.Mutex
	entries   map[string]*ipLimiterEntry
	limit     rate.Limit
	burst     int
	window    time.Duration
	lastSweep time.Time
}

func newIPRateLimiter(max int, window time.Duration) *ipRateLimiter {
	if max < 1 {
		max = 1
	}
	return &ipRateLimiter{
		entries: make(map[string]*ipLimiterEntry),
		limit:   rate.Every(window / time.Duration(max)),
		burst:   max,
		window:  window,
	}
}

func (l *ipRateLimiter) allow(ip string) bool {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastSweep) >= l.window {
		l.sweepLocked(now)
		l.lastSweep = now
	}

	entry, ok := l.entries[ip]
	if !ok {
		entry = &ipLimiterEntry{
			lim:      rate.NewLimiter(l.limit, l.burst),
			lastSeen: now,
		}
		l.entries[ip] = entry
	}
	entry.lastSeen = now
	return entry.lim.Allow()
}

// sweepLocked removes IPs idle longer than the limiter window.
func (l *ipRateLimiter) sweepLocked(now time.Time) {
	for ip, entry := range l.entries {
		if now.Sub(entry.lastSeen) >= l.window {
			delete(l.entries, ip)
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
