# Improvements queue-2 — under-covered platform areas

**Generated:** 2026-09-05 (IST)
**Source:** `saurabh4269/venture_os` @ `main` (`925c284` — merge of PR #2 / QA+fix batch 1) via `gh api` (no clone push)
**Scope:** Areas a **new** cloud agent is likely to under-cover after queue-1 product rituals (Flags/NAV/Compare/Reports/Company/Connectors): **session security**, **deploy/preview**, **Shell a11y**, **E2E happy-path friction**
**Rule:** Box files only under `/workspace/v3/improvements-queue-2/`; do **not** push to GitHub from this queue work

---

## Why this queue exists

Queue-1 (`docs/improvements/queue/` and `/workspace/v3/improvements-queue/`) + passes 01-22 closed most **book correctness** P0s on main. Residuals in `docs/improvements/NEXT.md` and pass 01/18 still include: session hardening, no Playwright, Redis health, SMTP deferred.

A follow-on agent that only reads NEXT.md product bullets will **not** spontaneously fix cookie/CORS preview login, skip links, or a smoke e2e. This queue makes those first-class.

---

## Batch priority order

| Order | Batch | Queue file | Why this order | Suggested agent focus |
| --- | --- | --- | --- | --- |
| **1** | **Deploy + preview origins** | `queued-pass-deploy-preview.md` | Without same-origin proxy or allowlisted preview origins, design-partner URL cannot keep a session | P0 #1-5: Vercel rewrite/BFF, origin patterns, bake-time public API URL, production start not watch, Fly warm machine |
| **2** | **Security and session** | `queued-pass-security-session.md` | Cookie SameSite, open redirect, weak secret default, invite enumeration — ship with batch 1 | P0 #1-5 with deploy; then rate limit + production secret fail-closed |
| **3** | **E2E happy-path friction** | `queued-pass-e2e-happy-path-friction.md` | Locks batches 1-2 with a smoke path; exposes Shell gate races | Playwright smoke; data-testid; remove passWithNoTests |
| **4** | **a11y Shell** | `queued-pass-a11y-shell.md` | Parallelize after Shell gate stabilizes | Skip link, focus-visible, aria-current, Fact labels, mobile nav disclosure |

---

## Cross-batch shared fixes (do once)

1. **Same-origin API access for web** — Vercel rewrite or Next BFF to relative api() base; simplifies cookies (security) + Playwright (e2e) + preview (deploy).
2. **Origin allowlist module** — one helper used by Hono CORS + Better Auth trustedOrigins (prod URL + optional preview policy).
3. **/health redis ping + build SHA** — deploy readiness + e2e globalSetup.
4. **Shell session provider** — fetch /api/me once; aria-busy gate; stable data-testid=shell-ready for e2e + a11y.

---

## Parallelism guidance

- Batch **1** and the secret/open-redirect subset of batch **2** can land in one PR.
- Batch **3** should wait until local localhost cookie path is green (compose).
- Batch **4** can start anytime on CSS/landmarks; avoid fighting Shell reloads until batch 2/3 decide org-switch behaviour.

---

## File index

| File | Area | Min issues |
| --- | --- | --- |
| `queued-pass-security-session.md` | Security / session / invites / cookies | 26 (P0-P3) |
| `queued-pass-deploy-preview.md` | Vercel / Fly / Render / Docker / CI preview | 26 |
| `queued-pass-a11y-shell.md` | Shell chrome, focus, landmarks, AT | 26 |
| `queued-pass-e2e-happy-path-friction.md` | Playwright absence, gate races, onboard flake | 26 |

Each issue cites concrete paths under `apps/web`, `apps/api`, `packages/config`, `packages/db`, deploy stubs, or CI.

---

## Explicitly deferred (do not invent in these batches)

- Real Microsoft Graph / Affinity / Granola OAuth (stub + **not connected** only).
- SMTP / domain auto-join / forgot-password product (keep honest absence; security batch only rate-limits and refuse fake links).
- SOC2 audit log viewer / SSO.
- LP / ILPA data room.
- NAV period lock / approval (product residual in NEXT.md — not this queue).
- Pushing this queue folder to GitHub (parent/user may copy into `docs/improvements/queue2/` later).

---

## Relation to queue-1

Do **not** reopen queue-1 P0s marked closed in `docs/improvements/NEXT.md` (pass 21-22). If a security fix touches Settings invite list visibility, coordinate with connectors/settings batch but keep scope = authz of acceptUrl, not connector field lists.
