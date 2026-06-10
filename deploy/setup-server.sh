#!/bin/bash
# Run this ONCE on a fresh server to install all dependencies.
# Usage: bash setup-server.sh
set -e

APP_DIR="/home/crane/wastrica-collect-be"
REPO="https://github.com/Waste-hunters/wastrica-collect-BE.git"

echo "=== [1/4] Updating system packages ==="
sudo apt-get update -y && sudo apt-get upgrade -y

echo "=== [2/4] Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

echo "=== [3/4] Installing PM2 ==="
sudo npm install -g pm2
pm2 -v

echo "=== [4/4] Cloning repository ==="
git clone "$REPO" "$APP_DIR"
echo "Repo cloned to $APP_DIR"

echo ""
echo "=========================================="
echo "Server setup complete!"
echo ""
echo "NEXT STEPS:"
echo "  1. Create $APP_DIR/.env  (copy from .env.example, set your Neon DATABASE_URL)"
echo "  2. Run: bash $APP_DIR/deploy/deploy.sh"
echo "  3. Set up PM2 startup: pm2 startup  then  pm2 save"
echo "=========================================="
