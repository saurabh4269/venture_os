# AGENTS.md — Venture OS

**Repo:** https://github.com/saurabh4269/venture_os  
**Domain:** ventureos.xyz  
**Design partner:** V3 Ventures (brief SoT; public chrome does not name the partner)  
**Pack date:** 2026-09-07 (Asia/Calcutta)

This file is mandatory reading for every coding agent before any code change.

---

## Mission

Build a production multi-tenant **portfolio operating system** for VC investment teams. Data arrives from source systems, messy company packs are standardized into a firm schema, and Command / NAV / flags / Ask / reports read only from the standardized **book**.

**Wedge:** standardization, provenance, ritual cadence, cite-or-refuse. Not CRM, not fund accounting, not cap table.

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
| 0 Platform | Shipped (auth, RLS, CI, shell, marketing landing). Pass 01 + same-origin BFF / session hardening |
| 1 Book | Shipped (upload → parse → **Confirm** → book). Sources list + parse-phase stall UX |
| 2 Standardization | Shipped (units, FY, FX triple, corrections, restatements). Optional high-confidence auto-confirm via org setting |
| 3 Rituals | Shipped (Command, Flags, NAV + PoP bridge + period lock + pack snapshot, Compare). Honest coverage Source/Stage |
| 4 Ask + Reports | Shipped (FTS + refuse; on-demand PDF/PPTX/XLSX). Cite drawer: sheet window + PDF page preview (`SourceViewer`) |
| 5 Live connectors | Infra ready (Pass 42). UI honest until healthCheck. Live Graph/Affinity/Granola wait on operator secrets |
| 6 LP room + billing | Out of scope |

**Still open (typical):** live vendor secrets, domain/SMTP join, bbox OCR highlight inside source files, NAV multi-approver, LP room, billing. See `docs/improvements/NEXT.md`.

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

### OpenAI / Claude

- Default: `OPENAI_API_KEY` in `.env` (never commit it). `LLM_PROVIDER=openai`.
- Brief Claude layer: `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (Messages API). Still propose → Confirm only.
- If unset: parse still runs heuristically; Ask still searches the book/FTS and **refuses** to invent a completion.
- Models via `OPENAI_MODEL` / `ANTHROPIC_MODEL`.

### Demo for a VC

1. Sign up → create org (you are Org Admin). If org create fails, `/onboard` finishes it. Invites: Settings → copy link → `/invite?id=`.
2. Companies → Add company → upload an MIS `.xlsx` / `.csv` (or run opt-in seed).
3. **Confirm** (`/confirm`, legacy `/inbox`) → confirm rows (edit units if needed). Nothing auto-posts to the book unless the org sets a high-confidence auto-confirm threshold.
4. Command / Flags / NAV / Compare / Ask / Reports now read the **book**. Cite chips open sheet/page preview when locators resolve.
5. **Sources** (`/sources`, legacy `/vault`) shows parse phase (including stalled).
6. Optional labelled fixture: `pnpm demo:vc` or `SEED_DEMO=1 pnpm seed:demo`. Banner: **FIXTURE_ONLY**. Never use as production data.

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

Wave A infra lives in `packages/core` (types/status/validate/map/redact) and `@venture-os/core/server` (envelope seal + HTTP). Vendor docs: `docs/connectors/README.md`. Secrets: `docs/connectors/SECURITY.md` — ciphertext/nonce/key_version, `CONNECTOR_SECRETS_KEY` in env only, Org Admin endpoints, no plaintext in `org_settings`. Do not add Graph / Affinity / Granola fields that are not in those docs or a `FIXTURE_ONLY` fixture. Never fake `connected` or `lastSyncAt`.

---

## Where code lives

| Concern | Path |
| --- | --- |
| Tables, RLS, migrations | `packages/db` |
| Zod / DTO | `packages/schema` |
| Runway, MOIC, XIRR, units, FY, flags, Ask, extract, cite helpers, salvage, fuzzy propose, parse-phase, ops | `packages/core` |
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

First principles. Do not copy `v3.heisenbug.in`. Dense calm desktop, provenance chips, objective/subjective split, ritual nav (Today / Book / Review / Output — see `docs/design/design.md`). Confirm is the write-gate; Ask is cite-or-refuse (panel + route). Public marketing does not name design-partner customers.

---

## Demo reference (never production data plane)

- Repo: https://github.com/saurabh4269/v3_agentic_os
- Live: https://v3.heisenbug.in (narrative only — do not copy UI)
- Functional SoT: `docs/brief` Gargi v3
