package httpx

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// HeaderRequestID is the standard HTTP header for tracing requests.
const HeaderRequestID = "X-Request-ID"

// RequestID middleware extracts or generates a unique Request ID for each incoming HTTP request.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := strings.TrimSpace(r.Header.Get(HeaderRequestID))
		if reqID == "" {
			reqID = uuid.New().String()
		}

		ctx := logger.WithRequestID(r.Context(), reqID)
		w.Header().Set(HeaderRequestID, reqID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// responseWriterInterceptor wraps http.ResponseWriter to capture status code and bytes written.
type responseWriterInterceptor struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
}

func (rw *responseWriterInterceptor) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriterInterceptor) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += int64(n)
	return n, err
}

// AccessLogger logs structured HTTP request metadata using log/slog.
// It never records sensitive data such as passwords, tokens, or PINs.
func AccessLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriterInterceptor{ResponseWriter: w}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		reqID := logger.GetRequestID(r.Context())

		status := rw.statusCode
		if status == 0 {
			status = http.StatusOK
		}

		level := slog.LevelInfo
		if status >= 500 {
			level = slog.LevelError
		} else if status >= 400 {
			level = slog.LevelWarn
		}

		slog.Log(r.Context(), level, "HTTP request handled",
			"request_id", reqID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"duration_ms", duration.Milliseconds(),
			"bytes", rw.bytesWritten,
			"client_ip", r.RemoteAddr,
		)
	})
}

// Recovery catches any unexpected panic in request processing and outputs a 500 JSON response.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				reqID := logger.GetRequestID(r.Context())
				stack := string(debug.Stack())

				slog.ErrorContext(r.Context(), "Panic recovered in HTTP handler",
					"request_id", reqID,
					"panic", fmt.Sprintf("%v", rec),
					"stack", stack,
				)

				WriteError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Internal server error occurred", reqID)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders applies baseline security headers to harden HTTP responses.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "0")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// CORS provides a lightweight CORS handler with preflight support.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originsMap := make(map[string]bool)
	allowAll := false
	for _, o := range allowedOrigins {
		if o == "*" {
			allowAll = true
			break
		}
		originsMap[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowAll {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if originsMap[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-Request-ID, Idempotency-Key")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Timeout middleware attaches a context deadline to the request.
func Timeout(duration time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), duration)
			defer cancel()
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// MaxBodySize limits the size of request bodies to prevent resource exhaustion attacks (OWASP API4).
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}
