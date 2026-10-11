// Package config manages application configuration loaded from environment variables with fail-fast validation.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config represents all application configuration loaded from environment variables.
type Config struct {
	AppEnv               string
	AppPort              string
	AppName              string
	DatabaseURL          string
	DBMaxConns           int32
	DBMinConns           int32
	DBMaxConnIdleTime    time.Duration
	DBMaxConnLifetime    time.Duration
	JWTSecret                string
	JWTAccessExpiration      time.Duration
	JWTRefreshExpiration     time.Duration
	SessionInactivityTimeout time.Duration
	SessionAbsoluteLifetime  time.Duration
}

// Load loads configuration from environment variables, optionally reading from .env file if it exists.
// It applies defaults and performs validation (fail-fast on startup).
func Load() (*Config, error) {
	// Attempt to load .env file if present, ignore file not found error
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:                   getEnv("APP_ENV", "development"),
		AppPort:                  getEnv("APP_PORT", "8080"),
		AppName:                  getEnv("APP_NAME", "bank-a-api"),
		DatabaseURL:              getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable"),
		DBMaxConns:               getEnvInt32("DB_MAX_CONNS", 25),
		DBMinConns:               getEnvInt32("DB_MIN_CONNS", 5),
		DBMaxConnIdleTime:        getEnvDuration("DB_MAX_CONN_IDLE_TIME", 15*time.Minute),
		DBMaxConnLifetime:        getEnvDuration("DB_MAX_CONN_LIFETIME", 1*time.Hour),
		JWTSecret:                getEnv("JWT_SECRET", "bank-a-insecure-dev-jwt-secret-key-32chars!"),
		JWTAccessExpiration:      getEnvDuration("JWT_ACCESS_EXPIRATION", 15*time.Minute),
		JWTRefreshExpiration:     getEnvDuration("JWT_REFRESH_EXPIRATION", 7*24*time.Hour),
		SessionInactivityTimeout: getEnvDuration("SESSION_INACTIVITY_TIMEOUT", 15*time.Minute),
		SessionAbsoluteLifetime:  getEnvDuration("SESSION_ABSOLUTE_LIFETIME", 24*time.Hour),
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// Validate checks for mandatory configuration values and invariants.
func (c *Config) Validate() error {
	if c.AppPort == "" {
		return errors.New("APP_PORT cannot be empty")
	}

	if c.DatabaseURL == "" {
		return errors.New("DATABASE_URL cannot be empty")
	}

	if c.DBMaxConns <= 0 {
		return errors.New("DB_MAX_CONNS must be greater than 0")
	}

	if c.DBMinConns < 0 {
		return errors.New("DB_MIN_CONNS cannot be negative")
	}

	if c.DBMinConns > c.DBMaxConns {
		return fmt.Errorf("DB_MIN_CONNS (%d) cannot exceed DB_MAX_CONNS (%d)", c.DBMinConns, c.DBMaxConns)
	}

	if c.SessionInactivityTimeout <= 0 {
		return errors.New("SESSION_INACTIVITY_TIMEOUT must be greater than 0")
	}

	if c.SessionAbsoluteLifetime <= 0 {
		return errors.New("SESSION_ABSOLUTE_LIFETIME must be greater than 0")
	}

	isProduction := strings.EqualFold(c.AppEnv, "production")
	if isProduction {
		if len(c.JWTSecret) < 32 {
			return errors.New("JWT_SECRET must be at least 32 characters long in production")
		}
		if strings.Contains(c.JWTSecret, "insecure-dev") {
			return errors.New("JWT_SECRET must not use development default secret in production")
		}
	}

	return nil
}

// IsProduction returns true if current environment is production.
func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.AppEnv, "production")
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return strings.TrimSpace(val)
	}
	return defaultVal
}

func getEnvInt32(key string, defaultVal int32) int32 {
	valStr, ok := os.LookupEnv(key)
	if !ok {
		return defaultVal
	}
	valStr = strings.TrimSpace(valStr)
	if valStr == "" {
		return 0
	}
	val, err := strconv.ParseInt(valStr, 10, 32)
	if err != nil {
		return 0
	}
	return int32(val)
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	valStr, ok := os.LookupEnv(key)
	if !ok {
		return defaultVal
	}
	valStr = strings.TrimSpace(valStr)
	if valStr == "" {
		return 0
	}
	val, err := time.ParseDuration(valStr)
	if err != nil {
		return 0
	}
	return val
}
