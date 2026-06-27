-- BoostIns Database Schema
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  referral_code   VARCHAR(50)  UNIQUE,
  referred_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  balance         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  reseller_enabled BOOLEAN NOT NULL DEFAULT false,
  reseller_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  reseller_min_deposit DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- ─── PROVIDERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  api_url         VARCHAR(500) NOT NULL,
  api_key_enc     TEXT         NOT NULL,  -- AES encrypted
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SERVICES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID REFERENCES providers(id) ON DELETE SET NULL,
  provider_service_id INTEGER      NOT NULL,
  name                VARCHAR(255) NOT NULL,
  category            VARCHAR(100) NOT NULL,  -- 'followers' | 'likes' | 'views'
  platform            VARCHAR(100) NOT NULL,  -- 'instagram' | 'tiktok' | 'youtube'
  description         TEXT,
  price_per_unit      DECIMAL(10,6) NOT NULL,
  min_quantity        INTEGER NOT NULL DEFAULT 100,
  max_quantity        INTEGER NOT NULL DEFAULT 10000,
  delivery_speed      VARCHAR(100),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_platform   ON services(platform);
CREATE INDEX IF NOT EXISTS idx_services_category   ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active  ON services(is_active);

-- ─── COUPONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  discount_type   VARCHAR(50) NOT NULL,  -- 'percentage' | 'fixed'
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ─── ORDERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  service_id          UUID REFERENCES services(id) ON DELETE SET NULL,
  link                VARCHAR(500) NOT NULL,
  quantity            INTEGER NOT NULL,
  price               DECIMAL(10,2) NOT NULL,
  original_price      DECIMAL(10,2),
  coupon_id           UUID REFERENCES coupons(id) ON DELETE SET NULL,
  provider_order_id   VARCHAR(255),
  status              VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending | awaiting_payment | processing | in_progress | completed | partial | failed | refunded | cancelled
  start_count         INTEGER,
  remains             INTEGER,
  email               VARCHAR(255),
  notes               TEXT,
  refill_requested_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ─── PAYMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(10) NOT NULL DEFAULT 'BRL',
  payment_method   VARCHAR(100),
  payment_provider VARCHAR(100) NOT NULL DEFAULT 'mercadopago',
  external_id      VARCHAR(255),        -- MercadoPago payment ID
  preference_id    VARCHAR(255),        -- MercadoPago preference ID
  status           VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected | cancelled | refunded
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id    ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);

-- ─── DEPOSITS (wallet top-ups) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         DECIMAL(10,2) NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected
  preference_id  VARCHAR(255),
  external_id    VARCHAR(255),  -- MercadoPago payment ID
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status  ON deposits(status);

-- ─── REFERRALS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_amount   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','providers','services','orders','payments']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl
    );
  END LOOP;
END;
$$;

-- ─── SEED: Default Admin ─────────────────────────────────────────────────────
-- Password is "Admin@123456" (bcrypt hash) — change after first login
INSERT INTO users (email, password_hash, name, role, referral_code, email_verified)
VALUES (
  'admin@boostins.com',
  '$2a$12$VEIG6sLLroI2Ga5VejIImOobq81NY.C3tYbTiqX2STAYuya8TX096',
  'Admin',
  'admin',
  'ADMIN1',
  true
) ON CONFLICT (email) DO NOTHING;

-- Auto-generate referral_code for any users created without one
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE referral_code IS NULL;

-- ─── SEED: Sample Services ──────────────────────────────────────────────────
INSERT INTO providers (id, name, api_url, api_key_enc) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Provider', 'https://provider.example.com/api/v2', 'PLACEHOLDER_ENCRYPTED_KEY')
ON CONFLICT DO NOTHING;

INSERT INTO services (provider_id, provider_service_id, name, category, platform, description, price_per_unit, min_quantity, max_quantity, delivery_speed, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 1,  'Instagram Followers – Real', 'followers', 'instagram', 'High-quality real Instagram followers. Gradual delivery for account safety.', 0.002500, 100,  10000, '1-3 days',  1),
  ('00000000-0000-0000-0000-000000000001', 2,  'Instagram Followers – Premium', 'followers', 'instagram', 'Premium Instagram followers with profile pictures and posts.', 0.005000, 100,  5000,  '2-5 days',  2),
  ('00000000-0000-0000-0000-000000000001', 3,  'Instagram Likes – Fast', 'likes',      'instagram', 'Fast Instagram likes delivered within minutes.', 0.001000, 50,   10000, '0-1 hours', 3),
  ('00000000-0000-0000-0000-000000000001', 4,  'Instagram Views – Reels & Posts', 'views', 'instagram', 'Boost your Instagram reel and post view count instantly.', 0.000300, 500,  100000,'Instant',   4),
  ('00000000-0000-0000-0000-000000000001', 5,  'TikTok Followers – Real', 'followers', 'tiktok',    'Grow your TikTok with real, engaged followers.', 0.003000, 100,  10000, '1-2 days',  5),
  ('00000000-0000-0000-0000-000000000001', 6,  'TikTok Views – Viral Boost', 'views',  'tiktok',    'Skyrocket your TikTok view count to hit the For You page.', 0.000150, 1000, 500000,'Instant',   6),
  ('00000000-0000-0000-0000-000000000001', 7,  'YouTube Views – High Retention','views','youtube',  'High-retention YouTube views (60%+ watch time).', 0.004000, 500,  50000, '1-3 days',  7)
ON CONFLICT DO NOTHING;
