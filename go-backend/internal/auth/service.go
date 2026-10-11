package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	dbgen "github.com/hibank/bank-a/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRequest represents the registration payload.
type RegisterRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// UserResponse represents the public user model without sensitive fields.
type UserResponse struct {
	ID        string    `json:"id"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// LoginRequest represents credentials supplied during authentication.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	DeviceID string `json:"device_id"`
}

// RefreshRequest represents payload for refreshing/touching an active session.
type RefreshRequest struct {
	SessionToken string `json:"session_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Token        string `json:"token,omitempty"`
}

// ExtractToken returns the token provided in any of the supported request fields.
func (r RefreshRequest) ExtractToken() string {
	if r.SessionToken != "" {
		return strings.TrimSpace(r.SessionToken)
	}
	if r.Token != "" {
		return strings.TrimSpace(r.Token)
	}
	return strings.TrimSpace(r.RefreshToken)
}

// SessionResponse returns the active opaque session token and metadata.
type SessionResponse struct {
	SessionToken string `json:"session_token"`
	AccessToken  string `json:"access_token,omitempty"` // Mirrored for backward-compatibility with clients
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"` // Seconds remaining in current sliding inactivity window
}

// TokensResponse is an alias to SessionResponse for backward compatibility.
type TokensResponse = SessionResponse

// Service provides high-level authentication and session use-cases.
type Service struct {
	pool           *pgxpool.Pool
	queries        *dbgen.Queries
	sessionManager *SessionManager
}

// NewService constructs a new auth Service instance backed by the ephemeral session store.
func NewService(pool *pgxpool.Pool, sessionManager *SessionManager) *Service {
	return &Service{
		pool:           pool,
		queries:        dbgen.New(pool),
		sessionManager: sessionManager,
	}
}

// Register registers a new user with hashed password and unique constraints.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*UserResponse, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanPhone := strings.TrimSpace(req.Phone)

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	userRow, err := s.queries.CreateUser(ctx, dbgen.CreateUserParams{
		FullName:     strings.TrimSpace(req.FullName),
		Email:        cleanEmail,
		Phone:        cleanPhone,
		PasswordHash: passwordHash,
		Status:       "active",
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.ConstraintName, "email") {
				return nil, ErrEmailAlreadyExists
			}
			if strings.Contains(pgErr.ConstraintName, "phone") {
				return nil, ErrPhoneAlreadyExists
			}
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	return &UserResponse{
		ID:        uuid.UUID(userRow.ID.Bytes).String(),
		FullName:  userRow.FullName,
		Email:     userRow.Email,
		Phone:     userRow.Phone,
		Status:    userRow.Status,
		CreatedAt: userRow.CreatedAt.Time,
	}, nil
}

// Login validates credentials against PostgreSQL and issues a high-entropy opaque session token
// persisted solely in the ephemeral session cache with single-device preemption semantics.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*SessionResponse, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.queries.GetUserByEmail(ctx, cleanEmail)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	if user.Status != "active" {
		return nil, ErrAccountSuspended
	}

	match, err := VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !match {
		return nil, ErrInvalidCredentials
	}

	userIDStr := uuid.UUID(user.ID.Bytes).String()

	// CreateSession automatically purges any previous session for this (userID, deviceID)
	session, err := s.sessionManager.CreateSession(ctx, userIDStr, req.DeviceID)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return &SessionResponse{
		SessionToken: session.Token,
		AccessToken:  session.Token,
		TokenType:    "Bearer",
		ExpiresIn:    int64(session.InactivityTimeout.Seconds()),
	}, nil
}

// Refresh touches the session in the ephemeral store and returns updated remaining inactivity time.
func (s *Service) Refresh(ctx context.Context, token string) (*SessionResponse, error) {
	cleanToken := strings.TrimSpace(token)
	if cleanToken == "" {
		return nil, ErrInvalidToken
	}

	session, err := s.sessionManager.ValidateAndTouch(ctx, cleanToken)
	if err != nil {
		if errors.Is(err, ErrSessionExpired) || errors.Is(err, ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	remaining := session.RemainingInactivity(time.Now().UTC())
	return &SessionResponse{
		SessionToken: session.Token,
		AccessToken:  session.Token,
		TokenType:    "Bearer",
		ExpiresIn:    int64(remaining.Seconds()),
	}, nil
}

// Logout purges a single session from the ephemeral store immediately.
func (s *Service) Logout(ctx context.Context, token string) error {
	cleanToken := strings.TrimSpace(token)
	if cleanToken == "" {
		return nil
	}
	return s.sessionManager.RevokeSession(ctx, cleanToken)
}

// LogoutAll invalidates all sessions for a user across all devices.
func (s *Service) LogoutAll(ctx context.Context, userIDStr string) error {
	cleanUID := strings.TrimSpace(userIDStr)
	if cleanUID == "" {
		return errors.New("user_id cannot be empty")
	}
	return s.sessionManager.RevokeAllUserSessions(ctx, cleanUID)
}

// GetUserByID retrieves a user profile by UUID.
func (s *Service) GetUserByID(ctx context.Context, userIDStr string) (*UserResponse, error) {
	uid, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	user, err := s.queries.GetUserByID(ctx, pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return &UserResponse{
		ID:        uuid.UUID(user.ID.Bytes).String(),
		FullName:  user.FullName,
		Email:     user.Email,
		Phone:     user.Phone,
		Status:    user.Status,
		CreatedAt: user.CreatedAt.Time,
	}, nil
}
