# V3 Requirement Brief v3

**Author:** Gargi (V3 Ventures)  
**Date:** 3 September 2026  
**Status:** Functional source of truth for Venture OS  
**Audience:** Build team / design partner engineering  
**Supersedes:** Adishree brief of 26 August 2026 (historical sibling; do not implement against it)

This document is the functional specification for a central operating system for the V3 Ventures investment team. Product, data, and UX decisions in this repository must satisfy this brief. Later handoff drafts that contradict it are overridden by the locked decisions in `docs/decisions.md`.

---

## 1. Purpose

V3 needs a single operating layer for the investment book — not another spreadsheet, not a chatbot over PDFs, and not a founder-facing data-collection portal.

The product is the place a partner or analyst opens in the morning to know:

1. What changed in the portfolio.
2. What needs a look (flags, late MIS, inbox waiting on a human).
3. What the fund is marked at, and why.
4. Whether a number can be trusted (source, period, unit, currency, restatement).

Success is operational, not theatrical. If a headline cannot be traced to a confirmed book fact, it is not shown as fact.

---

## 2. Users, scale, and operating context

| Item | Requirement |
| --- | --- |
| Firm | V3 Ventures — early-stage consumer, India / Europe / US, evergreen / Verlinvest-backed |
| Primary users | Investment team: partners, investors, analysts |
| Secondary users | Ops / finance preparing NAV and LP-facing packs (LP room itself is Phase 2) |
| Portfolio scale | Approximately **15–40 portfolio companies** in active coverage |
| Cadence | Monthly MIS; quarterly marks / NAV; ad-hoc IC and one-pagers |
| Fiscal year | **April–March** unless a company profile overrides |
| Geography / units | Mixed India and international reporting: **lakh, crore, USD, EUR**, and local statements |
| Reporting currencies | Dual display: **INR crore + EUR**, each conversion carrying **FX rate + date + source** |

The system is multi-tenant SaaS (Venture OS). V3 is the design partner. Other funds must be isolatable by organisation. No cross-org leakage.

---

## 3. Problem to solve

Today the book lives in:

- Non-standard monthly MIS workbooks (each company a different layout, different units, different FY presentation).
- Board packs and PDFs dropped into OneDrive folders.
- Affinity CRM notes and relationship history.
- Granola (or equivalent) call transcripts — qualitative, useful, not books.
- Analyst-assembled Excel for NAV, runway, and partner packs.

Pain:

- Assembly time dominates analysis time.
- Headlines drift because missing cells get typed as zero, units get guessed, and restatements overwrite history.
- A partner cannot click a number and land on the source page / sheet / cell.
- Objective MIS figures get blended with “we think they will recover GM next quarter” from a call.
- New company onboarding takes too long to be used in the first month.

---

## 4. In-scope product

A **central OS** for the investment team with these rituals:

| Ritual | What it is |
| --- | --- |
| **Command** | Morning home: fund pulse + Needs-a-look (open flags + inbox awaiting confirm) |
| **Companies** | Coverage list + company page (book, commentary, documents, flags) |
| **Inbox** | Human-in-the-loop confirm of every proposed extract. Nothing auto-posts to the book. |
| **Vault / Documents** | Company vault: MIS, board packs, mark memos, transcripts |
| **Flags** | Deterministic risk flags from a catalog, each with evidence |
| **NAV** | Quarterly (and as-of) fund NAV from positions + marks, not from a vibe |
| **Compare** | Cross-company compare on confirmed book facts only |
| **Ask** | Cited question-answering over the org corpus. Decline if unknown. |
| **Reports** | One-pager / portfolio draft; export PDF, PPTX, XLSX |
| **Org / Settings** | Users, roles, invites, connectors, FY / currency profile |

### 4.1 Data rooms (three meanings — do not collapse)

1. **Company vault** — documents that belong to one portfolio company (MIS, board pack, transcript). This is in scope.
2. **Firm library** — firm-level templates, IC memos, mark policy. Thin support in v1 (org settings / reports).
3. **LP / ILPA room** — external sharing with LPs. **Out of scope this phase** (stub only).

---

## 5. Data sources

### 5.1 Preferred: OneDrive MIS API

- Connect a company (or fund) folder.
- Ingest new or changed workbooks / PDFs automatically.
- Target: **90%+ of monthly MIS auto-ingested** (landed in inbox with a proposal), not 90% auto-posted to the book.

### 5.2 Fallback: upload

- Analyst uploads PDF / XLSX into the company vault when the folder is not connected.
- Same parse → inbox → confirm path. No second-class book.

### 5.3 Affinity CRM

- Relationship / note / deal context. **Connect stub in v1** (show “not connected”; do not fake sync success).
- When live: notes are **subjective** unless a human promotes a figure through inbox.

### 5.4 Granola transcripts

- Call notes are **subjective commentary** by default.
- Extracted numbers from a call still go to inbox and must be labelled subjective unless the human confirms they match MIS.

