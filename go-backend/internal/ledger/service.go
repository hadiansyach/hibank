package ledger

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/platform/database"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service coordinates double-entry ledger entries, balance transactions, and historical mutation queries.
type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

// NewService constructs a new ledger Service.
func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:    pool,
		queries: dbgen.New(pool),
	}
}

// ExecuteTransferMovement executes an atomic double-entry balance transfer between two accounts.
// Enforces:
// 1. Idempotency replay check.
// 2. Deadlock-free row locking by ascending UUID order.
// 3. Sufficient balance validation on source account.
// 4. Materialized balance update + Transaction row + 2 paired ledger rows (DB & CR) in single DB transaction.
func (s *Service) ExecuteTransferMovement(ctx context.Context, params TransferMovementParams) (*Transaction, error) {
	if params.Amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if params.Fee < 0 {
		return nil, ErrInvalidAmount
	}
	if params.SourceAccountID == params.TargetAccountID {
		return nil, ErrSameAccountTransfer
	}

	srcParsed, err := uuid.Parse(params.SourceAccountID)
	if err != nil {
		return nil, fmt.Errorf("invalid source account id: %w", err)
	}
	tgtParsed, err := uuid.Parse(params.TargetAccountID)
	if err != nil {
		return nil, fmt.Errorf("invalid target account id: %w", err)
	}

	srcUUID := pgtype.UUID{Bytes: srcParsed, Valid: true}
	tgtUUID := pgtype.UUID{Bytes: tgtParsed, Valid: true}

	// 1. Idempotency Check (if key provided)
	if params.IdempotencyKey != "" {
		existing, err := s.queries.GetTransactionByIdempotencyKey(ctx, pgtype.Text{String: params.IdempotencyKey, Valid: true})
		if err == nil {
			// Transaction with this key exists; verify payload matches
			existingSrc := uuid.UUID(existing.SourceAccountID.Bytes).String()
			existingTgt := uuid.UUID(existing.TargetAccountID.Bytes).String()
			if existing.Amount == params.Amount && existingSrc == params.SourceAccountID && existingTgt == params.TargetAccountID {
				return mapDbTransactionToDomain(existing), nil
			}
			return nil, ErrIdempotencyConflict
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("check idempotency key: %w", err)
		}
	}

	var completedTx *Transaction

	// 2. Execute within single atomic database transaction
	err = database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		qtx := s.queries.WithTx(tx)

		// Deadlock prevention: sort account UUIDs alphabetically before locking
		sortedUUIDs := []pgtype.UUID{srcUUID, tgtUUID}
		if bytes.Compare(srcUUID.Bytes[:], tgtUUID.Bytes[:]) > 0 {
			sortedUUIDs[0], sortedUUIDs[1] = tgtUUID, srcUUID
		}

		lockedAccounts, lErr := qtx.GetAccountsForUpdateOrdered(ctx, sortedUUIDs)
		if lErr != nil {
			return fmt.Errorf("lock accounts: %w", lErr)
		}
		if len(lockedAccounts) != 2 {
			return ErrAccountNotFound
		}

		var srcAcc, tgtAcc *dbgen.Account
		for i := range lockedAccounts {
			acc := &lockedAccounts[i]
			if acc.ID == srcUUID {
				srcAcc = acc
			} else if acc.ID == tgtUUID {
				tgtAcc = acc
			}
		}

		if srcAcc == nil || tgtAcc == nil {
			return ErrAccountNotFound
		}

		if srcAcc.Status != "active" || tgtAcc.Status != "active" {
			return ErrAccountInactive
		}

		totalDebit := params.Amount + params.Fee
		if srcAcc.Balance < totalDebit {
			return ErrInsufficientBalance
		}

		// Calculate updated balances
		newSourceBalance := srcAcc.Balance - totalDebit
		newTargetBalance := tgtAcc.Balance + params.Amount

		// Update materialized balances
		if _, uErr := qtx.UpdateAccountBalance(ctx, dbgen.UpdateAccountBalanceParams{
			ID:      srcUUID,
			Balance: newSourceBalance,
		}); uErr != nil {
			return fmt.Errorf("update source balance: %w", uErr)
		}

		if _, uErr := qtx.UpdateAccountBalance(ctx, dbgen.UpdateAccountBalanceParams{
			ID:      tgtUUID,
			Balance: newTargetBalance,
		}); uErr != nil {
			return fmt.Errorf("update target balance: %w", uErr)
		}

		// Insert Transaction record
		refNumber := GenerateReferenceNumber()
		metadataJSON := []byte("{}")
		if params.Metadata != nil {
			if m, mErr := json.Marshal(params.Metadata); mErr == nil {
				metadataJSON = m
			}
		}

		txType := params.Type
		if txType == "" {
			txType = "TRANSFER_INTERNAL"
		}

		insertedTx, tErr := qtx.CreateTransaction(ctx, dbgen.CreateTransactionParams{
			IdempotencyKey:  pgtype.Text{String: params.IdempotencyKey, Valid: params.IdempotencyKey != ""},
			SourceAccountID: srcUUID,
			TargetAccountID: tgtUUID,
			Type:            txType,
			Amount:          params.Amount,
			Fee:             params.Fee,
			Status:          "SUCCESS",
			ReferenceNumber: refNumber,
			Notes:           pgtype.Text{String: params.Notes, Valid: params.Notes != ""},
			Metadata:        metadataJSON,
		})
		if tErr != nil {
			return fmt.Errorf("create transaction record: %w", tErr)
		}

		now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}

		// Insert Debit Ledger Entry (source account)
		if _, lErr := qtx.CreateLedgerEntry(ctx, dbgen.CreateLedgerEntryParams{
			TransactionID: insertedTx.ID,
			AccountID:     srcUUID,
			Direction:     "DB",
			Amount:        totalDebit,
			BalanceAfter:  newSourceBalance,
			CreatedAt:     now,
		}); lErr != nil {
			return fmt.Errorf("create debit ledger entry: %w", lErr)
		}

		// Insert Credit Ledger Entry (target account)
		if _, lErr := qtx.CreateLedgerEntry(ctx, dbgen.CreateLedgerEntryParams{
			TransactionID: insertedTx.ID,
			AccountID:     tgtUUID,
			Direction:     "CR",
			Amount:        params.Amount,
			BalanceAfter:  newTargetBalance,
			CreatedAt:     now,
		}); lErr != nil {
			return fmt.Errorf("create credit ledger entry: %w", lErr)
		}

		completedTx = mapDbTransactionToDomain(insertedTx)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return completedTx, nil
}

