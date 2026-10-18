package ledger

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateReferenceNumber(t *testing.T) {
	refRegex := regexp.MustCompile(`^TRX-\d{8}-[0-9A-HJ-NP-Z]{10}$`)

	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		ref := GenerateReferenceNumber()
		assert.True(t, refRegex.MatchString(ref), "reference %s did not match expected pattern", ref)
		assert.False(t, seen[ref], "duplicate reference number generated: %s", ref)
		seen[ref] = true
	}
}

