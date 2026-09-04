# Product Spec — Agentic OS (production)

**Status:** Locked for design-partner V1 + SaaS-ready tenancy from day one  
**Functional SoT:** Gargi brief v3, 3 Sep 2026  
**Pack date:** 2026-09-05

---

## 1. Vision

Build a **cited portfolio operating system** for VC investment teams:

- Data arrives from source systems (or a controlled upload fallback).
- Messy company packs are standardized into a firm schema.
- **Objective commentary** (from numbers / MIS) and **subjective commentary** (from founder calls / Granola) stay **visibly separate**.
- Dashboard, NAV, flags, Ask, and reports read **only** from the standardized book — never from ad-hoc Excel.

**Design partner:** V3 Ventures (India + Europe/US evergreen vehicles; consumer brands).  
**Commercial future:** same product sold to other VC firms as **multi-tenant SaaS** (org per firm, domain join, connectors, firm-specific metric schema and flag policy).

---

## 2. Positioning (wedge vs Affinity / Visible / Carta)

Typical VC stack today:

| Layer | Common tools | Gap |
| --- | --- | --- |
| Deal CRM / relationships | Affinity | Not MIS standardization |
| Portfolio KPI collection | Visible.vc | Weak on messy Excel/PDF MIS + source-cell audit |
| Cap table / fund admin | Carta, AngelList, Juniper Square | Not an operating MIS OS |
| Data rooms | DocSend / Datasite / firm Drive | Document vault, not a live book |
| Standards | ILPA reporting / PC templates | Reporting *out*, not ingest *in* |

**Agentic OS owns:** API-first MIS ingest → standardization → live book → cited Ask → dual commentary → flags → partner-ready drafts.

**Integrate with** Affinity / Carta / Visible later; **do not** try to replace fund accounting, CRM, or cap-table admin in V1.

---

## 3. Multi-tenant model (SaaS-ready from day one)

Inspired by B2B patterns in Visible (firm workspace), Affinity (org + roles), Better Auth (domain join / SSO).

```
Organization (VC firm)          e.g. "V3 Ventures"
  ├── verified email domains    e.g. @v3.ventures
  ├── Members + roles
  ├── Funds / vehicles          e.g. India Evergreen, Europe & US
  ├── Portfolio companies
  ├── Data rooms (document vaults)
  ├── Connectors                OneDrive, Affinity, Granola, upload
  ├── Metric schema             firm-standard fields (start from V3 schema)
  └── Flag policy               thresholds / spectrum (firm-configurable)
```

### Onboarding (must feel startup-product, not IT project)

1. **Sign up** with work email → create Organization.
2. **Claim / verify domain** (DNS TXT or magic-link admin) so `@firm.com` can auto-join or request join.
3. **Invite team** (Org Admin, Partner, Analyst, Viewer).
4. **Create Fund(s)** and reporting currency defaults.
5. **Connect sources** (OneDrive folder / Affinity / Granola) *or* start with upload-only.
6. **Add first portfolio company** → map folder → run first extract → human confirms → book has structured output.
7. **Target (brief):** new company producing structured output in **≤15 minutes** without engineering.

### Roles (minimum)

| Role | Can |
| --- | --- |
| Org Admin | Billing, domain, connectors, invites, schema, flag policy |
| Partner | Read all, confirm extracts, edit marks, Ask, reports |
| Analyst | Ingest, confirm/edit extracts, draft reports, Ask |
| Viewer | Read dashboard / reports; no confirm; no connector change |

Platform super-admin (internal) is separate and always audited; not a firm role.

---

## 4. Data room model (use precise language)

Do **not** overload “data room.” Implement three concepts; name them clearly in UI:

| Concept | Meaning | V1 |
| --- | --- | --- |
| **Company vault** | Per portfolio company folder of MIS, board decks, cap tables, updates (the OneDrive reality) | **Required** |
| **Firm library** | Firm-level templates, IC templates, valuation policy docs | Required light |
| **LP / fundraising data room** | ILPA-aligned folders for LP diligence (DDQ, track record, side letters) | **Phase 2** — needed to sell broadly; not V3 day-1 blocker |

Every document in a vault is **immutable raw storage** + extracted versions. Re-parse never destroys prior confirmed values without a version trail.

---

## 5. Functional scope locked from V3 brief v3 (Gargi, 3 Sep 2026)

Must implement for V3 design partner:

