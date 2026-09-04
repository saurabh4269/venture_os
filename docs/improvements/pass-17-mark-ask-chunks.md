# Pass 17 — Mark memo provenance + Ask chunk locators

**Date:** 2026-09-04  
**Surface:** NAV mark form, document_chunks, Ask company scope

## Issues

1. **P1 — Marks saved without a file stayed unfactual forever.** Form had no memo picker. **Fix:** optional vault file; API creates a file-level `source_ref` and sets `sourceRefId`.
2. **P1 — Chip stays — without a memo.** Honest; partners must attach a file for a factual mark.
3. **P1 — Ask chunks were one concatenated blob per document.** Cover-page FTS hits; no `sourceRefId`. **Fix:** one chunk per extract proposal with that proposal’s ref.
4. **P0 — Ask company filter ignored chunks.** FTS was org-wide even when `companyId` was set. **Fix:** `document_id in (select … company_id)`.
5. **P2 — Empty extract still indexes the filename.** So the vault file is findable; not a booked number.
6. **P2 — Memo list filtered by the selected position’s company.** No cross-name file attach.
7. **P2 — Foreign `documentId` 404** via RLS / org tx.
8. **P2 — Incomplete FX triple still omitted.** Kept (Pass 16).
9. **P2 — Per-proposal chunks keep locator excerpts in Ask citations.**
10. **P3 — No bbox inside the memo PDF.** Residual.
11. **P2 — Filename-only chunk has no sourceRef.** Citation may be document-level only. Acceptable.
12. **P3 — Re-parse adds more chunks.** Same as inbox proposals; FTS ranks.
13. **P2 — Mark without value still allowed (null).** Missing ≠ 0.
14. **P2 — Viewer cannot add a mark.** Pass 14.
15. **P3 — No NAV lock after memo.** Residual (gap #19).
16. **P2 — GET /api/nav returns documents for the picker.** No invented IDs.

## Tests
HTTP: one-pager `company_id_required`; company GET has scoped `sourceRefs` + empty KPI `—`. Viewer write 403.
