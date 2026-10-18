package user

import "errors"

var (
	// ErrUserNotFound indicates the requested user was not found.
	ErrUserNotFound = errors.New("user not found")
	// ErrInvalidPINFormat indicates the PIN format is not exactly 6 digits.
	ErrInvalidPINFormat = errors.New("pin must be exactly 6 numeric digits")
	// ErrOldPINRequired indicates that old_pin or password is required because user already has a PIN.
	ErrOldPINRequired = errors.New("current pin or password is required to change pin")
	// ErrPINMismatch indicates the candidate old PIN or password does not match.
	ErrPINMismatch = errors.New("incorrect current pin or password")
	// ErrPINLocked indicates the PIN is temporarily locked due to excessive failed attempts.
	ErrPINLocked = errors.New("pin is temporarily locked due to too many failed attempts")
)

