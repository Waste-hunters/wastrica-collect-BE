#!/bin/bash
# Run this ONCE on a fresh server to install all dependencies.
# Usage: bash setup-server.sh
set -e

APP_DIR="/home/crane/wastrica-collect-be"
REPO="https://github.com/Waste-hunters/wastrica-collect-BE.git"

echo "=== [1/6] Updating system packages ==="
sudo apt-get update -y && sudo apt-get upgrade -y

echo "=== [2/6] Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

echo "=== [3/6] Installing PM2 ==="
sudo npm install -g pm2
pm2 -v

echo "=== [4/6] Installing PostgreSQL ==="
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
echo "PostgreSQL installed. Version: $(psql --version)"

echo "=== [5/6] Creating database and user ==="
# Creates DB user 'wastrica' with password 'wastrica_pass' and a database 'wastrica_collect'
# CHANGE the password below before running!
sudo -u postgres psql -c "CREATE USER wastrica WITH PASSWORD 'wastrica_pass';" || echo "User may already exist"
sudo -u postgres psql -c "CREATE DATABASE wastrica_collect OWNER wastrica;" || echo "DB may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wastrica_collect TO wastrica;"

echo "=== [6/6] Cloning repository ==="
git clone "$REPO" "$APP_DIR"
echo "Repo cloned to $APP_DIR"

echo ""
echo "=========================================="
echo "Server setup complete!"
echo ""
echo "NEXT STEPS:"
echo "  1. Create $APP_DIR/.env  (copy from .env.example and fill in real values)"
echo "  2. Run: bash $APP_DIR/deploy/deploy.sh"
echo "  3. Set up PM2 startup: pm2 startup  then  pm2 save"
echo "=========================================="
