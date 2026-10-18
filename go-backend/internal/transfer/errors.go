package transfer

import "errors"

var (
	// ErrSourceAccountNotFound is returned when source account does not exist or does not belong to the user.
	ErrSourceAccountNotFound = errors.New("source account not found or access denied")

	// ErrTargetAccountNotFound is returned when target account number does not exist.
	ErrTargetAccountNotFound = errors.New("target account number not found")

	// ErrSameAccountTransfer is returned when attempting to transfer to the exact same account.
	ErrSameAccountTransfer = errors.New("cannot transfer funds to the same account")

	// ErrAccountInactive is returned when source or target account is not active.
	ErrAccountInactive = errors.New("account is inactive or suspended")

	// ErrInsufficientBalance is returned when source account has less balance than the transfer amount.
	ErrInsufficientBalance = errors.New("insufficient account balance")

	// ErrInvalidAmount is returned when transfer amount is less than the minimum (Rp 10.000).
	ErrInvalidAmount = errors.New("invalid transfer amount, minimum is Rp 10.000")

	// ErrInvalidPIN is returned when the provided transaction PIN is incorrect.
	ErrInvalidPIN = errors.New("incorrect transaction PIN")

	// ErrPINNotConfigured is returned when the user has not set a transaction PIN.
	ErrPINNotConfigured = errors.New("transaction PIN has not been configured")

	// ErrPINLocked is returned when PIN attempts exceeded threshold (3x) and is temporarily locked.
	ErrPINLocked = errors.New("transaction PIN is locked due to multiple failed attempts")

	// ErrMissingIdempotencyKey is returned when the Idempotency-Key HTTP header is omitted.
	ErrMissingIdempotencyKey = errors.New("Idempotency-Key header is required")

	// ErrInvalidAccountNumber is returned when the account number format or checksum is invalid.
	ErrInvalidAccountNumber = errors.New("invalid account number format")

	// ErrTransferNotFound is returned when a transaction cannot be found or the user is not a party to it.
	ErrTransferNotFound = errors.New("transfer transaction not found or access denied")

	// ErrIdempotencyConflict is returned when an idempotency key is reused with differing transaction parameters.
	ErrIdempotencyConflict = errors.New("idempotency key conflict: payload does not match existing transaction")

	// ErrDailyLimitExceeded is returned when the total daily transfer limit is exceeded.
	ErrDailyLimitExceeded = errors.New("daily transfer limit exceeded (maximum Rp 25.000.000 per day)")
)

