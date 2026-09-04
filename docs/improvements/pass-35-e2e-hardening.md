# Pass 35 — Playwright hardening

**Date:** 2026-09-05  
**Surface:** viewer storageState, axe (optional CI), Flags / NAV / Ask refuse / inbox reject  
**Evidence:** `docs/improvements/queue-2/queued-pass-e2e-happy-path-friction.md` residuals; NEXT.md item 9 after passes 33–34.

## Issues

### 1. P0 — Viewer matrix was HTTP-only

**Wrong:** `hardening.test.ts` 403s never opened `/companies/new` in a browser. A regression that flashed the create form would stay green.

**Should:** Persist a viewer `storageState` after invite accept; assert the onboard form is hidden (`viewer-read-only`).

**Fix:** `e2e/helpers/session.ts` + `e2e/viewer.spec.ts`.

### 2. P0 — Happy path stopped at Command

**Wrong:** Flags, NAV, Ask refuse, and inbox reject had no click coverage. Ritual pages could 500 while smoke stayed green.

**Should:** After upload, reject one inbox row, then open Flags / NAV / Ask and assert refuse-without-invention.

**Fix:** `e2e/rituals.spec.ts`.

### 3. P0 — Inbox reject had no testid

**Wrong:** Confirm was tagged; Reject was a bare ghost button. Tests would scrape “Reject” text.

**Should:** `data-testid=inbox-reject` and a rejected-tab empty/list assertion.

### 4. P1 — Ask refuse untested in the browser

**Wrong:** Unit goldens cover `refused: true`. The banner + “None — refusal” copy could disappear.

**Should:** Ask a question with no book overlap; assert `ask-refused`.

### 5. P1 — Flags page had no ready testid

**Wrong:** Empty-state prose is brittle.

**Should:** `data-testid=flags-ready` on the heading.

### 6. P1 — NAV page had no ready / lock testids

**Wrong:** Lock controls are role-gated; smoke never proved they render for Org Admin.

**Should:** `nav-ready`, `nav-lock` / `nav-unlock`.

### 7. P1 — axe not in CI

**Wrong:** Pass 34 residualled “no axe job.”

**Should:** `@axe-core/playwright` spec tagged `@axe`, skipped unless `PLAYWRIGHT_AXE=1`. CI runs it with `continue-on-error`.

### 8. P1 — Viewer could still see the create button markup

**Wrong:** Gate existed but had no testid for the forbidden state.

**Should:** `viewer-read-only` copy.

### 9. P1 — Invite helper did not expose viewer role + storageState

**Wrong:** Invite spec accepted an analyst then discarded the context.

**Should:** `acceptInviteAs` + `storageState` path under `e2e/.auth/` (gitignored).

### 10. P1 — Reports / Ask / Flags loading had no live region for e2e waits

**Wrong:** Tests would race first paint.

**Should:** Ready testids on Flags, NAV, Ask, Reports.

### 11. P2 — Compose-attached Playwright still absent

**Wrong:** CI uses native api + `next start`.

**Should:** Residual. Documented; not required for this job.

### 12. P2 — Fact download event untested

**Wrong:** Pass 33 residual.

**Should:** Residual. Rituals assert chips exist when a source exists; download event later.

### 13. P2 — SEED_DEMO e2e still forbidden in CI

**Wrong:** Fixture org would look like a live book.

**Should:** Keep out of CI. `pnpm demo:vc` is the operator path (pass 40).

### 14. P2 — Trace only on first retry

**Wrong:** Fine. Keep.

### 15. P2 — Inbox rejected tab not selected in smoke

**Wrong:** After reject the pending list could still show the row if the handler failed silently.

**Should:** Switch to rejected and assert the proposal.

### 16. P3 — Forced-colors / mobile viewport matrix

**Wrong:** Not this pass.

## Residual

- Compose-attached Playwright.
- Fact download event.
- `SEED_DEMO` in CI (still forbidden).
