# FSIS Request — Deployment Guide

Production target: **Hostinger VPS** (`76.13.187.170`, `srv2024771`) running **CloudPanel**, domain **https://request.bfpr2.online**.

Architecture (no Docker for the app — only Postgres runs in Docker):

```
Browser → CloudPanel nginx (:443, Let's Encrypt)
            ├─ /            → client/dist (static React build, SPA fallback)
            ├─ /api         → proxy → 127.0.0.1:3001 (PM2: fsis-api, node server/dist/index.js)
            └─ /uploads     → proxy → 127.0.0.1:3001
PM2 (fsis-api) → Postgres in Docker (fsis-postgres, 127.0.0.1:5432, volume fsis_pg_data)
```

## Paths on the VPS

| What | Where |
|---|---|
| App (git clone) | `/home/fsis-app/htdocs/request.bfpr2.online` |
| Site user (SSH/SFTP) | `fsis-app` |
| Client build | `.../client/dist` (nginx docroot) |
| Server build | `.../server/dist` |
| `.env` (secrets) | `/home/fsis-app/htdocs/request.bfpr2.online/.env` (chmod 600) |
| Nginx vhost | `/etc/nginx/sites-enabled/request.bfpr2.online.conf` |
| Generated credentials | `/root/.fsis_creds` (root only) |
| Postgres container | `fsis-postgres` (image `postgres:16-alpine`, volume `fsis_pg_data`) |

## Workflow

Code is edited on the dev PC and pushed to GitHub. The VPS **pulls** — never edit tracked files directly on the VPS. Only `.env` lives on the VPS.

```bash
# Dev PC
git add . && git commit -m "..." && git push

# VPS
ssh root@76.13.187.170
cd /home/fsis-app/htdocs/request.bfpr2.online
./deploy-cloudpanel.sh        # pull + npm install + build + migrate + pm2 restart
```

> The script runs as whichever user invokes it; run it as `fsis-app` (or via root — it uses nvm from the fsis-app home). GitHub access uses a **deploy key** at `/home/fsis-app/.ssh/fsis_deploy` (added to the repo as `fsis-vps`).

## 1. `.env` (on the VPS)

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=fsis_admin
DB_PASSWORD=<generated — see /root/.fsis_creds>
DB_NAME=fsis
JWT_SECRET=<generated>
PORT=3001
ADMIN_PASSWORD=<generated>
```

Rules:

* dotenv loads `.env` from the **current working directory** — always run the server/migrations from the app root (the deploy script does).
* `ADMIN_PASSWORD` is applied to the `admin` user on every migration run.
* After changing `.env`: `pm2 restart fsis-api --update-env` (or rerun the deploy script).
* ⚠️ `POSTGRES_*` envs only take effect on **first** initialization of the `fsis_pg_data` volume. To change DB credentials later, create the role manually in psql or wipe the volume (`docker rm -f fsis-postgres && docker volume rm fsis_pg_data` — **deletes all data**).

## 2. Deploy / update

```bash
cd /home/fsis-app/htdocs/request.bfpr2.online
./deploy-cloudpanel.sh
```

First-boot sequence (already done):

1. Postgres container starts (`fsis-postgres`, localhost-only port binding `127.0.0.1:5432`)
2. Migrations run (`node server/dist/db/migrate.js`) → tables, seed stations, admin password
3. `setup-auth.js` ensures the users table/admin
4. PM2 starts `node server/dist/index.js` (name `fsis-api`, port 3001)

Verify:

```bash
pm2 status | grep fsis-api                    # online
curl -s http://127.0.0.1:3001/api/stations | head -c 200
curl -sk https://127.0.0.1/api/stations --resolve request.bfpr2.online:443:127.0.0.1
```

## 3. Database seeding

Migrations auto-run on every deploy. Manual seed commands use **compiled JS** (`ts-node`/`src/` are not deployed):

```bash
cd /home/fsis-app/htdocs/request.bfpr2.online
node server/dist/db/deploy-stations.js   # fire stations (idempotent)
node server/dist/db/seed-personnel.js    # ⚠️ DELETES all personnel, reimports bundled CSV
```

For day-to-day personnel management use the admin UI (**Personnel → Import CSV / Add / Edit / Delete**) — no rebuild needed.

## 4. Admin login

* **Username:** `admin`
* **Password:** value of `ADMIN_PASSWORD` (generated — see `/root/.fsis_creds`)

Changing it: edit `.env` → `node server/dist/db/migrate.js && pm2 restart fsis-api` (migration upserts the hash).

Landing-page users identify themselves by their FSIS account number, which must exist in the `personnel` table.

## 5. SSL / domain

* DNS: A record `request` → `76.13.187.170` (hPanel → Domains → bfpr2.online → DNS)
* Cert: `clpctl lets-encrypt:install:certificate --domainName=request.bfpr2.online` (issues apex + www — www needs a DNS record too, e.g. CNAME `www` → `request.bfpr2.online`)
* CloudPanel places a **self-signed placeholder cert** at site creation, so HTTPS works internally even before Let's Encrypt.

## 6. Database backup

```bash
# dump to file
docker exec fsis-postgres pg_dump -U fsis_admin -d fsis > ~/fsis_backup_$(date +%Y%m%d).sql

