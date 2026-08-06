#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${AWS_REGION:-ap-south-1}
STACK_NAME=${STACK_NAME:-praxis-aws}
PROJECT_NAME=${PROJECT_NAME:-praxis-aws}
INSTANCE_TYPE=${INSTANCE_TYPE:-m6a.2xlarge}
ROOT_VOLUME_SIZE=${ROOT_VOLUME_SIZE:-50}
KEY_NAME=${KEY_NAME:-praxis-aws}
AMI_ID=${AMI_ID:-ami-0d15e9052c94acb75}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-HoomanBuilds/praxis}
GITHUB_BRANCH=${GITHUB_BRANCH:-main}
SSH_CIDR=${SSH_CIDR:?Set SSH_CIDR to your trusted IPv4 address followed by /32}

aws sts get-caller-identity >/dev/null

aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file deploy/aws/cloudformation.yml \
  --parameter-overrides \
    ProjectName="$PROJECT_NAME" \
    InstanceType="$INSTANCE_TYPE" \
    RootVolumeSize="$ROOT_VOLUME_SIZE" \
    KeyName="$KEY_NAME" \
    AmiId="$AMI_ID" \
    SshCidr="$SSH_CIDR" \
    GitHubRepository="$GITHUB_REPOSITORY" \
    GitHubBranch="$GITHUB_BRANCH" \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags Project=praxis Environment=production

aws cloudformation update-termination-protection \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --enable-termination-protection

aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' \
  --output table
