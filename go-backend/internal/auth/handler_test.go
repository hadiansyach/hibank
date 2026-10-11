package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hibank/bank-a/internal/platform/config"
	"github.com/hibank/bank-a/internal/platform/database"
	"github.com/hibank/bank-a/internal/platform/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T, inactivityTimeout, absoluteLifetime time.Duration) (*pgxpool.Pool, *SessionManager, *MemorySessionStore) {
	t.Helper()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable"
	}

	cfg := &config.Config{
		DatabaseURL:       dbURL,
		DBMaxConns:        5,
		DBMinConns:        1,
		DBMaxConnIdleTime: 5 * time.Minute,
		DBMaxConnLifetime: 10 * time.Minute,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		t.Skipf("PostgreSQL database is not reachable, skipping integration test: %v", err)
	}

	if inactivityTimeout <= 0 {
		inactivityTimeout = 15 * time.Minute
	}
	if absoluteLifetime <= 0 {
		absoluteLifetime = 24 * time.Hour
	}

	store := NewMemorySessionStore(1 * time.Minute)
	sm := NewSessionManager(store, inactivityTimeout, absoluteLifetime)
	return pool, sm, store
}

func setupTestRouter(service *Service, sm *SessionManager) *chi.Mux {
	handler := NewHandler(service)
	router := chi.NewRouter()
	router.Use(httpx.RequestID)

	router.Route("/v1", func(v1 chi.Router) {
		handler.RegisterRoutes(v1)

		// Protected endpoint to verify middleware
		v1.Group(func(protected chi.Router) {
			protected.Use(Authenticate(sm))
			protected.Get("/protected", func(w http.ResponseWriter, r *http.Request) {
				userID, _ := GetUserID(r.Context())
				deviceID, _ := GetDeviceID(r.Context())
				_ = httpx.WriteJSON(w, http.StatusOK, map[string]string{
					"user_id":   userID,
					"device_id": deviceID,
				})
			})
		})
	})

	return router
}

func TestAuth_Integration_Flow(t *testing.T) {
	pool, sm, store := setupTestDB(t, 15*time.Minute, 24*time.Hour)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	router := setupTestRouter(service, sm)

	uniqueSuffix := uuid.New().String()[:8]
	email := fmt.Sprintf("test-%s@hibank.com", uniqueSuffix)
	phone := fmt.Sprintf("0812%08d", time.Now().UnixNano()%100000000)
	password := "SecurePassword123!"

	// 1. Register
	regBody, _ := json.Marshal(RegisterRequest{
		FullName: "Test User",
		Email:    email,
		Phone:    phone,
		Password: password,
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusCreated, rec.Code)
	var regResp UserResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &regResp))
	assert.NotEmpty(t, regResp.ID)
	assert.Equal(t, email, regResp.Email)
	assert.Equal(t, phone, regResp.Phone)
	assert.Equal(t, "active", regResp.Status)

	// 2. Register Duplicate Email -> Expect 409
	reqDup := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	reqDup.Header.Set("Content-Type", "application/json")
	recDup := httptest.NewRecorder()
	router.ServeHTTP(recDup, reqDup)
	assert.Equal(t, http.StatusConflict, recDup.Code)

	// 3. Login with correct credentials -> gets opaque session token
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
		DeviceID: "device-test-01",
	})
	reqLogin := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	recLogin := httptest.NewRecorder()
	router.ServeHTTP(recLogin, reqLogin)

	require.Equal(t, http.StatusOK, recLogin.Code)
	var loginResp SessionResponse
	require.NoError(t, json.Unmarshal(recLogin.Body.Bytes(), &loginResp))
	assert.NotEmpty(t, loginResp.SessionToken)
	assert.Len(t, loginResp.SessionToken, 64) // 256 bits = 64 hex characters
	assert.Equal(t, "Bearer", loginResp.TokenType)
	assert.Greater(t, loginResp.ExpiresIn, int64(0))

	// 4. Access Protected Route with Opaque Session Token
	reqProt := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	reqProt.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	recProt := httptest.NewRecorder()
	router.ServeHTTP(recProt, reqProt)
	assert.Equal(t, http.StatusOK, recProt.Code)

	var protResp map[string]string
	require.NoError(t, json.Unmarshal(recProt.Body.Bytes(), &protResp))
	assert.Equal(t, regResp.ID, protResp["user_id"])
	assert.Equal(t, "device-test-01", protResp["device_id"])

	// 5. Sliding Inactivity Window extension via refresh endpoint
	refBody, _ := json.Marshal(RefreshRequest{
		SessionToken: loginResp.SessionToken,
	})
	reqRef := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewReader(refBody))
	reqRef.Header.Set("Content-Type", "application/json")
	recRef := httptest.NewRecorder()
	router.ServeHTTP(recRef, reqRef)

	require.Equal(t, http.StatusOK, recRef.Code)
	var refResp SessionResponse
	require.NoError(t, json.Unmarshal(recRef.Body.Bytes(), &refResp))
	assert.Equal(t, loginResp.SessionToken, refResp.SessionToken)
	assert.Greater(t, refResp.ExpiresIn, int64(0))

	// 6. Login with wrong password -> Expect 401
	wrongLoginBody, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: "IncorrectPassword!",
		DeviceID: "device-test-01",
	})
	reqWrong := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(wrongLoginBody))
	reqWrong.Header.Set("Content-Type", "application/json")
	recWrong := httptest.NewRecorder()
	router.ServeHTTP(recWrong, reqWrong)
	assert.Equal(t, http.StatusUnauthorized, recWrong.Code)

	// 7. Security verification: Verify refresh_tokens table does NOT exist in PostgreSQL
	var tableCount int
	err := pool.QueryRow(context.Background(),
		"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refresh_tokens'").
		Scan(&tableCount)
	require.NoError(t, err)
	assert.Equal(t, 0, tableCount, "refresh_tokens table must not exist in PostgreSQL")
}

