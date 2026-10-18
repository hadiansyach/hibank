package httpx

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/hibank/bank-a/internal/platform/logger"
)

type clientBucket struct {
	tokens     float64
	lastRefill time.Time
}

// KeyExtractor extracts a unique client identification string for rate limiting (e.g. IP or User ID).
type KeyExtractor func(r *http.Request) string

// RateLimiter implements a thread-safe token bucket rate limiter per client key (UserID or IP).
type RateLimiter struct {
	mu           sync.Mutex
	capacity     float64
	refillRate   float64 // tokens per second
	buckets      map[string]*clientBucket
	stopCh       chan struct{}
	keyExtractor KeyExtractor
}

// DefaultIPKeyExtractor extracts client IP from request.
func DefaultIPKeyExtractor(r *http.Request) string {
	return "ip:" + ExtractClientIP(r)
}

// NewRateLimiter constructs a new RateLimiter.
// maxRequests: maximum burst capacity.
// per: time duration within which maxRequests tokens are replenished.
// keyExtractors: optional key extractor function. If omitted or nil, DefaultIPKeyExtractor is used.
func NewRateLimiter(maxRequests int, per time.Duration, keyExtractors ...KeyExtractor) *RateLimiter {
	refillRate := float64(maxRequests) / per.Seconds()
	var keyExtractor KeyExtractor = DefaultIPKeyExtractor
	if len(keyExtractors) > 0 && keyExtractors[0] != nil {
		keyExtractor = keyExtractors[0]
	}

	rl := &RateLimiter{
		capacity:     float64(maxRequests),
		refillRate:   refillRate,
		buckets:      make(map[string]*clientBucket),
		stopCh:       make(chan struct{}),
		keyExtractor: keyExtractor,
	}

	// Background garbage collection routine to evict stale buckets
	go rl.cleanupLoop(per * 2)

	return rl
}

// Close stops the background cleanup routine.
func (rl *RateLimiter) Close() {
	close(rl.stopCh)
}

func (rl *RateLimiter) allow(key string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	bucket, exists := rl.buckets[key]
	if !exists {
		rl.buckets[key] = &clientBucket{
			tokens:     rl.capacity - 1,
			lastRefill: now,
		}
		return true, 0
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(bucket.lastRefill).Seconds()
	bucket.tokens += elapsed * rl.refillRate
	if bucket.tokens > rl.capacity {
		bucket.tokens = rl.capacity
	}
	bucket.lastRefill = now

	if bucket.tokens >= 1 {
		bucket.tokens -= 1
		return true, 0
	}

	// Calculate wait time until at least 1 token is available
	missingTokens := 1.0 - bucket.tokens
	retryAfterSec := missingTokens / rl.refillRate
	return false, time.Duration(retryAfterSec * float64(time.Second))
}

func (rl *RateLimiter) cleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-rl.stopCh:
			return
		case now := <-ticker.C:
			rl.mu.Lock()
			for k, b := range rl.buckets {
				if now.Sub(b.lastRefill) > interval {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}
}

// Middleware returns an HTTP middleware enforcing rate limits.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := logger.GetRequestID(r.Context())

		key := rl.keyExtractor(r)

		allowed, retryAfter := rl.allow(key)
		if !allowed {
			retrySeconds := int(retryAfter.Seconds()) + 1
			w.Header().Set("Retry-After", fmt.Sprintf("%d", retrySeconds))
			WriteError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Terlalu banyak permintaan. Silakan tunggu beberapa saat.", reqID)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ExtractClientIP extracts the IP address from headers or RemoteAddr.
func ExtractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	idx := strings.LastIndex(r.RemoteAddr, ":")
	if idx != -1 {
		return r.RemoteAddr[:idx]
	}
	return r.RemoteAddr
}

