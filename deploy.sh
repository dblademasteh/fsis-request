#!/bin/bash
# Deploy script for FSIS Request system — run on the NAS (BFP-R2-NAS1).
# Pulls latest from GitHub, then rebuilds/restarts the Docker stack.
#
# Usage:
#   ./deploy.sh            # pull + rebuild + restart
#   ./deploy.sh --no-pull  # skip git pull (just rebuild/restart)
#   ./deploy.sh --tunnel   # also start the Cloudflare tunnel service

set -e

echo "=== FSIS Request Deployment Script ==="

# --- 1. .env check ---------------------------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found at project root."
  echo "Create it from .env.example and fill in production values:"
  echo "  cp .env.example .env"
  echo "  # then edit .env (DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, ...)"
  exit 1
fi

# --- 2. Pull latest code (unless skipped) ----------------------------------
if [ "$1" != "--no-pull" ]; then
  echo "Pulling latest from origin/main..."
  git pull origin main
else
  echo "Skipping git pull (--no-pull)."
fi

# --- 3. Build and start core services --------------------------------------
echo "Building Docker images..."
docker compose build

echo "Starting services (postgres, server, client)..."
docker compose up -d

# --- 4. Optional: Cloudflare tunnel ----------------------------------------
if [ "$1" = "--tunnel" ] || [ "$2" = "--tunnel" ]; then
  echo "Starting Cloudflare tunnel..."
  docker compose --profile tunnel up -d cloudflared
else
  echo "Cloudflare tunnel not started (pass --tunnel to enable)."
fi

# --- 5. Verify --------------------------------------------------------------
echo ""
echo "Waiting for services to become healthy..."
sleep 8

echo ""
echo "=== Deployment Complete ==="
docker compose ps

echo ""
echo "Client:  http://$(hostname -I | awk '{print $1}'):${CLIENT_PORT:-38080}"
echo "Server:  http://$(hostname -I | awk '{print $1}'):${SERVER_PORT:-3001}"
echo ""
echo "To view logs:  docker compose logs -f"
echo "To stop:       docker compose down"