package ledger

import "errors"

var (
	// ErrAccountNotFound is returned when an account cannot be found or does not belong to the user.
	ErrAccountNotFound = errors.New("account not found or unauthorized")

	// ErrAccountInactive is returned when attempting to transact with a frozen or closed account.
	ErrAccountInactive = errors.New("account is inactive or closed")

	// ErrInsufficientBalance is returned when source account does not have enough funds.
	ErrInsufficientBalance = errors.New("insufficient account balance")

	// ErrInvalidAmount is returned when transaction amount is less than or equal to zero.
	ErrInvalidAmount = errors.New("invalid transaction amount, must be greater than zero")

	// ErrSameAccountTransfer is returned when source and target account IDs are identical.
	ErrSameAccountTransfer = errors.New("cannot transfer to the same account")

	// ErrIdempotencyConflict is returned when a transaction with the same idempotency key already exists with different payload.
	ErrIdempotencyConflict = errors.New("idempotency key conflict")

	// ErrInvalidCursor is returned when cursor string is malformed.
	ErrInvalidCursor = errors.New("invalid cursor format")

	// ErrInvariantViolation is returned when double-entry accounting invariant fails.
	ErrInvariantViolation = errors.New("double-entry ledger invariant violation")
)

