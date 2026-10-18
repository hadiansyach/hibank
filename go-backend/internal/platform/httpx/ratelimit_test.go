package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimiter_AllowAndBlock(t *testing.T) {
	// 5 requests per 100ms
	limiter := NewRateLimiter(5, 100*time.Millisecond)
	defer limiter.Close()

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Send 5 allowed requests
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "request %d should be allowed", i+1)
	}

	// 6th request should be blocked with 429
	reqBlocked := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
	recBlocked := httptest.NewRecorder()
	handler.ServeHTTP(recBlocked, reqBlocked)
	assert.Equal(t, http.StatusTooManyRequests, recBlocked.Code)
	assert.NotEmpty(t, recBlocked.Header().Get("Retry-After"))

	var errResp ErrorResponse
	err := json.Unmarshal(recBlocked.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "RATE_LIMIT_EXCEEDED", errResp.Error.Code)

	// Wait for refill
	time.Sleep(120 * time.Millisecond)

	// Next request should now succeed
	reqAfterRefill := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
	recAfterRefill := httptest.NewRecorder()
	handler.ServeHTTP(recAfterRefill, reqAfterRefill)
	assert.Equal(t, http.StatusOK, recAfterRefill.Code)
}

func TestRateLimiter_UserIsolation(t *testing.T) {
	// Rate limiter with header-based key extractor
	limiter := NewRateLimiter(2, 500*time.Millisecond, func(r *http.Request) string {
		return "user:" + r.Header.Get("X-User-ID")
	})
	defer limiter.Close()

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// User 1 exhausts quota
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
		req.Header.Set("X-User-ID", "user-111")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	}

	// User 1 gets 429
	reqU1 := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
	reqU1.Header.Set("X-User-ID", "user-111")
	recU1 := httptest.NewRecorder()
	handler.ServeHTTP(recU1, reqU1)
	assert.Equal(t, http.StatusTooManyRequests, recU1.Code)

	// User 2 should NOT be affected
	reqU2 := httptest.NewRequest(http.MethodPost, "/v1/transfers", nil)
	reqU2.Header.Set("X-User-ID", "user-222")
	recU2 := httptest.NewRecorder()
	handler.ServeHTTP(recU2, reqU2)
	assert.Equal(t, http.StatusOK, recU2.Code)
}

