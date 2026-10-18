package transfer

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// ServiceInterface defines the business operations required by the transfer Handler.
type ServiceInterface interface {
	Inquiry(ctx context.Context, userIDStr string, req InquiryRequest) (*InquiryResponse, error)
	ExecuteTransfer(ctx context.Context, userIDStr, idempotencyKey string, req TransferRequest) (*TransferResponse, error)
	GetReceipt(ctx context.Context, userIDStr, txIDStr string) (*TransferResponse, error)
}

// Handler serves HTTP requests for the bank transfer module.
type Handler struct {
	service ServiceInterface
}

// NewHandler constructs a new transfer Handler.
func NewHandler(service ServiceInterface) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers transfer routes onto the provided chi.Router.
func (h *Handler) RegisterRoutes(r chi.Router, transferMiddlewares ...func(http.Handler) http.Handler) {
	r.Route("/transfers", func(tr chi.Router) {
		tr.Post("/inquiry", h.Inquiry)
		if len(transferMiddlewares) > 0 {
			tr.With(transferMiddlewares...).Post("/", h.ExecuteTransfer)
		} else {
			tr.Post("/", h.ExecuteTransfer)
		}
		tr.Get("/{id}", h.GetReceipt)
	})
}

// Inquiry handles POST /v1/transfers/inquiry.
func (h *Handler) Inquiry(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req InquiryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	resp, err := h.service.Inquiry(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidAccountNumber):
			httpx.WriteError(w, http.StatusBadRequest, "INVALID_ACCOUNT_NUMBER", "Format nomor rekening tujuan tidak valid", reqID)
		case errors.Is(err, ErrSourceAccountNotFound):
			httpx.WriteError(w, http.StatusNotFound, "SOURCE_ACCOUNT_NOT_FOUND", "Rekening sumber tidak ditemukan", reqID)
		case errors.Is(err, ErrTargetAccountNotFound):
			httpx.WriteError(w, http.StatusNotFound, "TARGET_ACCOUNT_NOT_FOUND", "Nomor rekening tujuan tidak ditemukan", reqID)
		case errors.Is(err, ErrSameAccountTransfer):
			httpx.WriteError(w, http.StatusBadRequest, "SAME_ACCOUNT_TRANSFER", "Tidak dapat melakukan transfer ke rekening yang sama", reqID)
		case errors.Is(err, ErrAccountInactive):
			httpx.WriteError(w, http.StatusBadRequest, "ACCOUNT_INACTIVE", "Rekening sumber atau tujuan tidak aktif", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Gagal memproses inkuiri transfer", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, resp)
}

// ExecuteTransfer handles POST /v1/transfers.
func (h *Handler) ExecuteTransfer(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	// 1. Enforce Idempotency-Key Header
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		httpx.WriteError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Header Idempotency-Key wajib disertakan untuk transaksi transfer", reqID)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	resp, err := h.service.ExecuteTransfer(r.Context(), userID, idempotencyKey, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidAmount):
			httpx.WriteError(w, http.StatusBadRequest, "INVALID_AMOUNT", "Nominal transfer minimum adalah Rp 10.000", reqID)
		case errors.Is(err, ErrInvalidPIN):
			httpx.WriteError(w, http.StatusUnauthorized, "INVALID_PIN", "PIN transaksi salah", reqID)
		case errors.Is(err, ErrPINNotConfigured):
			httpx.WriteError(w, http.StatusBadRequest, "PIN_NOT_CONFIGURED", "PIN transaksi belum dibuat. Silakan atur PIN transaksi terlebih dahulu", reqID)
		case errors.Is(err, ErrPINLocked):
			httpx.WriteError(w, http.StatusTooManyRequests, "PIN_LOCKED", "PIN transaksi diblokir sementara karena 3x salah input. Silakan coba 15 menit lagi", reqID)
		case errors.Is(err, ErrInsufficientBalance):
			httpx.WriteError(w, http.StatusBadRequest, "INSUFFICIENT_BALANCE", "Saldo rekening sumber tidak mencukupi", reqID)
		case errors.Is(err, ErrSourceAccountNotFound):
			httpx.WriteError(w, http.StatusNotFound, "SOURCE_ACCOUNT_NOT_FOUND", "Rekening sumber tidak ditemukan", reqID)
		case errors.Is(err, ErrTargetAccountNotFound):
			httpx.WriteError(w, http.StatusNotFound, "TARGET_ACCOUNT_NOT_FOUND", "Nomor rekening tujuan tidak ditemukan", reqID)
		case errors.Is(err, ErrSameAccountTransfer):
			httpx.WriteError(w, http.StatusBadRequest, "SAME_ACCOUNT_TRANSFER", "Tidak dapat melakukan transfer ke rekening yang sama", reqID)
		case errors.Is(err, ErrAccountInactive):
			httpx.WriteError(w, http.StatusBadRequest, "ACCOUNT_INACTIVE", "Rekening sumber atau tujuan tidak aktif", reqID)
		case errors.Is(err, ErrDailyLimitExceeded):
			httpx.WriteError(w, http.StatusBadRequest, "DAILY_LIMIT_EXCEEDED", "Batas akumulasi transfer harian per rekening terlampaui (maksimal Rp 25.000.000 per hari)", reqID)
		case errors.Is(err, ErrIdempotencyConflict):
			httpx.WriteError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency key sudah digunakan dengan parameter transaksi berbeda", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Gagal memproses transaksi transfer", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusCreated, resp)
}

// GetReceipt handles GET /v1/transfers/{id}.
func (h *Handler) GetReceipt(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	txID := chi.URLParam(r, "id")
	if txID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Transaction ID is required", reqID)
		return
	}

	resp, err := h.service.GetReceipt(r.Context(), userID, txID)
	if err != nil {
		if errors.Is(err, ErrTransferNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "TRANSFER_NOT_FOUND", "Bukti transfer tidak ditemukan atau akses ditolak", reqID)
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Gagal mengambil bukti transfer", reqID)
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, resp)
}

