-- name: CreateUser :one
INSERT INTO users (
    full_name,
    email,
    phone,
    password_hash,
    status
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING id, full_name, email, phone, status, created_at, updated_at;

-- name: GetUserByEmail :one
SELECT id, full_name, email, phone, password_hash, status, created_at, updated_at
FROM users
WHERE email = $1;

-- name: GetUserByPhone :one
SELECT id, full_name, email, phone, password_hash, status, created_at, updated_at
FROM users
WHERE phone = $1;

-- name: GetUserByID :one
SELECT id, full_name, email, phone, status, created_at, updated_at
FROM users
WHERE id = $1;

