package transfer

import (
	"strings"
)

// MaskRecipientName masks a customer's full name to comply with banking PII privacy guidelines.
// Example: "Budi Santoso" -> "B*** S******", "Siti Rahma" -> "S*** R****"
func MaskRecipientName(fullName string) string {
	trimmed := strings.TrimSpace(fullName)
	if trimmed == "" {
		return ""
	}

	words := strings.Fields(trimmed)
	maskedWords := make([]string, len(words))

	for i, word := range words {
		runes := []rune(word)
		if len(runes) <= 1 {
			maskedWords[i] = string(runes)
			continue
		}

		numStars := len(runes) - 1
		if numStars < 3 {
			numStars = 3
		}

		maskedWords[i] = string(runes[0]) + strings.Repeat("*", numStars)
	}

	return strings.Join(maskedWords, " ")
}

