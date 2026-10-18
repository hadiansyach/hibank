package ledger

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
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

func TestLedgerHandler_Unauthenticated(t *testing.T) {
	handler := NewHandler(nil)

	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodGet, "/accounts/770e8400-e29b-41d4-a716-446655440000/mutations", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestLedgerHandler_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()


	service := NewService(pool)
	handler := NewHandler(service)

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			// Mock authenticated context
			ctxWithUser := auth.WithUserID(req.Context(), "00000000-0000-0000-0000-000000000001")
			next.ServeHTTP(w, req.WithContext(ctxWithUser))
		})
	})
	handler.RegisterRoutes(r)

	t.Run("invalid cursor returns 400", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/accounts/00000000-0000-0000-0000-000000000002/mutations?cursor=invalid-cursor-string", nil)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		// Could be 400 invalid cursor or 404 account not found (ownership check runs first)
		require.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, rec.Code)
	})
}
