# Pass 19 — Onboard a11y + duplicate SHA

**Date:** 2026-09-04  
**Surface:** company wizard, vault upload

## Issues

1. **P2 — Wizard file input had no label.** Screen readers got a bare control. **Fix:** labelled field.
2. **P2 — Viewer could open `/companies/new`.** API 403; form still showed. **Fix:** view-only copy.
3. **P2 — Duplicate SHA not warned.** Re-upload of the same bytes looked like a new source. **Fix:** compare `sha256` in-org; return `duplicateOf`; UI warns. File is still stored and parsed (HITL may want a second look).
4. **P2 — We do not skip parse on duplicate.** Partner may still want a new extract version. Honest warning only.
5. **P2 — SHA lookup is RLS-scoped.** Other firms’ files never match.
6. **P2 — Filename still sanitised.** Kept.
7. **P2 — Empty / type / 25MB guards.** Kept (Pass 02).
8. **P2 — Nothing auto-posts after duplicate.** Inbox still required.
9. **P3 — No virus scan.** Residual.
10. **P3 — No drag-and-drop.** Residual.
11. **P2 — Skip still lands on the company.** Kept; inbox hint on step 3.
12. **P2 — Company vault upload shows the same warning.**
13. **P2 — OneDrive still not connected.** Copy unchanged; no lastSyncAt.
14. **P2 — Duplicate is not a 409.** A hard reject would hide the second extract. Warning is enough.
15. **P3 — No content-addressed dedupe of S3 keys.** Residual.
16. **P2 — Viewer cannot upload from company detail.** Pass 14.

## Tests
Typecheck. Duplicate path is a response field; SHA compare is org-scoped via RLS.
