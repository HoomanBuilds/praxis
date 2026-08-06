#!/usr/bin/env bash
# PRAXIS host setup script
# Run once on a fresh Ubuntu 22.04 host before releasing the application.
set -euo pipefail

echo "=== PRAXIS Production Setup ==="

echo "[1/6] Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

echo "[2/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "Docker installed. Log out and back in for group changes."
fi

echo "[3/6] Installing Docker Compose..."
if ! docker compose version &>/dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi

echo "[4/6] Configuring swap..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 8G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created: 8GB"
fi

echo "[5/6] Creating project directory..."
sudo mkdir -p /opt/praxis
sudo chown "$USER:docker" /opt/praxis

echo "[6/6] Configuring firewall and backups..."
if command -v ufw &>/dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi

chmod +x /opt/praxis/deploy/backup.sh /opt/praxis/deploy/restore.sh 2>/dev/null || true
mkdir -p /opt/praxis/backups
(crontab -l 2>/dev/null | grep -v 'praxis/deploy/backup.sh'; \
 echo "0 2 * * * cd /opt/praxis && ./deploy/backup.sh >> /opt/praxis/backups/backup.log 2>&1") | crontab -
echo "Daily backup scheduled for 2am (deploy/backup.sh -> /opt/praxis/backups)."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo: cd /opt/praxis && git clone <repo-url> ."
echo "  2. Create .env.production with real secrets"
echo "  3. Start: ./deploy/aws/remote-release.sh"
echo "  4. Caddy obtains and renews the TLS certificate automatically"
