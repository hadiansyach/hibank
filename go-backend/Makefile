# HiBank - Core API Makefile
SHELL := /bin/bash

# Load environment variables from .env if present
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/bank_a?sslmode=disable
MIGRATIONS_DIR := db/migrations

.PHONY: help run build test test-cover lint sqlc migrate-up migrate-down migrate-create seed docker-up docker-down clean

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

run: ## Run the HTTP API server locally
	go run cmd/api/main.go

build: ## Build the API binary
	@mkdir -p bin
	go build -ldflags="-s -w" -o bin/api cmd/api/main.go

test: ## Run tests with race detection
	go test -v -race ./...

test-cover: ## Run tests and output coverage summary
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

lint: ## Run golangci-lint linter
	golangci-lint run ./...

sqlc: ## Generate type-safe Go queries from SQL using sqlc
	sqlc generate

migrate-up: ## Apply all pending database migrations
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

migrate-down: ## Rollback the most recent migration step
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

migrate-create: ## Create a new migration file: make migrate-create name=create_users_table
	@if [ -z "$(name)" ]; then echo "Error: 'name' parameter is required. Example: make migrate-create name=create_users_table"; exit 1; fi
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

seed: ## Seed default development users and accounts
	go run cmd/seed/main.go

docker-up: ## Start local PostgreSQL container in background
	docker compose up -d

docker-down: ## Stop local PostgreSQL container
	docker compose down

clean: ## Clean build binaries and coverage outputs
	rm -rf bin coverage.out
