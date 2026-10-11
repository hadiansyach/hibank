package auth

import (
	"context"
	"sync"
	"time"
)

// SessionStore defines the interface for ephemeral session persistence and operations.
type SessionStore interface {
	// Create persists a new session and replaces any previous active session for the same user/device.
	Create(ctx context.Context, session *Session) error

	// GetAndTouch retrieves the session by token, validates its expiration, and updates LastActiveAt.
	GetAndTouch(ctx context.Context, token string) (*Session, error)

	// Get retrieves the session without updating LastActiveAt.
	Get(ctx context.Context, token string) (*Session, error)

	// Revoke immediately deletes the session with the specified token.
	Revoke(ctx context.Context, token string) error

	// RevokeUserDevice immediately invalidates the active session for a specific user and device.
	RevokeUserDevice(ctx context.Context, userID, deviceID string) error

	// RevokeAllUserSessions invalidates all sessions for a specific user.
	RevokeAllUserSessions(ctx context.Context, userID string) error

	// Close terminates any background workers and frees resources.
	Close() error
}

// MemorySessionStore is a thread-safe, high-concurrency in-memory session cache.
type MemorySessionStore struct {
	mu                 sync.RWMutex
	sessions           map[string]*Session
	userDeviceSessions map[string]string            // key: userID:deviceID -> token
	userSessions       map[string]map[string]struct{} // key: userID -> set of tokens
	stopChan           chan struct{}
	ticker             *time.Ticker
	stopped            bool
}

// NewMemorySessionStore creates an in-memory session store with an optional background cleanup interval.
func NewMemorySessionStore(cleanupInterval time.Duration) *MemorySessionStore {
	if cleanupInterval <= 0 {
		cleanupInterval = 1 * time.Minute
	}

	store := &MemorySessionStore{
		sessions:           make(map[string]*Session),
		userDeviceSessions: make(map[string]string),
		userSessions:       make(map[string]map[string]struct{}),
		stopChan:           make(chan struct{}),
		ticker:             time.NewTicker(cleanupInterval),
	}

	go store.sweepLoop()

	return store
}

func userDeviceKey(userID, deviceID string) string {
	return userID + ":" + deviceID
}

func cloneSession(s *Session) *Session {
	if s == nil {
		return nil
	}
	cp := *s
	return &cp
}

func (s *MemorySessionStore) sweepLoop() {
	for {
		select {
		case <-s.ticker.C:
			s.sweepExpired()
		case <-s.stopChan:
			return
		}
	}
}

func (s *MemorySessionStore) sweepExpired() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	for token, sess := range s.sessions {
		if sess.IsExpired(now) && now.Sub(sess.LastActiveAt) > (sess.InactivityTimeout+10*time.Minute) {
			s.deleteSessionLocked(token)
		}
	}
}

func (s *MemorySessionStore) deleteSessionLocked(token string) {
	sess, exists := s.sessions[token]
	if !exists {
		return
	}

	delete(s.sessions, token)

	devKey := userDeviceKey(sess.UserID, sess.DeviceID)
	if s.userDeviceSessions[devKey] == token {
		delete(s.userDeviceSessions, devKey)
	}

	if tokens, ok := s.userSessions[sess.UserID]; ok {
		delete(tokens, token)
		if len(tokens) == 0 {
			delete(s.userSessions, sess.UserID)
		}
	}
}

// Create stores a new session and terminates any existing active session on that device.
func (s *MemorySessionStore) Create(_ context.Context, session *Session) error {
	if session == nil {
		return ErrInvalidToken
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Enforce single active session per user/device
	devKey := userDeviceKey(session.UserID, session.DeviceID)
	if oldToken, exists := s.userDeviceSessions[devKey]; exists {
		s.deleteSessionLocked(oldToken)
	}

	s.sessions[session.Token] = cloneSession(session)
	s.userDeviceSessions[devKey] = session.Token

	if s.userSessions[session.UserID] == nil {
		s.userSessions[session.UserID] = make(map[string]struct{})
	}
	s.userSessions[session.UserID][session.Token] = struct{}{}

	return nil
}

// GetAndTouch retrieves a session and refreshes LastActiveAt if still valid.
func (s *MemorySessionStore) GetAndTouch(_ context.Context, token string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, exists := s.sessions[token]
	if !exists {
		return nil, ErrSessionNotFound
	}

	now := time.Now().UTC()
	if sess.IsExpired(now) {
		return nil, ErrSessionExpired
	}

	sess.LastActiveAt = now
	return cloneSession(sess), nil
}

// Get retrieves a session without updating LastActiveAt.
func (s *MemorySessionStore) Get(_ context.Context, token string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, exists := s.sessions[token]
	if !exists {
		return nil, ErrSessionNotFound
	}

	now := time.Now().UTC()
	if sess.IsExpired(now) {
		return nil, ErrSessionExpired
	}

	return cloneSession(sess), nil
}

// Revoke immediately removes the session token from memory.
func (s *MemorySessionStore) Revoke(_ context.Context, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.deleteSessionLocked(token)
	return nil
}

// RevokeUserDevice immediately invalidates the active session for a specific user and device.
func (s *MemorySessionStore) RevokeUserDevice(_ context.Context, userID, deviceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	devKey := userDeviceKey(userID, deviceID)
	if token, exists := s.userDeviceSessions[devKey]; exists {
		s.deleteSessionLocked(token)
	}
	return nil
}

// RevokeAllUserSessions invalidates all sessions for a user across all devices.
func (s *MemorySessionStore) RevokeAllUserSessions(_ context.Context, userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tokens, exists := s.userSessions[userID]
	if exists {
		for token := range tokens {
			s.deleteSessionLocked(token)
		}
	}
	return nil
}

// Close gracefully stops the background janitor ticker.
func (s *MemorySessionStore) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.stopped {
		s.stopped = true
		s.ticker.Stop()
		close(s.stopChan)
	}
	return nil
}