// ExecuteDepositMovement credits an account balance directly (e.g. from top-up or cash-in) with double-entry CR ledger record.
func (s *Service) ExecuteDepositMovement(ctx context.Context, params DepositMovementParams) (*Transaction, error) {
	if params.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	tgtParsed, err := uuid.Parse(params.TargetAccountID)
	if err != nil {
		return nil, fmt.Errorf("invalid target account id: %w", err)
	}
	tgtUUID := pgtype.UUID{Bytes: tgtParsed, Valid: true}

	if params.IdempotencyKey != "" {
		existing, err := s.queries.GetTransactionByIdempotencyKey(ctx, pgtype.Text{String: params.IdempotencyKey, Valid: true})
		if err == nil {
			existingTgt := uuid.UUID(existing.TargetAccountID.Bytes).String()
			if existing.Amount == params.Amount && existingTgt == params.TargetAccountID {
				return mapDbTransactionToDomain(existing), nil
			}
			return nil, ErrIdempotencyConflict
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("check idempotency key: %w", err)
		}
	}

	var completedTx *Transaction

	err = database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		qtx := s.queries.WithTx(tx)

		acc, lErr := qtx.GetAccountForUpdate(ctx, tgtUUID)
		if lErr != nil {
			if errors.Is(lErr, pgx.ErrNoRows) {
				return ErrAccountNotFound
			}
			return fmt.Errorf("lock account for deposit: %w", lErr)
		}

		if acc.Status != "active" {
			return ErrAccountInactive
		}

		newBalance := acc.Balance + params.Amount

		if _, uErr := qtx.UpdateAccountBalance(ctx, dbgen.UpdateAccountBalanceParams{
			ID:      tgtUUID,
			Balance: newBalance,
		}); uErr != nil {
			return fmt.Errorf("update deposit balance: %w", uErr)
		}

		refNumber := GenerateReferenceNumber()
		metadataJSON := []byte("{}")
		if params.Metadata != nil {
			if m, mErr := json.Marshal(params.Metadata); mErr == nil {
				metadataJSON = m
			}
		}

		txType := params.Type
		if txType == "" {
			txType = "TOPUP"
		}

		insertedTx, tErr := qtx.CreateTransaction(ctx, dbgen.CreateTransactionParams{
			IdempotencyKey:  pgtype.Text{String: params.IdempotencyKey, Valid: params.IdempotencyKey != ""},
			SourceAccountID: pgtype.UUID{Valid: false}, // No internal source account for external top-ups
			TargetAccountID: tgtUUID,
			Type:            txType,
			Amount:          params.Amount,
			Fee:             0,
			Status:          "SUCCESS",
			ReferenceNumber: refNumber,
			Notes:           pgtype.Text{String: params.Notes, Valid: params.Notes != ""},
			Metadata:        metadataJSON,
		})
		if tErr != nil {
			return fmt.Errorf("create deposit transaction: %w", tErr)
		}

		now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
		if _, lErr := qtx.CreateLedgerEntry(ctx, dbgen.CreateLedgerEntryParams{
			TransactionID: insertedTx.ID,
			AccountID:     tgtUUID,
			Direction:     "CR",
			Amount:        params.Amount,
			BalanceAfter:  newBalance,
			CreatedAt:     now,
		}); lErr != nil {
			return fmt.Errorf("create credit ledger entry: %w", lErr)
		}

		completedTx = mapDbTransactionToDomain(insertedTx)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return completedTx, nil
}

