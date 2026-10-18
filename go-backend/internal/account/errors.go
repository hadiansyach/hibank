package account

import "errors"

var (
	// ErrAccountNotFound indicates the requested account was not found or does not belong to user.
	ErrAccountNotFound = errors.New("account not found")
	// ErrAccountLimitExceeded indicates the user has reached the maximum permitted accounts limit.
	ErrAccountLimitExceeded = errors.New("maximum number of accounts reached (limit is 3)")
	// ErrInvalidAccountType indicates an unsupported account category was requested.
	ErrInvalidAccountType = errors.New("invalid account type, must be SAVINGS or CHECKING")
	// ErrAccountInactive indicates the account is frozen or closed.
	ErrAccountInactive = errors.New("account is inactive or suspended")
)

