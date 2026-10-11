package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword_Success(t *testing.T) {
	password := "SecretP@ssw0rd!123"

	hash, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.Contains(t, hash, "$argon2id$v=19$")

	// Verify valid password
	match, err := VerifyPassword(password, hash)
	require.NoError(t, err)
	assert.True(t, match)

	// Verify wrong password
	match, err = VerifyPassword("WrongPassword!", hash)
	require.NoError(t, err)
	assert.False(t, match)
}

func TestVerifyPassword_InvalidFormats(t *testing.T) {
	tests := []struct {
		name        string
		hash        string
		expectedErr error
	}{
		{
			name:        "empty hash",
			hash:        "",
			expectedErr: ErrInvalidHashFormat,
		},
		{
			name:        "malformed prefix",
			hash:        "$bcrypt$v=19$m=65536,t=3,p=2$salt$hash",
			expectedErr: ErrInvalidHashFormat,
		},
		{
			name:        "missing parts",
			hash:        "$argon2id$v=19$m=65536,t=3,p=2$salt",
			expectedErr: ErrInvalidHashFormat,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			match, err := VerifyPassword("any-pass", tt.hash)
			assert.False(t, match)
			assert.ErrorIs(t, err, tt.expectedErr)
		})
	}
}
