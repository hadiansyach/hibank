package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTokenManager_GenerateAndValidate(t *testing.T) {
	tm := NewTokenManager("super-secret-key-at-least-32-characters!", 15*time.Minute, 7*24*time.Hour, "bank-a-api")

	userID := "019488a0-0000-7000-8000-000000000001"
	deviceID := "iphone-15-pro-device-id"

	tokenString, expiresAt, err := tm.GenerateAccessToken(userID, deviceID)
	require.NoError(t, err)
	assert.NotEmpty(t, tokenString)
	assert.True(t, expiresAt.After(time.Now()))

	claims, err := tm.ValidateAccessToken(tokenString)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, deviceID, claims.DeviceID)
	assert.Equal(t, "bank-a-api", claims.Issuer)
}

func TestTokenManager_ValidateExpiredToken(t *testing.T) {
	// Negative duration produces expired token immediately
	tm := NewTokenManager("super-secret-key-at-least-32-characters!", -1*time.Minute, 7*24*time.Hour, "bank-a-api")

	tokenString, _, err := tm.GenerateAccessToken("user-1", "device-1")
	require.NoError(t, err)

	claims, err := tm.ValidateAccessToken(tokenString)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrTokenExpired)
}

func TestTokenManager_InvalidSecret(t *testing.T) {
	tm1 := NewTokenManager("secret-key-number-one-at-least-32-chars!", 15*time.Minute, 7*24*time.Hour, "bank-a-api")
	tm2 := NewTokenManager("secret-key-number-two-at-least-32-chars!", 15*time.Minute, 7*24*time.Hour, "bank-a-api")

	tokenString, _, err := tm1.GenerateAccessToken("user-1", "device-1")
	require.NoError(t, err)

	claims, err := tm2.ValidateAccessToken(tokenString)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestTokenManager_GenerateRefreshToken(t *testing.T) {
	tm := NewTokenManager("secret", 15*time.Minute, 7*24*time.Hour, "bank-a-api")

	plain1, hash1, err := tm.GenerateRefreshToken()
	require.NoError(t, err)
	assert.Len(t, plain1, 64) // 32 hex bytes = 64 chars
	assert.Len(t, hash1, 64)  // sha256 = 64 hex chars

	plain2, hash2, err := tm.GenerateRefreshToken()
	require.NoError(t, err)
	assert.NotEqual(t, plain1, plain2)
	assert.NotEqual(t, hash1, hash2)

	assert.Equal(t, hash1, HashToken(plain1))
}
