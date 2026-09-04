# Cost and hosting

No secrets in repo. Numbers are order-of-magnitude bands for planning, not quotes.

---

## 1. Local — $0

`docker compose up` is **DEV ONLY** (bind-mount watch). Production images use `docker/Dockerfile` `APP=api|worker` and `pnpm --filter … start` (not `pnpm dev`).

If Docker is missing: native Postgres + Redis + filesystem object store (`S3_ENDPOINT=fs`).

## 2. Early live (free-tier, VC feedback)

Intended for a closed V3 design-partner URL, not production scale.

| Service | Suggested free tier | Role | Watch-outs |
| --- | --- | --- | --- |
| Vercel Hobby | $0 | `apps/web` | Serverless only; API/worker stay elsewhere. Filter `@venture-os/web`. Leave `NEXT_PUBLIC_API_URL` empty; set server `API_URL` for the BFF. Enable Deployment Protection on public Hobby previews. |
| Neon Free | $0 | Postgres | Sleep / compute limits; RLS still works. **Branch per preview** — do not share one DSN across PRs. Never `SEED_DEMO=1` on a partner URL. |
| Upstash Free | $0 | Redis for BullMQ | Connection / command caps. `/health.ready` is false if Redis is down. |
| Fly.io or Render hobby | $0–small | `apps/api` + `apps/worker` | Fly: `min_machines_running = 1`, `[processes] worker`, `release_command` migrate. Render: worker is a second service. |
| Cloudflare R2 free | $0 | Objects | Same names as Compose MinIO: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`. Local/CI: `S3_ENDPOINT=fs`. |
| OpenAI | usage | Ask + parse assist | Set monthly cap; Ask refuses if key missing (still searchable facts) |

**Band:** $0–50 / month if Ask is used lightly. OpenAI is the first bill that moves.

Deploy files: `apps/web/vercel.json` (BFF is the rewrite — do not bake `NEXT_PUBLIC_API_URL`), `fly.toml`, `render.yaml`.  
Env names (no secrets): README “Free-tier preview” — only keys from `.env.example`.

**Cookies:** same-origin BFF keeps `SameSite=Lax`. `Secure` follows `COOKIE_SECURE` or an `https` `BETTER_AUTH_URL` (Fly `force_https` terminates TLS at the edge — still set Secure). Split-host without BFF is not the supported preview path.

**Migrate:** `MIGRATE_DATABASE_URL` must be the Neon **owner** role. The app DSN is `venture_os_app` (no `BYPASSRLS`). Migrate prints a hint if you point it at the app role.

**Region:** Fly `primary_region = iad` — pick a Neon region next to it or every `getSession` pays the ocean.

**Rollback:** Vercel → previous deployment. Fly → `fly releases rollback`. No Terraform in this repo.

**Hobby sleep:** session cookies survive; in-flight parse dies. Retry after the API wakes. `/health` `ok` is Postgres; `ready` is Postgres+Redis.

## 3. Azure later (when the firm wants it)

| Band | Shape |
| --- | --- |
| Dev | Azure PG flexible + Cache + Blob + Container Apps consume ~ low hundreds USD / month if left on |
| Design-partner prod | HA PG, private networking, Key Vault, Front Door — budget as a real workload, not free tier |

Domain code stays on `ObjectStore` + `LlmProvider` + Drizzle. Azure is an adapter change plus Terraform (not in this PR).

## 4. What we will not do

- Put the book in a spreadsheet-backed “no backend” host.
- Bind metric math to a vendor AI gateway.
- Store documents only on a vendor-specific SDK.
