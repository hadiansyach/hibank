package ledger

import (
	"crypto/rand"
	"fmt"
	"time"
)

const refAlphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ" // Base32 without ambiguous characters (no I, O)

// GenerateReferenceNumber generates a cryptographically random, human-readable reference number.
// Format: TRX-YYYYMMDD-<10 random characters> (e.g. TRX-20261017-K7B92M4P9X)
func GenerateReferenceNumber() string {
	bytes := make([]byte, 10)
	_, _ = rand.Read(bytes)

	randomPart := make([]byte, 10)
	alphabetLen := byte(len(refAlphabet))
	for i := 0; i < 10; i++ {
		randomPart[i] = refAlphabet[bytes[i]%alphabetLen]
	}

	datePart := time.Now().UTC().Format("20060102")
	return fmt.Sprintf("TRX-%s-%s", datePart, string(randomPart))
}

