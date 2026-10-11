-- Sprint 0: Initial database foundation
-- Enables extensions for cryptographic helpers and UUIDs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
