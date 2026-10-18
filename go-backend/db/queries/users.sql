-- name: GetUserProfileByID :one
SELECT 
    id, 
    full_name, 
    email, 
    phone, 
    status, 
    (pin_hash IS NOT NULL AND pin_hash != '') AS has_pin, 
    created_at, 
    updated_at
FROM users
WHERE id = $1;

-- name: GetUserSecurityInfoByID :one
SELECT 
    id, 
    password_hash, 
    pin_hash, 
    failed_pin_attempts, 
    pin_locked_until
FROM users
WHERE id = $1;

-- name: UpdateUserPIN :exec
UPDATE users
SET 
    pin_hash = $2,
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = NOW()
WHERE id = $1;

-- name: RecordFailedPINAttempt :exec
UPDATE users
SET 
    failed_pin_attempts = failed_pin_attempts + 1,
    pin_locked_until = CASE 
        WHEN failed_pin_attempts + 1 >= 3 THEN NOW() + INTERVAL '15 minutes'
        ELSE pin_locked_until
    END,
    updated_at = NOW()
WHERE id = $1;

-- name: ResetFailedPINAttempts :exec
UPDATE users
SET 
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = NOW()
WHERE id = $1;


