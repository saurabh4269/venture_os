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
| 1 | Org auth / user logins | **missing** | **done** | Session hardening / SSO later |
| 2 | Multi-tenant orgs / domain join | **missing** | **partial** | Domain verification / auto-join still missing; invites + RLS shipped |
| 3 | Durable database book | **missing** (JSON seed) | **done** | — |
| 4 | OneDrive API ingest | **missing** | **missing** | Settings stub: **not connected**. No invented Graph fields |
| 5 | Affinity API (ownership, CRM) | **missing** | **missing** | Settings stub: **not connected** |
| 6 | Granola API (transcripts) | **missing** | **missing** | Settings stub: **not connected** |
| 7 | Upload fallback form | **partial** (paste text) | **done** | Same parse pipeline OneDrive will reuse |
| 8 | True PDF/XLSX/DOCX parse | **missing** | **partial** | XLSX/CSV + PDF text; no DOCX; no layout OCR |
| 9 | Standardization engine | **mock** | **partial** | Alias catalog + HITL confirm; LLM assist propose-only later |
| 10 | Units (lakh/crore/USD) explicit | **missing** | **done** | Ambiguous → inbox `unit_ambiguity` |
| 11 | FY Apr–Mar + calendar mix | **missing** / **partial** seed | **done** | Company `fyStartMonth` override |
| 12 | Restatements (keep both, mark current) | **missing** | **done** | `version` + `restatement_of_id` |
| 13 | missing ≠ 0 | **partial** (Ask declines) | **done** | Core math + UI `—` |
| 14 | Dual currency INR Cr + EUR + FX audit | **mock** (illustrative FX) | **done** | Converted EUR only with complete FX triple; else refuse |
| 15 | Attributable corrections survive re-parse | **missing** | **done** | Ledger + extract merge; golden test in `packages/core` |
| 16 | One-click source to cell/page | **mock** (page chips) | **partial** | Sheet!cell + PDF page; no bbox OCR |
| 17 | Live dashboard | **mock** | **done** | Command reads the book |
| 18 | Fund roll-up NAV/MOIC/IRR | **mock** | **done** | Deterministic; incomplete rollups stay `—` |
| 19 | Quarterly NAV + bridge + history | **mock** | **partial** | Marks + PoP bridge shipped; approval / lock later |
| 20 | Objective commentary from MIS | **missing** | **partial** | Separate lane; human + inbox confirm |
| 21 | Subjective commentary from calls | **missing** | **partial** | Lane rejects MIS-only source; Granola still **not connected** |
| 22 | Reports PDF/PPTX/XLSX | **partial** (demo exports) | **done** | On-demand from book facts (not seed JSON) |
| 23 | Cited Ask | **mock** (lexical + Luna) | **done** | Org-scoped FTS; refuse without evidence |
| 24 | Flags with evidence | **mock** (rules on seed) | **done** | Catalog detectors + evidence payload |
| 25 | Cross-company compare | **mock** | **done** | Book-only; null-safe |
| 26 | 15-min company onboarding | **missing** | **partial** | Wizard + upload path; connector IDs wait for OAuth |
| 27 | Claude as reasoning layer (brief) | Demo uses **OpenAI** Luna | **done** | Pluggable `LlmProvider`; default OpenAI (D5) |
| 28 | SOC2-ready audit / security | **missing** | **missing** | RLS + roles only so far |
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