// GetAccountMutations retrieves cursor-paginated ledger mutation history for an account owned by userID (BOLA protected).
func (s *Service) GetAccountMutations(ctx context.Context, userIDStr, accountIDStr, cursorStr string, limit int32) (*MutationsResponse, error) {
	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	accUUID, err := uuid.Parse(accountIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid account uuid: %w", err)
	}

	// 1. Verify ownership (OWASP BOLA protection)
	_, err = s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
		ID:     pgtype.UUID{Bytes: accUUID, Valid: true},
		UserID: pgtype.UUID{Bytes: userUUID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("verify account ownership: %w", err)
	}

	// 2. Parse cursor if present
	var cursorCreatedAt pgtype.Timestamptz
	var cursorID pgtype.UUID

	if cursorStr != "" {
		cTime, cIDStr, cErr := DecodeCursor(cursorStr)
		if cErr != nil {
			return nil, ErrInvalidCursor
		}
		cursorCreatedAt = pgtype.Timestamptz{Time: cTime, Valid: true}
		parsedCID, _ := uuid.Parse(cIDStr)
		cursorID = pgtype.UUID{Bytes: parsedCID, Valid: true}
	}

	// 3. Normalise pagination limit (clamp between 1 and 100, default 20)
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}

	// Fetch limit + 1 to check if there are more records
	rows, err := s.queries.GetMutationsByAccountCursor(ctx, dbgen.GetMutationsByAccountCursorParams{
		AccountID:       pgtype.UUID{Bytes: accUUID, Valid: true},
		Limit:           limit + 1,
		CursorCreatedAt: cursorCreatedAt,
		CursorID:        cursorID,
	})
	if err != nil {
		return nil, fmt.Errorf("query mutations: %w", err)
	}

	hasMore := len(rows) > int(limit)
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]MutationItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, MutationItem{
			ID:              uuid.UUID(row.ID.Bytes).String(),
			TransactionID:   uuid.UUID(row.TransactionID.Bytes).String(),
			AccountID:       uuid.UUID(row.AccountID.Bytes).String(),
			Direction:       row.Direction,
			Amount:          row.Amount,
			BalanceAfter:    row.BalanceAfter,
			TransactionType: row.TransactionType,
			Status:          row.TransactionStatus,
			ReferenceNumber: row.ReferenceNumber,
			Notes:           row.Notes,
			CreatedAt:       row.CreatedAt.Time,
		})
	}

	var nextCursor string
	if hasMore && len(items) > 0 {
		lastItem := items[len(items)-1]
		nextCursor = EncodeCursor(lastItem.CreatedAt, lastItem.ID)
	}

	return &MutationsResponse{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

// VerifyAccountLedgerInvariant verifies the double-entry accounting invariant:
// Total Credits - Total Debits == Current Account Balance.
func (s *Service) VerifyAccountLedgerInvariant(ctx context.Context, accountIDStr string) (bool, int64, int64, int64, error) {
	accUUID, err := uuid.Parse(accountIDStr)
	if err != nil {
		return false, 0, 0, 0, fmt.Errorf("invalid account uuid: %w", err)
	}
	pgAccUUID := pgtype.UUID{Bytes: accUUID, Valid: true}

	acc, err := s.queries.GetAccountByID(ctx, pgAccUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, 0, 0, 0, ErrAccountNotFound
		}
		return false, 0, 0, 0, fmt.Errorf("get account: %w", err)
	}

	sumRow, err := s.queries.GetAccountLedgerSum(ctx, pgAccUUID)
	if err != nil {
		return false, 0, 0, 0, fmt.Errorf("get ledger sum: %w", err)
	}

	ledgerCalculatedBalance := sumRow.TotalCredit - sumRow.TotalDebit
	isBalanced := ledgerCalculatedBalance == acc.Balance

	return isBalanced, acc.Balance, sumRow.TotalCredit, sumRow.TotalDebit, nil
}

