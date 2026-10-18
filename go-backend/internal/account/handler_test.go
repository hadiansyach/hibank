package account

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

func TestAccountHandler_Unauthenticated(t *testing.T) {
	service := &Service{}
	handler := NewHandler(service)

	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	// 1. POST /accounts without user in context
	reqPost := httptest.NewRequest(http.MethodPost, "/accounts", nil)
	recPost := httptest.NewRecorder()
	r.ServeHTTP(recPost, reqPost)
	assert.Equal(t, http.StatusUnauthorized, recPost.Code)

	// 2. GET /accounts without user in context
	reqGet := httptest.NewRequest(http.MethodGet, "/accounts", nil)
	recGet := httptest.NewRecorder()
	r.ServeHTTP(recGet, reqGet)
	assert.Equal(t, http.StatusUnauthorized, recGet.Code)

	// 3. GET /accounts/{id} without user in context
	reqDetail := httptest.NewRequest(http.MethodGet, "/accounts/00000000-0000-0000-0000-000000000001", nil)
	recDetail := httptest.NewRecorder()
	r.ServeHTTP(recDetail, reqDetail)
	assert.Equal(t, http.StatusUnauthorized, recDetail.Code)
}

func TestAccountHandler_InvalidAccountType(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()

	service := NewService(pool)
	handler := NewHandler(service)

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

	body, _ := json.Marshal(CreateAccountRequest{AccountType: "INVALID_CRYPTO_WALLET"})
	req := httptest.NewRequest(http.MethodPost, "/accounts", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var errResp httpx.ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "INVALID_ACCOUNT_TYPE", errResp.Error.Code)
}