### 5.5 Honesty rule

Never display a connector as healthy if it is not authenticated and syncing. Label **not connected**. Inventing OneDrive / Affinity / Granola field names is forbidden.

---

## 6. Firm schema and non-standard MIS

Portfolio companies do not share a workbook template. The OS must **standardise into a firm schema** without forcing founders onto a portal.

Minimum firm metric catalog (extend, do not invent values):

| Key | Meaning | Unit family |
| --- | --- | --- |
| `net_revenue` | Net sales / revenue for the period | money |
| `gmv` | Gross merchandise / GMV if reported | money |
| `gross_margin_pct` | Gross margin | percent |
| `contribution_margin_pct` | Contribution margin | percent |
| `ebitda` | EBITDA | money |
| `cash` | Closing cash | money |
| `burn` | Net cash burn for the period (cash out − cash in); missing ≠ 0 | money |
| `runway_months` | Cash / burn; only if both inputs exist and burn > 0 | months |
| `opex` | Operating expenses | money |
| `cogs` | Cost of goods | money |
| `headcount` | FTE / headcount | count |
| `customers` | Active customers if reported | count |
| `aov` | Average order value if reported | money |
| `cac` | Customer acquisition cost if reported | money |
| `repeat_rate_pct` | Repeat / repurchase if reported | percent |

Mapping rules:

- Label aliases are configured per company (e.g. “Net Sales”, “Revenue (INR lakhs)”).
- **Ambiguous units → review, not guess.** Inbox item of kind `unit_ambiguity`.
- Parser confidence below threshold → inbox, never book.
- Low-quality PDF / OCR → inbox with locator and low confidence. Do not silently drop.

---

## 7. Units, currency, and missingness

### 7.1 Mixed units must be explicit

A cell that says `12.4` without a unit is not a number we can book. The proposal must carry:

- raw token
- detected or unknown unit (`lakh` | `crore` | `thousand` | `million` | `unit` | `unknown`)
- currency if money (`INR` | `USD` | `EUR` | `GBP` | `unknown`)
- period
- locator (sheet/cell or page + excerpt)

### 7.2 Dual display: INR crore + EUR

Every booked money fact that is shown in dual currency **must** store:

- `fx_rate`
- `fx_date`
- `fx_source`

If any of the three is missing, do not show the converted figure as fact. Show the native figure only.

### 7.3 Missing ≠ 0

This is a hard invariant.

- A missing metric is `null`. UI shows **—** or **not reported**.
- Arithmetic that would treat null as zero is forbidden (runway, burn multiple, portfolio sums).
- A company that did not report cash does **not** pull fund cash or runway to a fake number.
- Spreadsheet empty cells are not zero.

---

## 8. Time, fiscal year, restatements

- Default fiscal year: **1 April – 31 March**.
- Company profile may override `fy_start_month`.
- Periods are first-class: month / quarter / FY, with `period_start` and `period_end`.
- **Restatements are versioned.** A restated metric does not overwrite the prior booked row. It points at `restatement_of_id` and increments `version`.
- Headlines use the latest confirmed version unless the user asks for the as-was figure.

---

## 9. Identity, attribution, corrections

- Named user logins (no shared “team@” as the only identity).
- Roles: **Org Admin / Partner / Analyst / Viewer**.
- Every confirm, edit, reject, and correction is attributable (`actor_user_id`, timestamp).
- **Corrections are sacred on re-parse.** If an analyst corrected “Revenue for FY26 M5 is 4.2 crore, not 42 lakh”, a later re-parse of the same or successor file must not clobber that correction. The pipeline reapplies the correction ledger before proposing or booking.

---

## 10. Onboarding (15-minute company path)

A new portfolio company must be usable inside ~15 minutes:

1. Create company (name, sector, stage, country, FY override, reporting unit hints).
2. Connect OneDrive folder **or** upload first MIS / board pack.
3. First extract lands in inbox with locators.
4. Analyst confirms / edits / rejects the handful of headlines (cash, burn, revenue, GM).
5. Company appears on Command with only confirmed facts; missing headlines show — .

Do not block on perfect historical backfill. Backfill is a later job.

---

## 11. Provenance

**Every figure that is shown as fact is clickable to source.**

Minimum `source_ref`:

- document id
- locator (sheet + cell, or page + excerpt / bbox if available)
- optional excerpt
- confirmed by / at

**No `source_ref` → not shown as fact.** Derived headlines (runway, MOIC, TVPI, fund NAV) must cite the inputs they used. If an input is missing, the derived headline is missing (—), not zero.

---

## 12. Live dashboard (Command)

Command is the morning home. It is not a marketing hero.

Required:

- Fund pulse: committed / cost / last mark / TVPI / DPI / open flags — each from the book or —.
- Needs-a-look: open flags + inbox count + late MIS.
- Coverage table: company, stage, ownership, last MIS period, cash, burn, runway, last mark, open flags.
- Period and fund filters.
- No invented companies. Empty org → empty state with “Add a company” / “Upload MIS”.

