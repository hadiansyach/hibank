package account

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// Handler serves HTTP requests for the bank accounts module.
type Handler struct {
	service *Service
}

// NewHandler constructs a new account Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers account endpoints onto the provided chi.Router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/accounts", func(accRouter chi.Router) {
		accRouter.Post("/", h.CreateAccount)
		accRouter.Get("/", h.GetAccounts)
		accRouter.Get("/{id}", h.GetAccountDetail)
	})
}

// CreateAccount handles POST /v1/accounts.
func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	// OWASP API4: Restrict request body size to maximum 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	account, err := h.service.CreateAccount(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidAccountType):
			httpx.WriteError(w, http.StatusBadRequest, "INVALID_ACCOUNT_TYPE", "Invalid account type, must be SAVINGS or CHECKING", reqID)
		case errors.Is(err, ErrAccountLimitExceeded):
			httpx.WriteError(w, http.StatusConflict, "ACCOUNT_LIMIT_EXCEEDED", "Maximum number of accounts reached (maximum 3 accounts per customer)", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create new account", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusCreated, account)
}

// GetAccounts handles GET /v1/accounts.
func (h *Handler) GetAccounts(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	accounts, err := h.service.GetAccounts(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve accounts", reqID)
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, accounts)
}

// GetAccountDetail handles GET /v1/accounts/{id}.
func (h *Handler) GetAccountDetail(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	accountID := chi.URLParam(r, "id")
	if accountID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Account ID is required", reqID)
		return
	}

	account, err := h.service.GetAccountDetail(r.Context(), userID, accountID)
	if err != nil {
		if errors.Is(err, ErrAccountNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Account not found or access denied", reqID)
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve account detail", reqID)
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, account)
}

