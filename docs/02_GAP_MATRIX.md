# Gap matrix — V3 brief vs current demo vs production

**Demo reference:** `saurabh4269/v3_agentic_os` @ https://v3.heisenbug.in/  
**Film:** https://v3.heisenbug.in/demo/v3-agentic-os-demo.mp4  
**Statuses:** **done** (real end-to-end) · **mock** (UI/logic on synthetic corpus) · **partial** · **missing**  
**Functional SoT:** Gargi brief 2026-09-03. Adishree 2026-08-26 is historical subset.

Demo facts (do not invent beyond these): seed corpus JSON · no DB · no auth · OpenAI “Luna” for ask/extract/draft · lexical RAG · deterministic flags · inbox confirm = ephemeral `useState` · no real PDF parse · no OneDrive / Affinity / Granola connectors · UI surfaces exist: command, companies, inbox, flags, NAV, compare, reports, ask, documents, exports.

**This repo** column is the greenfield build. Update it in the same PR as behaviour changes. Do not fork a second gap file.

---

## Primary matrix

| # | Requirement (brief) | Demo | This repo | Production work remaining |
| --- | --- | --- | --- | --- |
| 1 | Org auth / user logins | **missing** | **done** | SSO / Redis limiter later. Pass 31–32: same-origin BFF, preview origin patterns, production secret fail-closed, invite mask, security headers |
| 2 | Multi-tenant orgs / domain join | **missing** | **partial** | Domain / SMTP still missing; copy-link invites; role change + remove + last-admin guard (Pass 14) |
| 3 | Durable database book | **missing** (JSON seed) | **done** | — |
| 4 | OneDrive API ingest | **missing** | **partial** | Infra ready (OAuth + client-credentials, folder map, download → same parse/inbox). Live Graph pending operator secrets. No invented Graph fields |
| 5 | Affinity API (ownership, CRM) | **missing** | **partial** | Infra ready (bearer key, `GET /v2/companies`, verified field map). Ownership only via configured number field id. Live API pending secrets |
| 6 | Granola API (transcripts) | **missing** | **partial** | Infra ready (`grn_` key, notes → transcript docs + subjective inbox). Live API pending secrets |
| 7 | Upload fallback form | **partial** (paste text) | **done** | Same parse pipeline OneDrive will reuse |
| 8 | True PDF/XLSX/DOCX parse | **missing** | **partial** | XLSX/CSV + PDF text; no DOCX; no layout OCR |
| 9 | Standardization engine | **mock** | **partial** | Alias catalog + HITL confirm; LLM assist propose-only later |
| 10 | Units (lakh/crore/USD) explicit | **missing** | **done** | Ambiguous → inbox `unit_ambiguity` |
| 11 | FY Apr–Mar + calendar mix | **missing** / **partial** seed | **done** | Company `fyStartMonth` override |
| 12 | Restatements (keep both, mark current) | **missing** | **done** | `version` + `restatement_of_id` |
| 13 | missing ≠ 0 | **partial** (Ask declines) | **done** | Core math + UI `—` |
| 14 | Dual currency INR Cr + EUR + FX audit | **mock** (illustrative FX) | **done** | Converted EUR only with complete FX triple; else refuse |
| 15 | Attributable corrections survive re-parse | **missing** | **done** | Ledger + extract merge; golden test in `packages/core` |
| 16 | One-click source to cell/page | **mock** (page chips) | **partial** | Cookie-auth `Fact` chips on Command/company/compare/NAV/flags (Pass 12); no bbox OCR |
| 17 | Live dashboard | **mock** | **done** | Command reads the book; Needs-a-look list; 3-mo runway; 0 flags is 0 |
| 18 | Fund roll-up NAV/MOIC/IRR | **mock** | **done** | Deterministic; IRR only with `investedAt` + dated mark (Pass 21); incomplete stay `—` |
| 19 | Quarterly NAV + bridge + history | **mock** | **partial** | Marks + bridge + period lock + frozen official pack snapshot (Pass 23/37). Multi-approver / LP sign-off later |
| 20 | Objective commentary from MIS | **missing** | **partial** | Separate lane; human + inbox confirm |
| 21 | Subjective commentary from calls | **missing** | **partial** | Lane rejects MIS-only source; Granola sync writes transcript + subjective inbox only when connected |
| 22 | Reports PDF/PPTX/XLSX | **partial** (demo exports) | **done** | Monthly pack lanes + worker artifact (Pass 25); curated one-pager; cookie-auth download |
| 23 | Cited Ask | **mock** (lexical + Luna) | **done** | Org-scoped FTS; refuse without overlap; `refuseUnsourcedDigits` + golden harness (Pass 26) |
| 24 | Flags with evidence | **mock** (rules on seed) | **done** | Catalog + evidence; firm `flag_policy` jsonb (Pass 24); mute/snooze; restatement-safe reads |
| 25 | Cross-company compare | **mock** | **done** | Stage/sector peer filter; catalog labels; hide-empty; objective-lane only (Pass 21) |
| 26 | 15-min company onboarding | **missing** | **partial** | Wizard maps optional folder/Affinity/Granola ids; upload or OneDrive pull when connected (Pass 42). Live pull needs secrets |
| 27 | Claude as reasoning layer (brief) | Demo uses **OpenAI** Luna | **done** | Pluggable `LlmProvider`; default OpenAI (D5) |
| 28 | SOC2-ready audit / security | **missing** | **partial** | RLS + lock/policy isolation; invite mask + admin list; origin patterns; headers; secret fail-closed (Pass 30–32). Audit viewer / SSO later |
| 29 | Billing / plans for other VCs | **missing** | **missing** | Out of scope this phase |
| 30 | LP data room (ILPA-style) | **missing** | **missing** | Phase 6 |

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
