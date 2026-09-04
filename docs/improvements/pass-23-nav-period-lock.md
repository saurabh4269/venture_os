# Pass 23 — NAV period lock / approval

**Date:** 2026-09-04  
**Surface:** quarterly NAV as-of, mark writes, Partner/Org Admin lock  
**Evidence:** Gargi brief §6 NAV; gap #19; `docs/05_DATA_MODEL.md` ValuationMark `approved_by`; NEXT.md item 1.

## Issues

### 1. P0 — Write role could silently change any unofficial as-of

**Wrong:** `POST /api/nav/marks` accepted a new mark for any date. A quarterly pack could be overwritten after circulation.

**Should:** Official as-of is locked. Writes return `409 period_locked` until unlock with a reason.

**Fix:** `nav_period_locks` + `assertMarkWritable`. HTTP test in `hardening.test.ts`.

### 2. P0 — No official vs unofficial distinction

**Wrong:** UI copy said “approval / period lock is later.” Partners could not tell if a quarter was circulating or draft.

**Should:** GET `/api/nav` returns `period.status` (`unofficial` | `locked`) with audit fields.

**Fix:** `loadNavPeriod` on NAV GET.

### 3. P1 — No lock API

**Wrong:** Nothing persisted a lock.

**Should:** `POST /api/nav/lock` `{ asOf }` by Partner or Org Admin.

**Fix:** Route + unique `(org_id, as_of)`.

### 4. P1 — Unlock without reason

**Wrong:** A silent unlock would hide that the quarter was reopened.

**Should:** `POST /api/nav/unlock` requires `reason` (3–500 chars). Audit: `unlock_reason`, `unlocked_by`, `unlocked_at`. Last lock actor/time retained.

**Fix:** `UnlockNavPeriodSchema`.

### 5. P1 — Analyst could have locked if we used `requireWrite`

**Wrong:** Analysts write marks; they must not declare a quarter official.

**Should:** `isLockRole` = Org Admin + Partner only. Viewer/analyst → `403 partner_or_admin_required`.

**Fix:** `requireLock` + roles tests.

### 6. P1 — UI still offered Add mark on a locked as-of

**Wrong:** Form would 409 after submit.

**Should:** Hide the form; show “unlock with a reason.”

**Fix:** NAV page.

### 7. P1 — API as-of defaulted to today

**Wrong:** GET without `asOf` used `new Date()`. UI used last quarter-end. Headlines disagreed.

**Should:** API defaults to `lastCalendarQuarterEnd()`.

**Fix:** `routes.get("/api/nav")`.

### 8. P1 — No RLS on the lock table

**Wrong:** A new tenant table without FORCE RLS is a tenancy hole.

**Should:** `nav_period_locks` on `RLS_TABLES` + policy in migration 0007.

**Fix:** RLS isolation test org A cannot read org B locks.

### 9. P1 — Unlock of a period that is not locked

**Wrong:** Would invent an unofficial row.

**Should:** `409 period_not_locked`.

**Fix:** Unlock handler.

### 10. P2 — Missing status treated as locked

**Wrong:** Easy to invent a lock and block the book.

**Should:** Missing row = unofficial. `isNavPeriodLocked(null) === false`.

**Fix:** Core tests.

### 11. P2 — Lock button not labelled for screen readers

**Wrong:** Icon-only or silent state.

**Should:** Visible status line + `role="status"`.

**Fix:** NAV page.

### 12. P2 — Relock after unlock dropped audit

**Wrong:** Overwriting `locked_by` without keeping history of the last unlock is acceptable if we keep unlock fields until next lock; we clear unlock fields on relock and keep the new lock actor.

**Should:** Relock sets new `locked_by`/`locked_at` and clears unlock fields.

**Fix:** Lock upsert.

### 13. P2 — Viewer saw lock controls

**Wrong:** Viewer must not lock.

**Should:** `canLock` from session.

**Fix:** Shell + NAV.

### 14. P2 — No unit test on the gate

**Wrong:** HTTP-only coverage.

**Should:** `assertMarkWritable` in `nav.test.ts`.

### 15. P2 — Gap matrix still said “approval later”

**Wrong:** Stale This-repo column.

**Should:** Partial → lock shipped; LP sign-off / multi-approver later.

**Fix:** `docs/02_GAP_MATRIX.md` #19.

### 16. P3 — Multi-approver / SOC2 viewer

**Wrong:** No audit-log viewer for lock events.

**Should:** Deferred. Fields exist on the lock row.

## Residual

- No second-person approval chain.
- Unlock does not snapshot the prior official pack to object storage.
- Fund-scoped lock (one as-of for the org, not per fund).
