# V3 Requirement Brief (historical sibling)

**Author:** Adishree (V3 / Heisenbug working notes)  
**Date:** 26 August 2026  
**Status:** Historical sibling only — **not** the functional source of truth  
**Superseded by:** Gargi brief, 3 September 2026 (`docs/brief/v3-requirement-brief-gargi-2026-09-03.md`)

Use this document to understand how the problem was first framed and what the earlier single-firm demo (`v3.heisenbug.in`, repo `v3_agentic_os`) was aiming at. Do **not** implement stack, tenancy, or UX from this brief or from that demo’s chrome.

---

## 1. Original framing

Build an “Agentic OS” for the V3 investment team so that board packs, MIS, and marks stop living only in last month’s Excel. The demo’s promise:

- Live companies on one dashboard (stage, ownership, NAV, MOIC, runway).
- Board decks and MIS parsed into fields; low confidence waits for a human.
- Plain-English Ask across a corpus; decline rather than guess; no unsourced rupees.
- Valuation history with method, inputs, date, rationale; period-on-period bridge.
- Flags (runway, plan variance, GM compression, late MIS) ranked with evidence.
- Draft IC memo, one-pager, portfolio pack on V3 templates — minutes, not days.

Honesty note from the demo itself: public portfolio **names** from v3.ventures; ownership, NAV, MIS extracts and flags in that demo were a **realistic working set, not the live book**.

---

## 2. What this brief got right (carry forward)

- Cited operating layer, not a chatbot.
- Human review for low-confidence extracts.
- Ask must refuse without a page / source.
- Flags need evidence.
- Reports should be assembled from the book, not re-typed.
- Mixed India / Europe book is the real world for V3.

---

## 3. What this brief / demo must not dictate

| Topic | Historical lean | Override (locked) |
| --- | --- | --- |
| Tenancy | Single-firm demo | Multi-tenant SaaS with RLS |
| Auth | Unspecified / demo login | **Better Auth** (orgs, invites, roles) — not Clerk / WorkOS |
| Jobs | Unspecified / Inngest-shaped drafts | **BullMQ + Redis** |
| Files | R2-only drafts | **S3-compatible** (MinIO locally; R2 / Azure Blob later) |
| LLM | Claude-default drafts | **OpenAI** default behind `packages/llm` |
| UX | Demo chrome, fonts, marketing film | **First-principles** VC desktop; do not clone `v3.heisenbug.in` |
| Data | Seeded public names + illustrative figures | Never invent; fixtures opt-in and labelled `FIXTURE_ONLY` |
| Product name | V3 Agentic OS | **Venture OS** (domain `ventureos.xyz`); V3 is design partner |

---

## 4. Workflows worth remembering (not visuals)

1. **See** — one dashboard, filterable, drillable, sourced.
2. **Ingest** — parse → wait on low confidence.
3. **Ask** — grounded Q&A.
4. **Mark** — method + inputs + date + rationale.
5. **Flag** — catalogued, evidenced.
6. **Draft** — one-pager / pack from the book.

The Gargi brief tightens these into invariants: missing ≠ 0, dual INR crore + EUR with FX triple, corrections that survive re-parse, objective vs subjective never blended, 15-minute onboarding, 90%+ auto-ingest **to inbox**.

---

## 5. How to use this file

- Read for intent and ritual names.
- If it conflicts with the 3 Sep 2026 brief or `docs/decisions.md`, ignore it.
- Do not copy demo companies, marks, or flags into production defaults.
