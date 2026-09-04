# V3 Ventures — Agentic OS Requirement Brief (v3)

**Central operating layer for the investment team**  
**Version:** 3 · **Date:** 3 September 2026  
**Prepared by:** Gargi, V3 Ventures  
**Source PDF:** [`raw/V3_Requirement_Brief_v3_Gargi_2026-09-03.pdf`](raw/V3_Requirement_Brief_v3_Gargi_2026-09-03.pdf)  
**Status:** Functional source of truth for V3 design-partner behavior

---

## 1. Objective and context

V3 Ventures is a venture capital fund: we invest money in early-stage startups (our **portfolio companies**) and then track how each one performs, month after month, for years. Each company emails us a monthly pack of numbers. Today someone opens it, copies figures into a spreadsheet, and writes up what changed — for every company, every month.

We want to build an **Agentic OS** that becomes the central operating layer for V3's investment team: data arrives from source systems on its own, the recurring analysis is drafted automatically, and the team's time goes to **judgement instead of assembly**.

**Scale to design for:** 15–40 portfolio companies, each sending roughly one pack a month, plus board decks a few times a year. The system is used by V3's investment team — a small number of internal users, not a public product.

---

## 2. Deliverables and cadence

| Deliverable | Cadence | What it contains | Primary source |
| --- | --- | --- | --- |
| **Portfolio performance sheet** | Monthly, automated, all companies | Each company's numbers for the month, plus two separate layers of written commentary: **objective** commentary read out of the MIS the way an analyst would read it, and **subjective** commentary drawn from recorded founder calls | MIS files (OneDrive); founder call transcripts (Granola) |
| **NAV report** | Quarterly | NAV per company, rolled to fund level, plus what changed since last quarter and why | MIS financials (OneDrive); ownership data (Affinity) |
| **Performance dashboard** | Real time — no manual updates | Live view across all companies: latest reported numbers, trend against earlier months, open flags, runway, and V3's ownership stake. Refreshes as new files land | MIS financials (OneDrive); Affinity |
| **Portfolio reports** | On demand | Full portfolio report and single-company one-pagers on V3 templates, generated from live data and exportable to PDF, PPTX and XLSX | MIS; Affinity; Granola |

### Commentary split (hard product rule)

- **Objective commentary** — what the numbers support: performance against the previous month and against plan, and what drove it (from MIS).
- **Subjective commentary** — what the founder said on a call: priorities, concerns and asks (from transcripts).
- Both matter, and they must stay **visibly separate** so the reader always knows whether a statement is a measured number or a claim someone made.

**Glossary (brief terms):**

- **MIS** — the monthly financial pack a company sends its investors (revenue, costs, cash).
- **NAV** — net asset value; what V3's stake in each company is currently worth.
- **Fund** — the pool of money V3 invests from.
- **Runway** — months of cash left before a company must raise again.

---

## 3. Data sources and ingestion

| Source | What it provides | Access method |
| --- | --- | --- |
| **OneDrive** | Monthly MIS files and management accounts from portfolio companies | Direct API pull. No manual uploads — this is the preferred design |
| **Affinity** | V3's CRM — company records, investment history, ownership, contacts | API |
| **Granola** | Recordings and transcripts of calls with founders; basis for all subjective commentary | API |
| **LLM reasoning layer** | Reasoning, extraction and writing across all of the above | Connected to all sources |

Design rules:

- **Primary:** the system reads directly from source systems via API. Files that already sit in OneDrive are never re-uploaded by hand.
- **Fallback:** a separate backend ingestion layer with a form-based upload, for companies or documents that do not land in OneDrive. Fallback only, not the default path.
- **Onboarding:** a new portfolio company should be connected and producing structured output within **15 minutes**, without engineering involvement.

---

## 4. Incoming data, and how it must be standardised

This is the hardest part of the build and the part most likely to be underestimated.

- **No standard format.** Every company builds its own MIS. One puts revenue on a tab called "P&L", the next calls it "Financials" and splits it by product line, a third sends a PDF export. Expect no two companies to match — and expect a company's own format to change when it hires a new finance lead.
- **Mixed units.** Indian packs use lakh (100,000) and crore (10,000,000) alongside plain numbers, sometimes within one sheet. Some companies report in USD. Units must be detected explicitly, never inferred from magnitude.
- **Fiscal year runs April to March.** "Q1" means April–June, not January–March. Some companies report on calendar months regardless.
- **Revenue definitions vary.** Gross vs net of returns, GST-inclusive vs exclusive, GMV vs recognised revenue. The same word means different things across two companies, and occasionally across two months at one company.
- **Restatements are normal.** A company sends March's numbers in April and revises them in May. The system must hold both and know which is current.
- **Missing is not zero.** Any field the system cannot find must be recorded as "not reported", never as 0. A zero silently corrupts every average and roll-up above it.

### Required outcome — standardisation

However a company shapes its MIS, the system must map it into one V3 standard format (Section 5). Everything downstream — dashboard, NAV, commentary, reports, Q&A — reads from that standard format and never from the original file. The original is retained only as the source a figure links back to. **Standardising the incoming mess into a single shape is the core of this build**, not a side effect of it.

### Currency

Every figure is held and displayed in both **INR crore** and **EUR**. Companies report in INR (and occasionally USD); the system converts and stores both, recording the **FX rate used and its date** alongside each converted figure so any number can be reproduced later.

### Corrections and attribution

The system has user logins. Any team member can correct an extracted figure; the correction is logged against that user and against the source file, and **survives the same file being re-parsed**. Accuracy is judged against the ingested files themselves — every figure must be checkable in one click against the cell it came from.

