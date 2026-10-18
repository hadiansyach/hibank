// Package main provides a database seeder for local development and integration testing.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"time"

	"github.com/hibank/bank-a/internal/account"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/ledger"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

type SeedUser struct {
	FullName      string
	Email         string
	Phone         string
	Password      string
	PIN           string
	AccountNumber string
	InitialBalance int64
}

var defaultSeedUsers = []SeedUser{
	{
		FullName:       "Budi Santoso",
		Email:          "budi@hibank.com",
		Phone:          "081234567890",
		Password:       "Password123!",
		PIN:            "123456",
		AccountNumber:  "1088291038",
		InitialBalance: 24750000,
	},
	{
		FullName:       "Siti Rahma",
		Email:          "siti@hibank.com",
		Phone:          "081298765432",
		Password:       "Password123!",
		PIN:            "123456",
		AccountNumber:  "1088291040",
		InitialBalance: 15200000,
	},
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	queries := dbgen.New(pool)

	slog.Info("Seeding development users and bank accounts...")

	for _, u := range defaultSeedUsers {
		var userID pgtype.UUID

		existing, err := queries.GetUserByEmail(ctx, u.Email)
		if err == nil && existing.Email != "" {
			slog.Info("User already exists", "email", u.Email)
			userID = existing.ID
		} else {
			passHash, hErr := auth.HashPassword(u.Password)
			if hErr != nil {
				slog.Error("Failed to hash password", "email", u.Email, "error", hErr)
				continue
			}

			user, cErr := queries.CreateUser(ctx, dbgen.CreateUserParams{
				FullName:     u.FullName,
				Email:        u.Email,
				Phone:        u.Phone,
				PasswordHash: passHash,
				Status:       "active",
			})
			if cErr != nil {
				slog.Error("Failed to create user", "email", u.Email, "error", cErr)
				continue
			}
			userID = user.ID
			slog.Info("Created seed user", "id", fmt.Sprintf("%x", user.ID.Bytes), "name", user.FullName, "email", user.Email)
		}

		// Seed PIN if not set
		pinHash, _ := auth.HashPassword(u.PIN)
		_ = queries.UpdateUserPIN(ctx, dbgen.UpdateUserPINParams{
			ID:      userID,
			PinHash: pgtype.Text{String: pinHash, Valid: true},
		})

		// Seed initial savings account if none exists
		accCount, _ := queries.CountAccountsByUserID(ctx, userID)
		if accCount == 0 {
			accNum := u.AccountNumber
			if !account.ValidateAccountNumber(accNum) {
				accNum, _ = account.GenerateAccountNumber()
			}

			createdAcc, aErr := queries.CreateAccount(ctx, dbgen.CreateAccountParams{
				UserID:        userID,
				AccountNumber: accNum,
				AccountType:   "SAVINGS",
				Balance:       u.InitialBalance,
				Status:        "active",
			})
			if aErr != nil {
				slog.Error("Failed to seed bank account", "email", u.Email, "error", aErr)
			} else {
				slog.Info("Created seed account", "account_number", createdAcc.AccountNumber, "balance", createdAcc.Balance, "user", u.FullName)

				if u.InitialBalance > 0 {
					refNum := ledger.GenerateReferenceNumber()
					initTx, tErr := queries.CreateTransaction(ctx, dbgen.CreateTransactionParams{
						IdempotencyKey:  pgtype.Text{String: "SEED-INIT-" + accNum, Valid: true},
						SourceAccountID: pgtype.UUID{Valid: false},
						TargetAccountID: createdAcc.ID,
						Type:            "TOPUP",
						Amount:          u.InitialBalance,
						Fee:             0,
						Status:          "SUCCESS",
						ReferenceNumber: refNum,
						Notes:           pgtype.Text{String: "Setoran awal pembukaan rekening", Valid: true},
						Metadata:        []byte(`{"channel":"branch_initial_deposit"}`),
					})
					if tErr == nil {
						now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
						_, _ = queries.CreateLedgerEntry(ctx, dbgen.CreateLedgerEntryParams{
							TransactionID: initTx.ID,
							AccountID:     createdAcc.ID,
							Direction:     "CR",
							Amount:        u.InitialBalance,
							BalanceAfter:  u.InitialBalance,
							CreatedAt:     now,
						})
						slog.Info("Seeded initial double-entry ledger entry", "account_number", accNum, "amount", u.InitialBalance)
					}
				}
			}
		}
	}

	slog.Info("Database seeding completed successfully!")
}
