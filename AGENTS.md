# AGENTS.md — Venture OS

Read this before writing code. The book is more important than the demo.

## Source of truth (order)

1. **Gargi brief** — `docs/brief/v3-requirement-brief-gargi-2026-09-03.md`
2. **Locked decisions** — `docs/decisions.md` (overrides older Clerk/WorkOS/Inngest/Claude/R2-only drafts)
3. **This file**
4. `docs/product-spec.md`, `docs/architecture.md`, `docs/data-model.md`
5. `docs/gap-matrix.md` (what is actually built)
6. Adishree 26 Aug brief and `v3.heisenbug.in` — **workflow memory only**, never UX or data templates

If a comment in code disagrees with (1)–(2), fix the comment.

## What this product is

Multi-tenant SaaS for VC investment teams. Design partner: V3 Ventures. Domain: `ventureos.xyz`.  
Rituals: Command, Companies, Inbox, Flags, NAV, Compare, Ask, Reports, Vault, Settings.

## How to run

```bash
pnpm i
cp .env.example .env          # set OPENAI_API_KEY to enable Ask completions; optional
docker compose up --build     # Postgres, Redis, MinIO, api, web, worker
# open http://localhost:3000
```

Without Docker (native services + filesystem objects):

```bash
cp .env.example .env
# MIGRATE_DATABASE_URL = Postgres superuser (migrations + GRANT)
# DATABASE_URL         = venture_os_app (no BYPASSRLS — required for RLS)
# REDIS_URL            = local Redis
# S3_ENDPOINT=fs
pnpm db:migrate
pnpm dev                       # turbo: web, api, worker
```

### OpenAI

- `OPENAI_API_KEY` in `.env` (never commit it).
- If unset: parse still runs heuristically; Ask still searches the book/FTS and **refuses** to invent a completion.
- Model via `OPENAI_MODEL` (default `gpt-4o-mini`).

### Demo for a VC

1. Sign up → create org (you are Org Admin).
2. Companies → Add company → upload an MIS `.xlsx` (or run opt-in seed).
3. Inbox → confirm rows (edit units if needed).
4. Command / Flags / NAV / Compare / Ask / Reports now read the **book**.
5. Optional labelled fixture: `pnpm seed:demo` (`SEED_DEMO=1`). Banner: **FIXTURE_ONLY**. Never use as production data.

## Phase status

| Phase | Status |
| --- | --- |
| 0 Platform | Done in this repo |
| 1 Book | Done (upload → parse → inbox → book) |
| 2 Rituals | Done (Command, Inbox, Flags, NAV, Compare, onboard) |
| 3 Ask + Reports | Done (FTS + refuse; exports) |
| 4 Live connectors | Stub only (not connected) |
| 5 Hardening | Later |
| 6 LP room + billing | Out of scope |

Resume work from `docs/gap-matrix.md` and `docs/build-plan.md`.

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | web :3000, api :4000, worker |
| `pnpm test` | Vitest across packages |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Drizzle migrate |
| `pnpm db:generate` | Drizzle generate |
| `pnpm seed:demo` | FIXTURE_ONLY opt-in |
| `pnpm --filter @venture-os/api start` | API only |

## Anti-hallucination rules (non-negotiable)

1. Never invent companies, metrics, NAV, flags, documents, or connector API fields.
2. Missing ≠ 0. Null stays null in math and UI (`—` / not reported).
3. LLM never commits objective facts — propose to inbox only.
4. Headlines computed in `packages/core` from book facts only.
5. No `source_ref` → not shown as fact.
6. Ask refuses without evidence; citations must resolve to a row/locator.
7. Corrections are reapplied on re-parse; do not delete the ledger.
8. Dual currency needs `fx_rate` + `fx_date` + `source`.
9. Ambiguous units → inbox `unit_ambiguity`, not a guess.
10. FY Apr–Mar unless profile overrides.
11. Restatements insert versions; never overwrite the prior amount in place.
12. Flags only from the catalog + evidence payload.
13. Never fake connector success — label **not connected**.
14. No secrets in git. `.env.example` only.
15. Fixtures are `FIXTURE_ONLY` and opt-in.

## Never invent connector fields

OneDrive / Affinity / Granola live APIs are out of scope. Do not add request bodies, webhook shapes, or “sync tokens” you have not verified against vendor docs in this repo. Settings UI is a stub.

## Where code lives

| Concern | Path |
| --- | --- |
| Tables, RLS, migrations | `packages/db` |
| Zod / DTO | `packages/schema` |
| Runway, MOIC, XIRR, units, FY, flags, Ask | `packages/core` |
| LLM port | `packages/llm` |
| HTTP | `apps/api` |
| Jobs | `apps/worker` |
| UI | `apps/web` |

## Tests you must not break

- Null semantics (runway/MOIC/XIRR with null inputs)
- Flag detectors (no evidence → no flag)
- Ask refuse (empty retrieval → `refused: true`, LLM not required)
- RLS isolation (org A cannot read org B)

## UI

First principles. Do not copy `v3.heisenbug.in`. Dense calm desktop, provenance chips, objective/subjective split, ritual nav.
