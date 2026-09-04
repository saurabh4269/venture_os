# Gap matrix — V3 brief vs current demo vs production

**Demo reference:** `saurabh4269/v3_agentic_os` @ https://v3.heisenbug.in/  
**Film:** https://v3.heisenbug.in/demo/v3-agentic-os-demo.mp4  
**Statuses:** **done** (real end-to-end) · **mock** (UI/logic on synthetic corpus) · **partial** · **missing**  
**Functional SoT:** Gargi brief 2026-09-03. Adishree 2026-08-26 is historical subset.

Demo facts (do not invent beyond these): seed corpus JSON · no DB · no auth · OpenAI “Luna” for ask/extract/draft · lexical RAG · deterministic flags · inbox confirm = ephemeral `useState` · no real PDF parse · no OneDrive / Affinity / Granola connectors · UI surfaces exist: command, companies, inbox, flags, NAV, compare, reports, ask, documents, exports.

---

## Primary matrix

| # | Requirement (brief) | Demo | Production work |
| --- | --- | --- | --- |
| 1 | Org auth / user logins | **missing** | Better Auth + org membership + RBAC + sessions |
| 2 | Multi-tenant orgs / domain join | **missing** | Orgs, domain verification, invites, `org_id` on every row + RLS |
| 3 | Durable database book | **missing** (JSON seed) | Postgres + RLS; write path for confirms/corrections; migrations |
| 4 | OneDrive API ingest | **missing** | Microsoft Graph connector + OAuth + webhook/poll + per-company folder map |
| 5 | Affinity API (ownership, CRM) | **missing** | Affinity connector; map ownership/lots; sync cursor; **no invented fields** |
| 6 | Granola API (transcripts) | **missing** | Granola connector; subjective commentary only from this source |
| 7 | Upload fallback form | **partial** (paste text) | Real file upload to S3-compatible + same parse pipeline as OneDrive |
| 8 | True PDF/XLSX/DOCX parse | **missing** | Parse pipeline (Excel cell refs + PDF text/layout); retain locators |
| 9 | Standardization engine | **mock** | Company mapping profiles + LLM assist + human confirm; schema versioning |
| 10 | Units (lakh/crore/USD) explicit | **missing** | Unit detector; never infer from magnitude alone |
| 11 | FY Apr–Mar + calendar mix | **missing** / **partial** seed | Period normalization service; company FY profile |
| 12 | Restatements (keep both, mark current) | **missing** | Snapshot versioning / as-of / `superseded_by` |
| 13 | missing ≠ 0 | **partial** (Ask declines) | Enforce in schema + rollups + exports + charts |
| 14 | Dual currency INR Cr + EUR + FX audit | **mock** (illustrative FX) | Store native + converted; FX rate, source, date per figure |
| 15 | Attributable corrections survive re-parse | **missing** | Correction ledger keyed by field+period+doc; merge on re-parse |
| 16 | One-click source to cell/page | **mock** (page chips) | Excel cell refs + PDF page/bbox where possible |
| 17 | Live dashboard | **mock** | Real queries on book; refresh on ingest |
| 18 | Fund roll-up NAV/MOIC/IRR | **mock** | Same formulas, real data; document method; deterministic math |
| 19 | Quarterly NAV + bridge + history | **mock** | ValuationMark entity + approval workflow |
| 20 | Objective commentary from MIS | **missing** | Draft job; separate UI column; cite MIS lines |
| 21 | Subjective commentary from calls | **missing** | Draft from transcripts only; separate UI column; never blend |
| 22 | Reports PDF/PPTX/XLSX | **partial** (demo exports) | Template engine on live book + audit |
| 23 | Cited Ask | **mock** (lexical + Luna) | Tenant-scoped retrieval; numeric post-check; refuse without citation; no cross-tenant leak |
| 24 | Flags with evidence | **mock** (rules on seed) | Configurable policy engine; firm thresholds; evidence payload |
| 25 | Cross-company compare | **mock** | Real metric store + normalize period/stage; null-safe |
| 26 | 15-min company onboarding | **missing** | Wizard + connector mapping UX |
| 27 | Claude as reasoning layer (brief) | Demo uses **OpenAI** Luna | Pluggable LLM provider; **default OpenAI** (DECISION D5) |
| 28 | SOC2-ready audit / security | **missing** | Audit log, encryption at rest, secrets vault, least privilege, retention |
| 29 | Billing / plans for other VCs | **missing** | Stripe later; stub entitlement flags now |
| 30 | LP data room (ILPA-style) | **missing** | **Phase 2** |

---

## Demo assets worth porting (patterns only — reimplement)

- Citation / `SourceChip` UX and “decline rather than guess” Ask contract.
- Flag categories and severity framing (as starting catalog, not hard-wired forever).
- Command center IA: Command / Inbox / Flags / NAV / Compare / Reports / Ask / Documents.
- First-principles Venture OS UI (do not clone v3.heisenbug.in). Optional later tenant theme tokens.
- Tour narrative for empty-state education.
- Deterministic metric helpers (runway, MOIC, XIRR) — **reimplement with tests**; do not copy brittle demo wiring blindly.

## Demo anti-patterns — do not continue

- Single JSON corpus as source of truth.
- Ephemeral React state for inbox confirms.
- No auth / no tenancy.
- LLM in the request path for heavy extract without a job queue.
- “Serverless-only” for long PDF/Excel pipelines.
- Hard-coded V3 portfolio as global data.
- OpenAI-coupled “Luna” without a provider interface.
- Lexical-only RAG as the long-term Ask plan (FTS first is OK; evolve; never skip citation gate).

## Adishree vs Gargi

Adishree Aug 26 ≈ surfaces + seed RAG + flags (demo roughly matches).  
Gargi Sep 3 hard requirements (connectors, dual currency, corrections, cell provenance, FY/restatements, Claude, 15-min onboard) are almost entirely **missing** in the demo.
