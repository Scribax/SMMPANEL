-- Promotion items: allows bundle promotions with multiple services/quantities
CREATE TABLE IF NOT EXISTS promotion_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_items_promotion_id ON promotion_items(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_items_service_id ON promotion_items(service_id);

INSERT INTO promotion_items (promotion_id, service_id, quantity, sort_order)
SELECT p.id, p.service_id, p.quantity, 0
FROM promotions p
WHERE NOT EXISTS (
  SELECT 1 FROM promotion_items pi WHERE pi.promotion_id = p.id
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