---

## 13. Fund rollup and quarterly NAV

- Positions: cost, instrument, ownership, date.
- Marks: as-of, method, value, currency, FX triple, rationale, source.
- Fund NAV at an as-of date = sum of latest marks on or before that date for each position + fund cash if booked. Missing mark → that position contributes **—** to the rollup explanation and is **excluded from a numeric total that claims completeness**. A total that silently skips unmarked names must say so.
- MOIC / TVPI / DPI / XIRR computed in **code** from book facts (cost, marks, distributions). Never from the LLM.
- Quarterly NAV is a first-class ritual, not a screenshot of last month’s Excel.

---

## 14. Monthly sheet: objective vs subjective

Each company-month has two commentary lanes that are **never blended** in storage or UI:

| Lane | Source | Treatment |
| --- | --- | --- |
| **Objective** | MIS / audited / confirmed financial extract | Book facts; used in headlines and flags |
| **Subjective** | Calls, Affinity notes, partner judgement, Granola | Displayed separately; must not overwrite book facts |

UI must make the two lanes visually distinct. A sentence from a call cannot appear inside the MIS column.

---

## 15. Reports

Generate, in minutes, from the book:

- Company one-pager
- Portfolio / partner pack draft

Exports: **PDF, PPTX, XLSX**.

Reports may draft narrative with an LLM **only** from confirmed facts + cited commentary. Unsourced claims are stripped. Exports that cannot be filled stay as structured stubs that still download (title, date, confirmed table, citation list).

---

## 16. Ask (cited Q&A)

- Search the org corpus first (Postgres FTS in v1; pgvector optional later).
- Ground the model on retrieved chunks + book facts.
- **Every answer carries citations that resolve** to a document locator or a booked metric `source_ref`.
- **If evidence is insufficient, refuse.** Preferred refusal: “Not in the book / corpus — I will not guess.”
- The model must not invent companies, metrics, NAV, or flags.
- Ask never writes the book.

---

## 17. Risk flags

Flags are **only** raised from a versioned catalog, each with:

- `flag_key`
- severity
- evidence payload (metric ids, thresholds, periods)
- `source_ref`s

v1 catalog (deterministic detectors):

| Key | Idea |
| --- | --- |
| `runway_short` | Runway months exist and are below threshold (default 6) |
| `mis_late` | Expected monthly MIS period not confirmed by a grace window |
| `burn_up` | Burn increased beyond threshold vs prior confirmed period |
| `gm_compression` | Gross margin down beyond threshold vs prior confirmed period |
| `plan_variance` | Confirmed revenue vs plan (if plan exists) beyond threshold |
| `mark_stale` | No mark in the current quarter for a position that has cost |
| `cash_unreported` | Prior period had cash; current expected period does not (missing, not zero) |

No free-text “AI thought this was risky” flags without catalog + evidence.

---

## 18. Cross-company compare

A compare matrix: selected companies × selected catalog metrics × period.

- Cells are confirmed book values or —.
- Units normalised for display (native + dual currency rules).
- No imputation. No peer-average fill.

---

## 19. Non-functional and operating constraints

- Multi-tenant: `org_id` on every tenant row; RLS in Postgres.
- Auditability over cleverness.
- Near-zero headline error: headlines computed in code from confirmed facts only.
- Target **80%+ less assembly time** vs current Excel ritual.
- Reports in minutes.
- All answers cited.
- 90%+ auto-ingest **into inbox**, not auto-book.
- No secrets in the repository.
- Demo / seed data, if any, is clearly **FIXTURE_ONLY** and opt-in.

---

## 20. Out of scope (this phase)

- Live OneDrive / Affinity / Granola OAuth (stubs + “not connected”).
- LP / ILPA data room.
- Billing / Stripe.
- Perfect OCR for every PDF layout (solid XLSX + reasonable PDF text; low confidence → inbox).
- Founder-facing portal (do not become Visible).
- Cap-table system of record (do not become Carta).

---

## 21. Success criteria (acceptance)

A design-partner analyst can, without theatre:

1. Sign in, belong to an org, invite a teammate.
2. Onboard a company in ~15 minutes (create → upload → first extract → confirm).
3. See Command / Flags / NAV / Compare / Ask / Reports operate on **confirmed** data only.
4. Click a headline and land on source.
5. See missing as — , never as 0.
6. See objective and subjective commentary in separate lanes.
7. Ask a question the corpus cannot support and receive a refusal with no invented rupees.
8. Re-parse a file and keep prior corrections.

---

## 22. Vocabulary

Use investment-team language: **runway, burn, MOIC, TVPI, DPI, MIS, mark, restatement, ownership, cost, as-of**. Do not market “AI insights”, “magic”, or “copilot vibes”.
