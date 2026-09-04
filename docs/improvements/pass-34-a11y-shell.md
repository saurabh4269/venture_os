# Pass 34 — a11y Shell

**Date:** 2026-09-05  
**Surface:** landmarks, focus, nav, Fact names, mobile disclosure  
**Evidence:** `docs/improvements/queue-2/queued-pass-a11y-shell.md`. Skip-link and `:focus-visible` landed in pass 27; this pass finishes P0/P1 chrome.

## Issues

### 1. P0 — Main was a `div`

**Wrong:** `#main` on `div.main`.

**Should:** `<main id="main">`. Skip link already first focusable.

### 2. P0 — Session gate silent

**Wrong:** “Checking your organisation” had no status.

**Should:** `role="status"` `aria-busy` `data-testid=shell-busy`; ready `data-testid=shell-ready`.

### 3. P0 — Fact button name was the number

**Wrong:** SR heard “1.2” with no source verb.

**Should:** `aria-label` includes “open source”.

### 4. P0 — `aria-current` already set (pass 27)

**Wrong:** Queue-2 snapshot lacked it.

**Should:** Keep exactly one `aria-current="page"`.

### 5. P1 — Rail sections not headings

**Wrong:** `.sec` were `div`s.

**Should:** `h2.sec`.

### 6. P1 — Mobile rail not collapsible

**Wrong:** Ten links pushed the book below the fold at 960px.

**Should:** Menu disclosure `aria-expanded` / `aria-controls`.

### 7. P1 — Account region missing

**Wrong:** Sign out sat in muted text.

**Should:** `aria-label="Account"`.

### 8. P1 — Command errors not alerts

**Wrong:** `sev-high` paragraph only.

**Should:** `role="alert"`; loading `aria-live="polite"`.

### 9. P1 — Brand not a home link

**Wrong:** Inert wordmark.

**Should:** Link to `/command`.

### 10. P1 — Org switch announced nothing

**Wrong:** Full reload.

**Should:** Client refresh (pass 33) + `aria-live` of the org name.

### 11. P2 — `useBookSession` secondary fetch

**Wrong:** Role buttons flashed.

**Should:** No fetch when context already has `me`; expose `ready`.

### 12. P2 — Double live region on login

**Wrong:** `sr-only` + `role="alert"`.

**Should:** Visible alert only.

### 13. P2 — `prefers-reduced-motion`

**Wrong:** None.

**Should:** Cut animations when requested.

### 14. P2 — latin-ext subset

**Wrong:** `latin` only.

**Should:** `latin-ext` on both faces.

### 15. P2 — Invite lookup not live

**Wrong:** “Looking up the invite…” static.

**Should:** `aria-live="polite"`.

### 16. P3 — axe in CI / Devanagari / hit-target 24px

**Wrong:** Not this pass.

**Should:** Residual. Keyboard path is the acceptance: skip → Command → org → Sign out.

## Residual

- Forced-colors / table captions. Connect disabled buttons now `aria-describedby` the honest **not connected** copy.
- No axe job yet.
