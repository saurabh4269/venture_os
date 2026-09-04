# Pass 29 — Deploy preview docs

**Date:** 2026-09-04  
**Surface:** README + `docs/cost-hosting.md`  
**Evidence:** NEXT.md item 7; `.env.example` real names only. No fake secrets.

## Issues

### 1. P1 — README said “early live notes” without the env map

**Wrong:** A Partner could invent `GRAPH_CLIENT_ID` or `LAST_SYNC`.

**Should:** Table of names from `.env.example` only.

**Fix:** README “Free-tier preview” section.

### 2. P1 — Vercel env not listed

**Wrong:** `apps/web/vercel.json` is a stub. Next needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`.

**Should:** Document those two public vars. No API secrets on Vercel.

### 3. P1 — Neon / migrate vs app role

**Wrong:** One URL used for both migrate and RLS tests would BYPASS.

**Should:** `MIGRATE_DATABASE_URL` (owner) + `DATABASE_URL` (`venture_os_app`, no BYPASSRLS).

### 4. P1 — Upstash Redis URL shape

**Wrong:** People paste `rediss://` into a comment as a secret.

**Should:** `REDIS_URL` name only. No sample password.

### 5. P1 — Fly/Render process split

**Wrong:** `fly.toml` is API-shaped. Worker is a second process.

**Should:** Document api + worker. Web on Vercel.

### 6. P1 — S3/R2 names

**Wrong:** Invented bucket keys.

**Should:** `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`. Local/CI: `S3_ENDPOINT=fs`.

### 7. P1 — Better Auth URL mismatch

**Wrong:** Cookie `secure` + wrong `BETTER_AUTH_URL` = silent sign-in fail.

**Should:** `BETTER_AUTH_SECRET` (32+), `BETTER_AUTH_URL` = public API origin, `WEB_URL` trusted.

### 8. P1 — OpenAI optional

**Wrong:** Preview blocked waiting on a key.

**Should:** Empty `OPENAI_API_KEY` is valid. Ask refuses.

### 9. P1 — SEED_DEMO on a preview URL

**Wrong:** Fixture org mistaken for the client.

**Should:** `SEED_DEMO=0` in production. Never set on the design-partner URL.

### 10. P2 — cost-hosting.md lacked the same names

**Wrong:** Two docs would drift.

**Should:** Cross-link README. Keep cost bands there.

### 11. P2 — Render migrate on the web service only

**Wrong:** `render.yaml` migrates on api build. Worker must not race a second migrate.

**Should:** Document: migrate once (api build).

### 12. P2 — CORS / trusted origins

**Wrong:** Preview web origin must be in `WEB_URL`.

**Should:** Set `WEB_URL` to the Vercel URL.

### 13. P2 — No invented Graph/Affinity env

**Wrong:** Tempting `AFFINITY_API_KEY`.

**Should:** Explicitly absent.

### 14. P2 — Cookie `secure` in production

**Wrong:** Already `NODE_ENV === "production"`. Document it.

### 15. P3 — Azure later

**Wrong:** Already in cost-hosting. Do not reopen stack.

### 16. P3 — Custom domain TLS

**Wrong:** Hosting-provider concern. `ventureos.xyz` later.

## Residual

- No Terraform.
- Preview is not SOC2 hosting.