func TestAuth_InactivityTimeout_Expiration(t *testing.T) {
	// Set short inactivity timeout of 50 milliseconds
	pool, sm, store := setupTestDB(t, 50*time.Millisecond, 2*time.Second)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	router := setupTestRouter(service, sm)

	uniqueSuffix := uuid.New().String()[:8]
	email := fmt.Sprintf("inactivity-%s@hibank.com", uniqueSuffix)
	phone := fmt.Sprintf("0813%08d", time.Now().UnixNano()%100000000)
	password := "SecurePassword123!"

	// Register
	regBody, _ := json.Marshal(RegisterRequest{
		FullName: "Inactivity Tester",
		Email:    email,
		Phone:    phone,
		Password: password,
	})
	rReg := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	rReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, rReg)
	require.Equal(t, http.StatusCreated, wReg.Code)

	// Login
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
		DeviceID: "timeout-device",
	})
	rLogin := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(loginBody))
	rLogin.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, rLogin)
	require.Equal(t, http.StatusOK, wLogin.Code)

	var loginResp SessionResponse
	require.NoError(t, json.Unmarshal(wLogin.Body.Bytes(), &loginResp))

	// Immediately access protected endpoint -> 200 OK
	rProt1 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt1.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	wProt1 := httptest.NewRecorder()
	router.ServeHTTP(wProt1, rProt1)
	assert.Equal(t, http.StatusOK, wProt1.Code)

	// Wait for inactivity timeout to pass (> 50ms)
	time.Sleep(75 * time.Millisecond)

	// Subsequent request must be rejected with 401 TOKEN_EXPIRED
	rProt2 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt2.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	wProt2 := httptest.NewRecorder()
	router.ServeHTTP(wProt2, rProt2)
	assert.Equal(t, http.StatusUnauthorized, wProt2.Code)
	assert.Contains(t, wProt2.Body.String(), "TOKEN_EXPIRED")
}

