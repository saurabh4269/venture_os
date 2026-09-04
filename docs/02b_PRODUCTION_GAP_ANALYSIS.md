# V3 Agentic OS — Production Gap Analysis
**Audience:** coding agent handoff  
**Date:** 2026-09-05  
**Sources of truth:** Gargi brief 2026-09-03 (primary); Adishree brief 2026-08-26 (sibling, shorter); live demo https://v3.heisenbug.in/; repo https://github.com/saurabh4269/v3_agentic_os (private Next.js 15 monolith)  
**Demo facts (do not invent beyond these):** seed corpus JSON · no DB · no auth · OpenAI “Luna” for ask/extract/draft · lexical RAG · deterministic flags · inbox confirm = ephemeral `useState` · no real PDF parse · no OneDrive / Affinity / Granola connectors · UI surfaces exist: command, companies, inbox, flags, NAV, compare, reports, ask, documents, exports  

**LLM decision (locked):** Production default is **OpenAI** (DECISION D5). Brief Claude wording superseded for vendor choice; functional brief still wins on behavior. Keep pluggable provider interface.

**This-repo status:** live checkboxes are in `02_GAP_MATRIX.md` (This repo column). Do not duplicate a third matrix here.

---

## A) Capability matrix

Status key: **done** = works for real data end-to-end · **partial** = UI/logic exists but seed/demo-only or incomplete · **mock** = UI/shell only · **missing** = not present

