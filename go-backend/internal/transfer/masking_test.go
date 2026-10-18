package transfer

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMaskRecipientName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"two words", "Budi Santoso", "B*** S******"},
		{"two words short", "Siti Rahma", "S*** R****"},
		{"single word", "Ihsan", "I****"},
		{"three words", "Muhammad Budi Santoso", "M******* B*** S******"},
		{"single character words", "A B", "A B"},
		{"empty string", "", ""},
		{"extra spaces", "  Budi   Santoso  ", "B*** S******"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := MaskRecipientName(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

