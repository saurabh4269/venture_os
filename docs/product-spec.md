# Product spec — Venture OS

**Product:** Venture OS  
**Domain:** `ventureos.xyz`  
**Design partner:** V3 Ventures  
**Functional SoT:** [Gargi brief, 3 Sep 2026](./brief/v3-requirement-brief-gargi-2026-09-03.md)

Venture OS is a **multi-tenant SaaS** for VC investment teams: the operating system for the book. V3 is the first firm. The domain model is firm-agnostic (org → funds → companies → vault → inbox → book).

---

## 1. Vision

A partner opens Command at 8:40 and sees only things that are true or explicitly missing. An analyst onboards a new name in fifteen minutes. Nothing an LLM proposes becomes a headline until a human confirms it. Every rupee and euro on screen has a source.

We are not:

- Visible (founder-facing collection + LP portal)
- Standard Metrics (benchmark network)
- Affinity (CRM)
- Carta (cap table / fund admin)

We **sit on top of** the firm’s files and CRM, standardise MIS into a firm schema, and run the morning rituals.

---

## 2. Tenancy and roles

| Role | Intent |
| --- | --- |
| **Org Admin** | Org profile, connectors, invites, role changes, destructive settings |
| **Partner** | Full investment book: confirm inbox, marks, reports, Ask, flags |
| **Analyst** | Upload, parse, confirm, draft reports; cannot delete org or rotate connectors alone |
| **Viewer** | Read Command / company / flags / NAV / reports; no confirm, no upload |

A user may belong to multiple orgs. The chrome has an **org switcher**. Queries are scoped by `org_id` (application + RLS). Cross-org data leakage is a P0 defect.

Invites are email + role. Signup creates a user; first-run creates an org or accepts an invite.

---

## 3. Information architecture (rituals)

| Nav | Job |
| --- | --- |
| **Command** | Fund pulse + Needs-a-look |
| **Companies** | Coverage + company page + 15-min onboard |
| **Inbox** | HITL confirm / edit / reject |
| **Flags** | Catalog detectors + evidence |
| **NAV** | Positions, marks, as-of rollup |
| **Compare** | Cross-company matrix |
| **Ask** | Cited Q&A; refuse if unknown |
| **Reports** | One-pager / portfolio draft + PDF/PPTX/XLSX |
| **Vault** | Company (and later firm) documents |
| **Settings** | Org, members, FY/currency, connectors |

---

## 4. Data rooms (three meanings)

| Room | Owner | Phase |
| --- | --- | --- |
| **Company vault** | Documents for one portco | v1 |
| **Firm library** | Templates, IC, mark policy | thin v1 |
| **LP / ILPA room** | External LP sharing | Phase 2 — stub only |

Do not reuse one “data room” metaphor for all three. Permissions and retention differ.

---

## 5. Core loop

```
upload / folder stub
        ↓
   parse job (BullMQ)
        ↓
  proposals → Inbox
        ↓
 human confirm / edit / reject
        ↓
     MetricValue book  (+ correction ledger)
        ↓
 Command · Flags · NAV · Compare · Ask · Reports
```

LLM may **propose**. LLM may **never** commit objective facts.

---

## 6. Company onboarding (15 minutes)

1. Name, sector, stage, country, FY override, unit hints.
2. Upload first MIS/board pack (OneDrive connect is a labelled stub).
3. Worker extracts → inbox.
4. Confirm headlines.
5. Company is live on Command with provenanced facts and honest — s.

---

## 7. Surfaces (behavioural)

### Command

Dense coverage table + pulse cards + Needs-a-look. Empty org: “Create a company” / “Upload MIS”, not a sample portfolio.

### Company page

Header (stage, ownership, last mark). Book metrics with provenance chips. Objective commentary | subjective commentary. Documents. Open flags. Onboard progress.

### Inbox

Queue of proposals: metric, unit ambiguity, commentary. Side-by-side: excerpt, locator, proposed value, confidence. Actions: confirm, edit (value/unit/period), reject. Rejects stay auditable.

### Flags / NAV / Compare

Deterministic. Book only. Missing stays missing.

### Ask

FTS over indexed document text + booked facts. OpenAI completes only with provided evidence. Citations must resolve. Otherwise refuse.

### Reports

Draft from book. Export files that open. Narrative cannot introduce new numbers.

### Settings / Connectors

OneDrive, Affinity, Granola: **not connected** until a real OAuth lands. No fake last-sync timestamps.

---

## 8. UX principles (first principles — not the old demo)

- Command is the morning home.
- Provenance chip or it is not a fact; missing is — / not reported.
- Inbox is HITL; nothing auto-posts.
- Objective vs subjective are visually separated.
- Vocabulary: runway, burn, MOIC, TVPI, DPI, MIS, mark.
- Dense calm desktop. No AI-marketing chrome, no cloned `v3.heisenbug.in` layout.
- Empty states prescribe the next action.
- Org switcher always visible when a session exists.

Visual direction: paper/ink, serif titles, tight tables, forest accent, no gradients.

---

## 9. Anti-hallucination (product-level)

See `AGENTS.md`. The UI is part of the control system: it must refuse to render a fact without `source_ref`, and it must not default numeric inputs to 0.
