package auth

import (
	"context"
	"encoding/hex"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSession_TokenEntropy(t *testing.T) {
	store := NewMemorySessionStore(1 * time.Minute)
	defer func() {
		_ = store.Close()
	}()

	sm := NewSessionManager(store, 15*time.Minute, 24*time.Hour)

	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		token, err := sm.GenerateSessionToken()
		require.NoError(t, err)

		// 32 bytes hex encoded = 64 characters (256 bits of entropy)
		assert.Len(t, token, 64)

		decoded, err := hex.DecodeString(token)
		require.NoError(t, err)
		assert.Len(t, decoded, 32) // 32 bytes = 256 bits

		assert.False(t, seen[token], "token collision detected: %s", token)
		seen[token] = true
	}
}

func TestSession_SlidingWindowAndInactivityTimeout(t *testing.T) {
	store := NewMemorySessionStore(10 * time.Millisecond)
	defer func() {
		_ = store.Close()
	}()

	inactivityTimeout := 60 * time.Millisecond
	absoluteLifetime := 300 * time.Millisecond
	sm := NewSessionManager(store, inactivityTimeout, absoluteLifetime)

	ctx := context.Background()
	sess, err := sm.CreateSession(ctx, "user-123", "device-ios")
	require.NoError(t, err)
	require.NotEmpty(t, sess.Token)

	// 1. Initial access within inactivity window should succeed
	time.Sleep(20 * time.Millisecond)
	touched, err := sm.ValidateAndTouch(ctx, sess.Token)
	require.NoError(t, err)
	assert.True(t, touched.LastActiveAt.After(sess.LastActiveAt))

	// 2. Continuous access within sliding window keeps session alive
	time.Sleep(25 * time.Millisecond)
	touched2, err := sm.ValidateAndTouch(ctx, sess.Token)
	require.NoError(t, err)
	assert.True(t, touched2.LastActiveAt.After(touched.LastActiveAt))

	// 3. Exceed inactivity timeout without activity
	time.Sleep(75 * time.Millisecond)
	expiredSess, err := sm.ValidateAndTouch(ctx, sess.Token)
	assert.Nil(t, expiredSess)
	assert.ErrorIs(t, err, ErrSessionExpired)

	// 4. Subsequent lookup confirms session is marked expired
	lookupSess, err := store.Get(ctx, sess.Token)
	assert.Nil(t, lookupSess)
	assert.ErrorIs(t, err, ErrSessionExpired)

	// 5. Explicit revoke confirms immediate purge
	_ = sm.RevokeSession(ctx, sess.Token)
	purgedSess, err := store.Get(ctx, sess.Token)
	assert.Nil(t, purgedSess)
	assert.ErrorIs(t, err, ErrSessionNotFound)
}

func TestSession_AbsoluteLifetimeCap(t *testing.T) {
	store := NewMemorySessionStore(10 * time.Millisecond)
	defer func() {
		_ = store.Close()
	}()

	inactivityTimeout := 100 * time.Millisecond
	absoluteLifetime := 150 * time.Millisecond
	sm := NewSessionManager(store, inactivityTimeout, absoluteLifetime)

	ctx := context.Background()
	sess, err := sm.CreateSession(ctx, "user-456", "device-web")
	require.NoError(t, err)

	// Keep touching before inactivity expires (at 50ms and 110ms)
	time.Sleep(50 * time.Millisecond)
	_, err = sm.ValidateAndTouch(ctx, sess.Token)
	require.NoError(t, err)

	time.Sleep(60 * time.Millisecond)
	_, err = sm.ValidateAndTouch(ctx, sess.Token)
	require.NoError(t, err)

	// Total elapsed is now > absoluteLifetime (160ms > 150ms)
	time.Sleep(50 * time.Millisecond)
	expiredSess, err := sm.ValidateAndTouch(ctx, sess.Token)
	assert.Nil(t, expiredSess)
	assert.ErrorIs(t, err, ErrSessionExpired)
}

func TestSession_SingleActiveSessionPerDevice(t *testing.T) {
	store := NewMemorySessionStore(1 * time.Minute)
	defer func() {
		_ = store.Close()
	}()

	sm := NewSessionManager(store, 15*time.Minute, 24*time.Hour)
	ctx := context.Background()

	// Login 1 on device-A
	sess1, err := sm.CreateSession(ctx, "user-789", "device-A")
	require.NoError(t, err)

	// Login 2 on device-B (different device) -> should coexist
	sess2, err := sm.CreateSession(ctx, "user-789", "device-B")
	require.NoError(t, err)

	// Both device-A and device-B sessions are valid
	v1, err := sm.ValidateAndTouch(ctx, sess1.Token)
	require.NoError(t, err)
	assert.Equal(t, sess1.Token, v1.Token)

	v2, err := sm.ValidateAndTouch(ctx, sess2.Token)
	require.NoError(t, err)
	assert.Equal(t, sess2.Token, v2.Token)

	// Login 3 on device-A (same user, same device) -> MUST preempt sess1!
	sess3, err := sm.CreateSession(ctx, "user-789", "device-A")
	require.NoError(t, err)
	assert.NotEqual(t, sess1.Token, sess3.Token)

	// sess1 must now be purged/invalid
	preempted, err := sm.ValidateAndTouch(ctx, sess1.Token)
	assert.Nil(t, preempted)
	assert.ErrorIs(t, err, ErrSessionNotFound)

	// sess3 (new device-A) and sess2 (device-B) must remain valid
	v3, err := sm.ValidateAndTouch(ctx, sess3.Token)
	require.NoError(t, err)
	assert.Equal(t, sess3.Token, v3.Token)

	v2Again, err := sm.ValidateAndTouch(ctx, sess2.Token)
	require.NoError(t, err)
	assert.Equal(t, sess2.Token, v2Again.Token)
}

