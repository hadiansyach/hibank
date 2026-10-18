package transfer

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTransferHandler_Unauthenticated(t *testing.T) {
	handler := NewHandler(nil)
	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	// 1. Inquiry unauthenticated
	reqInq := httptest.NewRequest(http.MethodPost, "/transfers/inquiry", bytes.NewBufferString("{}"))
	recInq := httptest.NewRecorder()
	r.ServeHTTP(recInq, reqInq)
	assert.Equal(t, http.StatusUnauthorized, recInq.Code)

	// 2. Transfer unauthenticated
	reqTrf := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewBufferString("{}"))
	recTrf := httptest.NewRecorder()
	r.ServeHTTP(recTrf, reqTrf)
	assert.Equal(t, http.StatusUnauthorized, recTrf.Code)

	// 3. Receipt unauthenticated
	reqRec := httptest.NewRequest(http.MethodGet, "/transfers/770e8400-e29b-41d4-a716-446655440000", nil)
	recRec := httptest.NewRecorder()
	r.ServeHTTP(recRec, reqRec)
	assert.Equal(t, http.StatusUnauthorized, recRec.Code)
}

func TestTransferHandler_MissingIdempotencyKey(t *testing.T) {
	handler := NewHandler(nil)
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := auth.WithUserID(req.Context(), "00000000-0000-0000-0000-000000000001")
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	handler.RegisterRoutes(r)

	body, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440000",
		TargetAccountNumber: "1088291040",
		Amount:              50000,
		PIN:                 "123456",
	})
	req := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(body))
	// Notice: NO Idempotency-Key header set
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var errResp httpx.ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "MISSING_IDEMPOTENCY_KEY", errResp.Error.Code)
}

func TestTransferHandler_InvalidJSON(t *testing.T) {
	handler := NewHandler(nil)
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := auth.WithUserID(req.Context(), "00000000-0000-0000-0000-000000000001")
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	handler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodPost, "/transfers/inquiry", bytes.NewBufferString("{invalid_json}"))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var errResp httpx.ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "INVALID_JSON", errResp.Error.Code)
}
