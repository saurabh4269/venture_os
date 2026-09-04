# Architecture

Locked stack. Do not substitute Clerk, WorkOS, Inngest, Trigger, Claude-as-default, or R2-only storage in domain code.

---

## 1. Monorepo

```
apps/web      Next.js 15 — desktop UI
apps/api      Hono — auth + HTTP API
apps/worker   BullMQ processors
packages/db       Drizzle schema, RLS helpers, migrations
packages/schema   Shared Zod / TS types
packages/llm      Provider interface (OpenAI default)
packages/core     Metrics, units, FY, flags, Ask grounding
packages/ui       Shared presentational primitives
packages/config   Env + constants
```

Language: **TypeScript** everywhere.  
Workspace: **pnpm + Turborepo**.

---

## 2. Runtime diagram

```
Browser (apps/web :3000)
    │  rewrite /api/* 
    ▼
Hono (apps/api :4000)
    │ Better Auth session
    │ SET LOCAL app.current_org_id
    ▼
Postgres (Drizzle + RLS)
    │ enqueue
    ▼
Redis + BullMQ (apps/worker)
    │ getObject / putObject
    ▼
S3-compatible store (MinIO locally)
    │ optional complete()
    ▼
packages/llm (OpenAI)
```

---

## 3. Auth

**Better Auth** on the API (`/api/auth/*`).

- Email + password for v1 (magic-link later).
- Organization plugin: create org, invite, member roles.
- App roles mapped onto org membership: `org_admin` | `partner` | `analyst` | `viewer`.
- Next.js never holds a second user table. It proxies cookies to the API.

Not Clerk. Not WorkOS.

---

## 4. Data

- **Postgres** is the system of record.
- **Drizzle** is the only query builder.
- **RLS** on every tenant table keyed by `org_id`. The API sets `app.current_org_id` on the connection after resolving the active org from the session.
- **FTS**: `documents_fts` / `chunks.tsv` with `to_tsvector`. pgvector is optional later; do not block Ask on it.

---

## 5. Jobs

**BullMQ + Redis.** Queue names:

| Queue | Job |
| --- | --- |
| `parse` | Extract XLSX/PDF → inbox proposals + FTS chunks |
| `flags` | Re-run catalog detectors for an org/company |
| `nav` | Materialise as-of NAV snapshot (optional cache) |
| `report` | Build export bytes |
| `hello` | Worker liveness |

Not Inngest. Not Trigger.dev.

---

## 6. Files

`packages/db` / API use an **S3-compatible interface**:

- Local / Compose: **MinIO**
- Early live: Cloudflare R2 or any S3 API
- Later: Azure Blob behind the same interface

Domain code talks to `ObjectStore`, never to a vendor SDK type.

---

## 7. LLM

`packages/llm`:

```ts
interface LlmProvider {
  complete(req: CompletionRequest): Promise<CompletionResponse>
}
```

Default: **OpenAI**. Swap later by env (`LLM_PROVIDER`). Domain code does not import `openai` directly.

Used for: inbox assist (proposals only), Ask completion (grounded), report prose (from facts). Never for runway / MOIC / NAV / flag predicates.

---

## 8. Local development

Docker Compose services:

- `postgres` 5432
- `redis` 6379
- `minio` 9000 (console 9001)
- `api` 4000
- `web` 3000
- `worker`

If Docker is unavailable, `.env.example` documents native Postgres / Redis / filesystem object store (`S3_ENDPOINT=fs`).

```
pnpm i
cp .env.example .env
docker compose up --build
# or: pnpm db:migrate && pnpm dev
```

---

## 9. Early live hosting (free-tier friendly)

Documented so a VC can click a URL. No vendor lock-in in domain code.

| Piece | First live | Why | Later |
| --- | --- | --- | --- |
| `apps/web` | **Vercel** hobby | Next.js native | Azure SWA / any Node |
| Postgres | **Neon** free | serverless PG, RLS | Azure Flexible PG / Cosmos is wrong |
| Redis | **Upstash** free | BullMQ-compatible REST/TCP | Azure Cache |
| `apps/api` + `apps/worker` | **Fly.io** or **Render** free/hobby | long-running Node | Azure Container Apps |
| Objects | R2 free tier or Fly volume + MinIO | S3 API | Azure Blob |

See `docs/cost-hosting.md`. Deploy configs: `apps/web/vercel.json`, `fly.toml` (api+worker), `render.yaml`.

---

## 10. Azure-later notes

When the firm wants Azure:

- Blob Storage implements `ObjectStore`.
- Azure Database for PostgreSQL keeps Drizzle + RLS.
- Azure Cache for Redis keeps BullMQ.
- Container Apps replace Fly/Render.
- Entra ID can sit *in front of* Better Auth later; do not replace Better Auth in a hurry.

No Azure SDK in domain packages until that adapter lands.

---

## 11. Observability

- Structured JSON logs (`level`, `msg`, `orgId`, `requestId`, `jobId`).
- `GET /health` (api) and `GET /health` (web rewrite) return `{ ok, postgres, redis }`.
- Worker logs job start/fail/complete.
- No PII in logs beyond user id.

---

## 12. Tests

Vitest:

- metrics (runway, MOIC, XIRR) and **null semantics**
- flag detectors
- Ask refuse (no evidence → refusal, no completion call)
- RLS isolation (Postgres)

CI: `.github/workflows/ci.yml` — install, test, typecheck. Postgres service for RLS.
