package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DBTX represents a generic interface for executing queries either directly on a pool or within a transaction.
// This interface matches the expectations of sqlc-generated code.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// WithTx executes the supplied function within a database transaction managed by the pool.
// If fn returns an error or a panic occurs, the transaction is rolled back; otherwise it commits.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	if pool == nil {
		return fmt.Errorf("database: cannot execute transaction on nil pool")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("database: begin tx: %w", err)
	}

	defer func() {
		// Rollback is safe to call even after commit (returns ErrTxClosed)
		_ = tx.Rollback(ctx)
	}()

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("database: commit tx: %w", err)
	}

	return nil
}
