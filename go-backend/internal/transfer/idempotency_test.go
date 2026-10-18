package transfer

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockTransferService struct {
	mu           sync.Mutex
	transactions map[string]*TransferResponse
	txRequests   map[string]TransferRequest
	debitCount   int
}

func newMockTransferService() *mockTransferService {
	return &mockTransferService{
		transactions: make(map[string]*TransferResponse),
		txRequests:   make(map[string]TransferRequest),
	}
}

func (m *mockTransferService) Inquiry(ctx context.Context, userIDStr string, req InquiryRequest) (*InquiryResponse, error) {
	return &InquiryResponse{
		SourceAccountID:     req.SourceAccountID,
		TargetAccountNumber: req.TargetAccountNumber,
		RecipientName:       "B*** S******",
		BankCode:            "108",
		BankName:            "HiBank",
		Fee:                 0,
	}, nil
}

func (m *mockTransferService) ExecuteTransfer(ctx context.Context, userIDStr, idempotencyKey string, req TransferRequest) (*TransferResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if idempotencyKey == "" {
		return nil, ErrMissingIdempotencyKey
	}

	if req.Amount > 25000000 {
		return nil, ErrDailyLimitExceeded
	}

	// Check if already executed with this idempotency key
	if existingResp, exists := m.transactions[idempotencyKey]; exists {
		prevReq := m.txRequests[idempotencyKey]
		// If payload differs (different amount or source account), return conflict
		if prevReq.Amount != req.Amount || prevReq.SourceAccountID != req.SourceAccountID || prevReq.TargetAccountNumber != req.TargetAccountNumber {
			return nil, ErrIdempotencyConflict
		}
		// Idempotent replay: return identical response without incrementing debit count
		return existingResp, nil
	}

	m.debitCount++
	resp := &TransferResponse{
		TransactionID:       "tx-idempotency-123",
		ReferenceNumber:     "TRF-20261017-000001",
		SourceAccountID:     req.SourceAccountID,
		SourceAccountNumber: "1081112223",
		TargetAccountID:     "acc-target-456",
		TargetAccountNumber: req.TargetAccountNumber,
		RecipientName:       "B*** S******",
		Amount:              req.Amount,
		Fee:                 0,
		Status:              "SUCCESS",
		Notes:               req.Notes,
		CreatedAt:           time.Now(),
	}

	m.transactions[idempotencyKey] = resp
	m.txRequests[idempotencyKey] = req
	return resp, nil
}

func (m *mockTransferService) GetReceipt(ctx context.Context, userIDStr, txIDStr string) (*TransferResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, tx := range m.transactions {
		if tx.TransactionID == txIDStr {
			return tx, nil
		}
	}
	return nil, ErrTransferNotFound
}

func setupTestRouter(svc ServiceInterface, middlewares ...func(http.Handler) http.Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := auth.WithUserID(req.Context(), "00000000-0000-0000-0000-000000000001")
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	handler := NewHandler(svc)
	handler.RegisterRoutes(r, middlewares...)
	return r
}

func TestTransfer_IdempotencyReplay(t *testing.T) {
	svc := newMockTransferService()
	router := setupTestRouter(svc)

	idempotencyKey := "idem-test-replay-key-001"
	reqBody, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
		TargetAccountNumber: "1088291040",
		Amount:              50000,
		PIN:                 "123456",
		Notes:               "Pembayaran kopi",
	})

	// First Request: Successfully executes transfer
	req1 := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(reqBody))
	req1.Header.Set("Idempotency-Key", idempotencyKey)
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)

	assert.Equal(t, http.StatusCreated, rec1.Code)
	var resp1 TransferResponse
	err := json.Unmarshal(rec1.Body.Bytes(), &resp1)
	require.NoError(t, err)
	assert.Equal(t, "TRF-20261017-000001", resp1.ReferenceNumber)
	assert.Equal(t, int64(50000), resp1.Amount)
	assert.Equal(t, 1, svc.debitCount, "balance should be debited once")

	// Second Request: Identical Idempotency-Key and payload (Replay)
	req2 := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(reqBody))
	req2.Header.Set("Idempotency-Key", idempotencyKey)
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	assert.Equal(t, http.StatusCreated, rec2.Code)
	var resp2 TransferResponse
	err = json.Unmarshal(rec2.Body.Bytes(), &resp2)
	require.NoError(t, err)
	assert.Equal(t, resp1.TransactionID, resp2.TransactionID)
	assert.Equal(t, resp1.ReferenceNumber, resp2.ReferenceNumber)
	assert.Equal(t, 1, svc.debitCount, "balance must NOT be debited again on idempotent replay")
}

