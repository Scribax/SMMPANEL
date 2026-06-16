#!/bin/bash
# ─── SMM Panel - Docker Update Script ────────────────────────────────────────
# Correr en el VPS desde cualquier ruta:
#   bash deploy/update-docker.sh
#
# Hace un deploy completo:
#   1. git pull origin main
#   2. rebuild de imágenes
#   3. recrea contenedores
#   4. limpia orphans
#   5. muestra el estado final

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"
REMOTE="${2:-origin}"

if [ ! -d "$ROOT_DIR/.git" ]; then
  echo "❌ No se encontró un repositorio Git en: $ROOT_DIR"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker no está instalado o no está en PATH."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose v2 no está disponible en este servidor."
  exit 1
fi

resolve_ip() {
  local host="$1"
  getent ahostsv4 "$host" 2>/dev/null | awk 'NR==1 {print $1}'
}

EXPECTED_DOMAIN_IP="${EXPECTED_DOMAIN_IP:-186.64.123.153}"
DOMAIN_HOSTS=("followarg.com" "www.followarg.com")
for host in "${DOMAIN_HOSTS[@]}"; do
  host_ip="$(resolve_ip "$host" || true)"
  if [ -z "$host_ip" ]; then
    echo "❌ No se pudo resolver $host. Revisá el DNS antes del deploy."
    exit 1
  fi
  if [ "$host_ip" != "$EXPECTED_DOMAIN_IP" ]; then
    echo "❌ $host resuelve a $host_ip, pero se esperaba $EXPECTED_DOMAIN_IP."
    echo "   Corregí el DNS antes de desplegar."
    exit 1
  fi
done

if [ ! -f "$ROOT_DIR/nginx/ssl/origin.pem" ] || [ ! -f "$ROOT_DIR/nginx/ssl/origin.key" ]; then
  echo "❌ Faltan los certificados SSL en nginx/ssl (origin.pem / origin.key)."
  exit 1
fi

cd "$ROOT_DIR"

echo "=== [1/4] Actualizando código desde ${REMOTE}/${BRANCH} ==="
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH" >/dev/null 2>&1 || true
git reset --hard "$REMOTE/$BRANCH"

echo "=== [2/4] Construyendo y recreando servicios Docker ==="
docker compose -f docker-compose.yml up -d --build --force-recreate --remove-orphans

echo "=== [3/4] Verificando estado de contenedores ==="
docker compose -f docker-compose.yml ps

echo "=== [4/4] Estado final ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Deploy Docker completado."
echo "   Repo:  $ROOT_DIR"
echo "   Branch: $BRANCH"
echo "   Remote: $REMOTE"
