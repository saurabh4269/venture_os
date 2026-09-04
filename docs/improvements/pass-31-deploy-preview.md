# Pass 31 — Deploy + preview

**Date:** 2026-09-05  
**Surface:** same-origin BFF, origin patterns, production image, Fly/Render/CI, `/health`  
**Evidence:** `docs/improvements/queue-2/queued-pass-deploy-preview.md` on `main@925c284`.

## Issues

### 1. P0 — No same-origin API on Vercel

**Wrong:** Empty `vercel.json` rewrites; browser used bake-time `NEXT_PUBLIC_API_URL` cross-site so `SameSite=Lax` cookies never attached.

**Should:** Next BFF catch-all `apps/web/src/app/api/[...path]/route.ts` proxies to runtime `API_URL`. Client uses relative `/api` when `NEXT_PUBLIC_API_URL` is empty.

**Fix:** BFF + `api.ts` / `auth-client.ts`.

### 2. P0 — Preview origins not allowlisted

**Wrong:** CORS / Better Auth / mutating Origin check used a single `WEB_URL`.

**Should:** Shared `WEB_ORIGIN_PATTERNS` (e.g. `https://*.vercel.app`) in `@venture-os/config/origins`.

**Fix:** `collectTrustedOrigins` / `isTrustedOrigin`.

### 3. P0 — `NEXT_PUBLIC_API_URL` bake-time

**Wrong:** Preview built against localhost or prod API.

**Should:** Leave public URL empty; BFF reads `API_URL` at request time.

### 4. P0 — Container ran `pnpm dev`

**Wrong:** `docker/Dockerfile` CMD was watch mode; install fell back without lockfile.

**Should:** `pnpm install --frozen-lockfile`; `APP=api|worker` production `start`.

### 5. P0 — Fly zero warm machines

**Wrong:** `min_machines_running = 0` + auto-stop.

**Should:** One warm API machine; worker process group.

### 6. P1 — No Fly migrate-on-release

**Wrong:** Fresh Neon had empty schema.

**Should:** `[deploy] release_command` migrate. Superuser DSN (`MIGRATE_DATABASE_URL`).

### 7. P1 — render.yaml env checklist missing

**Wrong:** Only `NODE_ENV`.

**Should:** `sync: false` placeholders for DB, Redis, WEB_URL, Better Auth, S3.

### 8. P1 — Health lied about Redis

**Wrong:** `redis: "unknown"`.

**Should:** Ping Redis. `ok` = Postgres liveness; `ready` = Postgres + Redis. `gitSha` from `GIT_SHA`.

### 9. P1 — CI never built web

**Wrong:** migrate + unit + typecheck only.

**Should:** `WEB_URL` / `BETTER_AUTH_URL` / `API_URL` / `GIT_SHA`; web build; Playwright smoke; Redis service.

### 10. P1 — Shared preview DB + SEED_DEMO

**Wrong:** Fixture rows could land on a partner DSN.

**Should:** `SEED_DEMO=1` + `NODE_ENV=production` throws. Document Neon branches.

### 11. P1 — Object store absent from stubs

**Wrong:** Fly/Render never named R2 keys.

**Should:** `S3_*` in render placeholders + cost-hosting.

### 12. P1 — Worker undefined on Fly

**Wrong:** Comment only.

**Should:** `[processes] worker`.

### 13. P2 — Compose looks like production

**Wrong:** Bind-mount watch only.

**Should:** Header comment **DEV ONLY**. Image CMD is production start.

### 14. P2 — Cookie Secure vs edge HTTPS

**Wrong:** Secure keyed only off `NODE_ENV`.

**Should:** `COOKIE_SECURE` or `https` `BETTER_AUTH_URL` (pass 32). Document pairing.

### 15. P2 — Migrate DSN confusion

**Wrong:** App role migrate fails opaquely.

**Should:** migrate prints a superuser hint when the URL looks like `venture_os_app`.

### 16. P3 — Vercel filter / rollback / region

**Wrong:** Undocumented.

**Should:** cost-hosting notes (filter `@venture-os/web`, rollback, region pin). Residual: no Terraform.

## Residual

- No preview smoke curl after a real Fly/Vercel release (needs credentials).
- Image build in CI is optional (slow); Dockerfile is now production-shaped.
- Connectors stay **not connected**.
