package ledger

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuditor_Lifecycle(t *testing.T) {
	// Dummy service (nil pool, will skip DB query safely in lifecycle test)
	svc := &Service{}
	auditor := NewAuditor(svc, 50*time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Starting auditor should spawn goroutine without blocking
	auditor.Start(ctx)

	// Let it run for a brief moment
	time.Sleep(120 * time.Millisecond)

	// Stopping auditor should terminate cleanly without deadlocks or hangs
	doneCh := make(chan struct{})
	go func() {
		auditor.Stop()
		close(doneCh)
	}()

	select {
	case <-doneCh:
		// Clean shutdown!
	case <-time.After(2 * time.Second):
		t.Fatal("Auditor Stop() timed out after 2 seconds")
	}
}

func TestAuditor_IntegrationWithLiveDB(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()

	service := NewService(pool)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Audit all accounts currently in the test database
	report, err := service.AuditAllAccounts(ctx)
	require.NoError(t, err)
	require.NotNil(t, report)

	// Every properly seeded account in the database must satisfy Total Credit - Total Debit == Balance
	assert.Empty(t, report.Violations, "detected invariant violation in database accounts: %+v", report.Violations)
}
