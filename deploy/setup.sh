#!/usr/bin/env bash
# PRAXIS — EC2 production setup script
# Run once on a fresh Ubuntu 22.04 EC2 instance (t3.xlarge recommended)
set -euo pipefail

echo "=== PRAXIS Production Setup ==="

# --- System updates ---
echo "[1/9] Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# --- Install Docker ---
echo "[2/9] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "Docker installed. Log out and back in for group changes."
fi

# --- Install Docker Compose plugin ---
echo "[3/9] Installing Docker Compose..."
if ! docker compose version &>/dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi

# --- Install certbot ---
echo "[4/9] Installing certbot..."
if ! command -v certbot &>/dev/null; then
    sudo apt-get install -y certbot
fi

# --- Create swap (2GB safety net) ---
echo "[5/9] Configuring swap..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created: 2GB"
fi

# --- Create project directory ---
echo "[6/9] Creating project directory..."
sudo mkdir -p /opt/praxis
sudo chown "$USER:docker" /opt/praxis

# --- Open firewall ports ---
echo "[7/9] Configuring firewall..."
if command -v ufw &>/dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi

# --- Pre-pull Ollama model ---
echo "[8/9] Pulling Ollama model (this takes a while)..."
docker pull ollama/ollama:latest
docker run -d --name ollama-init ollama/ollama:latest
sleep 5
docker exec ollama-init ollama pull llama3.1:8b
docker stop ollama-init && docker rm ollama-init
echo "Model pulled successfully."

# --- Configure daily backups ---
echo "[9/9] Configuring backups..."
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
echo "  2. Copy .env.production to .env and set real passwords"
echo "  3. Get SSL cert: sudo certbot certonly --standalone -d praxis.inferia.ai"
echo "  4. Start: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "Auto-renewal for SSL:"
echo "  (crontab -l 2>/dev/null; echo '0 3 * * * certbot renew --quiet') | crontab -"
