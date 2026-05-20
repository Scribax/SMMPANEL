#!/bin/bash
# ─── SMM Panel - VPS Setup Script ────────────────────────────────────────────
# Correr como root en Ubuntu 22.04+
# Uso: bash setup-vps.sh

set -e

echo "=== [1/8] Actualizando sistema ==="
apt update && apt upgrade -y

echo "=== [2/8] Instalando Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== [3/8] Instalando PostgreSQL ==="
apt install -y postgresql postgresql-contrib

echo "=== [4/8] Instalando Nginx ==="
apt install -y nginx

echo "=== [5/8] Instalando PM2 ==="
npm install -g pm2

echo "=== [6/8] Configurando PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER boostins WITH PASSWORD 'CAMBIAR_PASSWORD_AQUI';"
sudo -u postgres psql -c "CREATE DATABASE boostins OWNER boostins;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE boostins TO boostins;"

echo "=== [7/8] Clonando repositorio ==="
cd /var/www
git clone https://github.com/Scribax/SMMPANEL smmpanel
cd smmpanel

echo "=== [8/8] Configurando Nginx ==="
cp deploy/nginx-vps.conf /etc/nginx/sites-available/smmpanel
ln -sf /etc/nginx/sites-available/smmpanel /etc/nginx/sites-enabled/smmpanel
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "✅ Setup base completado."
echo ""
echo "PRÓXIMOS PASOS:"
echo "  1. Crear /var/www/smmpanel/backend/.env  (ver deploy/backend.env.example)"
echo "  2. Crear /var/www/smmpanel/frontend/.env.local (ver deploy/frontend.env.example)"
echo "  3. Correr: bash deploy/install-and-start.sh"
