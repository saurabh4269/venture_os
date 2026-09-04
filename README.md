# Venture OS

Production-grade multi-tenant operating system for **VC investment teams**.  
Design partner: **V3 Ventures**. Domain: **ventureos.xyz**.

This is the book — Command, Inbox (HITL), Flags, NAV, Compare, Ask, Reports, Vault — not a chatbot over PDFs and not a founder portal.

Functional source of truth: [`docs/brief/v3-requirement-brief-gargi-2026-09-03.md`](docs/brief/v3-requirement-brief-gargi-2026-09-03.md).  
Agent guide: [`AGENTS.md`](AGENTS.md).

---

## Local run

### With Docker Compose (preferred)

```bash
pnpm i
cp .env.example .env
# optional: set OPENAI_API_KEY in .env so Ask can draft grounded prose
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). API is [http://localhost:4000/health](http://localhost:4000/health).

Compose starts Postgres, Redis, MinIO, `apps/api`, `apps/web`, `apps/worker`.

### Without Docker

You need Postgres 16 and Redis 7 locally. Object store can be the filesystem:

```bash
pnpm i
cp .env.example .env
# DATABASE_URL=postgres://…  REDIS_URL=redis://localhost:6379
# S3_ENDPOINT=fs
pnpm db:migrate
pnpm dev
```

`pnpm dev` runs web (:3000), api (:4000), and worker via Turborepo.

---

## OpenAI

Ask searches Postgres FTS + booked facts first. Completions use OpenAI **only** as a grounded rewrite.

```bash
# .env
OPENAI_API_KEY=sk-…
OPENAI_MODEL=gpt-4o-mini
```

If the key is unset: parse still works; Ask still retrieves and **refuses to invent**. It may return a raw evidence extract instead of polished prose.

---

## Demo for a VC

1. Open `/signup`. Create your user + organisation (you are Org Admin).
2. **Settings → Add fund** (or skip — the first company creates “Main fund”).
3. **Companies → Add company**. Complete the 15-minute path: profile → upload `fixtures/FIXTURE_ONLY-sample-mis.csv` (or any MIS xlsx/pdf).
4. **Inbox** — confirm rows. Ambiguous units must be set by you. Nothing auto-posts.
5. **Command / Flags / NAV / Compare / Ask / Reports** now read the **book**.
6. Click a number — it opens the source file when a `source_ref` exists. Missing shows **—**.

### Optional labelled fixture (never production)

```bash
SEED_DEMO=1 pnpm seed:demo
```

Loads `Fixture Capital (FIXTURE_ONLY)` with illustrative rows. Banner in the UI. **Not the live V3 book.**

---

## Tests

```bash
pnpm test
pnpm typecheck
```

CI (`.github/workflows/ci.yml`) runs the same against a Postgres service, including the RLS isolation test.

---

## Stack (locked)

| Piece | Choice |
| --- | --- |
| Language | TypeScript |
| Monorepo | pnpm + Turborepo |
| Web | Next.js 15 (`apps/web`) |
| API | Hono (`apps/api`) |
| Jobs | BullMQ + Redis (`apps/worker`) |
| DB | Postgres + Drizzle + RLS on `org_id` |
| Auth | Better Auth (orgs, invites, roles) |
| Files | S3-compatible (MinIO / `S3_ENDPOINT=fs`) |
| LLM | OpenAI behind `packages/llm` |
| Search | Postgres FTS |

Not Clerk, WorkOS, Inngest, Trigger, or Claude-as-default. See `docs/decisions.md`.

Early live hosting (free-tier): Vercel (web) + Neon + Upstash + Fly/Render (api/worker). Azure later. Notes in `docs/cost-hosting.md`. Deploy stubs: `apps/web/vercel.json`, `fly.toml`, `render.yaml`.

---

## What is real vs stubbed

**Real:** signup/org/roles, vault upload, XLSX/CSV + PDF-text parse → durable inbox, confirm → metric book, provenance chips, missing≠0, dual-currency fields, correction ledger + restatement versions, Command, Flags (catalog detectors), NAV rollup, Compare, Ask (FTS + refuse), Reports + PDF/PPTX/XLSX downloads, onboarding wizard, RLS, Vitest.

**Stub / honest “not connected”:** live OneDrive / Affinity / Granola OAuth, LP/ILPA room, billing, perfect OCR.

---

## Repository map

```
apps/web          desktop
apps/api          HTTP + Better Auth
apps/worker       BullMQ
packages/db       schema, RLS, ingest, object store
packages/core     runway / MOIC / XIRR / flags / Ask / units
packages/llm      provider interface
packages/schema   Zod
docs/             living product + architecture
```