func TestAuth_InstantLogout_Revocation(t *testing.T) {
	pool, sm, store := setupTestDB(t, 15*time.Minute, 24*time.Hour)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	router := setupTestRouter(service, sm)

	uniqueSuffix := uuid.New().String()[:8]
	email := fmt.Sprintf("logout-%s@hibank.com", uniqueSuffix)
	phone := fmt.Sprintf("0814%08d", time.Now().UnixNano()%100000000)
	password := "SecurePassword123!"

	// Register
	regBody, _ := json.Marshal(RegisterRequest{
		FullName: "Logout Tester",
		Email:    email,
		Phone:    phone,
		Password: password,
	})
	rReg := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	rReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, rReg)
	require.Equal(t, http.StatusCreated, wReg.Code)

	// Login
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
		DeviceID: "logout-device",
	})
	rLogin := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(loginBody))
	rLogin.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, rLogin)
	require.Equal(t, http.StatusOK, wLogin.Code)

	var loginResp SessionResponse
	require.NoError(t, json.Unmarshal(wLogin.Body.Bytes(), &loginResp))

	// Verify protected access works before logout
	rProt1 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt1.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	wProt1 := httptest.NewRecorder()
	router.ServeHTTP(wProt1, rProt1)
	assert.Equal(t, http.StatusOK, wProt1.Code)

	// Logout using Authorization header
	rLogout := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", nil)
	rLogout.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	wLogout := httptest.NewRecorder()
	router.ServeHTTP(wLogout, rLogout)
	assert.Equal(t, http.StatusOK, wLogout.Code)

	// Subsequent request must immediately fail with 401 INVALID_TOKEN
	rProt2 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt2.Header.Set("Authorization", "Bearer "+loginResp.SessionToken)
	wProt2 := httptest.NewRecorder()
	router.ServeHTTP(wProt2, rProt2)
	assert.Equal(t, http.StatusUnauthorized, wProt2.Code)
	assert.Contains(t, wProt2.Body.String(), "INVALID_TOKEN")
}

func TestAuth_SessionReplacement_OnNewLogin(t *testing.T) {
	pool, sm, store := setupTestDB(t, 15*time.Minute, 24*time.Hour)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	router := setupTestRouter(service, sm)

	uniqueSuffix := uuid.New().String()[:8]
	email := fmt.Sprintf("preempt-%s@hibank.com", uniqueSuffix)
	phone := fmt.Sprintf("0815%08d", time.Now().UnixNano()%100000000)
	password := "SecurePassword123!"

	// Register
	regBody, _ := json.Marshal(RegisterRequest{
		FullName: "Preempt Tester",
		Email:    email,
		Phone:    phone,
		Password: password,
	})
	rReg := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(regBody))
	rReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, rReg)
	require.Equal(t, http.StatusCreated, wReg.Code)

	// 1. First Login from device-01
	login1Body, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
		DeviceID: "device-01",
	})
	rLogin1 := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(login1Body))
	rLogin1.Header.Set("Content-Type", "application/json")
	wLogin1 := httptest.NewRecorder()
	router.ServeHTTP(wLogin1, rLogin1)
	require.Equal(t, http.StatusOK, wLogin1.Code)

	var sess1 SessionResponse
	require.NoError(t, json.Unmarshal(wLogin1.Body.Bytes(), &sess1))

	// Verify session 1 works
	rProt1 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt1.Header.Set("Authorization", "Bearer "+sess1.SessionToken)
	wProt1 := httptest.NewRecorder()
	router.ServeHTTP(wProt1, rProt1)
	assert.Equal(t, http.StatusOK, wProt1.Code)

	// 2. Second Login from device-02 (different device) -> should coexist
	login2Body, _ := json.Marshal(LoginRequest{
		Email:    email,
		Password: password,
		DeviceID: "device-02",
	})
	rLogin2 := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(login2Body))
	rLogin2.Header.Set("Content-Type", "application/json")
	wLogin2 := httptest.NewRecorder()
	router.ServeHTTP(wLogin2, rLogin2)
	require.Equal(t, http.StatusOK, wLogin2.Code)

	var sess2 SessionResponse
	require.NoError(t, json.Unmarshal(wLogin2.Body.Bytes(), &sess2))

	// Both sess1 (device-01) and sess2 (device-02) should work
	rProt2 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProt2.Header.Set("Authorization", "Bearer "+sess2.SessionToken)
	wProt2 := httptest.NewRecorder()
	router.ServeHTTP(wProt2, rProt2)
	assert.Equal(t, http.StatusOK, wProt2.Code)

	// 3. Third Login from device-01 again -> MUST preempt sess1 on device-01!
	rLogin3 := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(login1Body))
	rLogin3.Header.Set("Content-Type", "application/json")
	wLogin3 := httptest.NewRecorder()
	router.ServeHTTP(wLogin3, rLogin3)
	require.Equal(t, http.StatusOK, wLogin3.Code)

	var sess3 SessionResponse
	require.NoError(t, json.Unmarshal(wLogin3.Body.Bytes(), &sess3))
	assert.NotEqual(t, sess1.SessionToken, sess3.SessionToken)

	// Verify sess1 is now PREEMPTED and invalid -> 401
	rProtOld := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProtOld.Header.Set("Authorization", "Bearer "+sess1.SessionToken)
	wProtOld := httptest.NewRecorder()
	router.ServeHTTP(wProtOld, rProtOld)
	assert.Equal(t, http.StatusUnauthorized, wProtOld.Code)
	assert.Contains(t, wProtOld.Body.String(), "INVALID_TOKEN")

	// Verify sess3 (new device-01) is active -> 200 OK
	rProtNew := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProtNew.Header.Set("Authorization", "Bearer "+sess3.SessionToken)
	wProtNew := httptest.NewRecorder()
	router.ServeHTTP(wProtNew, rProtNew)
	assert.Equal(t, http.StatusOK, wProtNew.Code)

	// Verify sess2 (device-02) is still active -> 200 OK
	rProtDev2 := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
	rProtDev2.Header.Set("Authorization", "Bearer "+sess2.SessionToken)
	wProtDev2 := httptest.NewRecorder()
	router.ServeHTTP(wProtDev2, rProtDev2)
	assert.Equal(t, http.StatusOK, wProtDev2.Code)
}

