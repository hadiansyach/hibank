package transfer

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/account"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/ledger"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DefaultMaxDailyTransferLimit defines the standard 24h cumulative transfer limit per source account (Rp 25.000.000).
const DefaultMaxDailyTransferLimit int64 = 25_000_000

// Service orchestrates money transfer inquiries, PIN authorizations, and double-entry execution.
type Service struct {
	pool                  *pgxpool.Pool
	queries               *dbgen.Queries
	ledgerService         *ledger.Service
	maxDailyTransferLimit int64
}

// NewService constructs a new transfer Service with optional configurable daily limit.
func NewService(pool *pgxpool.Pool, ledgerService *ledger.Service, maxDailyLimits ...int64) *Service {
	limit := DefaultMaxDailyTransferLimit
	if len(maxDailyLimits) > 0 && maxDailyLimits[0] > 0 {
		limit = maxDailyLimits[0]
	}
	return &Service{
		pool:                  pool,
		queries:               dbgen.New(pool),
		ledgerService:         ledgerService,
		maxDailyTransferLimit: limit,
	}
}

// SetMaxDailyTransferLimit sets the maximum allowed cumulative daily transfer amount.
func (s *Service) SetMaxDailyTransferLimit(limit int64) {
	s.maxDailyTransferLimit = limit
}

// Inquiry validates recipient account number and returns masked recipient details for customer confirmation.
func (s *Service) Inquiry(ctx context.Context, userIDStr string, req InquiryRequest) (*InquiryResponse, error) {
	// 1. Validate destination account number format and Luhn checksum
	if !account.ValidateAccountNumber(req.TargetAccountNumber) {
		return nil, ErrInvalidAccountNumber
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	srcUUID, err := uuid.Parse(req.SourceAccountID)
	if err != nil {
		return nil, fmt.Errorf("invalid source account id: %w", err)
	}

	// 2. Validate source account ownership (OWASP BOLA)
	srcAcc, err := s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
		ID:     pgtype.UUID{Bytes: srcUUID, Valid: true},
		UserID: pgtype.UUID{Bytes: userUUID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSourceAccountNotFound
		}
		return nil, fmt.Errorf("verify source account: %w", err)
	}

	if srcAcc.Status != "active" {
		return nil, ErrAccountInactive
	}

	// 3. Lookup target recipient account
	targetInfo, err := s.queries.GetAccountOwnerInfoByNumber(ctx, req.TargetAccountNumber)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTargetAccountNotFound
		}
		return nil, fmt.Errorf("lookup recipient: %w", err)
	}

	if targetInfo.AccountStatus != "active" || targetInfo.UserStatus != "active" {
		return nil, ErrAccountInactive
	}

	// 4. Prohibit transferring to own identical account
	targetAccID := uuid.UUID(targetInfo.AccountID.Bytes).String()
	if targetAccID == req.SourceAccountID {
		return nil, ErrSameAccountTransfer
	}

	return &InquiryResponse{
		SourceAccountID:     req.SourceAccountID,
		TargetAccountNumber: req.TargetAccountNumber,
		RecipientName:       MaskRecipientName(targetInfo.FullName),
		BankCode:            "108",
		BankName:            "HiBank",
		Fee:                 0,
	}, nil
}

