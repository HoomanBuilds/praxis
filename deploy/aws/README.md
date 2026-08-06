# AWS Deployment Runbook

## Inputs

- An authenticated AWS CLI session with CloudFormation, EC2, and networking permissions.
- An authenticated GitHub CLI session with administration access to `HoomanBuilds/praxis`.
- A dedicated `praxis-aws` EC2 key pair and matching local SSH key.
- The administrator's current public IPv4 address for the restricted SSH rule.

The default region is Mumbai (`ap-south-1`). The host is an `m6a.2xlarge` with 8 vCPUs, 32 GiB RAM, a 50 GiB encrypted gp3 root volume, and 8 GiB swap. Estimated on-demand cost is about USD 170 per 730-hour month before tax, snapshots, and data transfer.

## Provision Infrastructure

Pass a single trusted address to CloudFormation:

```bash
SSH_CIDR=203.0.113.10/32 ./deploy/aws/provision.sh
```

Configure `~/.ssh/config` with the public IP from the stack output:

```bash
Host praxis-aws
  HostName 203.0.113.20
  User ec2-user
  IdentityFile ~/.ssh/praxis-aws
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
```

Provisioning creates a dedicated VPC, encrypted storage, security group, private release bucket, and EC2 instance. It also creates two restricted IAM roles: one for the EC2 host and one that GitHub can assume through OIDC. It does not create IAM users or permanent AWS access keys. SSH remains restricted to `SSH_CIDR`; HTTP and HTTPS serve the application.

## Configure GitHub Deployment

Install the AWS CLI and SSM agent on an existing host:

```bash
./deploy/aws/bootstrap-management.sh
```

Keep deployment disabled while checking a new setup:

```bash
ENABLE_EC2_DEPLOY=false ./deploy/aws/configure-github.sh
```

After SSM connectivity and a manual workflow run are verified, enable automatic deployment:

```bash
ENABLE_EC2_DEPLOY=true ./deploy/aws/configure-github.sh
```

A successful `CI` run on `main` then packages the reviewed commit, uploads it to the private S3 bucket, and deploys it through SSM. Release objects expire after 30 days. GitHub receives short-lived AWS credentials and does not store the EC2 SSH key.

## Verify

```bash
curl -fsS https://praxis.inferia.ai/healthz
curl -fsS https://praxis.inferia.ai/api/health
```

Open `https://praxis.inferia.ai`, sign in with the configured bootstrap administrator, upload a document, and confirm the processing worker completes it.

On the host, inspect the stack with:

```bash
cd /opt/praxis
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200
```

## Manual Recovery

If GitHub Actions or SSM is unavailable, run `./deploy/aws/release.sh` from a reviewed local checkout over the restricted SSH connection. Database schema changes require a separate migration and backup procedure before production use.
