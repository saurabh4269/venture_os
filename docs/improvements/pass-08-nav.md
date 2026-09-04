# Pass 08 — NAV

**Date:** 2026-09-04  
**Surface:** marks, rollup, bridge, FX

## Issues

1. **P0 — Two MOIC paths.** `/api/nav` returned `moic(rollup.nav.total, rollup.cost.total)` which can headline an incomplete book. **Fix:** `moic: rollup.moic` only.
2. **P0 — Bridge keyed by companyId.** Two positions in one name overwrote. **Fix:** match by `positionId`.
3. **P1 — Mark form had no FX triple.** Dual display would refuse but partners could not enter rate/date/source. **Fix:** FX fields on the form; API already stored them.
4. **P1 — Marks without sourceRef stay un-factual chips.** Kept (`isFact` requires sourceRef). Honest.
5. **P1 — Rollup unmarked list exists.** Kept.
6. **P2 — Approval / lock still later.** Residual (gap #19).
7. **P2 — No provenance file on mark chip.** Residual unless memo uploaded.
8. **P2 — Cost shown raw.** Residual.
9. **P2 — Bridge unexplained copy exists.** Kept.
10. **P2 — Default prior is −3 months.** Kept.
11. **P3 — No fund filter.** Residual.
12. **P3 — No XIRR on NAV page.** Residual (helper exists).
13. **P2 — Incomplete MOIC is —.** Verified by `nav.test.ts`.
14. **P2 — Missing prior ≠ 0 delta.** Kept.
15. **P2 — Position-level bridge test added.**
16. **P3 — No watermark on unofficial marks.** Residual.
