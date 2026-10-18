package account

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	// MaxAccountsPerUser defines the business limit for active savings/checking accounts per customer.
	MaxAccountsPerUser = 3
	// MaxCollisionRetries defines how many times we attempt generating account numbers upon unique conflict.
	MaxCollisionRetries = 5
)

// Service provides domain business operations for customer bank accounts.
type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

// NewService constructs a new account Service.
func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:    pool,
		queries: dbgen.New(pool),
	}
}

// CreateAccount opens a new account for the authenticated user, enforcing account limits and collision-free account numbers.
func (s *Service) CreateAccount(ctx context.Context, userIDStr string, req CreateAccountRequest) (*AccountResponse, error) {
	parsedUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	userUUID := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	// 1. Validate account type (defaults to SAVINGS)
	accountType := strings.ToUpper(strings.TrimSpace(req.AccountType))
	if accountType == "" {
		accountType = "SAVINGS"
	}
	if accountType != "SAVINGS" && accountType != "CHECKING" {
		return nil, ErrInvalidAccountType
	}

	// 2. Check maximum account limit per customer
	count, err := s.queries.CountAccountsByUserID(ctx, userUUID)
	if err != nil {
		return nil, fmt.Errorf("check accounts count: %w", err)
	}
	if count >= MaxAccountsPerUser {
		return nil, ErrAccountLimitExceeded
	}

	// 3. Collision retry loop to insert with unique account number
	for attempt := 0; attempt < MaxCollisionRetries; attempt++ {
		accountNumber, gErr := GenerateAccountNumber()
		if gErr != nil {
			return nil, fmt.Errorf("generate account number: %w", gErr)
		}

		created, cErr := s.queries.CreateAccount(ctx, dbgen.CreateAccountParams{
			UserID:        userUUID,
			AccountNumber: accountNumber,
			AccountType:   accountType,
			Balance:       0,
			Status:        "active",
		})
		if cErr == nil {
			return &AccountResponse{
				ID:            uuid.UUID(created.ID.Bytes).String(),
				UserID:        userIDStr,
				AccountNumber: created.AccountNumber,
				AccountType:   created.AccountType,
				Balance:       created.Balance,
				Status:        created.Status,
				CreatedAt:     created.CreatedAt.Time,
				UpdatedAt:     created.UpdatedAt.Time,
			}, nil
		}

		var pgErr *pgconn.PgError
		if errors.As(cErr, &pgErr) && pgErr.Code == "23505" {
			// Account number collision occurred, retry
			continue
		}

		return nil, fmt.Errorf("insert account: %w", cErr)
	}

	return nil, errors.New("unable to generate unique account number after multiple attempts")
}

// GetAccounts retrieves all active accounts belonging to the authenticated user.
func (s *Service) GetAccounts(ctx context.Context, userIDStr string) ([]AccountResponse, error) {
	parsedUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	userUUID := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	rows, err := s.queries.GetAccountsByUserID(ctx, userUUID)
	if err != nil {
		return nil, fmt.Errorf("get accounts by user: %w", err)
	}

	results := make([]AccountResponse, 0, len(rows))
	for _, row := range rows {
		results = append(results, AccountResponse{
			ID:            uuid.UUID(row.ID.Bytes).String(),
			UserID:        userIDStr,
			AccountNumber: row.AccountNumber,
			AccountType:   row.AccountType,
			Balance:       row.Balance,
			Status:        row.Status,
			CreatedAt:     row.CreatedAt.Time,
			UpdatedAt:     row.UpdatedAt.Time,
		})
	}

	return results, nil
}

// GetAccountDetail retrieves details for a single account while verifying ownership (IDOR defense).
func (s *Service) GetAccountDetail(ctx context.Context, userIDStr, accountIDStr string) (*AccountResponse, error) {
	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}
	accUUID, err := uuid.Parse(accountIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid account uuid: %w", err)
	}

	row, err := s.queries.GetAccountByIDAndUserID(ctx, dbgen.GetAccountByIDAndUserIDParams{
		ID:     pgtype.UUID{Bytes: accUUID, Valid: true},
		UserID: pgtype.UUID{Bytes: userUUID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account detail: %w", err)
	}

	return &AccountResponse{
		ID:            uuid.UUID(row.ID.Bytes).String(),
		UserID:        userIDStr,
		AccountNumber: row.AccountNumber,
		AccountType:   row.AccountType,
		Balance:       row.Balance,
		Status:        row.Status,
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
	}, nil
}

