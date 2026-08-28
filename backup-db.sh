#!/bin/bash
# Database backup script for FSIS Request — run on the NAS (BFP-R2-NAS1).
#
# Dumps the PostgreSQL database to a timestamped SQL file in ./backups/.
# Keeps the most recent BACKUP_KEEP (default 14) backups and deletes older ones.
#
# Usage:
#   ./backup-db.sh              # create a backup now
#   BACKUP_KEEP=30 ./backup-db.sh   # keep 30 backups
#
# To schedule automatically (daily at 02:00), add to crontab:
#   0 2 * * * cd /volume1/docker/fsis-request && ./backup-db.sh >> /volume1/docker/fsis-request/backups/backup.log 2>&1

set -e

cd "$(dirname "$0")"

# --- Config ----------------------------------------------------------------
BACKUP_DIR="./backups"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
DB_USER="$(grep '^DB_USER=' .env | cut -d= -f2-)"
DB_NAME="$(grep '^DB_NAME=' .env | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"

# --- Ensure postgres is running -------------------------------------------
echo "=== FSIS Database Backup ==="
echo "Checking postgres container..."
if ! docker compose ps postgres | grep -q "Up\|Healthy"; then
  echo "Starting postgres container..."
  docker compose up -d postgres
  sleep 10
fi

# --- Create backup ---------------------------------------------------------
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUTFILE="$BACKUP_DIR/fsis_backup_${STAMP}.sql"

echo "Backing up database '$DB_NAME' as user '$DB_USER'..."
docker compose exec -T postgres \
  env PGPASSWORD="$DB_PASSWORD" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" > "$OUTFILE"

# --- Verify ----------------------------------------------------------------
SIZE="$(wc -c < "$OUTFILE")"
if [ "$SIZE" -lt 100 ]; then
  echo "ERROR: Backup file is suspiciously small ($SIZE bytes). Aborting cleanup."
  exit 1
fi

echo "Backup created: $OUTFILE ($SIZE bytes)"

# --- Prune old backups -----------------------------------------------------
echo "Pruning backups older than the newest $BACKUP_KEEP..."
ls -1t "$BACKUP_DIR"/fsis_backup_*.sql 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | while read -r old; do
  echo "  Deleting $old"
  rm -f "$old"
done

echo "=== Backup complete ==="
echo "Latest backups:"
ls -1t "$BACKUP_DIR"/fsis_backup_*.sql 2>/dev/null | head -5
