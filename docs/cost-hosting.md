# Cost and hosting

No secrets in repo. Numbers are order-of-magnitude bands for planning, not quotes.

---

## 1. Local — $0

`docker compose up` (Postgres, Redis, MinIO, api, web, worker).  
If Docker is missing: native Postgres + Redis + filesystem object store (`S3_ENDPOINT=fs`).

## 2. Early live (free-tier, VC feedback)

Intended for a closed V3 design-partner URL, not production scale.

| Service | Suggested free tier | Role | Watch-outs |
| --- | --- | --- | --- |
| Vercel Hobby | $0 | `apps/web` | Serverless only; API/worker stay elsewhere |
| Neon Free | $0 | Postgres | Sleep / compute limits; RLS still works |
| Upstash Free | $0 | Redis for BullMQ | Connection / command caps |
| Fly.io or Render hobby | $0–small | `apps/api` + `apps/worker` | Cold starts; need a worker process |
| Cloudflare R2 free | $0 | Objects | S3 API; swap endpoint only |
| OpenAI | usage | Ask + parse assist | Set monthly cap; Ask refuses if key missing (still searchable facts) |

**Band:** $0–50 / month if Ask is used lightly. OpenAI is the first bill that moves.

Deploy files: `apps/web/vercel.json`, `fly.toml`, `render.yaml`.  
Env names (no secrets): README “Free-tier preview” — only keys from `.env.example`.

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
