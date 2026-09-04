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

One command (Compose if Docker is available; otherwise native services must already be up):

```bash
pnpm i
pnpm demo:vc
# open http://localhost:3000/login
# credentials printed by the script (SEED_DEMO_EMAIL / SEED_DEMO_PASSWORD)
```

Switch to **Fixture Capital (FIXTURE_ONLY)** if Command is empty. Banner: **FIXTURE_ONLY**. Never treat as the live book.

Manual empty-book path:

1. Open `/signup`. Create your user + organisation (you are Org Admin). A user with no org lands on `/onboard`. Invites are copy-link from **Settings → People** (`/invite?id=`). Email delivery is not connected.
2. **Settings → Add fund** (or skip — the first company creates “Main fund”).
3. **Companies → Add company**. Complete the 15-minute path: profile → upload `fixtures/FIXTURE_ONLY-sample-mis.csv` (or any MIS xlsx/pdf).
4. **Inbox** — confirm rows. Ambiguous units must be set by you. Nothing auto-posts.
5. **Command / Flags / NAV / Compare / Ask / Reports** now read the **book**.
6. Click a number — it opens the source file when a `source_ref` exists (downloads use the session cookie). Missing shows **—**. Dual EUR display appears only with `fx_rate` + `fx_date` + source. Runway is cash / average of the last three reported burns. Flags can be snoozed or muted (survives recompute). One-pagers require a company. Invites are copy-link from Settings (no SMTP).

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

**Real:** signup/org/roles, vault upload, XLSX/CSV + PDF-text parse → durable inbox, confirm → metric book, provenance chips, missing≠0, dual-currency fields + refused conversion without an FX triple, correction ledger + restatement versions, Command, Flags (catalog + firm policy), NAV rollup + period-over-period bridge + as-of lock, Compare, Ask (FTS + refuse + digit harness), Reports + monthly pack + PDF/PPTX/XLSX, onboarding wizard, RLS, Vitest.

**Stub / honest “not connected”:** live OneDrive / Affinity / Granola OAuth, NAV multi-approver / LP sign-off, LP/ILPA room, billing, perfect OCR, domain auto-join, SMTP.

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

---

## Free-tier preview (Vercel + Neon + Upstash + Fly/Render)

Names only — copy from [`.env.example`](.env.example). **Do not invent connector secrets** (`AFFINITY_*`, Graph folder IDs, `lastSyncAt`). Do not commit `.env`.

| Where | Role | Env names you actually set |
| --- | --- | --- |
| **Vercel** (`apps/web`) | Next.js desktop | `API_URL` (server — BFF upstream), `NEXT_PUBLIC_WEB_URL` (this Vercel URL). **Leave `NEXT_PUBLIC_API_URL` empty** so the browser uses same-origin `/api`. |
| **Neon** | Postgres | `MIGRATE_DATABASE_URL` (owner — migrate + GRANT), `DATABASE_URL` (role `venture_os_app`, **no BYPASSRLS**). Prefer a **branch per preview**; never `SEED_DEMO=1` on a shared DSN. |
| **Upstash** | Redis / BullMQ | `REDIS_URL` |
| **Fly.io or Render** | `apps/api` + `apps/worker` | `API_URL`, `API_PORT=4000`, `WEB_URL` (Vercel origin), `WEB_ORIGIN_PATTERNS` (e.g. `https://*.vercel.app`), `BETTER_AUTH_URL` (public API origin), `BETTER_AUTH_SECRET` (32+ random, not the `.env.example` dummy), `COOKIE_SECURE` (or https `BETTER_AUTH_URL`), `DATABASE_URL`, `MIGRATE_DATABASE_URL`, `REDIS_URL`, `S3_*`, `GIT_SHA` |
| **R2 / MinIO / fs** | Objects | `S3_ENDPOINT` (or `fs` for local), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE` |
| **OpenAI** (optional) | Ask rewrite | `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `LLM_PROVIDER=openai`. Empty key: Ask still searches and **refuses**. |
| **Never on a client URL** | Fixtures | `SEED_DEMO=0`. `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD` are local only. |

Also set `NODE_ENV=production` on live processes. Cookies stay `HttpOnly` + `SameSite=Lax` + `Secure` when the Better Auth URL is `https` or `COOKIE_SECURE=1`. The Next BFF keeps the session first-party — do not point the browser at a split API host unless you switch to `SameSite=None`.

**Shape:** web on Vercel (filter `@venture-os/web`); api HTTP on Fly/Render; worker as a **second** process (`fly.toml` `[processes] worker`, or a second Render service). Do not run parse/flags/report jobs on Vercel. Fly release migrates via `MIGRATE_DATABASE_URL` (owner). Render migrates once on the api `buildCommand`. Allow preview hosts with `WEB_ORIGIN_PATTERNS`. `/health` reports `postgres`, `redis`, `gitSha`; `ok` is Postgres liveness, `ready` is Postgres+Redis.

**Hobby sleeps:** first request after a cold API may 502 — wait and retry. Turn on Vercel Deployment Protection on public Hobby previews. Rollback: Vercel previous deployment; `fly releases rollback`. Pin Fly `primary_region` near Neon.

15-minute upload path: [`docs/improvements/onboarding-15min.md`](docs/improvements/onboarding-15min.md).
