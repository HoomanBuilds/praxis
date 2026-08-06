# AWS Deployment Runbook

## Inputs

- An authenticated AWS CLI session with CloudFormation, EC2, and networking permissions.
- A dedicated `praxis-aws` EC2 key pair and matching local SSH key.
- The administrator's current public IPv4 address for the restricted SSH rule.
- A Cloudflare Tunnel run token when public HTTPS is enabled.

The default region is Mumbai (`ap-south-1`). The host is an `m6a.2xlarge` with 8 vCPUs, 32 GiB RAM, a 50 GiB encrypted gp3 root volume, and 8 GiB swap. Estimated on-demand cost is about USD 170 per 730-hour month before tax, snapshots, and data transfer.

## Provision and Configure SSH

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

Synchronize the current workspace and release it:

```bash
./deploy/aws/release.sh
```

Provisioning creates a dedicated VPC, encrypted storage, security group, and EC2 instance without IAM users or roles. SSH is open only to `SSH_CIDR`; HTTP and HTTPS remain closed. The release script excludes local dependencies, Git metadata, and environment files. On the first release, production secrets are generated directly on the host with mode `0600`.

Before Cloudflare is connected, forward the host loopback port through SSH:

```bash
ssh -L 8080:127.0.0.1:8080 praxis-aws
```

Then open `http://localhost:8080`.

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

## Update and Roll Back

Rerun `release.sh` to synchronize a reviewed workspace. Keep versioned release archives before changes that need rollback. Database schema changes require a separate migration and backup procedure before production use.
