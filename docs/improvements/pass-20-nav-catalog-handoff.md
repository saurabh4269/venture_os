# Pass 20 — NAV provenance headline, brief catalog, handoff

**Date:** 2026-09-04  
**Surface:** `rollupNav`, flag catalog, company book, NEXT.md

## Issues

1. **P0 — Unprovenanced marks still summed into headline NAV.** UI greys the chip; rollup did not. **Fix:** only marks with `sourceRefId` enter `nav.total`; list `unprovenanced`.
2. **P0 — MOIC on a mixed sourced/unsourced book.** **Fix:** headline MOIC only if every position is provenanced.
3. **P1 — Brief catalog still missing spend-without-revenue.** **Fix:** detector requires burn up *and* flat/down revenue; missing revenue ≠ 0 growth.
4. **P1 — Catalog missing concentration / ownership / key person.** **Fix:** keys in schema + catalog; never auto-fire (no Affinity/Granola facts).
5. **P1 — Flag evidence refs used cash/burn for every key.** **Fix:** map flag → metric series.
6. **P1 — `mark_stale` only looked at `pos[0]`.** **Fix:** latest mark across all positions.
7. **P1 — Company book showed every restated row.** **Fix:** “Current version only” toggle.
8. **P1 — Commentary hid period.** **Fix:** period + lane label on each note.
9. **P1 — FY copy ignored `fyStartMonth`.** **Fix:** show the booked month.
10. **P2 — Default commentary lane was subjective.** **Fix:** objective default.
11. **P2 — Flag UI snake_case.** **Fix:** `FLAG_CATALOG.label`.
12. **P2 — Flag company name not linked.** **Fix:** `/companies/:id`.
13. **P2 — Compare hid `periodEnd`.** **Fix:** under the cell with FX note.
14. **P2 — NAV page silent on excluded marks.** **Fix:** unprovenanced sentence + memo CTA.
15. **P2 — Queue docs still read as if P0s are open.** **Fix:** `docs/improvements/NEXT.md` handoff.
16. **P3 — IRR still — without dated cashflows.** Honest; do not invent a cost date.

## Tests
`nav.test.ts` unprovenanced exclude; `flags.test.ts` spend_without_revenue missing≠0.