1. **Live portfolio dashboard** — stage, ownership, valuation, NAV, MOIC/IRR, cash, burn, runway, last round; filterable; drill-to-source.
2. **Automatic ingestion** — OneDrive API preferred; form upload fallback only (not default).
3. **Standardization** into firm schema (Section 5 fields in brief). Hard rules:
   - Mixed units (lakh / crore / USD) — detect explicitly, never infer from magnitude.
   - FY April–March (“Q1” = Apr–Jun); calendar-month reporters allowed via company profile.
   - Restatements — hold both; mark which is current.
   - **Missing ≠ 0** — “not reported”, never silent zero.
   - Dual **INR crore + EUR** with FX rate + date on every converted figure.
4. **User logins**; attributable corrections that survive re-parse; one-click source cell/page check.
5. **Company time series + fund roll-up.**
6. **Quarterly NAV** with versioned marks + bridge + history.
7. **Monthly sheet:** numbers + **objective** commentary (MIS) + **subjective** commentary (Granola) — never blended.
8. **On-demand reports:** portfolio + company one-pager; PDF / PPTX / XLSX.
9. **Plain-language Ask** with citations; decline if not in corpus.
10. **Risk / anomaly flags** with evidence; categories firm-defined (start with brief’s proposed set; spectrum UX TBD with V3).
11. **Cross-company compare** on chosen metrics, normalized for stage/period.

**Scale to design for:** 15–40 companies per org initially; architecture must not hard-cap there.

### Brief field groups (standard schema starting point)

| Group | Fields (finalize with V3 before build hardens) |
| --- | --- |
| Financial | Revenue (gross/net), COGS, GM, OpEx by category, EBITDA, P&L |
| Cash | Closing cash, monthly burn, runway (derived: cash / avg 3-mo burn) |
| Operating | Headcount, customers/users, orders/transactions, AOV, retention/churn |
| Unit economics | CAC, contribution margin, payback — extract where present; do not invent inputs |
| Ownership | Stake, latest round, post-money, cost, cap-table changes (mostly Affinity) |
| Qualitative | Founder priorities/risks/asks — **transcripts only**, never inferred from MIS |

---

## 6. Explicit non-goals (V1)

- Replacing Affinity as deal CRM / relationship graph.
- Full fund accounting / capital calls / K-1 (Carta / Juniper Square territory).
- Public LP portal / LP data room (Phase 2).
- Deal-sourcing data room for pipeline companies (unless same vault primitives are reused later).
- Guaranteeing 100% auto-extract without human confirm on low confidence.
- Mobile-native apps.
- Perfect 90% auto-ingest on day one — measure a path; high-confidence auto + mandatory review for low confidence is acceptable V1.

---

## 7. Success metrics (from brief — treat as acceptance)

| Metric | Target |
| --- | --- |
| Auto ingest | ≥90% of OneDrive-path reporting ingested without manual re-key |
| Accuracy | Near-zero error on headline financials (revenue, cash, burn); every figure checkable to source |
| Analyst time | ≥80% less assembly time |
| Report draft | Portfolio report draft in minutes |
| Ask | All figures cited or explicitly “not available” |
| Onboard | 15-minute company onboarding to first structured output |
| Adoption | Everyday use by investment team |
| Flags | Substantially all flags against V3-defined categories; low enough FP that team keeps reading |

---

## 8. Proposed flag starting set (brief — finalize with V3)

- Runway below agreed threshold  
- Revenue below plan beyond agreed band  
- Gross margin falling / compression  
- Spend rising without matching revenue growth  
- Late or missing monthly reporting  
- Customer concentration shift  
- Ownership or governance change  
- Key person departure  
- Concerns raised on a call but absent from the MIS  

Flag policy must be **firm-configurable** (thresholds / “spectrum”), not hard-coded forever.

---

## 9. Design partner people (context only — do not invent more)

Public / brief context: Arjun Vaidya, Abhiram Bhalerao, Priyanka Thakkar, Gargi Shirpurkar Pande (brief author). Flag “spectrum” ideation ongoing with V3 — keep policy data-driven.

---

## 10. Deliverables & cadence (brief)

| Deliverable | Cadence | Primary sources |
| --- | --- | --- |
| Portfolio performance sheet | Monthly, automated | MIS (OneDrive); transcripts (Granola) |
| NAV report | Quarterly | MIS; ownership (Affinity) |
| Performance dashboard | Real time as files land | MIS; Affinity |
| Portfolio / company reports | On demand | MIS; Affinity; Granola |
