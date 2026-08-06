#!/usr/bin/env bash
# PRAXIS production backup: Postgres dump plus uploaded PDFs, exports,
# org config). Run from the project root (/opt/praxis) where docker-compose.prod.yml lives.
#
# Usage: deploy/backup.sh [backup_dir]   (default: /opt/praxis/backups)
# Restore: see deploy/restore.sh
set -euo pipefail

BACKUP_DIR="${1:-/opt/praxis/backups}"
RETENTION_DAYS="${PRAXIS_BACKUP_RETENTION_DAYS:-14}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="${PRAXIS_ENV_FILE:-.env.production}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

mkdir -p "$BACKUP_DIR"

echo "[1/3] Dumping Postgres..."
"${COMPOSE[@]}" exec -T postgres \
    sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    | gzip > "$BACKUP_DIR/praxis-db-$STAMP.sql.gz"

echo "[2/3] Archiving uploaded PDFs, exports, and organization config..."
"${COMPOSE[@]}" exec -T api \
    tar czf - -C / app/data/documents app/data/exports app/runtime \
    > "$BACKUP_DIR/praxis-data-$STAMP.tar.gz"

echo "[3/3] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'praxis-db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'praxis-data-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Done: $BACKUP_DIR/praxis-db-$STAMP.sql.gz, $BACKUP_DIR/praxis-data-$STAMP.tar.gz"
