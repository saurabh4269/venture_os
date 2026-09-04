# Pass 04 — Command home

**Date:** 2026-09-04  
**Surface:** Needs-a-look, empty vs populated, sourced numbers only

## Issues

1. **P1 — Flag count used `openFlags || "—"`.** Zero flags displayed as missing. A count is not a financial fact. **Fix:** show `0`.
2. **P1 — Needs-a-look was only a number.** **Fix:** named inbox + flag list with links.
3. **P1 — Cash/burn chips had no source click-through.** Dual display omitted `sourceRefId`. **Fix:** helpers return `sourceRefId`; Command maps to file URL.
4. **P1 — Runway used last burn only.** Brief: last-three-month average. **Fix:** `runwayMonthsFromBurns`.
5. **P1 — No loading state.** **Fix:** “Loading the book…”.
6. **P2 — Empty org already honest.** Kept; no demo names.
7. **P2 — NAV headline without provenance chip.** Residual (NAV page owns marks); incomplete NAV still “—”.
8. **P2 — Ownership shown as percent without source.** Residual (Affinity stub).
9. **P2 — Mark chip had no document href.** Residual unless `sourceRefId` on mark.
10. **P2 — sourceRefs unused.** Now used for hrefs.
11. **P2 — Cards show company count as a number.** OK — not a booked rupee.
12. **P3 — No filter by fund.** Residual.
13. **P3 — No last-updated column.** Residual.
14. **P2 — Missing cash still “—”.** Verified via `formatDualDisplay`.
15. **P2 — Populated table appeared only after confirm.** Correct HITL.
16. **P3 — Mobile cards wrap already.** OK.

## Tests
`runwayMonthsFromBurns` + `formatDualDisplay` sourceRefId.
