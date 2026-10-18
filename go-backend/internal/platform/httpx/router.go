package httpx

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/logger"
)

// ReadinessChecker defines a contract for verifying external service readiness.
type ReadinessChecker interface {
	Ping(ctx context.Context) error
}

// RouterOptions groups configuration and dependencies for building the HTTP router.
type RouterOptions struct {
	Config           *config.Config
	ReadinessChecker ReadinessChecker
	MountV1          func(v1 chi.Router)
}

// NewRouter constructs a configured chi.Mux router with standard middleware stack and health endpoints.
func NewRouter(opts RouterOptions) *chi.Mux {
	r := chi.NewRouter()

	// Global Middleware Pipeline
	r.Use(RequestID)
	r.Use(AccessLogger)
	r.Use(Recovery)
	r.Use(SecurityHeaders)
	r.Use(CORS([]string{"*"}))
	r.Use(middleware.CleanPath)
	r.Use(MaxBodySize(1 << 20)) // 1MB payload limit (OWASP API4)

	// Custom 404 and 405 handlers returning consistent JSON format
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		reqID := logger.GetRequestID(r.Context())
		WriteError(w, http.StatusNotFound, "NOT_FOUND", "The requested endpoint was not found", reqID)
	})

	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		reqID := logger.GetRequestID(r.Context())
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed for this endpoint", reqID)
	})

	// Health check endpoints (Sprint 0 requirement)
	r.Get("/healthz", handleHealthz(opts.Config.AppName))
	r.Get("/readyz", handleReadyz(opts.Config.AppName, opts.ReadinessChecker))

	// API version 1 route group
	r.Route("/v1", func(v1 chi.Router) {
		v1.Get("/ping", func(w http.ResponseWriter, _ *http.Request) {
			_ = WriteJSON(w, http.StatusOK, map[string]string{
				"message": "pong",
				"version": "v1",
			})
		})

		if opts.MountV1 != nil {
			opts.MountV1(v1)
		}
	})

	return r
}

// HealthResponse represents the payload returned by the /healthz liveness endpoint.
type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

// ReadyResponse represents the payload returned by the /readyz readiness probe.
type ReadyResponse struct {
	Status   string `json:"status"`
	Service  string `json:"service"`
	Database string `json:"database"`
}

func handleHealthz(serviceName string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		_ = WriteJSON(w, http.StatusOK, HealthResponse{
			Status:  "ok",
			Service: serviceName,
		})
	}
}

func handleReadyz(serviceName string, checker ReadinessChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqID := logger.GetRequestID(r.Context())

		if checker == nil {
			WriteError(w, http.StatusServiceUnavailable, "DEPENDENCY_UNAVAILABLE", "Readiness checker is unconfigured", reqID)
			return
		}

		if err := checker.Ping(r.Context()); err != nil {
			_ = WriteJSON(w, http.StatusServiceUnavailable, ReadyResponse{
				Status:   "unavailable",
				Service:  serviceName,
				Database: "down",
			})
			return
		}

		_ = WriteJSON(w, http.StatusOK, ReadyResponse{
			Status:   "ready",
			Service:  serviceName,
			Database: "up",
		})
	}
}
