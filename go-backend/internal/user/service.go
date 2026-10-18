package user

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/auth"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var pinRegex = regexp.MustCompile(`^[0-9]{6}$`)

// Service handles business logic for user profiles and security credentials.
type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

// NewService constructs a new user Service.
func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:    pool,
		queries: dbgen.New(pool),
	}
}

// GetProfile retrieves the authenticated user's profile.
func (s *Service) GetProfile(ctx context.Context, userIDStr string) (*ProfileResponse, error) {
	parsedUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}

	pgUUID := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	row, err := s.queries.GetUserProfileByID(ctx, pgUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user profile: %w", err)
	}

	return &ProfileResponse{
		ID:        parsedUUID.String(),
		FullName:  row.FullName,
		Email:     row.Email,
		Phone:     row.Phone,
		Status:    row.Status,
		HasPIN:    row.HasPin.Bool,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

// SetOrUpdatePIN configures or updates the 6-digit transaction PIN.
func (s *Service) SetOrUpdatePIN(ctx context.Context, userIDStr string, req UpdatePINRequest) (*UpdatePINResponse, error) {
	if !pinRegex.MatchString(req.PIN) {
		return nil, ErrInvalidPINFormat
	}

	parsedUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user uuid: %w", err)
	}

	pgUUID := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	sec, err := s.queries.GetUserSecurityInfoByID(ctx, pgUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user security info: %w", err)
	}

	// Check if PIN is currently locked due to failed attempts
	if sec.PinLockedUntil.Valid && sec.PinLockedUntil.Time.After(time.Now()) {
		return nil, ErrPINLocked
	}

	// If user already has an active PIN, verify old PIN or password
	hasExistingPIN := sec.PinHash.Valid && sec.PinHash.String != ""
	if hasExistingPIN {
		if req.OldPIN == "" && req.Password == "" {
			return nil, ErrOldPINRequired
		}

		if req.OldPIN != "" {
			valid, vErr := auth.VerifyPassword(req.OldPIN, sec.PinHash.String)
			if vErr != nil || !valid {
				_ = s.queries.RecordFailedPINAttempt(ctx, pgUUID)
				return nil, ErrPINMismatch
			}
		} else if req.Password != "" {
			valid, vErr := auth.VerifyPassword(req.Password, sec.PasswordHash)
			if vErr != nil || !valid {
				return nil, ErrPINMismatch
			}
		}
	}

	// Hash the new 6-digit transaction PIN using Argon2id
	hashedPIN, err := auth.HashPassword(req.PIN)
	if err != nil {
		return nil, fmt.Errorf("hash pin: %w", err)
	}

	err = s.queries.UpdateUserPIN(ctx, dbgen.UpdateUserPINParams{
		ID: pgUUID,
		PinHash: pgtype.Text{
			String: hashedPIN,
			Valid:  true,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("update user pin: %w", err)
	}

	return &UpdatePINResponse{
		Message: "PIN transaksi berhasil disimpan",
		HasPIN:  true,
	}, nil
}

