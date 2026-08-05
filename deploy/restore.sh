#!/usr/bin/env bash
# PRAXIS — restore from a deploy/backup.sh pair. DESTRUCTIVE: overwrites the running
# database and data volume. Run from the project root, with the stack already up
# (docker compose -f docker-compose.prod.yml up -d postgres).
#
# Usage: deploy/restore.sh <praxis-db-STAMP.sql.gz> <praxis-data-STAMP.tar.gz>
set -euo pipefail

DB_DUMP="${1:?Usage: deploy/restore.sh <db-dump.sql.gz> <data-archive.tar.gz>}"
DATA_ARCHIVE="${2:?Usage: deploy/restore.sh <db-dump.sql.gz> <data-archive.tar.gz>}"
COMPOSE_FILE="docker-compose.prod.yml"

read -rp "This overwrites the running database and /app/data. Continue? [y/N] " confirm
[[ "$confirm" == "y" || "$confirm" == "Y" ]] || { echo "Aborted."; exit 1; }

echo "[1/3] Stopping api/worker (keep postgres up for the restore)..."
docker compose -f "$COMPOSE_FILE" stop api worker

echo "[2/3] Restoring Postgres from $DB_DUMP..."
gunzip -c "$DB_DUMP" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-praxis}" "${POSTGRES_DB:-praxis}"

echo "[3/3] Restoring data volume from $DATA_ARCHIVE..."
docker compose -f "$COMPOSE_FILE" up -d api
sleep 3
docker compose -f "$COMPOSE_FILE" exec -T api sh -c "rm -rf /app/data/* && tar xzf - -C /app/data" < "$DATA_ARCHIVE"

echo "Restarting all services..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate api worker

echo "Done. Verify: curl -sf http://localhost:8080/api/health"
