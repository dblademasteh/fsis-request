#!/bin/bash
# CloudPanel deploy for FSIS Request — run on the VPS (as fsis-app or root).
# Pulls latest from GitHub, rebuilds server + client, runs migrations, restarts PM2.
#
# Usage:
#   ./deploy-cloudpanel.sh            # pull + rebuild + migrate + restart
#   ./deploy-cloudpanel.sh --no-pull  # skip git pull (rebuild only)

set -e
cd "$(dirname "$0")"

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

echo "=== FSIS Request — CloudPanel Deploy ==="

# --- 1. .env check ----------------------------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found at project root."
  echo "It must contain: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, PORT, ADMIN_PASSWORD"
  exit 1
fi

# --- 2. Pull latest code (unless skipped) ------------------------------------
if [ "$1" != "--no-pull" ]; then
  echo "Pulling latest from origin/main..."
  git pull --ff-only origin main
else
  echo "Skipping git pull (--no-pull)."
fi

# --- 3. Build server ----------------------------------------------------------
echo "Building server..."
cd server
npm install --silent
npm run build
cp src/db/*.csv dist/db/ 2>/dev/null || true

# --- 4. Build client ----------------------------------------------------------
echo "Building client..."
cd ../client
npm install --silent
npm run build

# --- 5. Migrations (from app root so .env is loaded) --------------------------
cd ..
echo "Running migrations..."
node server/dist/db/migrate.js
node server/dist/db/setup-auth.js

# --- 6. Restart API via PM2 ---------------------------------------------------
echo "Restarting PM2 process..."
pm2 restart fsis-api --update-env
pm2 save

echo ""
echo "=== Deployment Complete ==="
pm2 status | grep fsis-api
echo ""
echo "Site: https://request.bfpr2.online"
echo "Logs: pm2 logs fsis-api"
