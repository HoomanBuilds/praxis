#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/praxis}
AWS_REGION=${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}
COPILOT_KEY_PARAMETER=${COPILOT_KEY_PARAMETER:-/praxis/production/zerog-api-key}

cd "$APP_DIR"

if [[ ! -s .env.production ]]; then
  echo "Missing $APP_DIR/.env.production." >&2
  exit 1
fi

chmod 600 .env.production

copilot_api_key=$(aws ssm get-parameter \
  --region "$AWS_REGION" \
  --name "$COPILOT_KEY_PARAMETER" \
  --with-decryption \
  --query Parameter.Value \
  --output text)
if [[ -z "$copilot_api_key" || "$copilot_api_key" == None ]]; then
  echo "The production Copilot API key is unavailable." >&2
  exit 1
fi
env_file=$(mktemp "$APP_DIR/.env.production.XXXXXX")
trap '[[ ! -f "${env_file:-}" ]] || unlink "$env_file"' EXIT
grep -Ev '^(ZEROG_COMPUTE_API_KEY|PRAXIS_COPILOT_PROVIDER|PRAXIS_COPILOT_MODEL|PRAXIS_COPILOT_FALLBACK_MODELS|PRAXIS_COPILOT_LOCAL_MODEL|PRAXIS_COPILOT_REQUEST_TIMEOUT|PRAXIS_COPILOT_CLOUD_TIMEOUT|PRAXIS_COPILOT_LOCAL_TIMEOUT|PRAXIS_COPILOT_PROVIDER_SORT|PRAXIS_COPILOT_NUM_PREDICT)=' .env.production > "$env_file"
printf '%s\n' \
  "ZEROG_COMPUTE_API_KEY=$copilot_api_key" \
  'PRAXIS_COPILOT_PROVIDER=0g' \
  'PRAXIS_COPILOT_MODEL=qwen3.8-max' \
  'PRAXIS_COPILOT_FALLBACK_MODELS=glm-5.1,deepseek-v4-flash,qwen3.7-plus,minimax-m3' \
  'PRAXIS_COPILOT_LOCAL_MODEL=llama3.2:3b' \
  'PRAXIS_COPILOT_REQUEST_TIMEOUT=12' \
  'PRAXIS_COPILOT_CLOUD_TIMEOUT=30' \
  'PRAXIS_COPILOT_LOCAL_TIMEOUT=30' \
  'PRAXIS_COPILOT_PROVIDER_SORT=latency' \
  'PRAXIS_COPILOT_NUM_PREDICT=512' >> "$env_file"
chmod 600 "$env_file"
mv "$env_file" .env.production
unset copilot_api_key

if docker compose --env-file .env.production -f docker-compose.prod.yml ps --status running --services postgres | grep -qx postgres; then
  ./deploy/backup.sh
fi

docker compose --env-file .env.production -f docker-compose.prod.yml pull --ignore-buildable
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker image prune -f
docker builder prune -f --keep-storage 5GB
