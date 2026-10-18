package transfer

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/ledger"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// SimulatedAccount represents an account with thread-safe ordered locking mimicking PostgreSQL FOR UPDATE.
type SimulatedAccount struct {
	ID      uuid.UUID
	Balance int64
	mu      sync.Mutex
}

// SimulatedLedgerEngine replicates the ordered-lock double-entry ledger algorithm implemented in ledger.Service.
type SimulatedLedgerEngine struct {
	accounts map[string]*SimulatedAccount
	mu       sync.RWMutex
}

func newSimulatedLedgerEngine() *SimulatedLedgerEngine {
	return &SimulatedLedgerEngine{
		accounts: make(map[string]*SimulatedAccount),
	}
}

func (e *SimulatedLedgerEngine) AddAccount(id uuid.UUID, initialBalance int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.accounts[id.String()] = &SimulatedAccount{
		ID:      id,
		Balance: initialBalance,
	}
}

func (e *SimulatedLedgerEngine) GetBalance(id uuid.UUID) int64 {
	e.mu.RLock()
	acc := e.accounts[id.String()]
	e.mu.RUnlock()
	if acc == nil {
		return 0
	}
	acc.mu.Lock()
	defer acc.mu.Unlock()
	return acc.Balance
}

// ExecuteTransfer implements the ordered locking algorithm:
// Accounts are sorted by UUID bytes order before locking, guaranteeing 0 circular deadlocks.
func (e *SimulatedLedgerEngine) ExecuteTransfer(srcID, tgtID uuid.UUID, amount int64) error {
	e.mu.RLock()
	srcAcc := e.accounts[srcID.String()]
	tgtAcc := e.accounts[tgtID.String()]
	e.mu.RUnlock()

	if srcAcc == nil || tgtAcc == nil {
		return errors.New("account not found")
	}

	// Deadlock prevention: sort accounts by UUID byte order before locking
	firstAcc, secondAcc := srcAcc, tgtAcc
	if bytes.Compare(srcID[:], tgtID[:]) > 0 {
		firstAcc, secondAcc = tgtAcc, srcAcc
	}

	// Acquire locks in canonical sorted order
	firstAcc.mu.Lock()
	defer firstAcc.mu.Unlock()

	secondAcc.mu.Lock()
	defer secondAcc.mu.Unlock()

	if srcAcc.Balance < amount {
		return ErrInsufficientBalance
	}

	srcAcc.Balance -= amount
	tgtAcc.Balance += amount
	return nil
}

// TestConcurrency_50ParallelTransfersFromSingleAccount executes 50 parallel goroutines
// attempting to debit from a single source account simultaneously.
// Verifies that balance updates are 100% atomic, no over-drafting occurs, and money is conserved.
func TestConcurrency_50ParallelTransfersFromSingleAccount(t *testing.T) {
	engine := newSimulatedLedgerEngine()

	srcID := uuid.New()
	tgtID := uuid.New()

	// Initial balance: 500.000 IDR
	initialBalance := int64(500000)
	transferAmount := int64(20000)
	concurrentWorkers := 50

	engine.AddAccount(srcID, initialBalance)
	engine.AddAccount(tgtID, 0)

	var wg sync.WaitGroup
	var successfulTransfers int64
	var failedTransfers int64

	// Start barrier so all 50 goroutines execute at the exact same moment
	startBarrier := make(chan struct{})

	for i := 0; i < concurrentWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-startBarrier // wait for synchronized trigger

			err := engine.ExecuteTransfer(srcID, tgtID, transferAmount)
			if err == nil {
				atomic.AddInt64(&successfulTransfers, 1)
			} else if errors.Is(err, ErrInsufficientBalance) {
				atomic.AddInt64(&failedTransfers, 1)
			}
		}()
	}

	// Trigger all 50 goroutines simultaneously
	close(startBarrier)
	wg.Wait()

	// Assertions
	// 500.000 IDR / 20.000 IDR = exactly 25 successful transfers allowed
	expectedSuccess := initialBalance / transferAmount
	expectedFailures := int64(concurrentWorkers) - expectedSuccess

	assert.Equal(t, expectedSuccess, successfulTransfers, "expected exactly 25 transfers to succeed")
	assert.Equal(t, expectedFailures, failedTransfers, "expected remaining 25 transfers to fail with INSUFFICIENT_BALANCE")

	finalSrcBalance := engine.GetBalance(srcID)
	finalTgtBalance := engine.GetBalance(tgtID)

	assert.Equal(t, int64(0), finalSrcBalance, "source balance should be cleanly depleted to 0")
	assert.Equal(t, initialBalance, finalTgtBalance, "target balance should equal initial funds transferred")
	assert.Equal(t, initialBalance, finalSrcBalance+finalTgtBalance, "conservation of money invariant: total sum must remain 500.000")
}

