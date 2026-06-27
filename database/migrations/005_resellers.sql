-- Resellers: manual approval + minimum approved deposit before wholesale prices
ALTER TABLE users ADD COLUMN IF NOT EXISTS reseller_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reseller_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reseller_min_deposit DECIMAL(10,2) NOT NULL DEFAULT 5000.00;

CREATE INDEX IF NOT EXISTS idx_users_reseller_enabled ON users(reseller_enabled);
