#!/bin/bash
# ─── SMM Panel - Install & Start ─────────────────────────────────────────────
# Correr desde /var/www/smmpanel después de crear los .env
# Uso: bash deploy/install-and-start.sh

set -e
cd /var/www/smmpanel

echo "=== [1/5] Instalando dependencias backend ==="
cd backend
npm install --production=false
cd ..

echo "=== [2/5] Instalando dependencias frontend ==="
cd frontend
npm install
cd ..

echo "=== [3/5] Creando tabla deposits en la base de datos ==="
sudo -u postgres psql -d boostins -c "
CREATE TABLE IF NOT EXISTS deposits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount         DECIMAL(10,2) NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'pending',
  preference_id  VARCHAR(255),
  external_id    VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

echo "=== [4/5] Construyendo frontend (Next.js build) ==="
cd frontend
npm run build
cd ..

echo "=== [5/5] Iniciando servicios con PM2 ==="
pm2 delete all 2>/dev/null || true
pm2 start backend/src/index.ts \
  --name smm-backend \
  --interpreter ts-node \
  -- --respawn
pm2 start "npm start" \
  --name smm-frontend \
  --cwd /var/www/smmpanel/frontend

pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo ""
echo "✅ Aplicación corriendo:"
echo "   Frontend → http://186.64.123.153"
echo "   Backend  → http://186.64.123.153/api"
echo ""
pm2 status
