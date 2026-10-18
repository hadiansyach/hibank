package account

import "time"

// CreateAccountRequest represents the payload for opening a new bank account.
type CreateAccountRequest struct {
	AccountType string `json:"account_type,omitempty"` // "SAVINGS" (default) or "CHECKING"
}

// AccountResponse represents public account details without internal audit flags.
type AccountResponse struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	AccountNumber string    `json:"account_number"`
	AccountType   string    `json:"account_type"`
	Balance       int64     `json:"balance"` // Rupiah integer (BIGINT)
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