---

## 5. Fields to extract

The V3 standard format every incoming MIS is mapped into. All monetary fields stored in INR crore and EUR. V3 will finalise this before build begins.

| Group | Fields | Notes |
| --- | --- | --- |
| **Financial** | Revenue (gross and net), cost of goods sold, gross margin, operating expenses by category, EBITDA, profit or loss | Monthly, with prior-month and plan comparison where the company provides a plan |
| **Cash** | Closing cash balance, monthly burn, runway | Runway is rarely stated and must be derived — closing cash divided by average burn over the last three months |
| **Operating** | Headcount, customers or users, orders or transactions, average order value, retention or churn | Varies by sector; not every company reports every field |
| **Unit economics** | CAC, contribution margin, payback period | Often absent. Extract where present; do not compute unless every input is available |
| **Ownership** | V3's ownership stake, latest round, post-money valuation, investment cost, cap table changes | Mostly from Affinity rather than the MIS |
| **Qualitative** | Founder-stated priorities, risks and asks | From call transcripts only, never inferred from the MIS |

---

## 6. Workflows in detail

| Workflow | Current process | Desired agentic workflow | Expected output |
| --- | --- | --- | --- |
| **Portfolio dashboard** | Data sits in separate Excel trackers, decks and drive folders. A current view is assembled by hand before every review | A live record per company that refreshes as new data arrives. No manual update step | One dashboard — stage, ownership, valuation, NAV, MOIC and IRR, cash, burn, runway, last funding round. Filterable, with click-through to the source file |
| **Automatic ingestion of files** | Files arrive by email and are read manually. Figures are re-keyed into trackers, or Excel sheets dropped into an LLM one at a time | Files pulled from OneDrive via API as they land and mapped into V3's standard field schema, whatever shape the company sent. Anything the system is unsure of is flagged for a human, never guessed | A standardised, timestamped record per company in INR crore and EUR, every field linked back to source file and cell. Ingestion status visible per company |
| **Company tracking rolled up to fund** | Metrics tracked in separate company sheets. Fund-level totals rebuilt from scratch each cycle | A standard metric set held per company over time and aggregated automatically to fund level, with restated figures reconciled against earlier submissions | Time series per company — revenue, gross margin, burn, runway, headcount — and an always-current fund-level roll-up |
| **NAV and performance updates** | NAV rebuilt manually in Excel each quarter. Valuation history lives in old file versions | Valuation held per company on a consistent method and rolled to fund level quarterly, every change versioned and attributable | Quarterly NAV by company and fund, MOIC and IRR, a bridge showing what moved value since last quarter, and full change history |
| **Monthly commentary** | Written by an analyst after reading each MIS, if it gets written at all. Call context lives in personal notes | System reads the MIS and drafts objective commentary; separately reads call transcripts and drafts subjective commentary. The two are never blended | A monthly sheet per company — numbers, objective commentary and subjective commentary side by side, each statement traceable to the MIS line or transcript passage behind it |
| **Portfolio reports on demand** | Assembled by hand from multiple sheets and decks. Takes days and is stale on arrival | Generated on request from live data against fixed V3 templates. The analyst edits rather than assembles | Full portfolio report and single-company one-pagers, produced in minutes |
| **Plain-language Q&A** | Answered by opening files and reading. Cross-portfolio questions often go unasked because they cost too much time | Ask anything across MIS files, transcripts and CRM records in plain English, with follow-ups. Every figure must come from a retrieved document; the system says the data is not available rather than estimating | A direct answer citing source document and page — e.g. "which companies are spending more than ₹2 Cr a year on marketing?" |
| **Risk and anomaly detection** | Issues surface when someone happens to read a deck closely, or at the next board meeting | Continuous scan of incoming files and transcripts against thresholds and prior periods, using flag categories V3 defines | A ranked flag list with evidence — runway below threshold, missed targets, unusual movement in a line item, late or missing reporting, concerns raised on a call |
| **Cross-company comparison** | Built ad hoc in Excel whenever a question comes up | Any set of companies compared on a chosen metric set, normalised for stage and reporting period | Comparison view and export — growth, gross margin, burn multiple, CAC and payback, revenue per head — with peer benchmarking inside a sector |

---

## 7. Key success metrics

| Metric | Target |
| --- | --- |
| Portfolio data updated automatically | Target **90%+** of incoming reporting ingested and structured with no manual entry, and no manual uploads for companies reporting through OneDrive |
| Accuracy of extracted numbers | Measured against the ingested files themselves. Near-zero tolerance for error on headline financials (revenue, cash, burn); every figure checkable in one click against the source cell, and correctable by a logged-in user |
| Reduction in manual data-entry time | Target **80%+** less analyst time spent assembling data rather than interpreting it |
| Time to generate a portfolio report | Minutes, not days — from request to a draft an analyst can edit |
| Answers supported by correct citations | All of them. Every figure cited; where the data does not exist the system says so rather than estimating |
| Time to onboard a new company | **15 minutes** end to end, from connecting the company's folder to first structured output |
| Adoption and frequency of use | Everyday use by every member of the investment team, not a monthly reporting tool |
| Risks and insights caught proactively | Substantially all flags caught against the categories V3 defines, with few enough false positives that the team keeps reading them |

### Flag categories (proposed starting set — to be defined by V3)

- Runway below an agreed threshold
- Revenue below plan beyond an agreed band
- Gross margin falling
- Spend rising without matching revenue growth
- Late or missing monthly reporting
- Customer concentration shift
- Ownership or governance change
- Key person departure
- Concerns raised by a founder on a call but absent from the MIS
