package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfig_Defaults(t *testing.T) {
	cfg := &Config{
		AppEnv:               getEnv("APP_ENV", "development"),
		AppPort:              getEnv("APP_PORT", "8080"),
		AppName:              getEnv("APP_NAME", "bank-a-api"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable"),
		DBMaxConns:           getEnvInt32("DB_MAX_CONNS", 25),
		DBMinConns:           getEnvInt32("DB_MIN_CONNS", 5),
		DBMaxConnIdleTime:    getEnvDuration("DB_MAX_CONN_IDLE_TIME", 15*time.Minute),
		DBMaxConnLifetime:    getEnvDuration("DB_MAX_CONN_LIFETIME", 1*time.Hour),
		JWTSecret:                getEnv("JWT_SECRET", "bank-a-insecure-dev-jwt-secret-key-32chars!"),
		JWTAccessExpiration:      getEnvDuration("JWT_ACCESS_EXPIRATION", 15*time.Minute),
		JWTRefreshExpiration:     getEnvDuration("JWT_REFRESH_EXPIRATION", 7*24*time.Hour),
		SessionInactivityTimeout: getEnvDuration("SESSION_INACTIVITY_TIMEOUT", 15*time.Minute),
		SessionAbsoluteLifetime:  getEnvDuration("SESSION_ABSOLUTE_LIFETIME", 24*time.Hour),
	}

	require.NoError(t, cfg.Validate())
	assert.Equal(t, "development", cfg.AppEnv)
	assert.Equal(t, "8080", cfg.AppPort)
	assert.Equal(t, "bank-a-api", cfg.AppName)
	assert.Equal(t, int32(25), cfg.DBMaxConns)
	assert.Equal(t, int32(5), cfg.DBMinConns)
	assert.Equal(t, 15*time.Minute, cfg.DBMaxConnIdleTime)
	assert.Equal(t, 1*time.Hour, cfg.DBMaxConnLifetime)
	assert.Equal(t, 15*time.Minute, cfg.JWTAccessExpiration)
	assert.Equal(t, 7*24*time.Hour, cfg.JWTRefreshExpiration)
	assert.Equal(t, 15*time.Minute, cfg.SessionInactivityTimeout)
	assert.Equal(t, 24*time.Hour, cfg.SessionAbsoluteLifetime)
	assert.False(t, cfg.IsProduction())
}

func TestConfig_EnvironmentOverrides(t *testing.T) {
	t.Setenv("APP_ENV", "staging")
	t.Setenv("APP_PORT", "9090")
	t.Setenv("DB_MAX_CONNS", "50")
	t.Setenv("DB_MIN_CONNS", "10")
	t.Setenv("JWT_ACCESS_EXPIRATION", "30m")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "staging", cfg.AppEnv)
	assert.Equal(t, "9090", cfg.AppPort)
	assert.Equal(t, int32(50), cfg.DBMaxConns)
	assert.Equal(t, int32(10), cfg.DBMinConns)
	assert.Equal(t, 30*time.Minute, cfg.JWTAccessExpiration)
}

func TestConfig_ValidationErrors(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(subT *testing.T)
		wantErr string
	}{
		{
			name: "empty app port",
			mutate: func(subT *testing.T) {
				subT.Setenv("APP_PORT", "")
			},
			wantErr: "APP_PORT cannot be empty",
		},
		{
			name: "empty database URL",
			mutate: func(subT *testing.T) {
				subT.Setenv("DATABASE_URL", "")
			},
			wantErr: "DATABASE_URL cannot be empty",
		},
		{
			name: "min conns greater than max conns",
			mutate: func(subT *testing.T) {
				subT.Setenv("DB_MAX_CONNS", "5")
				subT.Setenv("DB_MIN_CONNS", "10")
			},
			wantErr: "cannot exceed DB_MAX_CONNS",
		},
		{
			name: "production with weak JWT secret",
			mutate: func(subT *testing.T) {
				subT.Setenv("APP_ENV", "production")
				subT.Setenv("JWT_SECRET", "short")
			},
			wantErr: "JWT_SECRET must be at least 32 characters long",
		},
		{
			name: "production with dev default JWT secret",
			mutate: func(subT *testing.T) {
				subT.Setenv("APP_ENV", "production")
				subT.Setenv("JWT_SECRET", "bank-a-insecure-dev-jwt-secret-key-32chars!")
			},
			wantErr: "must not use development default secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(subT *testing.T) {
			tt.mutate(subT)
			_, err := Load()
			require.Error(subT, err)
			assert.Contains(subT, err.Error(), tt.wantErr)
		})
	}
}
