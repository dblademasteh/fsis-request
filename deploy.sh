#!/bin/bash
# Deploy script for FSIS Request system

set -e

echo "=== FSIS Request Deployment Script ==="

# Check if .env exists
if [ ! -f .env ]; then
  echo "Creating .env from example..."
  cp .env.example .env
  echo "Please edit .env with your production values"
  exit 1
fi

# Build and start containers
echo "Building Docker images..."
docker-compose build

echo "Starting services..."
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Run migrations and seeds
echo "Running database migrations..."
docker-compose exec server npm run migrate

echo "Seeding fire stations..."
docker-compose exec server ts-node src/db/deploy-stations.ts

echo "Seeding personnel data..."
docker-compose exec server ts-node src/db/seed-personnel.ts

echo ""
echo "=== Deployment Complete ==="
echo "Client: http://$(hostname -I | awk '{print $1}'):80"
echo "Server: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"