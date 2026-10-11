package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
)

type contextKey string

const (
	userIDContextKey   contextKey = "auth_user_id"
	deviceIDContextKey contextKey = "auth_device_id"
	sessionContextKey  contextKey = "auth_session"
)

// SessionValidator defines the method required by Authenticate middleware.
type SessionValidator interface {
	ValidateAndTouch(ctx context.Context, token string) (*Session, error)
}

// Authenticate returns a middleware that validates opaque session tokens in the Authorization header
// against the ephemeral session cache, sliding the inactivity window with zero database queries.
func Authenticate(validator SessionValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := logger.GetRequestID(r.Context())
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header", reqID)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				httpx.WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format", reqID)
				return
			}

			tokenString := strings.TrimSpace(parts[1])
			if tokenString == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Session token cannot be empty", reqID)
				return
			}

			session, err := validator.ValidateAndTouch(r.Context(), tokenString)
			if err != nil {
				if errors.Is(err, ErrSessionExpired) || errors.Is(err, ErrTokenExpired) {
					httpx.WriteError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Session has expired due to inactivity or lifetime", reqID)
					return
				}
				httpx.WriteError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Session token is invalid or revoked", reqID)
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, session.UserID)
			ctx = context.WithValue(ctx, deviceIDContextKey, session.DeviceID)
			ctx = context.WithValue(ctx, sessionContextKey, session)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts the authenticated user ID from context.
func GetUserID(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(userIDContextKey).(string)
	return val, ok && val != ""
}

// GetDeviceID extracts the authenticated device ID from context.
func GetDeviceID(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(deviceIDContextKey).(string)
	return val, ok && val != ""
}

// GetSession extracts the authenticated Session from context.
func GetSession(ctx context.Context) (*Session, bool) {
	val, ok := ctx.Value(sessionContextKey).(*Session)
	return val, ok && val != nil
}
