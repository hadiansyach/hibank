package ledger

import "time"

// Transaction represents a financial transaction event between accounts.
type Transaction struct {
	ID              string    `json:"id"`
	IdempotencyKey  string    `json:"idempotency_key,omitempty"`
	SourceAccountID string    `json:"source_account_id,omitempty"`
	TargetAccountID string    `json:"target_account_id,omitempty"`
	Type            string    `json:"type"`
	Amount          int64     `json:"amount"` // Rupiah integer (BIGINT)
	Fee             int64     `json:"fee"`
	Status          string    `json:"status"`
	ReferenceNumber string    `json:"reference_number"`
	Notes           string    `json:"notes,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// LedgerEntry represents a single double-entry debit or credit row.
type LedgerEntry struct {
	ID           string    `json:"id"`
	TransactionID string   `json:"transaction_id"`
	AccountID    string    `json:"account_id"`
	Direction    string    `json:"direction"` // "DB" (Debit) or "CR" (Credit)
	Amount       int64     `json:"amount"`
	BalanceAfter int64     `json:"balance_after"`
	CreatedAt    time.Time `json:"created_at"`
}

// MutationItem represents a historical mutation entry returned to the mobile app.
type MutationItem struct {
	ID              string    `json:"id"`
	TransactionID   string    `json:"transaction_id"`
	AccountID       string    `json:"account_id"`
	Direction       string    `json:"direction"` // "DB" or "CR"
	Amount          int64     `json:"amount"`
	BalanceAfter    int64     `json:"balance_after"`
	TransactionType string    `json:"transaction_type"`
	Status          string    `json:"status"`
	ReferenceNumber string    `json:"reference_number"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
}

// MutationsResponse wraps paginated mutation items with cursor metadata.
type MutationsResponse struct {
	Items      []MutationItem `json:"items"`
	NextCursor string         `json:"next_cursor,omitempty"`
	HasMore    bool           `json:"has_more"`
}

// TransferMovementParams specifies the parameters needed to execute a double-entry balance transfer.
type TransferMovementParams struct {
	IdempotencyKey  string
	SourceAccountID string
	TargetAccountID string
	Type            string // e.g. "TRANSFER_INTERNAL", "TRANSFER_INTERBANK"
	Amount          int64  // Rupiah integer > 0
	Fee             int64  // >= 0
	Notes           string
	Metadata        map[string]any
}

// DepositMovementParams specifies the parameters needed to credit an account from external top-up or cash-in.
type DepositMovementParams struct {
	IdempotencyKey  string
	TargetAccountID string
	Type            string // e.g. "TOPUP"
	Amount          int64  // Rupiah integer > 0
	Notes           string
	Metadata        map[string]any
}

// InvariantViolation records an accounting discrepancy between account balance and ledger entries.
type InvariantViolation struct {
	AccountID         string `json:"account_id"`
	AccountBalance    int64  `json:"account_balance"`
	TotalCredit       int64  `json:"total_credit"`
	TotalDebit        int64  `json:"total_debit"`
	CalculatedBalance int64  `json:"calculated_balance"`
	Discrepancy       int64  `json:"discrepancy"`
}

// AuditReport summarizes the results of a background ledger invariant audit scan.
type AuditReport struct {
	TotalScanned int                  `json:"total_scanned"`
	Violations   []InvariantViolation `json:"violations"`
	AuditedAt    time.Time            `json:"audited_at"`
}


