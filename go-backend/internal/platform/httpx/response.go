// Package httpx provides HTTP routing, middlewares, and JSON response helpers.
package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

// Standard domain sentinel errors
var (
	ErrBadRequest          = errors.New("bad request")
	ErrNotFound            = errors.New("resource not found")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrConflict            = errors.New("conflict")
	ErrInternal            = errors.New("internal server error")
	ErrInsufficientBalance = errors.New("insufficient balance")
	ErrIdempotencyConflict = errors.New("idempotency conflict")
)

// ErrorResponse represents the standardized JSON error structure.
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

// ErrorBody contains specific machine-readable code, human-readable message, and tracking request ID.
type ErrorBody struct {
	Code      string   `json:"code"`
	Message   string   `json:"message"`
	RequestID string   `json:"request_id,omitempty"`
	Details   []string `json:"details,omitempty"`
}

// WriteJSON serializes the provided data payload into JSON with proper content-type header.
func WriteJSON(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data == nil {
		return nil
	}
	return json.NewEncoder(w).Encode(data)
}

// WriteError writes a standardized error JSON response.
func WriteError(w http.ResponseWriter, status int, code, message, requestID string) {
	resp := ErrorResponse{
		Error: ErrorBody{
			Code:      code,
			Message:   message,
			RequestID: requestID,
		},
	}
	_ = WriteJSON(w, status, resp)
}

// WriteErrorWithDetails writes a standardized error JSON response with extra validation details.
func WriteErrorWithDetails(w http.ResponseWriter, status int, code, message, requestID string, details []string) {
	resp := ErrorResponse{
		Error: ErrorBody{
			Code:      code,
			Message:   message,
			RequestID: requestID,
			Details:   details,
		},
	}
	_ = WriteJSON(w, status, resp)
}

// MapDomainError translates domain/sentinel errors to HTTP status code, error code string, and message.
func MapDomainError(err error) (int, string, string) {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, "NOT_FOUND", err.Error()
	case errors.Is(err, ErrUnauthorized):
		return http.StatusUnauthorized, "UNAUTHORIZED", err.Error()
	case errors.Is(err, ErrForbidden):
		return http.StatusForbidden, "FORBIDDEN", err.Error()
	case errors.Is(err, ErrInsufficientBalance):
		return http.StatusUnprocessableEntity, "INSUFFICIENT_BALANCE", "Account balance is insufficient for this transaction"
	case errors.Is(err, ErrIdempotencyConflict):
		return http.StatusConflict, "IDEMPOTENCY_CONFLICT", "A different request was already processed with this idempotency key"
	case errors.Is(err, ErrConflict):
		return http.StatusConflict, "CONFLICT", err.Error()
	case errors.Is(err, ErrBadRequest):
		return http.StatusBadRequest, "BAD_REQUEST", err.Error()
	default:
		return http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred"
	}
}
