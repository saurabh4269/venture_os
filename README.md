# Venture OS

Production-grade multi-tenant operating system for **VC investment teams**.  
Design partner: **V3 Ventures**. Domain: **ventureos.xyz**.  
Repo: https://github.com/saurabh4269/venture_os

This is the book — Command, Inbox (HITL), Flags, NAV, Compare, Ask, Reports, Vault — not a chatbot over PDFs and not a founder portal.

## Docs

Start at [`docs/00_README.md`](docs/00_README.md). Agent rules: [`AGENTS.md`](AGENTS.md).

Requirement briefs (Markdown + PDF): [`docs/brief/`](docs/brief/).  
Locked stack: [`docs/DECISION.md`](docs/DECISION.md) D5 and [`docs/03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md).  
Build status: [`docs/02_GAP_MATRIX.md`](docs/02_GAP_MATRIX.md) (This-repo column) and [`docs/04_BUILD_PLAN.md`](docs/04_BUILD_PLAN.md).

## Locked stack (summary)

Better Auth · OpenAI · BullMQ+Redis · Hono · Postgres+RLS · S3-compatible · first-principles UI · free-tier then Azure.

Not Clerk, WorkOS, Inngest, Trigger, or Claude-as-default.

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
# MIGRATE_DATABASE_URL=postgres://superuser…   (migrations + GRANT)
# DATABASE_URL=postgres://venture_os_app…      (app + RLS; no BYPASSRLS)
# REDIS_URL=redis://localhost:6379
# S3_ENDPOINT=fs
pnpm db:migrate
pnpm dev
```

`pnpm dev` runs web (:3000), api (:4000), and worker via Turborepo.

If Compose is unavailable, install Postgres 16 + Redis 7 on the host, copy `.env.example` → `.env`, set `S3_ENDPOINT=fs`, then `pnpm db:migrate` and `pnpm dev`. Create the `venture_os` database and the `venture` superuser before migrate; `0002_app_role.sql` creates `venture_os_app` (no BYPASSRLS).

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

1. Open `/signup`. Create your user + organisation (you are Org Admin). A user with no org lands on `/onboard`. Invites are copy-link from **Settings → People** (`/invite?id=`). Email delivery is not connected.
2. **Settings → Add fund** (or skip — the first company creates “Main fund”).
3. **Companies → Add company**. Complete the 15-minute path: profile → upload `fixtures/FIXTURE_ONLY-sample-mis.csv` (or any MIS xlsx/pdf).
4. **Inbox** — confirm rows. Ambiguous units must be set by you. Nothing auto-posts.
5. **Command / Flags / NAV / Compare / Ask / Reports** now read the **book**.
6. Click a number — it opens the source file when a `source_ref` exists. Missing shows **—**. Dual EUR display appears only with `fx_rate` + `fx_date` + source.

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

## What is real vs stubbed

**Real:** signup/org/roles, vault upload, XLSX/CSV + PDF-text parse → durable inbox, confirm → metric book, provenance chips, missing≠0, dual-currency fields + refused conversion without an FX triple, correction ledger + restatement versions, Command, Flags (catalog detectors), NAV rollup + period-over-period bridge, Compare, Ask (FTS + refuse), Reports + PDF/PPTX/XLSX downloads, onboarding wizard, RLS, Vitest.

**Stub / honest “not connected”:** live OneDrive / Affinity / Granola OAuth, NAV approval workflow, LP/ILPA room, billing, perfect OCR, domain auto-join.

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
docs/             official numbered pack (do not fork a second tree)
```

Early live hosting notes: [`docs/cost-hosting.md`](docs/cost-hosting.md). Deploy stubs: `apps/web/vercel.json`, `fly.toml`, `render.yaml`.
