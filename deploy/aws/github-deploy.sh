#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${AWS_REGION:?AWS_REGION is required}
AWS_RELEASE_BUCKET=${AWS_RELEASE_BUCKET:?AWS_RELEASE_BUCKET is required}
AWS_INSTANCE_ID=${AWS_INSTANCE_ID:?AWS_INSTANCE_ID is required}
RELEASE_SHA=${1:?Pass the full release commit SHA}

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release SHA must be 40 lowercase hexadecimal characters." >&2
  exit 1
fi

if [[ ! "$AWS_REGION" =~ ^[a-z]{2}(-gov)?-[a-z]+-[0-9]+$ ]]; then
  echo "AWS_REGION is invalid." >&2
  exit 1
fi

if [[ ! "$AWS_INSTANCE_ID" =~ ^i-[0-9a-f]+$ ]]; then
  echo "AWS_INSTANCE_ID is invalid." >&2
  exit 1
fi

if [[ ! "$AWS_RELEASE_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "AWS_RELEASE_BUCKET is invalid." >&2
  exit 1
fi

work_dir=$(mktemp -d)
cleanup() {
  find "$work_dir" -mindepth 1 -delete
  rmdir "$work_dir"
}
trap cleanup EXIT

artifact_name="praxis-$RELEASE_SHA.tar.gz"
checksum_name="$artifact_name.sha256"
artifact_path="$work_dir/$artifact_name"

tar -czf "$artifact_path" \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*/.env' \
  --exclude='*/.env.*' \
  --exclude='*/node_modules' \
  --exclude='*/.venv' \
  --exclude='*/__pycache__' \
  --exclude='*.pyc' \
  backend \
  frontend \
  data \
  deploy \
  nginx \
  docker-compose.prod.yml \
  requirements.txt

(
  cd "$work_dir"
  sha256sum "$artifact_name" > "$checksum_name"
)

release_prefix="s3://$AWS_RELEASE_BUCKET/releases"
aws s3 cp "$artifact_path" "$release_prefix/$artifact_name" --only-show-errors
aws s3 cp "$work_dir/$checksum_name" "$release_prefix/$checksum_name" --only-show-errors

read -r -d '' remote_script <<'REMOTE_SCRIPT' || true
set -euo pipefail

bucket=$1
artifact_name=$2
checksum_name=$3
region=$4
archive="/var/tmp/$artifact_name"
checksum="/var/tmp/$checksum_name"
staging_dir=$(mktemp -d /opt/praxis-release.XXXXXX)

cleanup() {
  find "$staging_dir" -mindepth 1 -delete
  rmdir "$staging_dir"
  [[ ! -f "$archive" ]] || unlink "$archive"
  [[ ! -f "$checksum" ]] || unlink "$checksum"
}
trap cleanup EXIT

export AWS_DEFAULT_REGION="$region"
aws s3 cp "s3://$bucket/releases/$artifact_name" "$archive" --only-show-errors
aws s3 cp "s3://$bucket/releases/$checksum_name" "$checksum" --only-show-errors

(
  cd /var/tmp
  sha256sum --check "$checksum_name"
)

tar --no-same-owner -xzf "$archive" -C "$staging_dir"
install -d -o ec2-user -g ec2-user /opt/praxis
rsync -a --delete --chown=ec2-user:ec2-user \
  --exclude .env.production \
  --exclude backups/ \
  --exclude .integration-test/ \
  "$staging_dir/" /opt/praxis/

cd /opt/praxis
chmod +x deploy/aws/create-remote-env.sh deploy/aws/remote-release.sh
./deploy/aws/create-remote-env.sh
./deploy/aws/remote-release.sh
curl -fsS https://praxis.inferia.ai/api/health
REMOTE_SCRIPT

encoded_script=$(printf '%s' "$remote_script" | base64 -w 0)
run_command="printf '%s' '$encoded_script' | base64 --decode | bash -s -- '$AWS_RELEASE_BUCKET' '$artifact_name' '$checksum_name' '$AWS_REGION'"
parameters=$(jq -cn --arg command "$run_command" '{commands: [$command]}')

command_id=$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$AWS_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "Deploy PRAXIS $RELEASE_SHA" \
  --timeout-seconds 3600 \
  --parameters "$parameters" \
  --query 'Command.CommandId' \
  --output text)

echo "SSM command: $command_id"
status=Pending

for _ in $(seq 1 240); do
  status=$(aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$command_id" \
    --instance-id "$AWS_INSTANCE_ID" \
    --query Status \
    --output text 2>/dev/null || printf 'Pending')

  case "$status" in
    Success|Cancelled|Failed|TimedOut)
      break
      ;;
  esac

  sleep 15
done

aws ssm get-command-invocation \
  --region "$AWS_REGION" \
  --command-id "$command_id" \
  --instance-id "$AWS_INSTANCE_ID" \
  --query '{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}' \
  --output json

if [[ "$status" != Success ]]; then
  echo "Deployment finished with status $status." >&2
  exit 1
fi
