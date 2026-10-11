// Package logger provides structured logging initialization and context helpers using log/slog.
package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

type contextKey string

const (
	requestIDKey contextKey = "request_id"
)

// Setup initializes the global slog default logger according to the environment.
// For development, it uses a readable TextHandler. For production/staging, it uses JSONHandler.
func Setup(env string, minLevel slog.Level, out io.Writer) *slog.Logger {
	if out == nil {
		out = os.Stdout
	}

	opts := &slog.HandlerOptions{
		Level: minLevel,
	}

	var handler slog.Handler
	if strings.ToLower(env) == "production" || strings.ToLower(env) == "staging" {
		handler = slog.NewJSONHandler(out, opts)
	} else {
		handler = slog.NewTextHandler(out, opts)
	}

	l := slog.New(handler)
	slog.SetDefault(l)
	return l
}

// WithRequestID returns a new context containing the request ID.
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// GetRequestID extracts the request ID from context if present.
func GetRequestID(ctx context.Context) string {
	if val, ok := ctx.Value(requestIDKey).(string); ok {
		return val
	}
	return ""
}

// FromContext returns a logger with contextual attributes (such as request_id) attached.
func FromContext(ctx context.Context) *slog.Logger {
	l := slog.Default()
	if reqID := GetRequestID(ctx); reqID != "" {
		return l.With("request_id", reqID)
	}
	return l
}