// AuditAllAccounts scans all active bank accounts and verifies the fundamental double-entry ledger invariant.
func (s *Service) AuditAllAccounts(ctx context.Context) (*AuditReport, error) {
	if s == nil || s.queries == nil {
		return &AuditReport{AuditedAt: time.Now().UTC()}, nil
	}

	accIDs, err := s.queries.ListAllActiveAccountIDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("list active account ids: %w", err)
	}

	report := &AuditReport{
		TotalScanned: len(accIDs),
		Violations:   make([]InvariantViolation, 0),
		AuditedAt:    time.Now().UTC(),
	}

	for _, accID := range accIDs {
		idStr := uuid.UUID(accID.Bytes).String()
		isBalanced, balance, totalCredit, totalDebit, vErr := s.VerifyAccountLedgerInvariant(ctx, idStr)
		if vErr != nil {
			slog.Warn("Failed to verify account ledger invariant", "account_id", idStr, "error", vErr)
			continue
		}

		if !isBalanced {
			calcBalance := totalCredit - totalDebit
			discrepancy := balance - calcBalance
			slog.Error("CRITICAL: Accounting ledger invariant violation detected!",
				"account_id", idStr,
				"balance", balance,
				"calculated_balance", calcBalance,
				"discrepancy", discrepancy,
			)
			report.Violations = append(report.Violations, InvariantViolation{
				AccountID:         idStr,
				AccountBalance:    balance,
				TotalCredit:       totalCredit,
				TotalDebit:        totalDebit,
				CalculatedBalance: calcBalance,
				Discrepancy:       discrepancy,
			})
		}
	}

	return report, nil
}

func mapDbTransactionToDomain(dbTx dbgen.Transaction) *Transaction {
	var srcID, tgtID string
	if dbTx.SourceAccountID.Valid {
		srcID = uuid.UUID(dbTx.SourceAccountID.Bytes).String()
	}
	if dbTx.TargetAccountID.Valid {
		tgtID = uuid.UUID(dbTx.TargetAccountID.Bytes).String()
	}

	return &Transaction{
		ID:              uuid.UUID(dbTx.ID.Bytes).String(),
		IdempotencyKey:  dbTx.IdempotencyKey.String,
		SourceAccountID: srcID,
		TargetAccountID: tgtID,
		Type:            dbTx.Type,
		Amount:          dbTx.Amount,
		Fee:             dbTx.Fee,
		Status:          dbTx.Status,
		ReferenceNumber: dbTx.ReferenceNumber,
		Notes:           dbTx.Notes.String,
		CreatedAt:       dbTx.CreatedAt.Time,
		UpdatedAt:       dbTx.UpdatedAt.Time,
	}
}

