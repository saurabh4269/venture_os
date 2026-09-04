# Pass 06 — Company detail

**Date:** 2026-09-04  
**Surface:** KPI strip, commentary periods, locators, vault

## Issues

1. **P0 — Commentary period hardcoded Aug-2025.** Every note landed on `2025-08-01`–`2025-08-31`. **Fix:** date inputs defaulting to latest booked period (or this month).
2. **P0 — `GET /api/companies/:id` leaked org-wide `sourceRefs`.** Any company’s chips could resolve another company’s file. **Fix:** refs filtered to this company’s document IDs.
3. **P1 — No KPI strip.** Partner had to scan the table. **Fix:** cash / burn / 3-mo runway cards with provenance.
4. **P1 — Locator not shown.** **Fix:** sheet/cell + excerpt column; chip opens source.
5. **P1 — Downloads unauthenticated.** **Fix:** `downloadAuthed`.
6. **P1 — 404 spun “Loading company…” forever.** **Fix:** error state.
7. **P1 — Upload kind forced MIS.** **Fix:** kind select + errors.
8. **P2 — Flags listed raw keys.** **Fix:** replace underscores.
9. **P2 — Empty book copy OK.** Kept.
10. **P2 — Dual EUR note already honest.** Kept.
11. **P2 — No position/ownership editor.** Residual (Affinity).
12. **P3 — No time-series chart.** Residual.
13. **P2 — KPI runway uses 3-mo burn.** Matches brief.
14. **P3 — No print view.** Residual.
15. **P2 — Subjective lane copy honest (Granola not connected).** Kept.
16. **P2 — sourceRefs for other companies no longer in payload.** Tested via code path.