func TestTransfer_IdempotencyConflict(t *testing.T) {
	svc := newMockTransferService()
	router := setupTestRouter(svc)

	idempotencyKey := "idem-test-conflict-key-002"
	reqBody1, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
		TargetAccountNumber: "1088291040",
		Amount:              50000,
		PIN:                 "123456",
	})

	// First Request: 50,000 IDR
	req1 := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(reqBody1))
	req1.Header.Set("Idempotency-Key", idempotencyKey)
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)
	assert.Equal(t, http.StatusCreated, rec1.Code)

	// Second Request: Same Idempotency-Key, but different amount (100,000 IDR) -> Conflict!
	reqBody2, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
		TargetAccountNumber: "1088291040",
		Amount:              100000, // differing amount
		PIN:                 "123456",
	})
	req2 := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(reqBody2))
	req2.Header.Set("Idempotency-Key", idempotencyKey)
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	assert.Equal(t, http.StatusConflict, rec2.Code)
	var errResp httpx.ErrorResponse
	err := json.Unmarshal(rec2.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "IDEMPOTENCY_CONFLICT", errResp.Error.Code)
	assert.Equal(t, 1, svc.debitCount, "conflicting request must not perform additional debit")
}

func TestTransfer_RateLimiter(t *testing.T) {
	svc := newMockTransferService()
	// Allow 2 requests per 500ms
	limiter := httpx.NewRateLimiter(2, 500*time.Millisecond, func(r *http.Request) string {
		return "user:00000000-0000-0000-0000-000000000001"
	})
	defer limiter.Close()

	router := setupTestRouter(svc, limiter.Middleware)

	// First 2 requests succeed
	for i := 1; i <= 2; i++ {
		body, _ := json.Marshal(TransferRequest{
			SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
			TargetAccountNumber: "1088291040",
			Amount:              50000,
			PIN:                 "123456",
		})
		req := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(body))
		req.Header.Set("Idempotency-Key", time.Now().Format(time.RFC3339Nano))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusCreated, rec.Code, "request %d should succeed", i)
	}

	// 3rd request exceeds limit -> 429
	body, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
		TargetAccountNumber: "1088291040",
		Amount:              50000,
		PIN:                 "123456",
	})
	reqBlocked := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(body))
	reqBlocked.Header.Set("Idempotency-Key", "blocked-key")
	recBlocked := httptest.NewRecorder()
	router.ServeHTTP(recBlocked, reqBlocked)

	assert.Equal(t, http.StatusTooManyRequests, recBlocked.Code)
	assert.NotEmpty(t, recBlocked.Header().Get("Retry-After"))

	var errResp httpx.ErrorResponse
	err := json.Unmarshal(recBlocked.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "RATE_LIMIT_EXCEEDED", errResp.Error.Code)
}

func TestTransfer_DailyLimitExceeded(t *testing.T) {
	svc := newMockTransferService()
	router := setupTestRouter(svc)

	body, _ := json.Marshal(TransferRequest{
		SourceAccountID:     "770e8400-e29b-41d4-a716-446655440001",
		TargetAccountNumber: "1088291040",
		Amount:              30000000, // Exceeds 25M daily limit
		PIN:                 "123456",
	})
	req := httptest.NewRequest(http.MethodPost, "/transfers", bytes.NewReader(body))
	req.Header.Set("Idempotency-Key", "daily-limit-key")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	var errResp httpx.ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, "DAILY_LIMIT_EXCEEDED", errResp.Error.Code)
}


