package user

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable"
	}

	cfg := &config.Config{
		DatabaseURL:       dbURL,
		DBMaxConns:        5,
		DBMinConns:        1,
		DBMaxConnIdleTime: 5 * time.Minute,
		DBMaxConnLifetime: 10 * time.Minute,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		t.Skipf("PostgreSQL database is not reachable, skipping integration test: %v", err)
	}

	return pool
}

func TestUserHandler_Unauthenticated(t *testing.T) {
	service := &Service{}
	handler := NewHandler(service)

	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	// 1. GET /users/me without user in context
	req := httptest.NewRequest(http.MethodGet, "/users/me", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)

	// 2. PUT /users/me/pin without user in context
	body, _ := json.Marshal(UpdatePINRequest{PIN: "123456"})
	reqPin := httptest.NewRequest(http.MethodPut, "/users/me/pin", bytes.NewReader(body))
	recPin := httptest.NewRecorder()
	r.ServeHTTP(recPin, reqPin)

	assert.Equal(t, http.StatusUnauthorized, recPin.Code)
}

func TestUserHandler_InvalidPINPayload(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()

	service := NewService(pool)
	handler := NewHandler(service)

	// Mock authenticated context with a dummy user ID
	mockAuthMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := auth.WithUserID(r.Context(), "00000000-0000-0000-0000-000000000001")
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}

	r := chi.NewRouter()
	r.Use(httpx.RequestID)
	r.Use(mockAuthMiddleware)
	handler.RegisterRoutes(r)

	testCases := []struct {
		name         string
		pin          string
		expectedCode int
		expectedErr  string
	}{
		{"Short PIN", "123", http.StatusBadRequest, "INVALID_PIN"},
		{"Long PIN", "1234567", http.StatusBadRequest, "INVALID_PIN"},
		{"Non-numeric PIN", "abcdef", http.StatusBadRequest, "INVALID_PIN"},
		{"Empty PIN", "", http.StatusBadRequest, "INVALID_PIN"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(UpdatePINRequest{PIN: tc.pin})
			req := httptest.NewRequest(http.MethodPut, "/users/me/pin", bytes.NewReader(body))
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			assert.Equal(t, tc.expectedCode, rec.Code)

			var errResp httpx.ErrorResponse
			err := json.Unmarshal(rec.Body.Bytes(), &errResp)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedErr, errResp.Error.Code)
		})
	}
}

