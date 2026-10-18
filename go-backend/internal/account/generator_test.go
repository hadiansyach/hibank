package account

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerator_AccountNumbers(t *testing.T) {
	for i := 0; i < 50; i++ {
		accNum, err := GenerateAccountNumber()
		require.NoError(t, err)

		// 1. Length check: prefix (3) + random (6) + checkDigit (1) = 10 digits
		assert.Len(t, accNum, 10)

		// 2. Prefix check: must start with BankCodePrefix "108"
		assert.Equal(t, "108", accNum[:3])

		// 3. Validation check
		assert.True(t, ValidateAccountNumber(accNum), "Generated account number %s must be valid", accNum)
	}
}

func TestGenerator_ValidateCorrupted(t *testing.T) {
	accNum, err := GenerateAccountNumber()
	require.NoError(t, err)

	// Tampered last digit
	lastDigit := accNum[len(accNum)-1]
	tamperedLast := '0'
	if lastDigit == '0' {
		tamperedLast = '1'
	}
	corrupted := accNum[:len(accNum)-1] + string(tamperedLast)
	assert.False(t, ValidateAccountNumber(corrupted))

	// Invalid prefix
	corruptedPrefix := "999" + accNum[3:]
	assert.False(t, ValidateAccountNumber(corruptedPrefix))

	// Short length
	assert.False(t, ValidateAccountNumber("108123"))

	// Non-numeric
	assert.False(t, ValidateAccountNumber("108123456A"))
}

