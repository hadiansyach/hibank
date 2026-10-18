-- Sprint 4: Double-Entry Ledger & Transactions

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) UNIQUE,
    source_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    target_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    fee BIGINT NOT NULL DEFAULT 0 CHECK (fee >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')),
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_source_acc ON transactions(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_target_acc ON transactions(target_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref_number ON transactions(reference_number);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    direction VARCHAR(2) NOT NULL CHECK (direction IN ('DB', 'CR')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_cursor ON ledger_entries(account_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);

