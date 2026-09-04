# Pass 13 — Restatement-safe read path

**Date:** 2026-09-04  
**Surface:** Command, company KPI, compare, reports, flags job

## Issues

1. **P0 — `latestByPeriod` lived only in the flags job.** Command/company/compare sliced raw rows; a restated August burn was averaged twice. **Fix:** `seriesFor` + `latestByMetricPeriod` on every read path.
2. **P0 — `latestByPeriod` on mixed keys drops a metric.** Cash+burn same period → one overwrite. **Fix:** `latestByMetricPeriod` keyed by metric+period (reports).
3. **P1 — Compare “latest” could pick v1 on a period tie.** Sort was period only. **Fix:** `seriesFor` then optional `periodEnd` find.
4. **P1 — Reports exported every version.** PDF/XLSX listed restated duplicates as current. **Fix:** export `latestByMetricPeriod` only. History stays in the company book table.
5. **P1 — Company KPI runway used `.find` + `.slice(0,3)` on raw burns.** **Fix:** `seriesFor(metrics, "burn").slice(0,3)`.
6. **P2 — Flags job inlined `byKey`.** Now `seriesFor`. Same semantics.
7. **P2 — periodEnd Date vs string map keys.** **Fix:** `periodKey()` normalises to `YYYY-MM-DD`.
8. **P2 — Book table still shows all versions.** Correct (partners need the restatement trail).
9. **P2 — Missing month still skipped in 3-mo average.** `runwayMonthsFromBurns` unchanged.
10. **P2 — Compare period filter uses current series only.** A requested period with only an old version still shows that version (it is current for that period).
11. **P3 — No UI toggle “show restated”.** Residual; company table has Ver.
12. **P2 — Command last MIS uses latest current metric period.** Not a restated older month.
13. **P2 — Tests: mixed-key keep; 3-mo slice after seriesFor.**
14. **P2 — Incomplete runway still —.** Kept.
15. **P3 — No chart of versions.** Residual.
16. **P2 — Ask fact hits still scan all versions.** Residual (citations name the period; invent-check still applies).

## Tests
`metrics.test.ts`: restatement ignore, mixed-key keep, seriesFor + 3-mo runway.
