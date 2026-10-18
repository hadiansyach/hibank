-- name: CreateAccount :one
INSERT INTO accounts (
    user_id,
    account_number,
    account_type,
    balance,
    status
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING id, user_id, account_number, account_type, balance, status, created_at, updated_at;

-- name: CountAccountsByUserID :one
SELECT COUNT(*) FROM accounts
WHERE user_id = $1 AND status != 'closed';

-- name: GetAccountsByUserID :many
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE user_id = $1 AND status != 'closed'
ORDER BY created_at ASC;

-- name: GetAccountByID :one
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE id = $1;

-- name: GetAccountByIDAndUserID :one
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE id = $1 AND user_id = $2;

-- name: GetAccountByNumber :one
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE account_number = $1;

-- name: UpdateAccountBalance :one
UPDATE accounts
SET balance = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, balance, updated_at;

-- name: GetAccountForUpdate :one
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE id = $1
FOR UPDATE;

-- name: GetAccountsForUpdateOrdered :many
SELECT id, user_id, account_number, account_type, balance, status, created_at, updated_at
FROM accounts
WHERE id = ANY($1::uuid[])
ORDER BY id ASC
FOR UPDATE;

-- name: GetAccountOwnerInfoByNumber :one
SELECT 
    a.id AS account_id,
    a.user_id,
    a.account_number,
    a.account_type,
    a.balance,
    a.status AS account_status,
    u.full_name,
    u.status AS user_status
FROM accounts a
JOIN users u ON u.id = a.user_id
WHERE a.account_number = $1;

-- name: ListAllActiveAccountIDs :many
SELECT id FROM accounts
WHERE status = 'active'
ORDER BY id ASC;



