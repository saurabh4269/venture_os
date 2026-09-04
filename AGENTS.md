# AGENTS.md — Venture OS

**Repo:** https://github.com/saurabh4269/venture_os  
**Domain:** ventureos.xyz  
**Design partner:** V3 Ventures  
**Pack date:** 2026-09-05 (Asia/Calcutta)

This file is mandatory reading for every coding agent before any code change.

---

## Mission

Build a production multi-tenant **portfolio operating system** for VC investment teams. Data arrives from source systems, messy company packs are standardized into a firm schema, and dashboard / NAV / flags / Ask / reports read only from the standardized book.

Greenfield only. Do **not** extend `saurabh4269/v3_agentic_os` as production SoR.

---

## Read order (do not invent beyond these)

1. `docs/00_README.md` — index + anti-hallucination
2. `docs/brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md` — functional SoT (wins on V3 behavior)
3. `docs/01_PRODUCT_SPEC.md`
4. `docs/02_GAP_MATRIX.md` + `docs/02b_PRODUCTION_GAP_ANALYSIS.md`
5. `docs/03_ARCHITECTURE.md` + `docs/DECISION.md` — **LOCKED stack**
6. `docs/04_BUILD_PLAN.md` — phased delivery (extend checkboxes; do not rewrite)
7. `docs/05_DATA_MODEL.md` — hard invariants
8. `docs/06_AGENT_PROMPT.md` — original Phase 0 kickoff (historical)

Historical brief only: `docs/brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md` (Gargi supersedes).  
PDFs: `docs/brief/raw/`.

Do **not** recreate a parallel kebab-case docs tree. Tick or annotate the official numbered files as slices land.

---

## LOCKED stack (do not reopen casually)

Auth: Better Auth.  
LLM: OpenAI via `packages/llm`.  
Jobs: BullMQ + Redis.  
HTTP API: Hono.  
Web: Next.js 15 App Router.  
SoR: Postgres + Drizzle + RLS with `org_id` on every tenant row.  
Objects: S3-compatible storage (`ObjectStore`; MinIO in Compose; `S3_ENDPOINT=fs` local/CI).  
UI: first-principles — do not clone the demo site.  
Hosting: free-tier first, then Azure.  
Tooling: pnpm + Turborepo. Extra package: `packages/core` (metrics, flags, units, FY, Ask, extract).

Not Clerk, WorkOS, Inngest, Trigger, or Claude-as-default.

---

## Implementation status

| Phase | Status |
| --- | --- |
| 0 Platform | Shipped (auth, RLS, CI, empty shell). Pass 01: locked-role AC, invite accept, org onboard, membership-checked select |
| 1 Book | Shipped (upload → parse → inbox → book) |
| 2 Standardization | Shipped (units, FY, FX triple, corrections, restatements) |
| 3 Rituals | Shipped (Command, Flags, NAV + PoP bridge + period lock, Compare). Passes 23–24: lock/unlock, firm flag policy |
| 4 Ask + Reports | Shipped (FTS + refuse; on-demand PDF/PPTX/XLSX from the book). Pass 05/09: overlap + invented-number refuse; one-pager requires companyId |
| 5 Live connectors | Stub only — UI says **not connected** |
| 6 LP room + billing | Out of scope |

Resume from `docs/02_GAP_MATRIX.md` (This-repo column) and unchecked boxes in `docs/04_BUILD_PLAN.md`.

---

## How to run

```bash
pnpm i
cp .env.example .env          # set OPENAI_API_KEY to enable Ask completions; optional
pnpm demo:vc                  # Compose + migrate + FIXTURE signup/seed (or docker compose up --build)
# open http://localhost:3000/login — credentials printed by demo:vc
```

Without Docker (native services + filesystem objects):

```bash
cp .env.example .env
# MIGRATE_DATABASE_URL = Postgres superuser (migrations + GRANT)
# DATABASE_URL         = venture_os_app (no BYPASSRLS — required for RLS tests)
# REDIS_URL            = local Redis
# S3_ENDPOINT=fs
pnpm db:migrate
pnpm dev                       # turbo: web :3000, api :4000, worker
```

If Redis is up and the worker is down, parse jobs sit queued — start the worker or `POST /api/parse/:documentId`.