| # | Requirement (Sep 3 / workflows) | Demo status | Production work needed |
|---|--------------------------------|-------------|------------------------|
| 1 | Central OS for investment team (15–40 portfolio cos) | **partial** — UI for ~15 public-ish names; illustrative figures | Multi-user app; real portfolio registry; scale to 40 cos with period history; RBAC; audit |
| 2 | OneDrive MIS ingest (API preferred) | **missing** | Microsoft Graph connector: OAuth, folder watch/delta, file fetch, MIME/version handling, retry/backoff, per-company folder mapping, webhook or 5–15 min poll |
| 3 | Affinity CRM API | **missing** | Affinity sync: companies, people, interactions, custom fields → V3 entity IDs; conflict rules; sync cursor |
| 4 | Granola transcripts API | **missing** | Granola connector: meeting notes → company link; searchable; citeable snippets; retention policy |
| 5 | Claude as reasoning layer | **missing** (OpenAI used) | Pluggable LLM provider; OpenAI default (D5); structured outputs; cost/latency budgets |
| 6 | Nonstandard MIS → V3 schema standardization | **mock/partial** — extract path exists against seed; no real parse | PDF/XLSX/DOCX parsers; layout-aware table extract; company-specific mapping profiles; confidence scores; human review queue |
| 7 | Mixed units (lakh / crore / USD) normalize | **missing** | Unit detection + conversion pipeline; store canonical + display; reject ambiguous without review |
| 8 | FY April–March periods | **partial** — demo periods likely calendar-ish seed | Period model: FY labels, quarter map, period-close locks; restatement versioning |
| 9 | Restatements | **missing** | Versioned facts: `as_of`, `supersedes`, `restated_from`; NAV/reports always pin fact version |
| 10 | Missing ≠ zero | **missing** (seed likely fills or omits silently) | Null semantics everywhere; charts/aggs skip nulls; flags for “missing expected field”; never coerce null→0 in finance math |
| 11 | Dual store INR crore + EUR; FX rate + date | **missing** | Money type: `{amount, currency, fx_rate, fx_date, source}`; dual ledger views; FX table with dated rates |
| 12 | User logins + attributable corrections surviving re-parse | **missing** (no auth; inbox confirm ephemeral) | AuthN/Z; correction entities with user_id, timestamp, reason; re-parse merges corrections over new extracts; never wipe human overrides |
| 13 | 15-min company onboarding | **missing** | Wizard: create company → map OneDrive folder + Affinity ID + FY/currency defaults + MIS template profile → first ingest job |
| 14 | Every figure clickable to source cell | **partial** — citations/ask claim sourcing; not cell-level for all UI numbers | Provenance graph: figure → document_id + page + table/cell coords (or sheet!cell); UI drill-through on dashboard/NAV/reports |
| 15 | Real-time dashboard (stage, ownership, NAV, MOIC, runway…) | **partial** — UI over seed JSON | Live queries on DB; refresh on ingest; filters; role-aware |
| 16 | Auto ingest pipeline | **mock** — inbox UX, confirm in memory | Durable jobs (queue); parse → map → validate → review → commit; 90%+ auto target needs high-confidence path + low-confidence hold |
| 17 | Company → fund rollup | **partial** — fund NAV shown | Ownership %, cost, fair value, FX; fund-level aggregates from company facts; evergreen multi-fund |
| 18 | Quarterly NAV | **partial** — NAV surface + illustrative ₹887 Cr | Formal NAV workflow: period lock, methodology, bridge PoP, sign-off, export |
| 19 | Monthly portfolio performance sheet | **mock/partial** — reports/exports shells | Template: objective metrics from store + subjective commentary fields separate; export XLSX/PDF |
| 20 | Objective vs subjective commentary separation | **missing** as hard product rule | Schema: `metric_fact` vs `commentary` (author, period); LLM never writes objective cells |
| 21 | On-demand reports PDF / PPTX / XLSX | **partial** — drafts/exports; not production templates | Templating engine; V3 brand; deterministic numbers from DB only; PPTX layout; async generation |
| 22 | Plain Q&A with citations | **partial** — Ask + lexical RAG on seed | Hybrid retrieval over real corpus; refuse without citation; citation = doc+page/cell; eval harness for citation fidelity |
| 23 | Risk flags, low false positives | **partial** — deterministic flags on seed | Formal flag catalog (V3-defined); thresholds; evidence payload; mute/snooze with attribution; FP measurement |
| 24 | Cross-company compare | **partial** — compare surface | Normalized metrics only; unit/FY aligned; missing handling; export |
| 25 | Documents library | **partial** — seeded docs UI | Blob store; versions; ACL; link to companies/periods; OCR where needed |
| 26 | Success: 90%+ auto ingest | **missing** (unmeasurable) | Metrics: auto-commit rate, review rate, parse fail rate; dashboards for ops |
| 27 | Near-zero headline error | **missing** | Golden tests; reconcile vs source; human sign-off on headlines; no LLM for NAV/headline math |
| 28 | 80%+ less assembly time / reports in minutes | **unproven** | Time-to-report instrumentation; baseline vs Excel |
| 29 | All answers cited | **partial** — product intent; not enforced hard | Hard refuse path; UI block unsourced claims; logging |
| 30 | Flag categories “to be defined by V3” | **partial** — demo has runway/variance/GM/late MIS etc. | Workshop + freeze v1 catalog; version flags; don’t invent categories in code without product sign-off |

**Adishree Aug 26 brief:** treat as subset — demo roughly matches that shorter scope (surfaces + seed RAG + flags). Sep 3 hard requirements (connectors, dual currency, corrections, cell provenance, FY/restatements) are almost entirely **missing**.

---

## B) Must-have vs later — V1 production for V3 alone (single firm)

### V1 must-have (ship without these = not production)

1. **Postgres (or equivalent) as system of record** — companies, periods, facts, documents, extractions, corrections, users, audit. Kill seed-JSON-as-truth.
2. **Auth** — SSO optional later; at minimum email/password or Google Workspace SSO for V3 team; sessions; role: admin / investor / ops viewer.
3. **Durable inbox + review queue** — confirm/correct persists; attributable; survives refresh and re-parse.
4. **MIS ingest path that works on real files** — at least OneDrive (or manual upload fallback that same parser uses): XLSX + PDF tables → V3 schema with confidence.
5. **V3 canonical schema** — metrics dictionary, units, FY Apr–Mar, null semantics, dual INR crore + EUR with FX rate+date on every money fact.
6. **Corrections model** — human override wins on re-parse; full audit trail.
7. **Provenance** — every stored figure links to source document + locator (page/sheet/cell); UI click-through on dashboard, company, NAV, reports.
8. **Deterministic finance math** — NAV, rollups, MoIC, bridges computed in code from facts; LLM never calculates headline numbers.
9. **Ask with hard citation gate** — answer only from retrieved evidence; else refuse.
10. **Monthly pack + quarterly NAV export** — XLSX/PDF minimum; objective from DB; subjective commentary separate fields.
11. **Flag engine v1** — freeze a small catalog with V3 (even if “proposed”); evidence + severity; no silent FP spam.
12. **Company onboarding ≤15 min** — map folder/IDs + template + first ingest.
13. **LLM provider decision** — OpenAI default locked (D5); abstraction layer; secrets in env; logging of prompts/completions for audit (redact PII as needed).
14. **Observability** — job failures, parse confidence, ingest SLAs, citation miss rate.

