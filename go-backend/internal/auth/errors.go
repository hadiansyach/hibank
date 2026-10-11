package auth

import "errors"

var (
	// ErrEmailAlreadyExists indicates the provided email address is already registered.
	ErrEmailAlreadyExists = errors.New("email is already registered")
	// ErrPhoneAlreadyExists indicates the provided phone number is already registered.
	ErrPhoneAlreadyExists = errors.New("phone number is already registered")
	// ErrInvalidCredentials indicates the email or password provided does not match.
	ErrInvalidCredentials = errors.New("invalid email or password")
	// ErrAccountSuspended indicates the user account has been deactivated or suspended.
	ErrAccountSuspended = errors.New("account is suspended")
	// ErrSessionNotFound indicates the session token was not found in the ephemeral store.
	ErrSessionNotFound = errors.New("session not found")
	// ErrSessionExpired indicates the session has expired due to inactivity or absolute lifetime.
	ErrSessionExpired = errors.New("session has expired")
	// ErrTokenExpired is an alias for ErrSessionExpired for backward-compatible error handling.
	ErrTokenExpired = ErrSessionExpired
	// ErrInvalidToken indicates the session token is malformed, not found, or revoked.
	ErrInvalidToken = errors.New("invalid or revoked token")
	// ErrTokenRevoked indicates the session token was explicitly revoked.
	ErrTokenRevoked = errors.New("token has been revoked")
	// ErrTokenReuseDetected retained for security alerts.
	ErrTokenReuseDetected = errors.New("security alert: token reuse detected")
)
