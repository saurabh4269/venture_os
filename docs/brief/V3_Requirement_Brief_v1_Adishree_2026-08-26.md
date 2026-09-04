# V3 Ventures — Agentic OS Requirement Brief (v1)

**Central operating layer for the investment team**  
**Date:** 26 August 2026  
**Prepared by:** Adishree, V3 Ventures  
**Source PDF:** [`raw/V3_Requirement_Brief_v1_Adishree_2026-08-26.pdf`](raw/V3_Requirement_Brief_v1_Adishree_2026-08-26.pdf)  
**Status:** Historical shorter brief — superseded for functional detail by Gargi v3 (3 Sep 2026)

---

## 1. Objective

Build an Agentic OS that becomes the central operating layer for V3's investment team — bringing portfolio information together in one place, automating recurring analysis, and enabling faster decision-making.

The target is to remove the manual assembly work that currently sits between raw portfolio company data and an investment decision. Today the team spends more time gathering and reformatting data than interpreting it. The system should invert that.

---

## 2. Core features and workflows

- Unified portfolio dashboard across all companies
- Automatic ingestion of board decks, MIS reports, cap tables and financial updates
- Company-level financial and operational tracking, rolled up to fund level
- NAV calculation and regular portfolio performance updates
- On-demand generation of portfolio and IC reports
- Plain-language Q&A across portfolio data, cited back to source documents
- Automated identification of risks, anomalies, missed targets and portfolio updates
- Comparison of companies across relevant financial and operating metrics

---

## 3. Workflows in detail

| Workflow | Current process | Desired agentic workflow | Expected output |
| --- | --- | --- | --- |
| **Unified portfolio dashboard** | Portfolio data sits across separate Excel trackers, decks and drive folders. A current view is assembled by hand before every review | System maintains a live record for each company and refreshes it as new data arrives. No manual entry, no rebuild before a meeting | One dashboard covering stage, ownership, valuation, NAV, MOIC/IRR, cash, burn, runway and last round — filterable by fund, sector, vintage and partner, with drill-through to the source document |
| **Automatic ingestion of board decks, MIS, cap tables** | Documents arrive by email and are read manually. Figures are re-keyed into trackers, or Excel sheets are dropped into an LLM one at a time and analysed ad hoc | Documents ingested automatically on arrival (email, drive, portal upload) and parsed into structured fields. Low-confidence extractions are flagged for confirmation, never guessed | A structured, timestamped financial and operating record per company, every field linked back to the source file and page. Ingestion status visible per company |
| **Company-level tracking rolled up to fund** | Metrics tracked in individual company sheets. The fund-level roll-up is rebuilt from scratch each cycle | A standard metric set maintained per company over time and aggregated automatically to fund level, with restatements reconciled against prior submissions | Time series per company — revenue, gross margin, burn, runway, headcount, unit economics — and an always-current fund-level roll-up |
| **NAV calculation and performance updates** | NAV rebuilt manually in Excel each reporting cycle. Valuation history lives in old file versions | Valuation maintained per company on a consistent method and rolled to fund level, with every change versioned and attributable | Current NAV by company and by fund, MOIC/IRR, a period-on-period valuation bridge, and full change history (method, inputs, date, rationale) |
| **On-demand portfolio and IC reports** | Reports assembled by hand from multiple sheets and decks. Takes days and goes stale on arrival | Report generated on request from live data against fixed V3 templates, with the analyst editing rather than assembling | Full portfolio report, IC memo and single-company one-pager on V3 templates, exportable to PDF, PPTX and XLSX — produced in minutes |
| **Plain-language Q&A across portfolio data** | Questions answered by opening files and reading. Cross-portfolio questions often go unasked because they cost too much time | Ask anything across the full corpus in plain English, with follow-ups. Every figure grounded in a retrieved document; the system declines rather than infers | A direct answer with citation to source document and page — e.g. "which companies are spending more than ₹2 Cr a year on marketing?" No un-sourced numbers |
| **Risk, anomaly and update detection** | Issues surface when someone happens to read a deck closely, or at the next board meeting | Continuous scan of incoming data against thresholds and prior periods, using flag categories defined by V3 | A ranked flag list with supporting evidence: runway below threshold, variance to plan, missed targets, unusual movement in a line item, late or missing reporting, material portfolio updates |
| **Cross-company comparison** | Comparisons built ad hoc in Excel whenever a question comes up | Any set of companies compared on a chosen metric set, normalised for stage and reporting period | Comparison view and export across growth, burn multiple, gross margin, CAC and payback, revenue per head — with peer benchmarking inside a sector |

---

## 4. Key success metrics

| Metric | Target |
| --- | --- |
| Reduction in manual reporting and data-entry time | The bulk of current effort removed. Target **80%+** less analyst time spent assembling data rather than interpreting it |
| Portfolio data updated automatically | High. Target **90%+** of incoming portfolio company reporting ingested and structured with no manual entry |
| Accuracy of extracted financial and operating metrics | Extremely high. Near-zero tolerance for error on headline financials; every extracted figure traceable to its source page and open to spot-check |
| Time to generate a portfolio or IC report | Minutes, not days — from request to a draft an analyst can edit |
| Answers supported by correct source citations | All of them. Every figure cited; where the data does not exist the system says so rather than estimating |
| Adoption and frequency of use | Everyday use by every member of the investment team, not a monthly reporting tool |
| Proactive risks and insights identified | Substantially all flags caught against the categories V3 defines, with few enough false positives that the team keeps reading them |

### Flag categories (proposed starting set — to be defined by V3)

- Runway below an agreed threshold
- Revenue variance to plan beyond an agreed band
- Gross margin compression
- Burn increase without matching revenue growth
- Late or missing monthly reporting
- Customer concentration shift
- Cap table or governance change
- Key person departure

---

## 5. Not covered at this stage

Security architecture, technical integrations and infrastructure decisions are deliberately out of scope for this brief. These will be specified once the functional scope above is agreed.

---

## Relation to Gargi v3

This Aug 26 brief is the shorter sibling. **Gargi Sep 3 supersedes** for connectors (OneDrive/Affinity/Granola), dual currency, corrections, cell provenance, FY/restatements, reasoning-layer choice, and 15-minute onboard. Keep this file for scope history only.
