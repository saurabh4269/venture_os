# AGENTS.md — Venture OS

**Repo:** https://github.com/saurabh4269/venture_os  
**Domain:** ventureos.xyz  
**Design partner:** V3 Ventures  
**Pack date:** 2026-09-05 (Asia/Calcutta)

This file is mandatory reading for every coding agent before any code change.

---

## Mission

Build a production multi-tenant **portfolio operating system** for VC investment teams. Data arrives from source systems, messy company packs are standardized into a firm schema, and dashboard / NAV / flags / Ask / reports read only from the standardized book.

Greenfield only. Do **not** extend `saurabh4269/v3_agentic_os` as production SoR.

---

## Read order (do not invent beyond these)

1. `docs/00_README.md` — index + anti-hallucination
2. `docs/brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md` — functional SoT (wins on V3 behavior)
3. `docs/01_PRODUCT_SPEC.md`
4. `docs/02_GAP_MATRIX.md` + `docs/02b_PRODUCTION_GAP_ANALYSIS.md`
5. `docs/03_ARCHITECTURE.md` + `docs/DECISION.md` — **LOCKED stack**
6. `docs/04_BUILD_PLAN.md` — Phase 0 now
7. `docs/05_DATA_MODEL.md` — hard invariants
8. `docs/06_AGENT_PROMPT.md` — kickoff checklist

Historical brief only: `docs/brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md` (Gargi supersedes).
PDFs: `docs/brief/raw/`.

---

## LOCKED stack (do not reopen casually)

Auth: Better Auth.
LLM: OpenAI via packages/llm.
Jobs: BullMQ + Redis.
HTTP API: Hono.
Web: Next.js 15 App Router.
SoR: Postgres + RLS with org_id on every tenant row.
Objects: S3-compatible storage.
UI: first-principles — do not clone demo site.
Hosting: free-tier first, then Azure.
Tooling: workspace monorepo.

---

## Anti-hallucination (absolute)

1. Never invent portfolio companies, metrics, NAVs, ownership, runway, flags, document contents, or connector fields.
2. Missing is not zero. Null stays null. UI shows dash or not reported.
3. LLM never writes objective financial facts into SoR. Propose then review then confirm only.
4. Headline numbers computed by deterministic code only.
5. Every user-visible figure needs provenance (document_id + locator) or must not display as fact.
6. Ask must refuse when evidence is insufficient. Citations must resolve to real locators.
7. Corrections are sacred and survive reparse.
8. FX displays need rate + date + source. Units detected explicitly never from magnitude.
9. FY is April-March unless company profile overrides. Restatements version history.
10. Flags only from agreed catalog + deterministic rules + evidence.
11. Connectors: never fake success. Label not connected until real OAuth + sync.
12. Never invent Affinity / Graph / Granola / ILPA field names — stub + TODO(source-of-truth).
13. Migrations required for schema changes. Instrument success metrics before claiming targets.

---

## Current focus: Phase 0

Scaffold monorepo: web (Next.js), api (Hono), worker (BullMQ). Better Auth org stub. Postgres migrations + RLS proof. S3-compatible + BullMQ hello-world. packages/llm OpenAI stub. Empty OS shell with IA labels — no seed portfolio numbers. CI: lint, typecheck, migrate-on-test.

Details: docs/04_BUILD_PLAN.md

---

## Definition of done (any PR touching numbers)

- Fact written only via approved ingest/correct API
- Provenance present or field marked non-factual
- Null handling tested
- Re-parse + correction test where extract path changes
- No LLM in NAV/rollup path
- Ask path has refuse-without-citation coverage when Ask code changes

---

## Demo reference (never production data plane)

- Repo: https://github.com/saurabh4269/v3_agentic_os
- Live: https://v3.heisenbug.in (narrative only — do not copy UI)
- Functional SoT: docs/brief Gargi v3

