-- Rollback Sprint 2: Drop user PIN columns

ALTER TABLE users
DROP COLUMN IF EXISTS pin_locked_until,
DROP COLUMN IF EXISTS failed_pin_attempts,
DROP COLUMN IF EXISTS pin_hash;

