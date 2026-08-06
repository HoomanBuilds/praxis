#!/usr/bin/env bash
set -euo pipefail

SSH_HOST=${SSH_HOST:-praxis-aws}
SSH_CONFIG=${SSH_CONFIG:-$HOME/.ssh/config}

rsync -az -e "ssh -F $SSH_CONFIG" \
  --exclude .git/ \
  --exclude .venv/ \
  --exclude frontend/node_modules/ \
  --exclude .env \
  --exclude .env.production \
  ./ "$SSH_HOST:/opt/praxis/"

ssh -F "$SSH_CONFIG" "$SSH_HOST" "cd /opt/praxis && ./deploy/aws/create-remote-env.sh && ./deploy/aws/remote-release.sh"
