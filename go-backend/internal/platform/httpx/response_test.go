package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	payload := map[string]string{"status": "ok"}

	err := WriteJSON(rec, http.StatusOK, payload)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "application/json; charset=utf-8", rec.Header().Get("Content-Type"))

	var body map[string]string
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "ok", body["status"])
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, http.StatusBadRequest, "INVALID_REQUEST", "invalid input payload", "req-12345")

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Equal(t, "application/json; charset=utf-8", rec.Header().Get("Content-Type"))

	var errResp ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "INVALID_REQUEST", errResp.Error.Code)
	assert.Equal(t, "invalid input payload", errResp.Error.Message)
	assert.Equal(t, "req-12345", errResp.Error.RequestID)
}

func TestMapDomainError(t *testing.T) {
	tests := []struct {
		err          error
		expectedCode int
		expectedSlug string
	}{
		{ErrNotFound, http.StatusNotFound, "NOT_FOUND"},
		{ErrUnauthorized, http.StatusUnauthorized, "UNAUTHORIZED"},
		{ErrForbidden, http.StatusForbidden, "FORBIDDEN"},
		{ErrInsufficientBalance, http.StatusUnprocessableEntity, "INSUFFICIENT_BALANCE"},
		{ErrIdempotencyConflict, http.StatusConflict, "IDEMPOTENCY_CONFLICT"},
		{ErrBadRequest, http.StatusBadRequest, "BAD_REQUEST"},
	}

	for _, tt := range tests {
		t.Run(tt.expectedSlug, func(t *testing.T) {
			statusCode, slug, _ := MapDomainError(tt.err)
			assert.Equal(t, tt.expectedCode, statusCode)
			assert.Equal(t, tt.expectedSlug, slug)
		})
	}
}

func TestRequestIDMiddleware(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	respReqID := rec.Header().Get(HeaderRequestID)
	assert.NotEmpty(t, respReqID)
}

func TestRecoveryMiddleware(t *testing.T) {
	handler := Recovery(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		panic("unexpected crash")
	}))

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	rec := httptest.NewRecorder()

	assert.NotPanics(t, func() {
		handler.ServeHTTP(rec, req)
	})

	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "INTERNAL_SERVER_ERROR", errResp.Error.Code)
}
