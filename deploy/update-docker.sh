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