// TestConcurrency_DeadlockPrevention_Bidirectional verifies that when 50 concurrent goroutines
// transfer in opposite directions (A -> B and B -> A) simultaneously, no deadlocks occur.
func TestConcurrency_DeadlockPrevention_Bidirectional(t *testing.T) {
	engine := newSimulatedLedgerEngine()

	accA := uuid.New()
	accB := uuid.New()

	engine.AddAccount(accA, 1000000)
	engine.AddAccount(accB, 1000000)

	totalRoutines := 50
	var wg sync.WaitGroup
	startBarrier := make(chan struct{})

	doneCh := make(chan struct{})

	for i := 0; i < totalRoutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-startBarrier

			src, tgt := accA, accB
			// Alternate directions: even routines do A -> B, odd routines do B -> A
			if idx%2 == 1 {
				src, tgt = accB, accA
			}

			// Random transfer amount between 10.000 and 20.000
			amount := int64(10000 + (idx%5)*2000)
			_ = engine.ExecuteTransfer(src, tgt, amount)
		}(i)
	}

	// Launch timeout detector
	go func() {
		wg.Wait()
		close(doneCh)
	}()

	close(startBarrier)

	select {
	case <-doneCh:
		// Succeeded without deadlocking!
		balA := engine.GetBalance(accA)
		balB := engine.GetBalance(accB)
		assert.Equal(t, int64(2000000), balA+balB, "total money across both accounts must be strictly conserved at 2.000.000")
	case <-time.After(3 * time.Second):
		t.Fatal("DEADLOCK DETECTED! Goroutines failed to finish within 3 seconds due to circular locking")
	}
}

// TestPostgres_LiveConcurrencyAndDeadlock runs against a live PostgreSQL database if available.
// If PostgreSQL is not running or unreachable, the test skips gracefully.
func TestPostgres_LiveConcurrencyAndDeadlock(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable"
	}

	cfg := &config.Config{
		DatabaseURL:          dbURL,
		DBMaxConns:           25,
		DBMinConns:           5,
		DBMaxConnIdleTime:    15 * time.Minute,
		DBMaxConnLifetime:    1 * time.Hour,
		SessionInactivityTimeout: 15 * time.Minute,
		SessionAbsoluteLifetime: 168 * time.Hour,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		t.Skipf("Live PostgreSQL is not reachable (%v); skipping live DB concurrency test", err)
		return
	}
	defer pool.Close()

	if pErr := database.Ping(ctx, pool); pErr != nil {
		t.Skipf("Live PostgreSQL ping failed (%v); skipping live DB concurrency test", pErr)
		return
	}

	ledgerSvc := ledger.NewService(pool)
	queries := dbgen.New(pool)

	// Create test user and two test accounts for live stress test
	testUser, uErr := queries.CreateUser(ctx, dbgen.CreateUserParams{
		FullName:     "Concurrency Test User",
		Email:        fmt.Sprintf("concurrency_%d@test.com", time.Now().UnixNano()),
		Phone:        fmt.Sprintf("+62812%07d", rand.Intn(10000000)),
		PasswordHash: "hash-concurrency-test",
	})
	require.NoError(t, uErr)

	acc1Num := fmt.Sprintf("108%07d", rand.Intn(10000000))
	acc2Num := fmt.Sprintf("108%07d", rand.Intn(10000000))

	acc1, aErr1 := queries.CreateAccount(ctx, dbgen.CreateAccountParams{
		UserID:        testUser.ID,
		AccountNumber: acc1Num,
		AccountType:   "SAVINGS",
	})
	require.NoError(t, aErr1)

	acc2, aErr2 := queries.CreateAccount(ctx, dbgen.CreateAccountParams{
		UserID:        testUser.ID,
		AccountNumber: acc2Num,
		AccountType:   "SAVINGS",
	})
	require.NoError(t, aErr2)

	// Fund initial balances: 1.000.000 each
	_, _ = queries.UpdateAccountBalance(ctx, dbgen.UpdateAccountBalanceParams{
		ID:      acc1.ID,
		Balance: 1000000,
	})
	_, _ = queries.UpdateAccountBalance(ctx, dbgen.UpdateAccountBalanceParams{
		ID:      acc2.ID,
		Balance: 1000000,
	})

	acc1UUID := uuid.UUID(acc1.ID.Bytes).String()
	acc2UUID := uuid.UUID(acc2.ID.Bytes).String()

	// 50 concurrent transactions in opposite directions on real PostgreSQL
	concurrentWorkers := 50
	var wg sync.WaitGroup
	var deadlockErrors int64
	startBarrier := make(chan struct{})

	for i := 0; i < concurrentWorkers; i++ {
		wg.Add(1)
		go func(workerIdx int) {
			defer wg.Done()
			<-startBarrier

			src, tgt := acc1UUID, acc2UUID
			if workerIdx%2 == 1 {
				src, tgt = acc2UUID, acc1UUID
			}

			idemKey := fmt.Sprintf("live-concurrency-%d-%d", workerIdx, time.Now().UnixNano())
			_, tErr := ledgerSvc.ExecuteTransferMovement(context.Background(), ledger.TransferMovementParams{
				IdempotencyKey:  idemKey,
				SourceAccountID: src,
				TargetAccountID: tgt,
				Type:            "TRANSFER_INTERNAL",
				Amount:          10000,
				Fee:             0,
				Notes:           "Live DB concurrency stress test",
			})

			if tErr != nil {
				// PostgreSQL code 40P01 corresponds to "deadlock detected"
				if bytes.Contains([]byte(tErr.Error()), []byte("40P01")) ||
					bytes.Contains([]byte(tErr.Error()), []byte("deadlock detected")) {
					atomic.AddInt64(&deadlockErrors, 1)
				}
			}
		}(i)
	}

	close(startBarrier)
	wg.Wait()

	assert.Equal(t, int64(0), deadlockErrors, "PostgreSQL must never report deadlock (40P01) due to ordered locking")

	// Verify balance conservation on PostgreSQL
	refreshedAcc1, _ := queries.GetAccountByID(ctx, acc1.ID)
	refreshedAcc2, _ := queries.GetAccountByID(ctx, acc2.ID)
	assert.Equal(t, int64(2000000), refreshedAcc1.Balance+refreshedAcc2.Balance, "total PostgreSQL balance must remain exactly 2.000.000")
}
