# AGENTS.md

## Workflow rules

- Always commit, push, and deploy after completing a code change. Deploy target: Hostinger VPS (CloudPanel) — see DEPLOY.md. Push to `origin/main`, then on the VPS run `/home/fsis-app/htdocs/request.bfpr2.online/deploy-cloudpanel.sh` (or its `--no-pull` variant).

## Verify

- Type-check before deploying: `npx tsc --noEmit` in `client/` and `server/`.
- Client build: `npm run build` in `client/`.
