# Architecture — Agentic OS (greenfield)

**Status:** Locked  
**Pack date:** 2026-09-05 (Asia/Calcutta)  
**Rule:** Production-grade greenfield. Do **not** extend the demo repo corpus-JSON / serverless-HTTP data plane.
**Stack authority:** `DECISION.md` D5 — Better Auth, OpenAI, BullMQ+Redis, Hono, S3-compatible, first-principles UI, free-tier then Azure.


---

## 1. Monorepo shape

**Tooling:** `pnpm` workspaces + **Turborepo**.

```
apps/
  web/          # Next.js 15 — UI + BFF (thin Route Handlers / Server Actions only)
  api/          # Hono HTTP API for durable reads/writes (org-scoped)
  worker/       # BullMQ workers — long-running / heavy jobs (parse, extract, reports, connector sync)
packages/
  db/           # Drizzle/Prisma (pick one) + migrations + RLS helpers
  schema/       # Shared Zod / types for firm metric dictionary, jobs, provenance
  llm/          # Pluggable provider interface (default OpenAI)
  ui/           # Shared components / design tokens (optional V3 theme pack)
  config/       # ESLint, TSConfig, Tailwind presets
```

- **One deployable ≠ one concern.** UI can call `api`; heavy work always goes to `worker` via a job queue.
- Shared packages own contracts; apps do not invent parallel types.

---

## 2. Apps

| App | Responsibility | Must not |
| --- | --- | --- |
| **`apps/web`** | Next.js 15 App Router; auth session; OS shell; citation UX; inbox confirm UI | Run PDF/Excel parse, long LLM extract, bulk report gen, or connector backfills in Route Handlers |
| **`apps/api`** | Authenticated CRUD, book queries, enqueue jobs, RBAC checks | Become a dumping ground for unbounded CPU/IO |
| **`apps/worker`** | Ingest, parse, standardize, commentary drafts, flags recompute, report render, connector sync | Serve user HTTP directly |

**Reject:** corpus-JSON as system of record; heavy parse/LLM/report work inside serverless HTTP timeouts.

---

## 3. Persistence & tenancy

| Concern | Choice |
| --- | --- |
| Primary SoR | **Postgres** |
| Isolation | **`org_id` on every tenant row** + **Postgres RLS** (policies mandatory; app filters are defense-in-depth only) |
| Migrations | Required for every schema change — no “edit JSON” |
| Secrets | Env / secret manager; never commit keys |

RLS session: set `app.current_org_id` (or equivalent) per request from verified auth claims. Platform super-admin path is separate, audited, and never a firm role.

---

## 4. Object storage

| Concern | Choice |
| --- | --- |
| Blobs | **S3-compatible** (R2 / MinIO / AWS S3 / Azure Blob S3 API) |
| Documents | Immutable raw bytes + content hash; versions are new objects |
| Access | Signed URLs; org-scoped keys (`org/{org_id}/…`) |

Vault documents are never mutated in place. Re-parse creates new extraction versions; confirmed book values and corrections stay in Postgres.

---

## 5. Auth

| Concern | Choice |
| --- | --- |
| Provider | **Better Auth** |
| Model | Organization = VC firm; members + roles; domain verify / join |
| Roles | Org Admin, Partner, Analyst, Viewer (see `01_PRODUCT_SPEC.md`) |

Stub entitlement flags early even if Stripe lands later.

---

## 6. Jobs / orchestration

| Concern | Choice |
| --- | --- |
| Queue / workflows | **BullMQ + Redis** |
| Pattern | API enqueues → worker runs → status/events → UI polls or SSE |

Job types (minimum): `ingest.file`, `parse.document`, `extract.propose`, `book.commit`, `commentary.draft`, `flags.recompute`, `report.generate`, `connector.sync`.

Idempotency keys on `(org_id, document_version, job_type)`. Retries with backoff; dead-letter + ops visibility.

---

## 7. LLM provider interface

Production locks **OpenAI** as default (DECISION D5). Keep pluggable provider interface.

```ts
// Conceptual contract (packages/llm)
interface LlmProvider {
  id: "anthropic" | "openai" | string;
  completeStructured<T>(req: StructuredRequest): Promise<T>;
  completeText(req: TextRequest): Promise<string>;
}
```

- **Default implementation:** OpenAI.
- Swap via config / env; no call sites import vendor SDKs directly.
- LLM may **propose** extractions / drafts into review tables only.
- LLM **never** writes objective financial facts into the book; **never** computes NAV / MOIC / IRR / runway headlines.

---

## 8. Retrieval / Ask (V1 posture)

| Layer | V1 |
| --- | --- |
| Structured book | Postgres facts with provenance — primary for numbers |
| Document search | **FTS first** (Postgres `tsvector` / equivalent) over chunks + transcript snippets |
| Later | Embeddings / hybrid optional; do not block Phase 0–2 on vector infra |

**Hard gate:** Ask answers only from org-scoped retrieval + book facts. Refuse without citation. Citations must resolve to real `document_id` + locator (page / sheet!cell / chunk id). No cross-tenant retrieval.

---

## 9. Cost posture

| Principle | Practice |
| --- | --- |
| Cheap path first | Deterministic parse + mapping profiles before LLM |
| LLM only where needed | Ambiguous cells, commentary draft, Ask synthesis — not rollups |
| Cache | Document hashes; skip re-LLM when bytes unchanged and mapping unchanged |
| Quotas | Per-org token / page budgets; log usage for billing later |
| Model tiers | Smaller/faster for classify; stronger OpenAI model for hard extract/Ask |
| Fail closed | Low confidence → inbox review, not silent auto-commit |

Instrument: parse cost, LLM tokens, auto-commit rate, review rate, citation miss rate — before claiming 90% auto-ingest.

---

## 10. Explicit rejects (architecture anti-patterns)

1. **Corpus-JSON** (or any single file) as production source of truth.
2. **Heavy work in serverless HTTP** (long PDF/Excel parse, bulk extract, PPTX/PDF render, connector backfill).
3. Ephemeral React state as the confirmation / correction store.
4. OpenAI-coupled “Luna” without a provider interface.
5. Lexical-only Ask forever with fake citations.
6. Hard-coded V3 portfolio as global (non-tenant) data.
7. Silent null to zero coercion anywhere in finance math or exports.

---

## 11. Security baseline (day one, not later)

- Encryption at rest (DB + S3-compatible); TLS in transit.
- Audit log for confirms, corrections, connector changes, exports.
- Least-privilege service roles; no secrets in repo.
- Connectors: UI shows **not connected** until real OAuth + sync succeeds — no fake success.

---

## 12. UI — first principles

- Design Venture OS as its own product system.
- Do **not** copy colors, fonts, layouts, or chrome from https://v3.heisenbug.in.
- Reuse IA labels and HITL/citation contracts only — not as a skin.

## 13. Hosting posture

Free-tier first (Compose: Postgres + Redis + MinIO). Graduate to **Azure**.

## 14. Demo / UX reference (non-architecture)

- Repo `https://github.com/saurabh4269/v3_agentic_os` — UX / domain reference only.
- Live `https://v3.heisenbug.in` — walkthrough only.

Port IA, citation chips, flag framing, visual tokens as a **theme**. Reimplement data hooks against `api` + Postgres. **Do not** port the demo data plane.