### OpenAI

- `OPENAI_API_KEY` in `.env` (never commit it).
- If unset: parse still runs heuristically; Ask still searches the book/FTS and **refuses** to invent a completion.
- Model via `OPENAI_MODEL` (default `gpt-4o-mini`).

### Demo for a VC

1. Sign up → create org (you are Org Admin). If org create fails, `/onboard` finishes it. Invites: Settings → copy link → `/invite?id=`.
2. Companies → Add company → upload an MIS `.xlsx` / `.csv` (or run opt-in seed).
3. Inbox → confirm rows (edit units if needed). Nothing auto-posts to the book.
4. Command / Flags / NAV / Compare / Ask / Reports now read the **book**.
5. Optional labelled fixture: `pnpm demo:vc` or `SEED_DEMO=1 pnpm seed:demo`. Banner: **FIXTURE_ONLY**. Never use as production data.

---

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | web :3000, api :4000, worker |
| `pnpm test` | Vitest across packages |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Drizzle migrate (`MIGRATE_DATABASE_URL` preferred) |
| `pnpm db:generate` | Drizzle generate |
| `pnpm seed:demo` | FIXTURE_ONLY opt-in |
| `pnpm demo:vc` | Compose/native + migrate + signup + FIXTURE seed |
| `pnpm --filter @venture-os/api start` | API only |

---

## Anti-hallucination (absolute)

1. Never invent portfolio companies, metrics, NAVs, ownership, runway, flags, document contents, or connector fields.
2. Missing is not zero. Null stays null. UI shows dash or not reported.
3. LLM never writes objective financial facts into SoR. Propose then review then confirm only.
4. Headline numbers computed by deterministic code only.
5. Every user-visible figure needs provenance (document_id + locator) or must not display as fact.
6. Ask must refuse when evidence is insufficient. Citations must resolve to real locators.
7. Corrections are sacred and survive reparse.
8. FX displays need rate + date + source. Units detected explicitly never from magnitude.
9. FY is April-March unless company profile overrides. Restatements version history.
10. Flags only from agreed catalog + deterministic rules + evidence.
11. Connectors: never fake success. Label not connected until real OAuth + sync.
12. Never invent Affinity / Graph / Granola / ILPA field names — stub + TODO(source-of-truth).
13. Migrations required for schema changes. Instrument success metrics before claiming targets.
14. No secrets in git. `.env.example` only.
15. Fixtures are `FIXTURE_ONLY` and opt-in.
16. Subjective commentary never from MIS-only input.

---

## Never invent connector fields

OneDrive / Affinity / Granola live APIs are out of scope until vendor docs are in this repo. Do not add request bodies, webhook shapes, or sync tokens you have not verified. Settings UI is a stub.

---

## Where code lives

| Concern | Path |
| --- | --- |
| Tables, RLS, migrations | `packages/db` |
| Zod / DTO | `packages/schema` |
| Runway, MOIC, XIRR, units, FY, flags, Ask, extract | `packages/core` |
| LLM port | `packages/llm` |
| HTTP | `apps/api` |
| Jobs | `apps/worker` |
| UI | `apps/web` |

---

## Tests you must not break

- Null semantics (runway/MOIC/XIRR with null inputs)
- Flag detectors (no evidence → no flag)
- Ask refuse (empty retrieval → `refused: true`, LLM not required)
- RLS isolation (org A cannot read org B) — must use `venture_os_app`, not a superuser
- FX conversion without a complete triple → null / refused display
- Subjective lane rejects MIS-only source
- Correction ledger reapplies on extract

---

## Definition of done (any PR touching numbers)

- Fact written only via approved ingest/correct API
- Provenance present or field marked non-factual
- Null handling tested
- Re-parse + correction test where extract path changes
- No LLM in NAV/rollup path
- Ask path has refuse-without-citation coverage when Ask code changes

---

## UI

First principles. Do not copy `v3.heisenbug.in`. Dense calm desktop, provenance chips, objective/subjective split, ritual nav.

---

## Demo reference (never production data plane)

- Repo: https://github.com/saurabh4269/v3_agentic_os
- Live: https://v3.heisenbug.in (narrative only — do not copy UI)
- Functional SoT: `docs/brief` Gargi v3