# restore
docker exec -i fsis-postgres psql -U fsis_admin -d fsis < ~/fsis_backup_<timestamp>.sql
```

Schedule it with a cron job (`crontab -e` as root) and copy dumps off the VPS for disaster recovery.

## 7. Maintenance

```bash
pm2 status                          # process state
pm2 logs fsis-api                   # API logs
pm2 restart fsis-api                # restart API
docker ps | grep fsis-postgres      # DB container
docker logs fsis-postgres --tail 20 # DB logs
systemctl reload nginx              # after vhost edits
docker rm -f fsis-postgres && docker volume rm fsis_pg_data   # ⚠️ wipes database
```

> ⚠️ **Vhost caveat:** the nginx vhost was edited directly on disk (custom SPA + proxy config). If you save a vhost through the CloudPanel UI for this site, it regenerates the file and **overwrites** the custom config — re-apply it from `${VHOST}.deploy-bak` or by hand.

### Browser caching (service worker)

The client registers a service worker (`client/public/sw.js`, cache name `fsis-v2`) with a cache-first strategy for `/logo.png`, `manifest.json`, etc. After changing any static asset, **bump `CACHE_NAME`** (e.g. `fsis-v3`) in the same commit so browsers fetch fresh copies.

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `pm2 status` shows `errored`, errno -98 | Port 3001 already in use | `ss -tlnp \| grep 3001`, kill the stale process, `pm2 restart fsis-api` |
| `relation "..." does not exist` on migrate | Stale `dist/` (build didn't run) | Rerun `./deploy-cloudpanel.sh` |
| `permission denied` during build | Files owned by root (built as wrong user once) | `chown -R fsis-app:fsis-app /home/fsis-app/htdocs/request.bfpr2.online` as root |
| `node: command not found` in scripts | nvm not loaded (non-interactive shell) | `export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh` |
| `FATAL: JWT_SECRET ... required` | Server started outside the app root | Always run from `/home/fsis-app/htdocs/request.bfpr2.online` |
| Login modal reappears after reload | Account number missing from `personnel` | Import personnel via admin UI |
| Old logo/assets after deploy | Service worker cache | Bump `CACHE_NAME` in `sw.js` |
| Let's Encrypt fails | DNS record missing (apex or www) | Add/fix DNS in hPanel, retry |
| Old client after deploy | Browser cache on index.html | Hard refresh (Ctrl+Shift+R) |

## 9. Release checklist

- [ ] Type-checks pass locally (`npx tsc --noEmit` in `client/` and `server/`)
- [ ] Static assets changed? → bumped `CACHE_NAME` in `sw.js`
- [ ] Committed & pushed from the PC
- [ ] On VPS: `./deploy-cloudpanel.sh`
- [ ] `pm2 status` online + login + core flows verified

---

# Legacy: NAS deployment (BFP-R2-NAS1)

The previous target was a Synology NAS at `/volume1/docker/fsis-request`, running the full stack in Docker Compose with a Cloudflare tunnel (`devbry.online`). See git history for that workflow (`deploy.sh`, `backup-db.sh`, docker-compose with `cloudflared` service). Key differences from the CloudPanel setup:

* Compose injected env vars; the VPS uses a root-level `.env` loaded by dotenv.
* `cloudflared` tunnel replaced by CloudPanel nginx + Let's Encrypt.
* Container restarts replaced by PM2.
