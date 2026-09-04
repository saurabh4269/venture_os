# Pass 02 — Company onboarding + vault upload

**Date:** 2026-09-04  
**Surface:** create company, upload MIS (CSV/XLSX/PDF), parse job, locators

## Issues

1. **P0 — Empty / wrong-type uploads stored as facts pipeline.** Empty buffers and `.txt` still wrote a document row. **Fix:** reject `empty_file`, `file_too_large` (25MB), `unsupported_type`.
2. **P1 — No parse status.** Wizard said “queued” forever. **Fix:** `GET /api/documents/:id` + poll on step 3.
3. **P1 — Upload errors swallowed.** Company page and wizard had no catch. **Fix:** message + busy.
4. **P1 — Vault hid company and job.** Table was filename + kind only. **Fix:** company name + parse status/error.
5. **P1 — Downloads dropped cookies.** `<a href={apiUrl(...)}>` is cross-origin without credentials. **Fix:** `downloadAuthed`.
6. **P2 — CSV split on every comma.** Quoted cells broke. **Fix:** `parseCsvLine`.
7. **P2 — Filenames unsanitised.** **Fix:** safeName.
8. **P2 — Kind hardcoded to MIS on company vault.** **Fix:** kind select.
9. **P2 — Step 3 copy implied auto-post.** **Fix:** “Nothing auto-posts.”
10. **P2 — Skip left user on a company with no inbox hint.** Residual: skip still goes to company.
11. **P2 — No file input label on wizard.** Residual (company upload labelled).
12. **P2 — Duplicate SHA not warned.** Residual.
13. **P2 — PDF is text-only.** Residual (gap #8).
14. **P3 — No drag-and-drop.** Residual.
15. **P3 — No per-file virus scan.** Residual.
16. **P2 — Locator not shown after upload until Inbox.** Acceptable; Inbox is the review surface.

## Tests
Upload validation is API 400s (exercised in Pass 02 QA). Extract still null-safe (`extract.test.ts`).
