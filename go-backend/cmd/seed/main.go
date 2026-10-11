// Package main provides a database seeder for local development and integration testing.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
)

type SeedUser struct {
	FullName string
	Email    string
	Phone    string
	Password string
}

var defaultSeedUsers = []SeedUser{
	{
		FullName: "Budi Santoso",
		Email:    "budi@hibank.com",
		Phone:    "081234567890",
		Password: "Password123!",
	},
	{
		FullName: "Siti Rahma",
		Email:    "siti@hibank.com",
		Phone:    "081298765432",
		Password: "Password123!",
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

	slog.Info("Seeding development users...")

	for _, u := range defaultSeedUsers {
		// Check if user already exists
		existing, err := queries.GetUserByEmail(ctx, u.Email)
		if err == nil && existing.Email != "" {
			slog.Info("User already exists, skipping", "email", u.Email)
			continue
		}

		hash, err := auth.HashPassword(u.Password)
		if err != nil {
			slog.Error("Failed to hash password", "email", u.Email, "error", err)
			continue
		}

		user, err := queries.CreateUser(ctx, dbgen.CreateUserParams{
			FullName:     u.FullName,
			Email:        u.Email,
			Phone:        u.Phone,
			PasswordHash: hash,
			Status:       "active",
		})
		if err != nil {
			slog.Error("Failed to create user", "email", u.Email, "error", err)
			continue
		}

		slog.Info("Created seed user",
			"id", fmt.Sprintf("%x", user.ID.Bytes),
			"name", user.FullName,
			"email", user.Email,
			"phone", user.Phone,
		)
	}

	slog.Info("Database seeding completed successfully!")
}
