-- name: CreateTransaction :one
INSERT INTO transactions (
    idempotency_key,
    source_account_id,
    target_account_id,
    type,
    amount,
    fee,
    status,
    reference_number,
    notes,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING id, idempotency_key, source_account_id, target_account_id, type, amount, fee, status, reference_number, notes, metadata, created_at, updated_at;

-- name: GetTransactionByID :one
SELECT id, idempotency_key, source_account_id, target_account_id, type, amount, fee, status, reference_number, notes, metadata, created_at, updated_at
FROM transactions
WHERE id = $1;

-- name: GetTransactionByIdempotencyKey :one
SELECT id, idempotency_key, source_account_id, target_account_id, type, amount, fee, status, reference_number, notes, metadata, created_at, updated_at
FROM transactions
WHERE idempotency_key = $1;

-- name: UpdateTransactionStatus :one
UPDATE transactions
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, status, updated_at;

-- name: CreateLedgerEntry :one
INSERT INTO ledger_entries (
    transaction_id,
    account_id,
    direction,
    amount,
    balance_after,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, transaction_id, account_id, direction, amount, balance_after, created_at;

-- name: GetMutationsByAccountCursor :many
SELECT 
    le.id,
    le.transaction_id,
    le.account_id,
    le.direction,
    le.amount,
    le.balance_after,
    le.created_at,
    t.type AS transaction_type,
    t.status AS transaction_status,
    t.reference_number,
    COALESCE(t.notes, '') AS notes
FROM ledger_entries le
JOIN transactions t ON t.id = le.transaction_id
WHERE le.account_id = $1
  AND (
    sqlc.narg('cursor_created_at')::timestamptz IS NULL 
    OR le.created_at < sqlc.narg('cursor_created_at')::timestamptz 
    OR (le.created_at = sqlc.narg('cursor_created_at')::timestamptz AND le.id < sqlc.narg('cursor_id')::uuid)
  )
ORDER BY le.created_at DESC, le.id DESC
LIMIT $2;

-- name: GetAccountLedgerSum :one
SELECT 
    COALESCE(SUM(CASE WHEN direction = 'CR' THEN amount ELSE 0 END), 0)::BIGINT AS total_credit,
    COALESCE(SUM(CASE WHEN direction = 'DB' THEN amount ELSE 0 END), 0)::BIGINT AS total_debit
FROM ledger_entries
WHERE account_id = $1;

-- name: GetTransferReceiptByID :one
SELECT 
    t.id,
    t.idempotency_key,
    t.source_account_id,
    t.target_account_id,
    t.type,
    t.amount,
    t.fee,
    t.status,
    t.reference_number,
    COALESCE(t.notes, '') AS notes,
    t.created_at,
    COALESCE(src_a.account_number, '') AS source_account_number,
    COALESCE(src_u.full_name, '') AS source_user_name,
    tgt_a.account_number AS target_account_number,
    tgt_u.full_name AS target_user_name
FROM transactions t
LEFT JOIN accounts src_a ON src_a.id = t.source_account_id
LEFT JOIN users src_u ON src_u.id = src_a.user_id
JOIN accounts tgt_a ON tgt_a.id = t.target_account_id
JOIN users tgt_u ON tgt_u.id = tgt_a.user_id
WHERE t.id = $1;

-- name: GetDailyTransferTotal :one
SELECT COALESCE(SUM(amount), 0)::BIGINT AS total_amount
FROM transactions
WHERE source_account_id = $1
  AND status = 'SUCCESS'
  AND type = 'TRANSFER_INTERNAL'
  AND created_at >= $2;


