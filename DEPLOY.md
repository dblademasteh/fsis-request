# FSIS Request — Deployment Guide

Production target: **BFP-R2-NAS1** at `/volume1/docker/fsis-request`, deployed from GitHub.

## Workflow

Code is edited on the dev PC and pushed to GitHub. The NAS **pulls** — never edit tracked files directly on the NAS (diverged files caused every deploy issue to date). Only `.env` lives only on the NAS.

```bash
# Dev PC
git add . && git commit -m "..." && git push

# NAS
cd /volume1/docker/fsis-request
git pull origin main
docker compose up -d --build        # rebuilds only what changed
```

> 💡 A helper script `deploy.sh` wraps the NAS steps: `./deploy.sh` (pull + rebuild + restart), `./deploy.sh --no-pull` (rebuild only).

## 1. `.env` (on the NAS)

Create once at the project root:

```env
DB_USER=fsis_admin
DB_PASSWORD=strong_db_password
DB_NAME=fsis
JWT_SECRET=long_random_secret_at_least_32_characters
BASE_URL=http://localhost:3001
CLIENT_PORT=38080
SERVER_PORT=3001
ADMIN_PASSWORD=secure_admin_password
CF_TUNNEL_TOKEN=eyJ...cloudflare_tunnel_token
```

Rules:

* One entry per variable — duplicates silently override each other.
* `ADMIN_PASSWORD` is injected into the server container by compose; it is applied on every server start.
* `CF_TUNNEL_TOKEN` is optional until you want public access via Cloudflare.

> ⚠️ `POSTGRES_USER`/`POSTGRES_PASSWORD` only take effect on **first** initialization of the `postgres_data` volume. To change DB credentials later you must either create the new role manually in psql or wipe the volume (`docker compose down -v`) — which deletes all data.

## 2. Deploy / update

```bash
cd /volume1/docker/fsis-request
git pull origin main
docker compose up -d --build
```

On first boot (or after `down -v`):

1. Postgres initializes with `DB_USER`/`DB_PASSWORD` from `.env`
2. The server container waits for Postgres to become healthy (healthcheck), then runs migrations (`node dist/db/migrate.js`) → creates tables, seeds default stations, sets the admin password
3. API listens on port 3001, nginx serves the client on `CLIENT_PORT` (38080)

Verify:

```bash
docker compose ps                                   # all containers Up, stable uptimes
docker compose logs server --tail 10                # expect: Migration completed successfully. / Server running on port 3001
docker compose exec postgres env | grep POSTGRES_USER   # matches DB_USER
```

## 3. Database seeding

Migrations auto-run at container start. Manual seed commands use **compiled JS inside the server image** (`ts-node`/`src/` are not in production images):

```bash
# Fire stations (idempotent — skips existing)
docker compose exec server node dist/db/deploy-stations.js

# Personnel (DELETES all personnel rows, then imports the bundled CSV)
docker compose exec server node dist/db/seed-personnel.js
```

The personnel seed reads `server/src/db/personnel_template.csv`, which is baked into the image at build time. To change the data: update the CSV → commit/push → `git pull && docker compose up -d --build server` → rerun the seed command.

For day-to-day personnel management prefer the admin UI (**Personnel → Import CSV / Add / Edit / Delete**) — it goes through the API and needs no rebuild.

## 4. Admin login

* **Username:** `admin`
* **Password:** value of `ADMIN_PASSWORD` in `.env` (fallback `changeme` — never in production)

Changing the password: edit `.env` → `docker compose up -d --force-recreate server`.

User accounts are not separate logins — landing-page users identify themselves by their FSIS account number, which must exist in the `personnel` table.

## 5. Cloudflare tunnel (public access, optional)

Uses a token-based remote-managed tunnel. One-time setup in the Cloudflare dashboard:

1. https://one.dash.cloudflare.com → **Networks → Tunnels → Create a tunnel** (type *Cloudflared*)
2. Copy the token from the install command (`cloudflared tunnel run --token <TOKEN>`)
3. Add a **Public Hostname**: domain `devbry.online` → service `HTTP` → URL `http://localhost:38080`

> ⚠️ **Important:** The `cloudflared` container runs with **host networking** (`network_mode: host`) because Docker on this NAS runs with `--iptables=false`, which prevents containers on the bridge network from reaching the internet. With host networking, cloudflared cannot resolve Docker service names — so the tunnel's origin URL must be `http://localhost:38080` (the client's published port), **not** `http://client:80`.

Then on the NAS:

```bash
grep -q CF_TUNNEL_TOKEN .env || echo "CF_TUNNEL_TOKEN=<paste-token>" >> .env
docker compose up -d --force-recreate cloudflared
docker compose logs cloudflared --tail 20    # expect "Registered tunnel connection"
```

