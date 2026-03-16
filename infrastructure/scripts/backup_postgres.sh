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

# ============================================================
# RESTORE PROCEDURE
# ============================================================
# To restore a backup, run the following commands (replace BACKUP_FILE):
#
# 1. Identify the backup file to restore:
#      ls -lh /opt/portalon/backups/
#
# 2. STOP the backend to prevent writes during restore:
#      cd /opt/portalon/infrastructure
#      docker compose stop backend
#
# 3. Drop and recreate the target database:
#      docker exec -it portalon_postgres psql -U portalon -c "DROP DATABASE portalon_db;"
#      docker exec -it portalon_postgres psql -U portalon -c "CREATE DATABASE portalon_db;"
#
# 4. Restore the backup:
#      gunzip -c /opt/portalon/backups/portalon_YYYYMMDD_HHMMSS.sql.gz \
#        | docker exec -i portalon_postgres psql -U portalon -d portalon_db
#
# 5. Run Prisma migrations to ensure schema is up-to-date (safe if already applied):
#      docker compose exec backend npx prisma migrate deploy
#
# 6. Restart the backend:
#      docker compose start backend
#
# 7. Verify the restore:
#      docker compose exec backend npx prisma db pull  # should show no diff
#      curl http://localhost:3001/api/v1/health
#
# NOTES:
#   - Backups are plain SQL dumps (not binary) so they are portable across Postgres versions.
#   - Always test restores on a staging environment before applying to production.
#   - If restoring to a different host, ensure DATABASE_URL is updated accordingly.
#   - The backup includes all schema and data. Seeds do NOT need to be re-run.
# ============================================================
