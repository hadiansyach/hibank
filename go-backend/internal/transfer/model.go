package transfer

import "time"

// InquiryRequest represents the payload to check recipient details before initiating a transfer.
type InquiryRequest struct {
	SourceAccountID     string `json:"source_account_id"`
	TargetAccountNumber string `json:"target_account_number"`
}

// InquiryResponse returns verified and PII-masked recipient details.
type InquiryResponse struct {
	SourceAccountID     string `json:"source_account_id"`
	TargetAccountNumber string `json:"target_account_number"`
	RecipientName       string `json:"recipient_name"`
	BankCode            string `json:"bank_code"`
	BankName            string `json:"bank_name"`
	Fee                 int64  `json:"fee"`
}

// TransferRequest represents the payload to execute an intra-bank transfer.
type TransferRequest struct {
	SourceAccountID     string `json:"source_account_id"`
	TargetAccountNumber string `json:"target_account_number"`
	Amount              int64  `json:"amount"` // Minimum Rp 10.000
	Notes               string `json:"notes,omitempty"`
	PIN                 string `json:"pin"` // 6-digit transaction PIN
}

// TransferResponse returns the execution status and receipt details.
type TransferResponse struct {
	TransactionID       string    `json:"transaction_id"`
	ReferenceNumber     string    `json:"reference_number"`
	SourceAccountID     string    `json:"source_account_id"`
	SourceAccountNumber string    `json:"source_account_number"`
	TargetAccountID     string    `json:"target_account_id"`
	TargetAccountNumber string    `json:"target_account_number"`
	RecipientName       string    `json:"recipient_name"`
	Amount              int64     `json:"amount"`
	Fee                 int64     `json:"fee"`
	Status              string    `json:"status"`
	Notes               string    `json:"notes,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