func TestSession_InstantRevocationAndLogoutAll(t *testing.T) {
	store := NewMemorySessionStore(1 * time.Minute)
	defer func() {
		_ = store.Close()
	}()

	sm := NewSessionManager(store, 15*time.Minute, 24*time.Hour)
	ctx := context.Background()

	sess1, err := sm.CreateSession(ctx, "user-100", "device-1")
	require.NoError(t, err)

	sess2, err := sm.CreateSession(ctx, "user-100", "device-2")
	require.NoError(t, err)

	// Instant single revocation
	err = sm.RevokeSession(ctx, sess1.Token)
	require.NoError(t, err)

	_, err = sm.ValidateAndTouch(ctx, sess1.Token)
	assert.ErrorIs(t, err, ErrSessionNotFound)

	// sess2 still valid
	_, err = sm.ValidateAndTouch(ctx, sess2.Token)
	require.NoError(t, err)

	// RevokeAllUserSessions
	err = sm.RevokeAllUserSessions(ctx, "user-100")
	require.NoError(t, err)

	_, err = sm.ValidateAndTouch(ctx, sess2.Token)
	assert.ErrorIs(t, err, ErrSessionNotFound)
}

func TestSession_ConcurrencyRaceConditions(t *testing.T) {
	store := NewMemorySessionStore(20 * time.Millisecond)
	defer func() {
		_ = store.Close()
	}()

	sm := NewSessionManager(store, 100*time.Millisecond, 500*time.Millisecond)
	require.NotNil(t, sm)
	ctx := context.Background()

	const workers = 30
	var wg sync.WaitGroup
	wg.Add(workers)

	for i := 0; i < workers; i++ {
		go func(workerID int) {
			defer wg.Done()
			devID := fmt.Sprintf("device-race-%d", workerID)
			sess, err := sm.CreateSession(ctx, "user-race", devID)
			if err != nil {
				return
			}
			for j := 0; j < 20; j++ {
				_, _ = sm.ValidateAndTouch(ctx, sess.Token)
				time.Sleep(1 * time.Millisecond)
			}
			_ = sm.RevokeSession(ctx, sess.Token)
		}(i)
	}

	wg.Wait()
}

func TestSession_RevokeUserDevice(t *testing.T) {
	store := NewMemorySessionStore(1 * time.Minute)
	defer func() {
		_ = store.Close()
	}()

	sm := NewSessionManager(store, 15*time.Minute, 24*time.Hour)
	assert.Equal(t, 15*time.Minute, sm.InactivityTimeout())
	assert.Equal(t, 24*time.Hour, sm.AbsoluteLifetime())

	ctx := context.Background()
	sess1, err := sm.CreateSession(ctx, "user-device-test", "device-ios")
	require.NoError(t, err)

	sess2, err := sm.CreateSession(ctx, "user-device-test", "device-android")
	require.NoError(t, err)

	// Revoke device-ios specifically
	err = sm.RevokeUserDevice(ctx, "user-device-test", "device-ios")
	require.NoError(t, err)

	_, err = sm.ValidateAndTouch(ctx, sess1.Token)
	assert.ErrorIs(t, err, ErrSessionNotFound)

	// device-android remains active
	valid2, err := sm.ValidateAndTouch(ctx, sess2.Token)
	require.NoError(t, err)
	assert.Equal(t, sess2.Token, valid2.Token)
}

func TestSession_ContextAndAccessors(t *testing.T) {
	sess := &Session{
		Token:             "dummy-token",
		UserID:            "u-1",
		DeviceID:          "d-1",
		CreatedAt:         time.Now().UTC(),
		LastActiveAt:      time.Now().UTC(),
		InactivityTimeout: 10 * time.Minute,
		AbsoluteLifetime:  1 * time.Hour,
	}

	ctx := context.WithValue(context.Background(), sessionContextKey, sess)
	ctx = context.WithValue(ctx, userIDContextKey, sess.UserID)
	ctx = context.WithValue(ctx, deviceIDContextKey, sess.DeviceID)

	sExtracted, ok := GetSession(ctx)
	assert.True(t, ok)
	assert.Equal(t, "dummy-token", sExtracted.Token)

	uExtracted, ok := GetUserID(ctx)
	assert.True(t, ok)
	assert.Equal(t, "u-1", uExtracted)

	dExtracted, ok := GetDeviceID(ctx)
	assert.True(t, ok)
	assert.Equal(t, "d-1", dExtracted)

	// Negative cases for context extractors
	emptyCtx := context.Background()
	_, ok = GetSession(emptyCtx)
	assert.False(t, ok)
	_, ok = GetUserID(emptyCtx)
	assert.False(t, ok)
	_, ok = GetDeviceID(emptyCtx)
	assert.False(t, ok)
}
