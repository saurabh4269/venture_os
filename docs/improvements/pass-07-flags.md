# Pass 07 — Flags

**Date:** 2026-09-04  
**Surface:** catalog, plan variance, mute/snooze, mis_late grace, prior(), 3-mo runway, evidence UI

## Issues

1. **P0 — Catalog thinner than the brief.** Brief: runway, missed targets, unusual movement, late/missing reporting, call concerns. **Fix:** add `revenue_down`, `headcount_drop`, `call_concern` (catalog; never auto from MIS).
2. **P0 — `plan_variance` fired on beating plan.** **Fix:** below-plan only.
3. **P0 — Recompute wiped every open flag; no mute/snooze.** **Fix:** `snoozed`/`muted` + `snoozed_until`; job skips those keys; 14-day snooze + mute buttons.
4. **P0 — `mis_late` on day-one companies.** No MIS → flag. **Fix:** grace while company age ≤ 45 days.
5. **P0 — `prior()` used the previous *version* of the same period.** Restatement looked like MoM. **Fix:** `latestByPeriod` (max version per period, then prior period).
6. **P1 — Runway used one burn month.** **Fix:** 3-mo average burn into `runway_short`.
7. **P1 — Evidence was raw JSON.** **Fix:** human key/value line.
8. **P1 — Flag keys underscored.** **Fix:** display replaceAll.
9. **P2 — `call_concern` never auto-fires.** Correct (transcripts not connected).
10. **P2 — Recompute still clears *open* and re-inserts.** Expected; snoozed survives.
11. **P2 — No unmute UI.** Residual (status stays muted until SQL).
12. **P2 — mark_stale on companies with no position.** Still fires “no_mark”. Residual threshold.
13. **P3 — No firm-specific thresholds UI.** Residual.
14. **P2 — cash_unreported still missing≠0.** Kept.
15. **P2 — Detector tests updated for below-plan + grace.**
16. **P3 — No digest email.** Residual.
