#!/usr/bin/env bash
# PRAXIS restore from a deploy/backup.sh pair. DESTRUCTIVE: overwrites the running
# database, uploaded documents, exports, and organization config. Run from the project root, with the stack already up
# (docker compose -f docker-compose.prod.yml up -d postgres).
#
# Usage: deploy/restore.sh <praxis-db-STAMP.sql.gz> <praxis-data-STAMP.tar.gz>
set -euo pipefail

DB_DUMP="${1:?Usage: deploy/restore.sh <db-dump.sql.gz> <data-archive.tar.gz>}"
DATA_ARCHIVE="${2:?Usage: deploy/restore.sh <db-dump.sql.gz> <data-archive.tar.gz>}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="${PRAXIS_ENV_FILE:-.env.production}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

read -rp "This overwrites the running database and /app/data. Continue? [y/N] " confirm
[[ "$confirm" == "y" || "$confirm" == "Y" ]] || { echo "Aborted."; exit 1; }

echo "[1/3] Stopping api/worker (keep postgres up for the restore)..."
"${COMPOSE[@]}" stop api worker

echo "[2/3] Restoring Postgres from $DB_DUMP..."
gunzip -c "$DB_DUMP" | "${COMPOSE[@]}" exec -T postgres \
    sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'

echo "[3/3] Restoring data volume from $DATA_ARCHIVE..."
"${COMPOSE[@]}" run --rm --no-deps --user root -T api sh -c \
    "find /app/data/documents /app/data/exports /app/runtime -mindepth 1 -delete && tar xzf - -C /" \
    < "$DATA_ARCHIVE"

echo "Restarting all services..."
"${COMPOSE[@]}" up -d --force-recreate api worker

echo "Done. Verify: curl -fsS https://praxis.inferia.ai/api/health"
