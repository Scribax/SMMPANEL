#!/bin/bash

# ==============================================================================
# Script de Respaldo Automático de Base de Datos (PostgreSQL en Docker)
# ==============================================================================

# Obtener la ruta del directorio raíz del proyecto (un nivel arriba de scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Definir la carpeta y log de copias de seguridad
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Crear la carpeta de backups si no existe
mkdir -p "$BACKUP_DIR"

# Cargar variables del archivo .env si existe
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Leer variables de forma limpia ignorando comentarios y líneas en blanco
    DB_NAME=$(grep -E "^POSTGRES_DB=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
    DB_USER=$(grep -E "^POSTGRES_USER=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
else
    DB_NAME="boostins"
    DB_USER="boostins"
fi

# Asignar valores por defecto si las variables están vacías
DB_NAME="${DB_NAME:-boostins}"
DB_USER="${DB_USER:-boostins}"
CONTAINER_NAME="boostins_db"

echo "[$TIMESTAMP] Iniciando copia de seguridad para base de datos: $DB_NAME..." >> "$LOG_FILE"

# Comprobar si el contenedor de Docker está activo
if [ ! "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "[$TIMESTAMP] ERROR: El contenedor '$CONTAINER_NAME' no está activo. Copia de seguridad fallida." >> "$LOG_FILE"
    exit 1
fi

# Ejecutar el dump e insertarlo en el archivo gzip
docker exec -t $CONTAINER_NAME pg_dump -U "$DB_USER" -d "$DB_NAME" 2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"

# Verificar si el archivo se creó correctamente y no está vacío
if [ -s "$BACKUP_FILE" ]; then
    echo "[$TIMESTAMP] ÉXITO: Copia de seguridad creada en $BACKUP_FILE" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ERROR: La copia de seguridad falló o se creó vacía." >> "$LOG_FILE"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# ── Política de Retención (Guardar últimos 7 días) ───────────────────────────
echo "[$TIMESTAMP] Ejecutando política de retención (eliminando archivos con más de 7 días)..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -type f -print -exec rm -f {} \; >> "$LOG_FILE" 2>&1

echo "[$TIMESTAMP] Proceso de copia de seguridad completado." >> "$LOG_FILE"
echo "--------------------------------------------------------" >> "$LOG_FILE"
