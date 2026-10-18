package ledger

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCursor_EncodeAndDecode(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Microsecond)
	id := uuid.New().String()

	encoded := EncodeCursor(now, id)
	assert.NotEmpty(t, encoded)

	decodedTime, decodedID, err := DecodeCursor(encoded)
	require.NoError(t, err)
	assert.True(t, now.Equal(decodedTime), "expected %v, got %v", now, decodedTime)
	assert.Equal(t, id, decodedID)
}

func TestCursor_DecodeErrors(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"empty string", "", true},
		{"invalid base64", "!@#$%^", true},
		{"missing delimiter", "YWJjZGVm", true},
		{"invalid timestamp", "aW52YWxpZF90aW1lfDU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMA", true},
		{"invalid uuid", "MjAyNi0xMC0xN1QxNTozMDowMFp8aW52YWxpZC11dWlk", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := DecodeCursor(tt.input)
			assert.Error(t, err)
			assert.ErrorIs(t, err, ErrInvalidCursor)
		})
	}
}

