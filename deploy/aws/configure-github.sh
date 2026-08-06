#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${AWS_REGION:-ap-south-1}
STACK_NAME=${STACK_NAME:-praxis-aws}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-HoomanBuilds/praxis}
ENABLE_EC2_DEPLOY=${ENABLE_EC2_DEPLOY:-false}

aws sts get-caller-identity >/dev/null
gh auth status >/dev/null

stack_output() {
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" \
    --output text
}

deploy_role_arn=$(stack_output GitHubDeployRoleArn)
release_bucket=$(stack_output ReleaseBucketName)
instance_id=$(stack_output InstanceId)

gh variable set AWS_DEPLOY_ROLE_ARN --repo "$GITHUB_REPOSITORY" --body "$deploy_role_arn"
gh variable set AWS_REGION --repo "$GITHUB_REPOSITORY" --body "$AWS_REGION"
gh variable set AWS_RELEASE_BUCKET --repo "$GITHUB_REPOSITORY" --body "$release_bucket"
gh variable set AWS_INSTANCE_ID --repo "$GITHUB_REPOSITORY" --body "$instance_id"
gh variable set ENABLE_EC2_DEPLOY --repo "$GITHUB_REPOSITORY" --body "$ENABLE_EC2_DEPLOY"

gh variable list --repo "$GITHUB_REPOSITORY"
