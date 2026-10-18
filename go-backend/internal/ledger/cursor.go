package ledger

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// EncodeCursor encodes a created_at timestamp and UUID into an opaque, URL-safe base64 string.
func EncodeCursor(createdAt time.Time, id string) string {
	raw := fmt.Sprintf("%s|%s", createdAt.Format(time.RFC3339Nano), id)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor decodes an opaque cursor string into its timestamp and UUID components.
// Returns ErrInvalidCursor if the string cannot be parsed or if parts are invalid.
func DecodeCursor(encoded string) (time.Time, string, error) {
	if encoded == "" {
		return time.Time{}, "", ErrInvalidCursor
	}

	decodedBytes, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return time.Time{}, "", fmt.Errorf("%w: base64 decode failed", ErrInvalidCursor)
	}

	parts := strings.Split(string(decodedBytes), "|")
	if len(parts) != 2 {
		return time.Time{}, "", fmt.Errorf("%w: expected 2 segments separated by '|'", ErrInvalidCursor)
	}

	t, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", fmt.Errorf("%w: invalid timestamp format", ErrInvalidCursor)
	}

	if _, err := uuid.Parse(parts[1]); err != nil {
		return time.Time{}, "", fmt.Errorf("%w: invalid UUID format", ErrInvalidCursor)
	}

	return t, parts[1], nil
}