### Explicitly later (V1.x / V2) for V3-alone

- Affinity + Granola (nice for workflow completeness; not blocking if MIS + docs + Ask work)
- PPTX polish / cinematic report design
- Full “real-time” push websockets (poll/refresh OK for V1)
- Advanced compare / IC memo automation beyond templates
- Fine-tuned extract models; multi-agent orchestration theater
- Mobile apps
- Expanding flag taxonomy beyond agreed v1 set
- Perfect 90% auto-ingest day one — target measured path; start with high-confidence auto + mandatory review for low confidence
- London/NY multi-entity legal complexity beyond dual FX display

---

## C) Extra must-haves if multi-tenant SaaS for other VCs

Do **not** bolt these onto the current monolith without a tenancy design. Required additions:

| Area | Must-have |
|------|-----------|
| **Orgs / tenancy** | `org_id` on every row; hard isolation; no cross-tenant query possible |
| **Auth** | SSO (SAML/OIDC), SCIM optional; invite flows; org roles |
| **Schema-per-tenant or equivalent** | Per-tenant metric dictionaries + MIS mapping profiles; shared platform code, isolated config/data |
| **Connectors marketplace** | Pluggable OneDrive/SharePoint, Google Drive, Affinity, Dealcloud, Granola, email; per-org OAuth; credential vault |
| **Billing** | Seats + usage (LLM tokens, pages parsed); Stripe; entitlements |
| **White-label** | Domain, logo, report templates, email sender |
| **Admin** | Platform super-admin vs org admin; impersonation audited |
| **Compliance** | DPA, data residency options, retention, export/delete (GDPR), encryption at rest, SOC2-minded audit logs |
| **Rate limits / abuse** | Per-org LLM and parse quotas |
| **SLAs / multi-region** | Optional later but tenancy design must not preclude |

**Rule:** V3-alone V1 can be single-tenant. SaaS requires tenancy from day one of that product — retrofitting `org_id` into a polluted monolith is a rewrite.

---

## D) Risks: continue monolith vs greenfield

### Continuing same Next.js 15 monolith

| Risk | Why it hurts |
|------|----------------|
| **JSON/seed architecture baked into UI** | Components assume in-memory corpus; every screen rewired for DB + provenance |
| **No domain boundary** | Parse, RAG, NAV math, auth, connectors in one deployable → blast radius, can’t scale workers |
| **Ephemeral inbox pattern** | Culture of “useState = backend”; regressions on corrections |
| **OpenAI-coupled “Luna”** | Provider lock; hard to meet Claude brief without refactor |
| **Lexical RAG only** | Won’t hit citation quality on real messy MIS without chunking/embeddings/rerank + structured fact store |
| **Demo honesty debt** | Illustrative figures; easy for agent to “improve” by hallucinating realism instead of wiring truth |
| **Single process jobs** | Ingest/parse/PDF will block or OOM Next server |
| **SaaS path** | Monolith becomes tenant-unsafe quickly |

**When monolith is OK:** Keep Next.js as **BFF + UI** only. Extract workers (ingest, parse, report gen) and a real DB. Treat current repo as UI prototype to harvest, not as SoR.

### Greenfield

