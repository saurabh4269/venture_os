# Pass 27 — Deep UX

**Date:** 2026-09-04  
**Surface:** Shell, empty/loading/error, keyboard/a11y, VC copy  
**Evidence:** NEXT.md item 5; first-principles UI (not v3.heisenbug.in).

## Issues

### 1. P1 — No skip-to-content

**Wrong:** Rail is the first tab stop every time.

**Should:** “Skip to book” link to `#main`.

**Fix:** Shell + CSS.

### 2. P1 — Active nav not exposed to AT

**Wrong:** Class `active` only.

**Should:** `aria-current="page"`.

### 3. P1 — Rituals vs Book section label

**Wrong:** “Book” mixed Inbox (HITL) with NAV/Ask.

**Should:** Morning / Rituals / Firm. Titles on links (Fund pulse, Confirm before it posts, Cite or refuse).

### 4. P1 — Focus rings missing

**Wrong:** Default outline removed by browser defaults on some controls.

**Should:** `:focus-visible` forest outline.

### 5. P1 — Settings load failure silent

**Wrong:** Empty tables looked like an empty firm.

**Should:** `loadErr` alert.

### 6. P1 — Reports load failure silent

**Wrong:** Same.

**Should:** Promise catch + “Loading drafts…”.

### 7. P1 — Ask errors silent

**Wrong:** Network fail = blank.

**Should:** Alert + labelled question.

### 8. P1 — NAV no loading line

**Wrong:** Flash of empty positions.

**Should:** “Loading marks…”.

### 9. P1 — Shared empty/error helpers missing

**Wrong:** Copy drifted (`empty` vs `lede`).

**Should:** `Status.tsx` (`LoadingLine`, `ErrorLine`, `EmptyBook`).

### 10. P2 — Viewer-facing lock language

**Wrong:** “Approval later” leftover.

**Should:** Official vs unofficial in VC vocabulary.

### 11. P2 — Flag policy copy

**Wrong:** “not connected” for an editor we now ship.

**Should:** Persist + recompute.

### 12. P2 — Monthly pack empty state

**Wrong:** Only mentioned one-pager.

**Should:** Mention monthly pack.

### 13. P2 — Keyboard: disabled buttons still look clickable

**Wrong:** Opacity already 0.55; keep `not-allowed`.

**Should:** Existing `.btn:disabled`. No change beyond lock disabled until reason ≥ 3 chars.

### 14. P2 — Rail org switcher already labelled

**Wrong:** OK. Keep `aria-label="Organisation"`.

### 15. P3 — Mobile rail stacks

**Wrong:** Already a media query. Dense desktop remains the target.

### 16. P3 — Tour / coach marks

**Wrong:** Not cloned from the demo site.

**Should:** Empty-state sentences only.

## Residual

- No command palette.
- No full WCAG audit.
