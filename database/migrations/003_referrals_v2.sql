-- Migration: Referrals v2 — milestone-based rewards
-- Run: docker exec -i boostins_db psql -U boostins -d boostins < database/migrations/003_referrals_v2.sql

-- Add new columns to referrals
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS spend_threshold DECIMAL(10,2) NOT NULL DEFAULT 2000.00;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Update status enum: pending → qualified → paid
-- 'pending'   = referred user hasn't spent enough yet
-- 'qualified' = threshold met, reward paid
-- 'paid'      = (legacy alias for qualified)

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