| Risk | Why it hurts |
|------|----------------|
| **Time** | Rebuilding 10 surfaces delays V3 trust |
| **Scope creep** | Agents rebuild demo theater instead of ingest truth |
| **Lost UX learning** | Command palette, flag UX, Ask patterns already validated |

**Pragmatic recommendation:** **Strangler, not pure greenfield.**  
- New: `db` + `ingest-worker` + `schema` + `connectors` + `auth`.  
- Keep: Next UI routes/components, rewrite data hooks to API.  
- Delete: seed-JSON as production path; ephemeral confirm.  
- Do **not** rewrite UI from scratch unless tenancy/SaaS is the immediate goal.

---

## E) Non-negotiable anti-hallucination rules (paste into coding-agent system prompt / attach as `AGENTS.md`)

### Absolute

1. **Never invent portfolio companies, metrics, NAVs, ownership %, runway, flags, or document contents.** If not in DB/seed fixture for tests, it does not exist.
2. **Never coerce missing to zero.** `null` stays `null`. Aggregations skip nulls; UI shows “—” / “missing”.
3. **LLM never writes objective financial facts into the system of record.** LLM may propose extractions into a **review** table; commit requires deterministic validation ± human confirm.
4. **All headline numbers (NAV, TVPI/MOIC, revenue, EBITDA, cash, runway) are computed or copied by deterministic code from stored facts** — not generated in prose then parsed back.
5. **Every user-visible figure must carry `source_ref` (document_id + locator).** If provenance missing, do not display as fact; show as unverified or hide.
6. **Ask/Q&A must refuse** when retrieval returns insufficient evidence. Preferred response: “Insufficient sourced evidence.” No best-guess INR/EUR.
7. **Citations must resolve to real chunks/pages/cells.** No fake page numbers. If locator unknown, don’t cite.
8. **Corrections are sacred.** Re-parse merges; never overwrite `correction` rows with model output.
9. **FX:** every dual-currency display needs `fx_rate` + `fx_date` + source. No silent “approx” FX.
10. **Units:** detect lakh/crore/USD explicitly; convert only via declared rules; ambiguous → review queue.
11. **FY is April–March** unless company profile overrides; don’t assume calendar FY.
12. **Restatements:** new version; don’t mutate historical reported periods in place without `restatement` record.
13. **Flags:** only emit from the agreed catalog + deterministic rules + evidence payload. Don’t freestyle new risk categories in prompts.
14. **Demo vs prod:** never promote illustrative seed numbers as production defaults. Tests use fixtures labeled `FIXTURE_ONLY`.
15. **Connectors:** no fake OneDrive/Affinity/Granola success. Stub interfaces OK; UI must label “not connected”.
16. **Secrets:** no API keys in repo; no logging raw credentials; OAuth tokens encrypted at rest.
17. **Provider conflict:** default is OpenAI (D5); implement provider interface; do not invent a second default.
18. **Scope discipline:** prefer shipping ingest → schema → provenance → NAV over new chat chrome.
19. **Migrations required** for any schema change; no “just edit JSON”.
20. **Success metrics instrumented** before claiming 90% auto-ingest or near-zero headline error.

### Required attachments for any coding agent run

- This gap analysis  
- Sep 3 Gargi brief (verbatim)  
- Aug 26 Adishree brief (verbatim)  
- V3 metric dictionary / schema draft (create if absent — **block feature work until draft exists**)  
- Flag catalog v1 (even if 5–8 flags)  
- Explicit statement: demo corpus is illustrative, not live book  

### Definition of done (any PR touching numbers)

- [ ] Fact written only via approved ingest/correct API  
- [ ] Provenance present or field marked non-factual  
- [ ] Null handling tested  
- [ ] Re-parse + correction test  
- [ ] No LLM in NAV/rollup path  
- [ ] Ask path has refuse-without-citation test  

---

## One-line verdict for the coding agent

**The demo proves UX appetite. Production is a data + provenance + connector problem, not a new chat UI problem. Replace JSON with a versioned fact store, make corrections durable, wire real MIS ingest with cell-level source links, keep math deterministic, and gate every answer on citations — or you will ship a hallucinating Excel replacement that V3 cannot trust.**
