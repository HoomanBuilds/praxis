#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/praxis}

cd "$APP_DIR"

if [[ ! -s .env.production ]]; then
  echo "Missing $APP_DIR/.env.production." >&2
  exit 1
fi

chmod 600 .env.production

if docker compose --env-file .env.production -f docker-compose.prod.yml ps --status running --services postgres | grep -qx postgres; then
  ./deploy/backup.sh
fi

docker compose --env-file .env.production -f docker-compose.prod.yml pull --ignore-buildable
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker image prune -f
docker builder prune -af
