package ledger

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// Handler serves HTTP endpoints for financial ledger and mutation history.
type Handler struct {
	service *Service
}

// NewHandler constructs a new ledger Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers ledger-related routes on the given chi.Router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/accounts/{id}/mutations", h.GetAccountMutations)
}

// GetAccountMutations handles GET /v1/accounts/{id}/mutations.
func (h *Handler) GetAccountMutations(w http.ResponseWriter, r *http.Request) {
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

	cursor := r.URL.Query().Get("cursor")

	var limit int32 = 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = int32(parsed)
		}
	}

	response, err := h.service.GetAccountMutations(r.Context(), userID, accountID, cursor, limit)
	if err != nil {
		switch {
		case errors.Is(err, ErrAccountNotFound):
			httpx.WriteError(w, http.StatusNotFound, "ACCOUNT_NOT_FOUND", "Account not found or access denied", reqID)
		case errors.Is(err, ErrInvalidCursor):
			httpx.WriteError(w, http.StatusBadRequest, "INVALID_CURSOR", "Malformed pagination cursor", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve account mutations", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, response)
}