// ExecuteTransfer authorizes transaction PIN and executes double-entry ledger money movement.
func (s *Service) ExecuteTransfer(ctx context.Context, userIDStr, idempotencyKey string, req TransferRequest) (*TransferResponse, error) {
	// 1. Validate idempotency key
	if strings.TrimSpace(idempotencyKey) == "" {
		return nil, ErrMissingIdempotencyKey
	}

	// 2. Validate minimum transfer amount (Rp 10.000)
	if req.Amount < 10000 {
		return nil, ErrInvalidAmount
	}

	// 3. Early Idempotency Replay & Conflict Check
	existingTx, err := s.queries.GetTransactionByIdempotencyKey(ctx, pgtype.Text{String: idempotencyKey, Valid: true})
	if err == nil {
		// Existing transaction found; verify payload matches
		existingSrc := uuid.UUID(existingTx.SourceAccountID.Bytes).String()
		if existingSrc != req.SourceAccountID || existingTx.Amount != req.Amount {
			return nil, ErrIdempotencyConflict
		}
		receipt, rErr := s.queries.GetTransferReceiptByID(ctx, existingTx.ID)
		if rErr == nil {
			return &TransferResponse{
				TransactionID:       uuid.UUID(receipt.ID.Bytes).String(),
				ReferenceNumber:     receipt.ReferenceNumber,
				SourceAccountID:     uuid.UUID(receipt.SourceAccountID.Bytes).String(),
				SourceAccountNumber: receipt.SourceAccountNumber,
				TargetAccountID:     uuid.UUID(receipt.TargetAccountID.Bytes).String(),
				TargetAccountNumber: receipt.TargetAccountNumber,
				RecipientName:       MaskRecipientName(receipt.TargetUserName),
				Amount:              receipt.Amount,
				Fee:                 receipt.Fee,
				Status:              receipt.Status,
				Notes:               receipt.Notes,
				CreatedAt:           receipt.CreatedAt.Time,
			}, nil
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check idempotency key: %w", err)
	}

	// 4. Validate PIN format (exactly 6 numeric digits)
	pin := strings.TrimSpace(req.PIN)
	if len(pin) != 6 {
		return nil, ErrInvalidPIN
	}
	for _, ch := range pin {
		if ch < '0' || ch > '9' {
			return nil, ErrInvalidPIN
		}
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	pgUserUUID := pgtype.UUID{Bytes: userUUID, Valid: true}

	// 4. Verify PIN and Lockout state
	secInfo, err := s.queries.GetUserSecurityInfoByID(ctx, pgUserUUID)
	if err != nil {
		return nil, fmt.Errorf("fetch security info: %w", err)
	}

	if secInfo.PinLockedUntil.Valid && time.Now().Before(secInfo.PinLockedUntil.Time) {
		return nil, ErrPINLocked
	}

	if !secInfo.PinHash.Valid || secInfo.PinHash.String == "" {
		return nil, ErrPINNotConfigured
	}

	valid, vErr := auth.VerifyPassword(pin, secInfo.PinHash.String)
	if vErr != nil || !valid {
		_ = s.queries.RecordFailedPINAttempt(ctx, pgUserUUID)
		if secInfo.FailedPinAttempts+1 >= 3 {
			return nil, ErrPINLocked
		}
		return nil, ErrInvalidPIN
	}

	// Reset failed attempts upon successful PIN verification
	if secInfo.FailedPinAttempts > 0 {
		_ = s.queries.ResetFailedPINAttempts(ctx, pgUserUUID)
	}

	// 5. Verify source account ownership (OWASP BOLA)
	srcUUID, err := uuid.Parse(req.SourceAccountID)
	if err != nil {
		return nil, fmt.Errorf("invalid source account id: %w", err)
	}
	srcAcc, err := s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
		ID:     pgtype.UUID{Bytes: srcUUID, Valid: true},
		UserID: pgUserUUID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSourceAccountNotFound
		}
		return nil, fmt.Errorf("verify source account: %w", err)
	}

	if srcAcc.Status != "active" {
		return nil, ErrAccountInactive
	}

	if srcAcc.Balance < req.Amount {
		return nil, ErrInsufficientBalance
	}

	// 5.1 Enforce Daily Transfer Cumulative Limit
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	dailyTransferred, dErr := s.queries.GetDailyTransferTotal(ctx, dbgen.GetDailyTransferTotalParams{
		SourceAccountID: pgtype.UUID{Bytes: srcUUID, Valid: true},
		CreatedAt:       pgtype.Timestamptz{Time: startOfDay, Valid: true},
	})
	if dErr != nil && !errors.Is(dErr, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check daily transfer total: %w", dErr)
	}

	if dailyTransferred+req.Amount > s.maxDailyTransferLimit {
		return nil, ErrDailyLimitExceeded
	}

	// 6. Verify target account
	targetInfo, err := s.queries.GetAccountOwnerInfoByNumber(ctx, req.TargetAccountNumber)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTargetAccountNotFound
		}
		return nil, fmt.Errorf("lookup recipient: %w", err)
	}

	if targetInfo.AccountStatus != "active" || targetInfo.UserStatus != "active" {
		return nil, ErrAccountInactive
	}

	targetAccID := uuid.UUID(targetInfo.AccountID.Bytes).String()
	if targetAccID == req.SourceAccountID {
		return nil, ErrSameAccountTransfer
	}

	// 7. Delegate atomic double-entry balance movement to LedgerService
	tx, err := s.ledgerService.ExecuteTransferMovement(ctx, ledger.TransferMovementParams{
		IdempotencyKey:  idempotencyKey,
		SourceAccountID: req.SourceAccountID,
		TargetAccountID: targetAccID,
		Type:            "TRANSFER_INTERNAL",
		Amount:          req.Amount,
		Fee:             0,
		Notes:           req.Notes,
		Metadata: map[string]any{
			"channel":               "mobile_app",
			"target_account_number": req.TargetAccountNumber,
		},
	})
	if err != nil {
		switch {
		case errors.Is(err, ledger.ErrInsufficientBalance):
			return nil, ErrInsufficientBalance
		case errors.Is(err, ledger.ErrSameAccountTransfer):
			return nil, ErrSameAccountTransfer
		case errors.Is(err, ledger.ErrAccountInactive):
			return nil, ErrAccountInactive
		case errors.Is(err, ledger.ErrIdempotencyConflict):
			return nil, ErrIdempotencyConflict
		default:
			return nil, fmt.Errorf("execute ledger movement: %w", err)
		}
	}

	return &TransferResponse{
		TransactionID:       tx.ID,
		ReferenceNumber:     tx.ReferenceNumber,
		SourceAccountID:     req.SourceAccountID,
		SourceAccountNumber: srcAcc.AccountNumber,
		TargetAccountID:     targetAccID,
		TargetAccountNumber: req.TargetAccountNumber,
		RecipientName:       MaskRecipientName(targetInfo.FullName),
		Amount:              tx.Amount,
		Fee:                 tx.Fee,
		Status:              tx.Status,
		Notes:               tx.Notes,
		CreatedAt:           tx.CreatedAt,
	}, nil
}