func TestAuth_ValidationErrors(t *testing.T) {
	pool, sm, store := setupTestDB(t, 15*time.Minute, 24*time.Hour)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	router := setupTestRouter(service, sm)

	tests := []struct {
		name string
		req  RegisterRequest
	}{
		{
			name: "invalid email",
			req: RegisterRequest{
				FullName: "Valid Name",
				Email:    "not-an-email",
				Phone:    "081234567890",
				Password: "ValidPassword123!",
			},
		},
		{
			name: "invalid phone",
			req: RegisterRequest{
				FullName: "Valid Name",
				Email:    "valid@test.com",
				Phone:    "12345",
				Password: "ValidPassword123!",
			},
		},
		{
			name: "short password",
			req: RegisterRequest{
				FullName: "Valid Name",
				Email:    "valid@test.com",
				Phone:    "081234567890",
				Password: "short",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b, _ := json.Marshal(tt.req)
			r := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(b))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestService_LogoutAll_And_GetUserByID(t *testing.T) {
	pool, sm, store := setupTestDB(t, 15*time.Minute, 24*time.Hour)
	defer pool.Close()
	defer func() {
		_ = store.Close()
	}()

	service := NewService(pool, sm)
	ctx := context.Background()

	email := fmt.Sprintf("service-%s@hibank.com", uuid.New().String()[:8])
	user, err := service.Register(ctx, RegisterRequest{
		FullName: "Service Tester",
		Email:    email,
		Phone:    fmt.Sprintf("0816%08d", time.Now().UnixNano()%100000000),
		Password: "Password123!",
	})
	require.NoError(t, err)

	// GetUserByID
	fetched, err := service.GetUserByID(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, user.ID, fetched.ID)
	assert.Equal(t, "Service Tester", fetched.FullName)

	// Login 2 devices
	sess1, err := service.Login(ctx, LoginRequest{Email: email, Password: "Password123!", DeviceID: "dev-1"})
	require.NoError(t, err)
	sess2, err := service.Login(ctx, LoginRequest{Email: email, Password: "Password123!", DeviceID: "dev-2"})
	require.NoError(t, err)

	// LogoutAll
	err = service.LogoutAll(ctx, user.ID)
	require.NoError(t, err)

	// Both should be invalid
	_, err = sm.ValidateAndTouch(ctx, sess1.SessionToken)
	assert.ErrorIs(t, err, ErrSessionNotFound)
	_, err = sm.ValidateAndTouch(ctx, sess2.SessionToken)
	assert.ErrorIs(t, err, ErrSessionNotFound)
}
