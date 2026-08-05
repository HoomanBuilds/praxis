#!/usr/bin/env bash
# PRAXIS — production backup: Postgres dump + praxisdata volume (uploaded PDFs, exports,
# org config). Run from the project root (/opt/praxis) where docker-compose.prod.yml lives.
#
# Usage: deploy/backup.sh [backup_dir]   (default: /opt/praxis/backups)
# Restore: see deploy/restore.sh
set -euo pipefail

BACKUP_DIR="${1:-/opt/praxis/backups}"
RETENTION_DAYS="${PRAXIS_BACKUP_RETENTION_DAYS:-14}"
COMPOSE_FILE="docker-compose.prod.yml"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

echo "[1/3] Dumping Postgres..."
# Postgres isn't port-published to the host in docker-compose.prod.yml (internal network
# only), so `compose exec` is the only path in — not a host-level pg_dump.
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-praxis}" "${POSTGRES_DB:-praxis}" \
    | gzip > "$BACKUP_DIR/praxis-db-$STAMP.sql.gz"

echo "[2/3] Archiving praxisdata volume (uploaded PDFs, exports, org config)..."
# Stream a tar of /app/data out of the already-running `api` container instead of
# guessing the compose-generated volume name (it's prefixed with the project name,
# which depends on the directory this is deployed into).
docker compose -f "$COMPOSE_FILE" exec -T api tar czf - -C /app/data . \
    > "$BACKUP_DIR/praxis-data-$STAMP.tar.gz"

echo "[3/3] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'praxis-db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'praxis-data-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Done: $BACKUP_DIR/praxis-db-$STAMP.sql.gz, $BACKUP_DIR/praxis-data-$STAMP.tar.gz"
