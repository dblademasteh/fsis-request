# FSIS Request - Deployment Guide

## Cloudflare Tunnel Setup

### 1. Create .env file
```bash
cp .env.example .env
nano .env
```

### 2. Set environment variables
```env
DB_USER=fsis
DB_PASSWORD=your_secure_password_here
DB_NAME=fsis
JWT_SECRET=your_very_long_secret_key_at_least_32_characters
BASE_URL=http://localhost:3001
CLIENT_PORT=8080
SERVER_PORT=3001
```

### 3. Deploy to NAS via SSH
```bash
# From your computer
scp Dockerfile.client Dockerfile.server docker-compose.yml .env.example nginx.conf deploy.sh user@bfp-r2-nas1:/path/to/fsis-request

# SSH to NAS
ssh bfpr2@bfp-r2-nas1

# Navigate to project
cd /path/to/fsis-request

# Create .env
cp .env.example .env
nano .env  # Edit with your values

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 4. Configure Cloudflare Tunnel
```bash
# On NAS - in your project directory
cloudflared tunnel --hostname devbry.online --url http://localhost:8080
```

Or add to your existing tunnel config:
```yaml
# ~/.cloudflared/config.yml
tunnels:
  fsis-request:
    ingress:
      - hostname: devbry.online
        service: http://localhost:80
      - service: http_status:404
```

## Manual Start (without deploy script)
```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Run initial setup
docker-compose exec server npm run migrate
docker-compose exec server ts-node src/db/deploy-stations.ts
docker-compose exec server ts-node src/db/seed-personnel.ts
```

## Admin Login
- **Username:** admin
- **Password:** (from .env ADMIN_PASSWORD or 'changeme' if not set)

## Services
- **Client (Web):** http://localhost:8080 (via Cloudflare: https://devbry.online)
- **Server (API):** http://localhost:3001

## Stopping Services
```bash
docker-compose down
```

## Viewing Logs
```bash
docker-compose logs -f
docker-compose logs server
docker-compose logs client
```