package account

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strconv"
)

const (
	// BankCodePrefix is the institution routing prefix for Bank A (HiBank).
	BankCodePrefix = "108"
	// RandomDigitsLength is the number of random digits between prefix and check digit.
	RandomDigitsLength = 6
)

// GenerateAccountNumber creates a unique 10-digit account number following the format:
// [108 (3 digits)] + [Random (6 digits)] + [Luhn Check Digit (1 digit)]
func GenerateAccountNumber() (string, error) {
	// Generate random 6 digits (000000 - 999999)
	maxVal := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, maxVal)
	if err != nil {
		return "", fmt.Errorf("generate random digits: %w", err)
	}

	rawWithoutCheckDigit := fmt.Sprintf("%s%06d", BankCodePrefix, n.Int64())
	checkDigit := calculateLuhnCheckDigit(rawWithoutCheckDigit)

	return fmt.Sprintf("%s%d", rawWithoutCheckDigit, checkDigit), nil
}

// ValidateAccountNumber verifies if an account number has the valid bank prefix and Luhn check digit.
func ValidateAccountNumber(accountNumber string) bool {
	if len(accountNumber) != len(BankCodePrefix)+RandomDigitsLength+1 {
		return false
	}

	if accountNumber[:len(BankCodePrefix)] != BankCodePrefix {
		return false
	}

	for _, ch := range accountNumber {
		if ch < '0' || ch > '9' {
			return false
		}
	}

	payload := accountNumber[:len(accountNumber)-1]
	expectedCheckDigit := calculateLuhnCheckDigit(payload)
	actualCheckDigit, err := strconv.Atoi(string(accountNumber[len(accountNumber)-1]))
	if err != nil {
		return false
	}

	return expectedCheckDigit == actualCheckDigit
}

// calculateLuhnCheckDigit computes the single-digit Luhn checksum (mod 10) for a given numeric string.
func calculateLuhnCheckDigit(payload string) int {
	sum := 0
	alt := true

	for i := len(payload) - 1; i >= 0; i-- {
		digit := int(payload[i] - '0')
		if alt {
			digit *= 2
			if digit > 9 {
				digit -= 9
			}
		}
		sum += digit
		alt = !alt
	}

	return (10 - (sum % 10)) % 10
}

