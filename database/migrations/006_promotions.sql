-- Promotions: configurable offer packs managed from admin
CREATE TABLE IF NOT EXISTS promotions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slug             VARCHAR(120) UNIQUE NOT NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  image_url        VARCHAR(500),
  badge            VARCHAR(80),
  quantity         INTEGER NOT NULL,
  promo_price      DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  max_uses         INTEGER,
  used_count       INTEGER NOT NULL DEFAULT 0,
  starts_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_service_id ON promotions(service_id);
CREATE INDEX IF NOT EXISTS idx_promotions_sort_order ON promotions(sort_order);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_promotion_id ON orders(promotion_id);
