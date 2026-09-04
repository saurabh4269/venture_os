# Pass 16 — Ask harden, compare picker, inbox period, NAV FX

**Date:** 2026-09-04  
**Surface:** Ask FTS, Compare checkboxes, Inbox commentary period, NAV mark FX

## Issues

1. **P1 — Ask FTS 500 on bad tsquery.** Sanitise was not enough. **Fix:** try/catch around `to_tsquery`; fall back to booked facts; decideAsk still refuses empty overlap.
2. **P0 — Compare “uncheck one” isolated to that company.** Empty `selected` meant all; first click set `[id]`. **Fix:** first toggle starts from the full id list; API treats present `companyIds=` as an explicit list (empty → none).
3. **P1 — Compare company names not linked.** **Fix:** link to company detail.
4. **P1 — Inbox commentary confirm invented FY 2025-04-01 / 2026-03-31.** **Fix:** `400 period_required`; date inputs on pending rows.
5. **P1 — Period not editable on metric confirm.** **Fix:** date inputs for all pending rows (API already patched).
6. **P1 — NAV FX fields were documented, not in the form.** **Fix:** rate / date / source; sent only as a complete triple.
7. **P2 — Partial FX not stored.** Incomplete triple omitted so we never persist a half-rate.
8. **P2 — Ask still refuses invented numerals.** Kept.
9. **P2 — Compare CSV unchanged (display strings).** Kept.
10. **P2 — Empty compare after unchecking all.** Honest empty matrix.
11. **P3 — No saved compare views.** Residual.
12. **P2 — Mark without sourceRef still unfactual chip.** Honest; memo upload path later.
13. **P2 — Inbox viewer cannot edit period.** Pass 14.
14. **P3 — Ask chunk still one blob per doc.** Residual (ingest).
15. **P2 — Settings FY read-only copy for non-admin.** Pass 14.
16. **P3 — No mark-memo picker on the form.** Residual (Pass 17 candidate).

## Tests
Compare picker is UI+query-param contract. Commentary period is API 400. Ask catch is defensive (no 500).
