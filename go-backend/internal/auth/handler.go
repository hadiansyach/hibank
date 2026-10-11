package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	phoneRegex = regexp.MustCompile(`^(\+62|62|0)8[1-9][0-9]{6,11}$`)
)

// Handler serves HTTP requests for the authentication module.
type Handler struct {
	service *Service
}

// NewHandler constructs a new auth Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers auth endpoints into the provided chi.Router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(authRouter chi.Router) {
		authRouter.Post("/register", h.Register)
		authRouter.Post("/login", h.Login)
		authRouter.Post("/refresh", h.Refresh)
		authRouter.Post("/logout", h.Logout)
	})
}

// Register handles user registration.
// POST /v1/auth/register
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	var details []string
	req.FullName = strings.TrimSpace(req.FullName)
	if len(req.FullName) < 2 || len(req.FullName) > 100 {
		details = append(details, "full_name must be between 2 and 100 characters")
	}

	req.Email = strings.TrimSpace(req.Email)
	if !emailRegex.MatchString(req.Email) {
		details = append(details, "email format is invalid")
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if !phoneRegex.MatchString(req.Phone) {
		details = append(details, "phone must be a valid Indonesian mobile number (e.g. 081234567890)")
	}

	if len(req.Password) < 8 {
		details = append(details, "password must be at least 8 characters long")
	}

	if len(details) > 0 {
		httpx.WriteErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_FAILED", "Invalid registration fields", reqID, details)
		return
	}

	user, err := h.service.Register(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailAlreadyExists):
			httpx.WriteError(w, http.StatusConflict, "EMAIL_ALREADY_EXISTS", "Email is already registered", reqID)
		case errors.Is(err, ErrPhoneAlreadyExists):
			httpx.WriteError(w, http.StatusConflict, "PHONE_ALREADY_EXISTS", "Phone number is already registered", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to register user", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusCreated, user)
}

// Login handles credentials validation and token issuance.
// POST /v1/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Request body contains invalid JSON", reqID)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.DeviceID = strings.TrimSpace(req.DeviceID)
	if req.DeviceID == "" {
		req.DeviceID = "generic-client"
	}

	if req.Email == "" || req.Password == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Email and password are required", reqID)
		return
	}

	tokens, err := h.service.Login(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			httpx.WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", reqID)
		case errors.Is(err, ErrAccountSuspended):
			httpx.WriteError(w, http.StatusForbidden, "ACCOUNT_SUSPENDED", "User account is suspended", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Authentication failed", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, tokens)
}

// Refresh handles session renewal and sliding window extension.
// POST /v1/auth/refresh
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	tokenStr := ""
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			tokenStr = strings.TrimSpace(parts[1])
		}
	}

	if tokenStr == "" && r.Body != nil {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			tokenStr = req.ExtractToken()
		}
	}

	if tokenStr == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Session token is required", reqID)
		return
	}

	session, err := h.service.Refresh(r.Context(), tokenStr)
	if err != nil {
		switch {
		case errors.Is(err, ErrTokenExpired) || errors.Is(err, ErrSessionExpired):
			httpx.WriteError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Session has expired", reqID)
		case errors.Is(err, ErrInvalidToken) || errors.Is(err, ErrSessionNotFound):
			httpx.WriteError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Session token is invalid or revoked", reqID)
		default:
			httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to refresh session", reqID)
		}
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, session)
}

// Logout handles immediate session revocation.
// POST /v1/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	reqID := logger.GetRequestID(r.Context())

	tokenStr := ""
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			tokenStr = strings.TrimSpace(parts[1])
		}
	}

	if tokenStr == "" && r.Body != nil {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			tokenStr = req.ExtractToken()
		}
	}

	if tokenStr == "" {
		httpx.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Session token is required", reqID)
		return
	}

	if err := h.service.Logout(r.Context(), tokenStr); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to logout", reqID)
		return
	}

	_ = httpx.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}
