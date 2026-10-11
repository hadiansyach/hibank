package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// Session represents an active authenticated user session in the ephemeral store.
type Session struct {
	Token             string        `json:"token"`
	UserID            string        `json:"user_id"`
	DeviceID          string        `json:"device_id"`
	CreatedAt         time.Time     `json:"created_at"`
	LastActiveAt      time.Time     `json:"last_active_at"`
	InactivityTimeout time.Duration `json:"inactivity_timeout"`
	AbsoluteLifetime  time.Duration `json:"absolute_lifetime"`
}

// IsExpired checks if the session has expired due to either inactivity timeout or absolute lifetime.
func (s *Session) IsExpired(now time.Time) bool {
	if s == nil {
		return true
	}
	// Check inactivity timeout (sliding window)
	if s.InactivityTimeout > 0 && now.Sub(s.LastActiveAt) > s.InactivityTimeout {
		return true
	}
	// Check absolute lifetime
	if s.AbsoluteLifetime > 0 && now.Sub(s.CreatedAt) > s.AbsoluteLifetime {
		return true
	}
	return false
}

// RemainingInactivity returns remaining time before inactivity timeout expires.
func (s *Session) RemainingInactivity(now time.Time) time.Duration {
	if s == nil {
		return 0
	}
	elapsed := now.Sub(s.LastActiveAt)
	if s.InactivityTimeout > 0 && elapsed >= s.InactivityTimeout {
		return 0
	}
	rem := s.InactivityTimeout - elapsed
	if s.AbsoluteLifetime > 0 {
		absRem := s.AbsoluteLifetime - now.Sub(s.CreatedAt)
		if absRem < rem {
			rem = absRem
		}
	}
	if rem < 0 {
		return 0
	}
	return rem
}

// SessionManager coordinates session lifecycle, token generation, and caching operations.
type SessionManager struct {
	store             SessionStore
	inactivityTimeout time.Duration
	absoluteLifetime  time.Duration
}

// NewSessionManager creates a new SessionManager with specified store and timeout configurations.
func NewSessionManager(store SessionStore, inactivityTimeout, absoluteLifetime time.Duration) *SessionManager {
	return &SessionManager{
		store:             store,
		inactivityTimeout: inactivityTimeout,
		absoluteLifetime:  absoluteLifetime,
	}
}

// InactivityTimeout returns configured sliding inactivity duration.
func (m *SessionManager) InactivityTimeout() time.Duration {
	return m.inactivityTimeout
}

// AbsoluteLifetime returns configured absolute maximum session duration.
func (m *SessionManager) AbsoluteLifetime() time.Duration {
	return m.absoluteLifetime
}

// GenerateSessionToken generates a cryptographically secure 256-bit (32 bytes) opaque hex token.
func (m *SessionManager) GenerateSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("read secure random: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// CreateSession generates an opaque session token, registers the session in the ephemeral store,
// and enforces single active session semantics by invalidating any existing session on that device.
func (m *SessionManager) CreateSession(ctx context.Context, userID, deviceID string) (*Session, error) {
	token, err := m.GenerateSessionToken()
	if err != nil {
		return nil, fmt.Errorf("generate session token: %w", err)
	}

	now := time.Now().UTC()
	cleanDeviceID := strings.TrimSpace(deviceID)
	if cleanDeviceID == "" {
		cleanDeviceID = "generic-client"
	}

	sess := &Session{
		Token:             token,
		UserID:            userID,
		DeviceID:          cleanDeviceID,
		CreatedAt:         now,
		LastActiveAt:      now,
		InactivityTimeout: m.inactivityTimeout,
		AbsoluteLifetime:  m.absoluteLifetime,
	}

	if err := m.store.Create(ctx, sess); err != nil {
		return nil, fmt.Errorf("store session: %w", err)
	}

	return sess, nil
}

// ValidateAndTouch validates the session against the ephemeral store and refreshes the sliding window.
func (m *SessionManager) ValidateAndTouch(ctx context.Context, token string) (*Session, error) {
	cleanToken := strings.TrimSpace(token)
	if cleanToken == "" {
		return nil, ErrInvalidToken
	}

	sess, err := m.store.GetAndTouch(ctx, cleanToken)
	if err != nil {
		return nil, err
	}

	return sess, nil
}

// RevokeSession immediately purges the session from the cache.
func (m *SessionManager) RevokeSession(ctx context.Context, token string) error {
	cleanToken := strings.TrimSpace(token)
	if cleanToken == "" {
		return nil
	}
	return m.store.Revoke(ctx, cleanToken)
}

// RevokeUserDevice immediately invalidates the active session for a specific user and device.
func (m *SessionManager) RevokeUserDevice(ctx context.Context, userID, deviceID string) error {
	return m.store.RevokeUserDevice(ctx, userID, deviceID)
}

// RevokeAllUserSessions immediately invalidates all active sessions for a user across all devices.
func (m *SessionManager) RevokeAllUserSessions(ctx context.Context, userID string) error {
	return m.store.RevokeAllUserSessions(ctx, userID)
}

// Close gracefully stops the underlying session store and cleanup routines.
func (m *SessionManager) Close() error {
	if m.store != nil {
		return m.store.Close()
	}
	return nil
}
