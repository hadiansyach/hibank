// Package auth provides identity, registration, JWT authentication, and token rotation services.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

var (
	// ErrInvalidHashFormat is returned when the encoded password hash does not adhere to standard PHC format.
	ErrInvalidHashFormat = errors.New("invalid hash format")
	// ErrIncompatibleVersion is returned when the argon2 version does not match.
	ErrIncompatibleVersion = errors.New("incompatible argon2 version")
)

// Argon2id configuration params according to RFC 9106 recommended values for password hashing.
type argon2Params struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

var defaultParams = argon2Params{
	memory:      64 * 1024, // 64 MB
	iterations:  3,
	parallelism: 2,
	saltLength:  16,
	keyLength:   32,
}

// HashPassword hashes a raw password using argon2id and outputs a PHC-formatted string.
// Format: $argon2id$v=19$m=65536,t=3,p=2$<salt-b64>$<hash-b64>
func HashPassword(password string) (string, error) {
	salt := make([]byte, defaultParams.saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}

	hash := argon2.IDKey(
		[]byte(password),
		salt,
		defaultParams.iterations,
		defaultParams.memory,
		defaultParams.parallelism,
		defaultParams.keyLength,
	)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		defaultParams.memory,
		defaultParams.iterations,
		defaultParams.parallelism,
		b64Salt,
		b64Hash,
	)

	return encoded, nil
}

// VerifyPassword verifies a candidate raw password against an encoded argon2id hash.
// Uses subtle.ConstantTimeCompare to protect against timing attacks.
func VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, ErrInvalidHashFormat
	}

	if parts[1] != "argon2id" {
		return false, ErrInvalidHashFormat
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, ErrInvalidHashFormat
	}
	if version != argon2.Version {
		return false, ErrIncompatibleVersion
	}

	var memory, iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false, ErrInvalidHashFormat
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, ErrInvalidHashFormat
	}

	decodedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, ErrInvalidHashFormat
	}

	comparisonHash := argon2.IDKey(
		[]byte(password),
		salt,
		iterations,
		memory,
		parallelism,
		uint32(len(decodedHash)),
	)

	if subtle.ConstantTimeCompare(decodedHash, comparisonHash) == 1 {
		return true, nil
	}

	return false, nil
}
