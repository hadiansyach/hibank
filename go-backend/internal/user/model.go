package user

import "time"

// ProfileResponse represents the user's public profile data.
type ProfileResponse struct {
	ID        string    `json:"id"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Status    string    `json:"status"`
	HasPIN    bool      `json:"has_pin"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UpdatePINRequest represents payload for setting or updating 6-digit transaction PIN.
type UpdatePINRequest struct {
	PIN      string `json:"pin"`                // New 6-digit PIN
	OldPIN   string `json:"old_pin,omitempty"`  // Current 6-digit PIN (if already has PIN)
	Password string `json:"password,omitempty"` // Alternative verification using account password
}

// UpdatePINResponse represents the response when PIN is set or updated.
type UpdatePINResponse struct {
	Message string `json:"message"`
	HasPIN  bool   `json:"has_pin"`
}

