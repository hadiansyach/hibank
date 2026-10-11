# HiBank Core API (Bank A)

REST API backend for a digital mobile banking system built in Go. Designed following fintech engineering best practices: double-entry bookkeeping, strict concurrency controls (row locking ordered by ID), ACID transactions, idempotency keys, and clean modular monolith architecture.

---

## 1. Architecture Overview

- **Service Role:** Bank A Core Digital Banking Service.
- **Interbank Transfers:** Pure outbound client to external partner bank APIs via HMAC-signed REST endpoints, saga pattern, and reconciliation worker. External partner banks (such as Bank B) are external third-party services and are not hosted in this codebase.
- **Client:** Mobile App (React Native / Expo).
- **Core Stack:** Go 1.24+, PostgreSQL 16 (via `pgxpool`), `sqlc`, `chi` router, `slog` structured logging, `golang-migrate`.
- **Domain Rules:**
  - Money represented exclusively as `BIGINT` (rupiah bulat). No floating point.
  - Double-entry ledger: all balance movements record balanced debits and credits in `ledger_entries`. `accounts.balance` acts as a consistent materialized cache.
  - One database transaction per balance movement + ledger + transaction state update.
  - Strict row locking (`SELECT ... FOR UPDATE`) ordered by account ID to prevent deadlocks.
  - Idempotency key required for financial mutations.
  - Zero sensitive data in logs.

---

## 2. Directory Structure

```text
go-backend/
├── cmd/
│   └── api/
│       └── main.go              # Entrypoint: wiring, config, graceful shutdown
├── internal/                    # Private application code
│   ├── auth/                    # Registration, JWT, refresh rotation, PIN
│   ├── user/                    # User profile, PIN management
│   ├── account/                 # Accounts management, ownership verification
│   ├── transfer/                # Internal transfers, ledger recording, idempotency
│   ├── topup/                   # Midtrans topup integration & webhook
│   ├── interbank/               # Outbound saga client to external partner banks & reconciliation worker
│   └── platform/                # Shared foundational libraries
│       ├── config/              # Env loading and fail-fast validation
│       ├── database/            # pgxpool connection, WithTx helper, sqlc queries
│       ├── httpx/               # chi router, middlewares (RequestID, AccessLog, CORS, Recovery)
│       └── logger/              # slog structured logger with request ID context
├── db/
│   ├── migrations/              # golang-migrate SQL up/down scripts
│   └── queries/                 # sqlc SQL query definitions
├── api/
│   ├── openapi.yaml             # OpenAPI 3.0 specification
│   └── client.http              # REST client requests collection (VS Code / JetBrains)
├── docs/
│   └── Background.md            # Comprehensive domain & roadmap context
├── sqlc.yaml                    # sqlc code generation configuration
├── docker-compose.yml           # PostgreSQL container for Bank A
├── Makefile                     # Build, test, lint, migration, and docker targets
├── go.mod                       # Go module definition
├── go.sum                       # Go dependencies checksums
├── .env.example                 # Environment variables template
└── .golangci.yml                # Linter configuration
```

---

## 3. Getting Started

### Prerequisites

- **Go:** 1.24+ (e.g. `brew install go`)
- **Docker & Docker Compose:** for PostgreSQL
- **sqlc:** `brew install sqlc`
- **golang-migrate:** `brew install golang-migrate`
- **golangci-lint:** `brew install golangci-lint`

### Setup & Run Locally

1. **Clone repository and enter project directory:**
   ```bash
   cd /path/to/go-backend
   ```

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Start PostgreSQL database:**
   ```bash
   make docker-up
   ```

4. **Run database migrations:**
   ```bash
   make migrate-up
   ```

5. **Run the API server:**
   ```bash
   make run
   ```
   Server will start on `http://localhost:8080`.

---

## 4. Health & Status Endpoints

| Endpoint | Method | Purpose | Response |
| :--- | :--- | :--- | :--- |
| `/healthz` | `GET` | Liveness probe | `{"status": "ok", "service": "bank-a-api"}` |
| `/readyz` | `GET` | Readiness probe (verifies database) | `{"status": "ready", "service": "bank-a-api", "database": "up"}` |
| `/v1/ping` | `GET` | API v1 route test | `{"message": "pong", "version": "v1"}` |

### Testing via HTTP Client

- **REST Client (VS Code / Cursor / JetBrains):** Buka file [api/client.http](api/client.http) dan klik *Send Request*.
- **Postman / Insomnia / Bruno:** Import [api/openapi.yaml](api/openapi.yaml).
- **cURL:**
  ```bash
  curl -i http://localhost:8080/healthz
  curl -i http://localhost:8080/readyz
  curl -i http://localhost:8080/v1/ping
  ```

---

## 5. Development Commands

```bash
make help            # List all available targets
make run             # Run API server locally
make build           # Compile binary to bin/api
make test            # Run unit & integration tests with -race
make test-cover      # Run tests with coverage summary
make lint            # Run golangci-lint
make sqlc            # Regenerate type-safe queries from SQL
make migrate-up      # Run database migrations up
make migrate-down    # Rollback latest migration
make migrate-create  # Create new migration: make migrate-create name=create_table
make docker-up       # Start local PostgreSQL container in background
make docker-down     # Stop local PostgreSQL container
make clean           # Clean build binaries and coverage outputs
```

---

## 6. Definition of Done (DoD) - Sprint 0

- [x] Flat, modular monolith Go codebase initialized following standard Go layout (`cmd/`, `internal/`, `db/`, `api/`).
- [x] PostgreSQL 16 Docker Compose setup with healthchecks and UTC timezone.
- [x] Environment configuration (`platform/config`) with fail-fast startup validation.
- [x] Structured logging (`platform/logger`) using `log/slog` with `request_id` context tracing.
- [x] HTTP middleware suite (`RequestID`, `AccessLogger`, `Recovery`, `SecurityHeaders`, `CORS`).
- [x] Consistent JSON error response schema (`code`, `message`, `request_id`).
- [x] Database connection pool (`pgxpool`) and transaction helper `WithTx`.
- [x] `GET /healthz` (liveness) and `GET /readyz` (readiness) implemented and tested.
- [x] Graceful shutdown handling `SIGTERM` and `SIGINT`.
- [x] Initial migrations (`000001_init_schema`) and `sqlc.yaml` operational.
- [x] OpenAPI 3.0 specification (`api/openapi.yaml`) and HTTP client requests (`api/client.http`).
- [x] `.golangci.yml` and GitHub Actions CI workflow (`.github/workflows/ci.yml`).
