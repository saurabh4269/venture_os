# Pass 10 — Compare

**Date:** 2026-09-04  
**Surface:** company / metric / period picker + export

## Issues

1. **P0 — No pickers.** Hardcoded metric list, all companies, latest only. **Fix:** query `metrics`, `companyIds`, `periodEnd` + UI checkboxes/select.
2. **P1 — No export.** **Fix:** client CSV of displayed cells (already “—” for missing).
3. **P1 — Runway not 3-mo average.** **Fix:** `runwayMonthsFromBurns`.
4. **P1 — Periods not listed.** **Fix:** API returns distinct periodEnd.
5. **P2 — Empty state OK.** Kept.
6. **P2 — No peer-average fill.** Kept.
7. **P2 — Dual display + FX note on money cells.** Kept.
8. **P2 — Checkbox “all selected” when filter empty.** Documented UX.
9. **P3 — No stage filter.** Residual.
10. **P3 — No sparkline.** Residual.
11. **P2 — Company names not linked.** Residual.
12. **P2 — CSV is display strings not raw.** Safer (no false precision).
13. **P2 — Unknown metric key yields —.** OK.
14. **P3 — No saved views.** Residual.
15. **P2 — Headcount / plan_revenue added to picker.**
16. **P2 — Missing ≠ 0 in compare cells.** Kept.
