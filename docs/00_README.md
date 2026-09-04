# Venture OS — Documentation index

**Product working name:** Venture OS (Agentic OS) — portfolio operating layer for VC investment teams  
**Repo:** https://github.com/saurabh4269/venture_os  
**Domain:** ventureos.xyz  
**First customer / design partner:** V3 Ventures  
**Long-term:** Multi-tenant B2B SaaS sold to other VC firms  
**Pack date:** 2026-09-05 (Asia/Calcutta)  
**Author intent:** Production-grade **greenfield** build. Do **not** extend the demo architecture.

---

## How to use these docs (anti-hallucination — read before any code)

1. **Functional source of truth:** [`brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md`](brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md) (PDF in [`brief/raw/`](brief/raw/))
   - Workflows, fields, success metrics, commentary split, FY/units/restatements, dual currency, 15-min onboard.
   - If docs and the brief conflict on **V3 functional behavior**, the **Gargi brief wins**.

2. **Product contract:** [`01_PRODUCT_SPEC.md`](01_PRODUCT_SPEC.md)

3. **Build backlog:** [`02_GAP_MATRIX.md`](02_GAP_MATRIX.md) · deep dive [`02b_PRODUCTION_GAP_ANALYSIS.md`](02b_PRODUCTION_GAP_ANALYSIS.md)

4. **Technical decisions (mandatory):** [`03_ARCHITECTURE.md`](03_ARCHITECTURE.md) — **LOCKED stack**

5. **Phased delivery:** [`04_BUILD_PLAN.md`](04_BUILD_PLAN.md)

6. **Entities & invariants:** [`05_DATA_MODEL.md`](05_DATA_MODEL.md)

7. **Kickoff prompt:** [`06_AGENT_PROMPT.md`](06_AGENT_PROMPT.md)

8. **Decision log:** [`DECISION.md`](DECISION.md)

9. **Competitive notes:** [`COMPETITIVE_NOTES.md`](COMPETITIVE_NOTES.md)

10. **Agent rules:** root [`../AGENTS.md`](../AGENTS.md)

### Historical brief (not primary)

[`brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md`](brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md) — shorter sibling. **Gargi Sep 3 supersedes.**

### Demo / UX reference only (never production SoT, never copy UI)

| Asset | Role |
| --- | --- |
| Repo `https://github.com/saurabh4269/v3_agentic_os` | Domain / IA reference only |
| Live demo `https://v3.heisenbug.in/` | Narrative walkthrough only — **do not copy** look-and-feel |
| Firm site `https://www.v3.ventures` | Public names only |

**UI posture:** first-principles product design for Venture OS. Do **not** clone v3.heisenbug.in visuals, tokens, or chrome.

---

## LOCKED stack (summary)

| Concern | Choice |
| --- | --- |
| Auth | **Better Auth** |
| LLM | **OpenAI** (pluggable interface; OpenAI default) |
| Jobs | **BullMQ + Redis** |
| HTTP API | **Hono** |
| Objects | **S3-compatible** storage |
| UI | **First-principles** (not a clone of the demo) |
| Hosting | **Free-tier first**, then **Azure** |

Full detail: `03_ARCHITECTURE.md`.

---

## Absolute anti-hallucination rules

1. **Never invent** portfolio companies, metrics, NAVs, ownership %, runway, flags, document contents, or connector API fields.
2. **Never invent Affinity / OneDrive / Granola / ILPA / Microsoft Graph field names.** Stub + `TODO(source-of-truth)`.
3. **Missing ≠ 0.** `null` stays `null`. Aggregations skip nulls; UI shows "—" / "not reported".
4. **LLM never writes objective financial facts into SoR.** Propose → review → confirm only.
5. **Headline numbers** computed by **deterministic code** from stored facts.
6. **Every user-visible figure** needs provenance (`document_id` + locator) or must not display as fact.
7. **Ask must refuse** when evidence is insufficient.
8. **Citations must resolve** to real chunks/pages/cells.
9. **Corrections are sacred.** Survive re-parse.
10. **FX:** every dual-currency display needs `fx_rate` + `fx_date` + source.
11. **Units:** detect lakh/crore/USD explicitly; never infer from magnitude alone.
12. **FY is April–March** unless company profile overrides.
13. **Restatements:** new version; do not mutate history in place.
14. **Flags:** only from agreed catalog + deterministic rules + evidence.
15. **Demo vs prod:** never promote illustrative seed numbers as production defaults. Fixtures labeled `FIXTURE_ONLY`.
16. **Connectors:** no fake success. UI labels "not connected" until real OAuth + sync.
17. **LLM provider:** production default is **OpenAI** behind a pluggable interface (see D5).
18. **Greenfield mandatory.** No corpus-JSON as SoR. No heavy jobs in serverless HTTP.
19. **Migrations required** for any schema change.
20. **Instrument success metrics** before claiming 90% auto-ingest or near-zero headline error.

---

## Implementation map (this repo — extend, do not fork)

The numbered files above remain the contract. Status of the greenfield build lives in:

- [`02_GAP_MATRIX.md`](02_GAP_MATRIX.md) — **This repo** column
- [`04_BUILD_PLAN.md`](04_BUILD_PLAN.md) — acceptance checkboxes

Do **not** add a second kebab-case product/architecture/brief tree. Extra notes that are not SoT:

| File | Role |
| --- | --- |
| [`cost-hosting.md`](cost-hosting.md) | Free-tier then Azure bands (no secrets) |
| [`research/notes.md`](research/notes.md) | Parser / Better Auth / FTS research |
| [`improvements/`](improvements/) | Dated QA notes |

`packages/core` holds deterministic runway / MOIC / XIRR / units / FY / flags / Ask / extract. Headlines never come from the LLM.