The `cloudflared` service is part of the default stack, so a plain `docker compose up -d` starts it too. It **self-disables** when no token is set: if `CF_TUNNEL_TOKEN` is empty, the container prints `CF_TUNNEL_TOKEN not set — cloudflared disabled.` and exits cleanly (no crash-loop). To enable public access, add the token to `.env` and recreate the container as above.

## 5b. Database backup

Two ways to back up the database:

**Option A — helper script (recommended):**

```bash
cd /volume1/docker/fsis-request
./backup-db.sh
```

Creates `./backups/fsis_backup_<timestamp>.sql` and keeps the newest 14 (override with `BACKUP_KEEP=30 ./backup-db.sh`).

**Option B — compose service:**

```bash
cd /volume1/docker/fsis-request
docker compose --profile backup run --rm backup
```

Writes to `./backups/` on the host (bind-mounted).

**Scheduled backups (cron):** add to the NAS crontab (`crontab -e`):

```
0 2 * * * cd /volume1/docker/fsis-request && ./backup-db.sh >> /volume1/docker/fsis-request/backups/backup.log 2>&1
```

**Restore:**

```bash
cd /volume1/docker/fsis-request
docker compose exec -T postgres psql -U "$(grep '^DB_USER=' .env | cut -d= -f2-)" -d "$(grep '^DB_NAME=' .env | cut -d= -f2-)" < backups/fsis_backup_<timestamp>.sql
```

> ⚠️ Backups are stored in `./backups/` on the NAS. For disaster recovery, copy them off the NAS (e.g. to a USB drive or cloud storage).

## 6. Services

| Service | Local | Public |
|---|---|---|
| Client (nginx) | `http://<NAS-IP>:38080` | `https://devbry.online` |
| Server (API) | `http://<NAS-IP>:3001` | via nginx `/api` proxy — not exposed directly |
| Postgres | internal network only (`5432/tcp`) | — |

## 7. Maintenance

```bash
docker compose stop            # stop stack (survives reboot unless disabled)
docker compose down            # stop + remove containers (keeps data volume)
docker compose down -v         # ⚠️ also deletes the database volume
docker compose logs -f         # follow all logs
docker compose logs server     # API only
docker compose up -d --force-recreate cloudflared   # (re)start tunnel after adding token
docker compose stop cloudflared                     # stop tunnel
```

### Browser caching (service worker)

The client registers a service worker (`client/public/sw.js`, cache name `fsis-v2`) with a cache-first strategy for `/logo.png`, `manifest.json`, etc. After changing any static asset, **bump `CACHE_NAME`** (e.g. `fsis-v3`) in the same commit so browsers fetch fresh copies.

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Container restarts every few seconds | Crash at startup — check logs | `docker compose logs <service> --tail 30` |
| `password authentication failed for user ...` | Seed/service using credentials that don't match the initialized DB | Run seeds via the `server` container (`node dist/db/...`); verify `.env` matches the role shown by `psql -c "\du"` |
| `role "..." does not exist` | Volume was initialized before the current `DB_USER` was set | Wipe & re-init: `docker compose down -v && docker compose up -d --build` (data loss) |
| `ports are not available ... bind: address already in use` | Host port already used (e.g. local dev server on 3001) | Free the port or change `SERVER_PORT`/`CLIENT_PORT` in `.env` |
| Login modal reappears after page reload | Account number missing from `personnel` table | Re-import personnel / verify row exists: `SELECT COUNT(*) FROM personnel;` |
| Old logo/assets after deploy | Service worker cache | Bump `CACHE_NAME` in `sw.js`; clients clear automatically on next load |
| NAS files diverge from GitHub (merge errors on pull) | Direct edits were made on the NAS | `git reset --hard origin/main` (discards NAS-local edits; `.env` is untracked and safe) |
| Nginx: `host not found in upstream` | Config references `host.docker.internal`, which doesn't exist in this Docker network | Use compose service names — `proxy_pass http://server:3001;` |
| `cloudflared` exits with "token not set" | `CF_TUNNEL_TOKEN` is empty in `.env` | Add the token and recreate: `docker compose up -d --force-recreate cloudflared` |

## 9. Release checklist

- [ ] Type-checks pass locally (`npx tsc --noEmit` in `client/` and `server/`)
- [ ] Tested locally: `docker compose up -d --build postgres server client`
- [ ] Static assets changed? → bumped `CACHE_NAME` in `sw.js`
- [ ] Committed & pushed from the PC
- [ ] On NAS: `git pull origin main && docker compose up -d --build`
- [ ] `docker compose ps` healthy + login + core flows verified
- [ ] Tunnel enabled? → `CF_TUNNEL_TOKEN` set in `.env` + `docker compose up -d --force-recreate cloudflared`
