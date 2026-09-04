# Pass 15 — Flag lifecycle UI

**Date:** 2026-09-04  
**Surface:** open / snoozed / muted tabs, unmute, evidence chips

## Issues

1. **P0 — Mute was one-way.** No unmute route; GET listed open only. Muted rows vanished. **Fix:** `POST /api/flags/:id/unmute` → `open`; GET `?status=`.
2. **P1 — Snoozed/muted invisible.** Partner could not prove persistence. **Fix:** tabs.
3. **P1 — Evidence JSON only.** **Fix:** human line + source chips (Pass 12).
4. **P2 — Recompute button shown to viewer.** Hidden (Pass 14).
5. **P2 — Expired snooze.** Job re-raises as a new open row; old snoozed remains until unmute/cleared. Documented.
6. **P2 — Unmute clears `snoozedUntil`.** Open again; next recompute may clear+reinsert if still true.
7. **P2 — Invalid status query 400.**
8. **P2 — `all` status available for API.** UI uses three tabs.
9. **P2 — Note + until shown when present.**
10. **P3 — No bulk unmute.** Residual (dangerous).
11. **P2 — `call_concern` still never auto-fires.** Granola not connected. Honest.
12. **P2 — mark_stale on names with no position.** Residual threshold.
13. **P3 — No firm threshold UI.** Residual.
14. **P2 — Mute/snooze still skipped by `runFlagJob`.** Unchanged.
15. **P2 — Viewer sees tabs, no write buttons.**
16. **P3 — No digest email.** Residual.

## Tests
Unmute is HTTP; detectors covered in `flags.test.ts`. Job skip logic unchanged.