// GetReceipt retrieves the transfer receipt for an authorized sender or receiver.
func (s *Service) GetReceipt(ctx context.Context, userIDStr, txIDStr string) (*TransferResponse, error) {
	txUUID, err := uuid.Parse(txIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid transaction uuid: %w", err)
	}
	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	pgUserUUID := pgtype.UUID{Bytes: userUUID, Valid: true}

	row, err := s.queries.GetTransferReceiptByID(ctx, pgtype.UUID{Bytes: txUUID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTransferNotFound
		}
		return nil, fmt.Errorf("fetch transfer receipt: %w", err)
	}

	// Verify authorization (user must own source or target account)
	isAuthorized := false
	if row.SourceAccountID.Valid {
		if _, sErr := s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
			ID:     row.SourceAccountID,
			UserID: pgUserUUID,
		}); sErr == nil {
			isAuthorized = true
		}
	}
	if !isAuthorized && row.TargetAccountID.Valid {
		if _, tErr := s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
			ID:     row.TargetAccountID,
			UserID: pgUserUUID,
		}); tErr == nil {
			isAuthorized = true
		}
	}

	if !isAuthorized {
		return nil, ErrTransferNotFound
	}

	var srcID string
	if row.SourceAccountID.Valid {
		srcID = uuid.UUID(row.SourceAccountID.Bytes).String()
	}
	tgtID := uuid.UUID(row.TargetAccountID.Bytes).String()

	return &TransferResponse{
		TransactionID:       uuid.UUID(row.ID.Bytes).String(),
		ReferenceNumber:     row.ReferenceNumber,
		SourceAccountID:     srcID,
		SourceAccountNumber: row.SourceAccountNumber,
		TargetAccountID:     tgtID,
		TargetAccountNumber: row.TargetAccountNumber,
		RecipientName:       MaskRecipientName(row.TargetUserName),
		Amount:              row.Amount,
		Fee:                 row.Fee,
		Status:              row.Status,
		Notes:               row.Notes,
		CreatedAt:           row.CreatedAt.Time,
	}, nil
}

