package user

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// Handler serves HTTP requests for the user module.
type Handler struct {
	service *Service
}

// NewHandler constructs a new user Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers user endpoints onto the provided chi.Router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/users", func(userRouter chi.Router) {
		userRouter.Get("/me", h.GetProfile)
		userRouter.Put("/me/pin", h.SetOrUpdatePIN)
	})
}

// GetProfile handles GET /v1/users/me.
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User profile not found", reqID)
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve user profile", reqID)
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, profile)
}

// SetOrUpdatePIN handles PUT /v1/users/me/pin.
func (h *Handler) SetOrUpdatePIN(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	userID, ok := auth.GetUserID(r.Context())
	if !ok || userID == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User identity not found in context", reqID)
		return
	}

	var req UpdatePINRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	resp, err := h.service.SetOrUpdatePIN(r.Context(), userID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPINFormat):
			httpx.WriteError(w, http.StatusBadRequest, "INVALID_PIN", "PIN must be exactly 6 numeric digits", reqID)
		case errors.Is(err, ErrOldPINRequired):
			httpx.WriteError(w, http.StatusBadRequest, "OLD_PIN_REQUIRED", "Current PIN or password is required to change PIN", reqID)
		case errors.Is(err, ErrPINMismatch):
			httpx.WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Incorrect current PIN or password", reqID)
		case errors.Is(err, ErrPINLocked):
			httpx.WriteError(w, http.StatusTooManyRequests, "PIN_LOCKED", "PIN is temporarily locked due to too many failed attempts (try again in 15 minutes)", reqID)
		case errors.Is(err, ErrUserNotFound):
			httpx.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to configure transaction PIN", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, resp)
}

