# Decision log

**Pack date:** 2026-09-05 (Asia/Calcutta)

---

## D1 — Greenfield locked

**Decision:** Start production as a **new greenfield repo** (`new_repo: true` / new Origin private repo). Do **not** extend `saurabh4269/v3_agentic_os` as the production system of record.

**Why:** Demo is a corpus-JSON / no-auth / ephemeral-inbox prototype. Production needs Postgres+RLS, durable corrections, worker-based parse, pluggable Claude provider, and SaaS tenancy from day one. Continuing the monolith as SoR recreates the demo anti-patterns.

**Still reuse:** Domain IA labels and citation/HITL contracts (not demo chrome) — reimplemented against the new API/book.

**Status:** Locked.

---

## D2 — V3 is design partner for V1

**Decision:** V3 Ventures is the design-partner customer for V1. Schema, flag catalog, FY defaults, dual INR Cr + EUR, and onboarding UX are optimized for V3 workflows in the Gargi Sep 3 brief, while the data model stays multi-tenant so other VC firms can buy the same product later.

**Status:** Locked.

---

## D3 — Demo stays live for Wednesday meeting

**Decision:** Keep `https://v3.heisenbug.in` (and the demo film) **live and unchanged** for the Wednesday stakeholder meeting. Production greenfield work must not take down or “fix” the demo into a broken mid-migration state.

**Implication:** Demo remains UX walkthrough / narrative only. Production numbers and connectors ship in the new repo on a separate track.

**Status:** Locked.

---

## D4 — Phase 0 starts now

**Decision:** Execute `04_BUILD_PLAN.md` Phase 0 immediately via Cloud Agent using `06_AGENT_PROMPT.md`.

**Status:** Locked.

---

## D5 — LOCKED production stack

**Decision:** Stack is locked.

| Concern | Locked choice | Rejected |
| --- | --- | --- |
| Auth | Better Auth | Clerk/WorkOS |
| LLM | OpenAI | Hard-coupling |
| Jobs | BullMQ+Redis | Inngest |
| HTTP API | Hono | Heavy Next handlers |
| Objects | S3-compatible | Mutate-in-place |
| UI | First-principles | Clone demo UI |
| Hosting | Free-tier then Azure | Premature cost |

Status: Locked.

---

## D6 - Docs live under /docs

Decision: Briefs and architecture docs live under /docs. Root AGENTS.md points here.

Status: Locked.

---

## D7 — Official NAV is a locked as-of pack snapshot

**Decision:** When Partner or Org Admin locks an as-of, the API freezes a versioned JSON pack (`nav_period_pack` v1) to the object store and stores `snapshot_key` / `snapshot_sha256` / `snapshot_at` on `nav_period_locks`. Unlock keeps the last official pack. Relock writes a new hash (does not mutate the prior object). Multi-approver / second signature is **not** the V1 control — it would invent an undefined second actor.

**Why:** Circulating a quarter needs a frozen artifact of sourced marks (missing stays missing). A status bit alone can be unlocked and rewritten.

**Status:** Locked (pass 37).

---

## D8 — Auth sessions are 7-day cookie sessions with Redis IP rate-limit

**Decision:** Better Auth `expiresIn` = 7 days, `updateAge` = 24 hours. Signup / sign-in / invite accept+reject share a Redis sliding window (20 / 15 min / IP) with in-memory fallback if Redis is down. No SSO. No SMTP reset. Settings documents this honestly.

**Status:** Locked (pass 32 TTL + pass 36 Redis).
