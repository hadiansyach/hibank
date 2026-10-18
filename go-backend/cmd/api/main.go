// Package main is the entrypoint for the Bank A core API service.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hibank/bank-a/internal/account"
	"github.com/hibank/bank-a/internal/auth"
	"github.com/hibank/bank-a/internal/ledger"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/hibank/bank-a/internal/platform/logger"
	"github.com/hibank/bank-a/internal/transfer"
	"github.com/hibank/bank-a/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
)

// dbReadinessAdapter adapts pgxpool.Pool to the httpx.ReadinessChecker interface.
type dbReadinessAdapter struct {
	pool *pgxpool.Pool
}

func (a *dbReadinessAdapter) Ping(ctx context.Context) error {
	return database.Ping(ctx, a.pool)
}

func main() {
	if err := run(); err != nil {
		slog.Error("Application terminated with error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// 1. Initial logger setup
	log := logger.Setup("development", slog.LevelInfo, os.Stdout)

	// 2. Load and validate configuration (fail-fast)
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	// Reconfigure logger if production environment specified
	if cfg.IsProduction() {
		log = logger.Setup(cfg.AppEnv, slog.LevelInfo, os.Stdout)
	}

	log.Info("Starting service",
		"service", cfg.AppName,
		"env", cfg.AppEnv,
		"port", cfg.AppPort,
	)

	// 3. Database connection pool initialization
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var dbPool *pgxpool.Pool
	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		if cfg.IsProduction() {
			return fmt.Errorf("database init failed in production: %w", err)
		}
		log.Warn("Database is not reachable at startup; running in degraded mode (readyz will report down)", "error", err)
	} else {
		dbPool = pool
		defer dbPool.Close()
	}

	var readinessChecker httpx.ReadinessChecker
	if dbPool != nil {
		readinessChecker = &dbReadinessAdapter{pool: dbPool}
	}

	// 4. Initialize ephemeral session store and domain services
	sessionStore := auth.NewMemorySessionStore(1 * time.Minute)
	defer func() {
		_ = sessionStore.Close()
	}()

	sessionManager := auth.NewSessionManager(
		sessionStore,
		cfg.SessionInactivityTimeout,
		cfg.SessionAbsoluteLifetime,
	)

	var authHandler *auth.Handler
	var userHandler *user.Handler
	var accountHandler *account.Handler
	var ledgerHandler *ledger.Handler
	var transferHandler *transfer.Handler
	if dbPool != nil {
		authService := auth.NewService(dbPool, sessionManager)
		authHandler = auth.NewHandler(authService)

		userService := user.NewService(dbPool)
		userHandler = user.NewHandler(userService)

		accountService := account.NewService(dbPool)
		accountHandler = account.NewHandler(accountService)

		ledgerService := ledger.NewService(dbPool)
		ledgerHandler = ledger.NewHandler(ledgerService)

		transferService := transfer.NewService(dbPool, ledgerService)
		transferHandler = transfer.NewHandler(transferService)

		// Start background ledger auditor periodically scanning all accounts for invariant balance
		ledgerAuditor := ledger.NewAuditor(ledgerService, 10*time.Minute)
		ledgerAuditor.Start(ctx)
		defer ledgerAuditor.Stop()
	}

	// 5. Rate limiters
	loginRateLimiter := httpx.NewRateLimiter(10, time.Minute, httpx.DefaultIPKeyExtractor)
	defer loginRateLimiter.Close()

	transferRateLimiter := httpx.NewRateLimiter(30, time.Minute, auth.RateLimitKeyExtractor)
	defer transferRateLimiter.Close()

	// 6. Construct HTTP router with dependencies
	router := httpx.NewRouter(httpx.RouterOptions{
		Config:           cfg,
		ReadinessChecker: readinessChecker,
		MountV1: func(v1 chi.Router) {
			if authHandler != nil {
				authHandler.RegisterRoutes(v1, loginRateLimiter.Middleware)
			}
			v1.Group(func(protected chi.Router) {
				protected.Use(auth.Authenticate(sessionManager))
				if userHandler != nil {
					userHandler.RegisterRoutes(protected)
				}
				if accountHandler != nil {
					accountHandler.RegisterRoutes(protected)
				}
				if ledgerHandler != nil {
					ledgerHandler.RegisterRoutes(protected)
				}
				if transferHandler != nil {
					transferHandler.RegisterRoutes(protected, transferRateLimiter.Middleware)
				}
			})
		},
	})

	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// 5. Start HTTP server asynchronously
	serverErrors := make(chan error, 1)
	go func() {
		log.Info("HTTP server listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- fmt.Errorf("server error: %w", err)
		}
	}()

	// 6. Graceful shutdown listening to OS signals
	shutdownSignal := make(chan os.Signal, 1)
	signal.Notify(shutdownSignal, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		return fmt.Errorf("server crashed: %w", err)
	case sig := <-shutdownSignal:
		log.Info("Shutdown signal received", "signal", sig.String())

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			return fmt.Errorf("could not stop server gracefully: %w", err)
		}

		log.Info("Server stopped cleanly")
	}

	return nil
}
