#!/bin/sh
# Init script for seeding PostgreSQL database on first run

set -e

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-fsis}
DB_USER=${DB_USER:-fsis}
DB_PASSWORD=${DB_PASSWORD:-fsis_password}

echo "Waiting for database..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME; do
  sleep 1
done

echo "Database is ready!"

# Run migration
echo "Running database migration..."
npm run migrate

# Seed stations
echo "Seeding fire stations..."
npm run deploy-stations

# Seed personnel
echo "Seeding personnel data..."
npm run seed-personnel 2>/dev/null || echo "Personnel seeding skipped (already seeded or not available)"

echo "Database initialization complete!"