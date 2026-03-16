#!/bin/bash
# ============================================================
# Portalon Private Network - PostgreSQL Backup Script
# Cron: 0 3 * * * /opt/portalon/infrastructure/scripts/backup_postgres.sh
# ============================================================
set -e

BACKUP_DIR="/opt/portalon/backups"
CONTAINER="portalon_postgres"
DB_NAME="${POSTGRES_DB:-portalon_db}"
DB_USER="${POSTGRES_USER:-portalon}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/portalon_${DATE}.sql.gz"
KEEP_DAYS=30

# Load env if needed
if [ -f "/opt/portalon/.env" ]; then
  export $(grep -v '^#' /opt/portalon/.env | xargs)
fi

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

# Create backup
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check size
SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$DATE] Backup created: $BACKUP_FILE ($SIZE)"

# Delete old backups
find "$BACKUP_DIR" -name "portalon_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$DATE] Old backups cleaned (kept last $KEEP_DAYS days)"

# List current backups
echo "[$DATE] Current backups:"
ls -lh "$BACKUP_DIR/portalon_*.sql.gz" 2>/dev/null | tail -10

echo "[$DATE] Backup complete!"
