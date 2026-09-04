# Pass 33 — E2E happy-path friction

**Date:** 2026-09-05  
**Surface:** Playwright smoke, Shell session-once, `data-testid`, `passWithNoTests`  
**Evidence:** `docs/improvements/queue-2/queued-pass-e2e-happy-path-friction.md`.

## Issues

### 1. P0 — Zero browser E2E

**Wrong:** `apps/web` was Vitest `--passWithNoTests`. Happy path could break while CI was green.

**Should:** Playwright `@smoke`: signup → org → Command (`shell-ready`); company + upload + sync parse + Inbox confirm; `next=//evil` stays on-site.

### 2. P0 — Shell refetch on every nav

**Wrong:** `useEffect(..., [router, path])` bounced “Checking organisation”.

**Should:** Fetch `/api/me` + `/api/orgs` once per mount. Login `next` from a path ref.

### 3. P0 — Cross-origin cookies in E2E

**Wrong:** Absolute `NEXT_PUBLIC_API_URL` required two origins.

**Should:** Same-origin BFF (pass 31). Playwright hits `:3000` only.

### 4. P0 — Parse poll assumed a worker

**Wrong:** Wizard waited on queued jobs.

**Should:** After upload, `POST /api/parse/:id` (inline). Timeout copy if extract never finishes. `enqueueParse` / `enqueueFlags` use the same 1.5s Redis timeout as reports so upload does not hang when Redis is down.

### 5. P1 — No `data-testid`

**Wrong:** Brittle heading text.

**Should:** `shell-ready` / `shell-busy`, `command-ready`, wizard + inbox confirm ids.

### 6. P1 — Open redirect untested in browser

**Wrong:** Unit-only would miss a regression in `router.push`.

**Should:** Playwright after sign-in.

### 7. P1 — `passWithNoTests` hid empty web package

**Wrong:** `vitest run --passWithNoTests`.

**Should:** Web Vitest for `safeNextPath`. Fail if zero tests.

### 8. P1 — Org switch full reload

**Wrong:** Destroyed client state / Playwright.

**Should:** Re-fetch `/api/me` + `router.refresh()`.

### 9. P1 — Invite copy-link e2e + list 403 for non-admin

**Wrong:** Settings always GET `/api/invitations`. SMTP deferred.

**Should:** Catch 403; only Org Admin sees copy-links (pass 32). Playwright `e2e/helpers/invite.ts` creates a copy-link, asserts public GET is masked, accepts in a fresh context.

### 10. P2 — CI had no e2e job

**Wrong:** Unit/typecheck only.

**Should:** After migrate + web build, start api + `next start`, Playwright Chromium.

### 11. P2 — Home extra `/api/me` hop

**Wrong:** `/` client-redirects before Command.

**Should:** Smoke starts at `/signup` or `/login`. Residual: keep `/` hop.

### 12. P2 — Dual session reads

**Wrong:** Login + Shell both hit `/api/me`.

**Should:** Shell once; `useBookSession` skips a second fetch when context has `me`.

### 13. P2 — Worker/API boot order

**Wrong:** Compose did not wait on `/health`.

**Should:** E2E polls `/health` until `postgres=up`.

### 14. P3 — Trace on first retry

**Wrong:** Failures were opaque.

**Should:** Playwright `trace: on-first-retry`.

### 15. P3 — Manual QA checklist

**Wrong:** Only the 15-min script.

**Should:** Smoke spec is the automated 8-step path. Residual: no axe in this pass (pass 34 notes).

### 16. P2 — Viewer matrix not in browser

**Wrong:** HTTP-only 403.

**Should:** Residual. HTTP tests remain SoT; smoke is admin happy path.

## Residual

- Compose-attached Playwright (this job uses native api + `next start`).
- Viewer `storageState` / Fact download event.
- `SEED_DEMO` fixture-org e2e (forbidden in production; not used in CI).
