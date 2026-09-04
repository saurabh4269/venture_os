# Pass 09 — Reports

**Date:** 2026-09-04  
**Surface:** one-pager, portfolio, PDF/PPTX/XLSX

## Issues

1. **P0 — One-pager without companyId titled “Company”.** Invented a generic name. **Fix:** API 400 `company_id_required`; UI blocks submit.
2. **P0 — Export `<a href>` unauthenticated.** **Fix:** `downloadAuthed`.
3. **P1 — Empty reports table looked broken.** **Fix:** empty state.
4. **P1 — PDF is a real %PDF file.** Already; kept Times-Roman text stream (not a screenshot clone).
5. **P2 — One-pager select defaulted to “All companies”.** **Fix:** required picker.
6. **P2 — Portfolio still allowed without company.** Correct.
7. **P2 — Narrative cannot invent numbers.** Body is book metrics only.
8. **P2 — Worker-pre-rendered artifacts still stub.** Residual (gap plan).
9. **P2 — No preview before export.** Residual.
10. **P3 — PDF wraps 60 lines.** Residual.
11. **P3 — No letterhead.** Residual (do not copy demo chrome).
12. **P2 — Subjective/objective not blended in PPTX.** Kept.
13. **P2 — XLSX includes source_ref.** Kept.
14. **P2 — Missing values “—” in exports.** Kept.
15. **P3 — No scheduled pack.** Residual.
16. **P2 — Error when one-pager has no company.** UI alert.
