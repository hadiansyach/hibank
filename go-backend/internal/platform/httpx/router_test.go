package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockReadinessChecker struct {
	err error
}

func (m *mockReadinessChecker) Ping(_ context.Context) error {
	return m.err
}

func TestRouter_Healthz(t *testing.T) {
	cfg := &config.Config{
		AppName: "bank-a-test",
		AppPort: "8080",
	}

	router := NewRouter(RouterOptions{
		Config: cfg,
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var resp HealthResponse
	err := json.Unmarshal(rec.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "ok", resp.Status)
	assert.Equal(t, "bank-a-test", resp.Service)
}

func TestRouter_Readyz_Success(t *testing.T) {
	cfg := &config.Config{
		AppName: "bank-a-test",
		AppPort: "8080",
	}

	checker := &mockReadinessChecker{err: nil}
	router := NewRouter(RouterOptions{
		Config:           cfg,
		ReadinessChecker: checker,
	})

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var resp ReadyResponse
	err := json.Unmarshal(rec.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "ready", resp.Status)
	assert.Equal(t, "up", resp.Database)
}

func TestRouter_Readyz_Failure(t *testing.T) {
	cfg := &config.Config{
		AppName: "bank-a-test",
		AppPort: "8080",
	}

	checker := &mockReadinessChecker{err: errors.New("db connection failure")}
	router := NewRouter(RouterOptions{
		Config:           cfg,
		ReadinessChecker: checker,
	})

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)

	var resp ReadyResponse
	err := json.Unmarshal(rec.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "unavailable", resp.Status)
	assert.Equal(t, "down", resp.Database)
}

func TestRouter_NotFound(t *testing.T) {
	cfg := &config.Config{AppName: "bank-a-test"}
	router := NewRouter(RouterOptions{Config: cfg})

	req := httptest.NewRequest(http.MethodGet, "/non-existent", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "NOT_FOUND", errResp.Error.Code)
}
