#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${AWS_REGION:-ap-south-1}
SSH_HOST=${SSH_HOST:-praxis-aws}

if [[ ! "$AWS_REGION" =~ ^[a-z]{2}(-gov)?-[a-z]+-[0-9]+$ ]]; then
  echo "AWS_REGION is invalid." >&2
  exit 1
fi

ssh "$SSH_HOST" "sudo AWS_REGION='$AWS_REGION' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

if ! command -v aws >/dev/null; then
  dnf install -y curl unzip
  work_dir=$(mktemp -d)
  cleanup() {
    find "$work_dir" -mindepth 1 -delete
    rmdir "$work_dir"
  }
  trap cleanup EXIT
  curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o "$work_dir/awscliv2.zip"
  unzip -q "$work_dir/awscliv2.zip" -d "$work_dir"
  "$work_dir/aws/install" --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli
fi

if ! systemctl list-unit-files amazon-ssm-agent.service >/dev/null 2>&1; then
  dnf install -y "https://s3.$AWS_REGION.amazonaws.com/amazon-ssm-$AWS_REGION/latest/linux_amd64/amazon-ssm-agent.rpm"
fi

systemctl enable --now amazon-ssm-agent
aws --version
systemctl is-active amazon-ssm-agent
REMOTE_SCRIPT
