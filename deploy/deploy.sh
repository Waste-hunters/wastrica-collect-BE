#!/bin/bash
# Pulls latest code, builds, runs migrations, and restarts the app.
# Called by GitHub Actions on every push to main, or run manually.
set -e

APP_DIR="/home/crane/wastrica-collect-be"

echo "=== [1/5] Pulling latest code ==="
cd "$APP_DIR"
git pull origin main

echo "=== [2/5] Installing dependencies ==="
npm ci --omit=dev

echo "=== [3/5] Generating Prisma client ==="
npx prisma generate

echo "=== [4/5] Running database migrations ==="
npx prisma migrate deploy

echo "=== [5/5] Building and restarting app ==="
npm run build

# Start with PM2 if not running, otherwise reload (zero-downtime)
if pm2 list | grep -q "wastrica-collect-be"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

echo ""
echo "Deploy complete! App is running."
pm2 status wastrica-collect-be
