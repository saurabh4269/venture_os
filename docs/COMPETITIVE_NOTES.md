# Competitive notes (short)

**Pack date:** 2026-09-05

---

## Closest comps

| Player | Role vs Agentic OS |
| --- | --- |
| **Visible.vc + Standard Metrics** | **Closest** on portfolio KPI collection / standardization. Weak on messy Excel/PDF MIS ingest with source-cell audit and cited Ask. Integrate later; do not ignore their metric-dictionary UX lessons. |
| **Affinity** | Deal CRM / relationships. Own ownership & people graph — **not** MIS standardization. Connect; do not replace in V1. |
| **Carta** (and Juniper Square / AngelList admin) | Cap table / fund admin. Not an operating MIS OS. Integrate marks/ownership later; do not rebuild fund accounting in V1. |

## Three data room types (name precisely in UI)

1. **Company vault** — per-portfolio-company MIS / board decks / cap tables (V1 required).
2. **Firm library** — templates, IC docs, valuation policy (V1 light).
3. **LP / fundraising data room** — ILPA-aligned LP diligence packs (Phase 6 / sell-wide; not V3 day-1 blocker).

Do not overload a single “data room” label.

## HITL confirm (copy from demo intent)

Keep the demo’s human-in-the-loop **confirm** contract: model proposes extractions; analyst confirms/corrects into the book; low confidence never silent-auto-commits. Port the inbox confirm UX pattern; persist it in Postgres (never ephemeral React state).

## UI posture

Venture OS UI is **first-principles**. Do not clone https://v3.heisenbug.in look-and-feel. Port HITL confirm and citation contracts as product requirements only.
