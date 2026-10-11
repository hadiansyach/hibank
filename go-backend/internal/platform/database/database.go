// Package database provides PostgreSQL connection pool management and transaction utilities.
package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool initializes and returns a pgx connection pool based on configuration.
func NewPool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("database: parse config: %w", err)
	}

	poolConfig.MaxConns = cfg.DBMaxConns
	poolConfig.MinConns = cfg.DBMinConns
	poolConfig.MaxConnIdleTime = cfg.DBMaxConnIdleTime
	poolConfig.MaxConnLifetime = cfg.DBMaxConnLifetime
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	connectCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(connectCtx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("database: connect pool: %w", err)
	}

	if err := pool.Ping(connectCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database: ping: %w", err)
	}

	slog.InfoContext(ctx, "Database connection pool established",
		"max_conns", cfg.DBMaxConns,
		"min_conns", cfg.DBMinConns,
	)

	return pool, nil
}

// Ping checks whether the database pool is accessible.
func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return fmt.Errorf("database: pool is uninitialized")
	}

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	return pool.Ping(pingCtx)
}
