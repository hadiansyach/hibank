package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// UserClaims defines custom claims embedded into JWT access tokens.
type UserClaims struct {
	UserID   string `json:"user_id"`
	DeviceID string `json:"device_id"`
	jwt.RegisteredClaims
}

// TokenManager provides methods to generate and validate JWT and refresh tokens.
type TokenManager struct {
	secret            []byte
	accessExpiration  time.Duration
	refreshExpiration time.Duration
	issuer            string
}

// NewTokenManager creates a configured TokenManager instance.
func NewTokenManager(secret string, accessExpiration, refreshExpiration time.Duration, issuer string) *TokenManager {
	return &TokenManager{
		secret:            []byte(secret),
		accessExpiration:  accessExpiration,
		refreshExpiration: refreshExpiration,
		issuer:            issuer,
	}
}

// AccessExpiration returns the configured access token duration.
func (m *TokenManager) AccessExpiration() time.Duration {
	return m.accessExpiration
}

// RefreshExpiration returns the configured refresh token duration.
func (m *TokenManager) RefreshExpiration() time.Duration {
	return m.refreshExpiration
}

// GenerateAccessToken signs a new JWT access token containing UserID and DeviceID claims.
func (m *TokenManager) GenerateAccessToken(userID, deviceID string) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(m.accessExpiration)

	claims := UserClaims{
		UserID:   userID,
		DeviceID: deviceID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID,
			ID:        uuid.NewString(),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}

	return tokenString, expiresAt, nil
}

// ValidateAccessToken parses and validates the JWT signature, claims, and expiry.
func (m *TokenManager) ValidateAccessToken(tokenString string) (*UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.secret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// GenerateRefreshToken generates a cryptographically secure 32-byte token and its SHA-256 hash.
func (m *TokenManager) GenerateRefreshToken() (string, string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}

	plainToken := hex.EncodeToString(randomBytes)
	tokenHash := HashToken(plainToken)

	return plainToken, tokenHash, nil
}

// HashToken computes a SHA-256 hex-encoded hash of the given plain token string.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
