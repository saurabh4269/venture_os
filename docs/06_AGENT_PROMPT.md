# Cloud Agent kickoff prompt (paste-ready)

Copy everything below the line into a Cursor Cloud Agent launch with **`new_repo: true`**. Attach the handoff pack (this folder) as `/docs/handoff/` in the new repo (or upload the same files before coding).

---

## PROMPT START

You are building **Agentic OS** — a production multi-tenant portfolio operating system for VC firms. First design partner is **V3 Ventures**. This is a **greenfield** Origin/private repo (`new_repo: true`). Do **not** continue or fork `https://github.com/saurabh4269/v3_agentic_os` as the production codebase.

### Sources of truth (read in order; do not invent beyond them)

1. `/docs/handoff/00_README.md` — anti-hallucination rules (mandatory)
2. `/docs/handoff/V3_Requirement_Brief_v3_Gargi_2026-09-03.pdf` — functional SoT (wins on V3 behavior conflicts)
3. `/docs/handoff/01_PRODUCT_SPEC.md`
4. `/docs/handoff/02_GAP_MATRIX.md`
5. `/docs/handoff/03_ARCHITECTURE.md` — stack locked
6. `/docs/handoff/04_BUILD_PLAN.md` — Phase 0 now
7. `/docs/handoff/05_DATA_MODEL.md` — hard invariants
8. `/docs/handoff/DECISION.md`

### UX reference only (never production data plane)

- Repo: `https://github.com/saurabh4269/v3_agentic_os`
- Live demo: `https://v3.heisenbug.in`
- Film: `https://v3.heisenbug.in/demo/v3-agentic-os-demo.mp4`

Reuse IA labels and HITL/citation contracts only. **First-principles UI** — do not clone v3.heisenbug.in. **Do not** port corpus-JSON, ephemeral inbox state, or vendor-locked Luna.

### Stack (from architecture — do not “simplify” away)

- Monorepo: `pnpm` workspaces + Turborepo
- `apps/web` Next.js 15; `apps/api` Hono; `apps/worker` BullMQ
- Postgres + RLS with `org_id` on every tenant row
- S3-compatible for immutable documents
- Better Auth
- BullMQ + Redis
- Pluggable LLM provider; **default OpenAI**
- FTS first for Ask; no heavy parse/LLM/report work in serverless HTTP
- Reject corpus-JSON as SoR

### This run: Phase 0 deliverables only

1. Scaffold monorepo (`pnpm` + Turborepo) with `apps/web`, `apps/api`, `apps/worker`, and shared packages (`db`, `schema`, `llm`, `config`).
2. Auth provider wired: org create/invite + role stub.
3. Postgres schema migrations for org/membership/user stubs + RLS proof.
4. R2/S3 + job runner hello-world (enqueue from api, run in worker).
5. `packages/llm` provider interface with OpenAI default implementation stubbed.
6. Empty OS shell routes with IA labels; first-principles UI (Command / Inbox / Flags / NAV / Compare / Reports / Ask / Documents) — **no seed portfolio numbers**.
7. CI: lint, typecheck, test migrate.
8. Keep docs under `/docs` and root `AGENTS.md` pointing at anti-hallucination rules.

### Explicit non-goals this run

- No real PDF parse yet beyond stubs
- No OneDrive/Affinity/Granola OAuth yet (UI may show “not connected”)
- No demo corpus import
- No NAV math theater with fake figures

### Anti-hallucination rules (must obey)

1. Never invent portfolio companies, metrics, NAVs, ownership %, runway, flags, document contents, or connector API fields.
2. Missing ≠ 0. Null stays null. UI shows “—” / “not reported”.
3. LLM never writes objective financial facts into SoR; propose → review → confirm only.
4. Headline numbers computed by deterministic code only.
5. Every user-visible figure needs provenance or must not display as fact.
6. Ask must refuse without citation; citations must resolve to real locators.
7. Corrections are sacred and survive reparse.
8. FX displays need rate + date + source.
9. Units detected explicitly; never from magnitude alone.
10. FY April–March unless company profile overrides.
11. Restatements version; do not silently overwrite history.
12. Flags only from agreed catalog + evidence.
13. Connectors: never fake success.
14. Do not invent Affinity / Graph / Granola / ILPA field names — stub + `TODO(source-of-truth)`.
15. Greenfield mandatory — no corpus-JSON SoR; no heavy jobs in serverless HTTP.

### Definition of done for this Cloud Agent run

- Repo boots locally per README you write.
- Auth + empty shell demoable.
- RLS test proves cross-org isolation.
- No illustrative V3 NAV/seed numbers in UI.
- Handoff docs present under `/docs/handoff/`.
- Short PR/summary listing Phase 0 acceptance checkboxes from `04_BUILD_PLAN.md` with pass/fail.

## PROMPT END
