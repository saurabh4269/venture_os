# Pass 12 — Provenance chips (authenticated)

**Date:** 2026-09-04  
**Surface:** Fact chip, Command, company KPI/book, Compare, NAV marks, Flags evidence

## Issues

1. **P0 — Command/company chips used `<a href={apiUrl(...)}>`.** Cross-origin navigation to `:4000` dropped the session cookie. Partners got 401 on “click figure → source”. **Fix:** `Fact` takes `sourcePath` and calls `downloadAuthed`.
2. **P0 — Compare cells had `sourceRefId` but no href.** **Fix:** compare returns `sourceRefs`; chips use `sourcePathFor`.
3. **P1 — Command mark column ignored `lastMarkSource`.** **Fix:** chip + `sourcePathFor`.
4. **P1 — NAV mark chips had no document path.** **Fix:** `/api/nav` returns `sourceRefs`.
5. **P1 — Flag evidence stored `sourceRefIds` unused.** **Fix:** source chips on the flags table.
6. **P2 — `button.chip` inherited browser button chrome.** **Fix:** font/color reset in `globals.css`.
7. **P2 — Vault/Ask/Reports already used `downloadAuthed`.** Kept.
8. **P2 — Unfactual chips stay `—`.** `isFact` still requires `sourceRefId`. Honest.
9. **P2 — Company book table locator column kept.** Chip opens the file; locator is the cell.
10. **P3 — No bbox highlight inside the file.** Residual (gap #16).
11. **P2 — `sourcePathFor` is the shared helper.** One lookup, no invented URLs.
12. **P2 — Missing ref id → no chip click.** Never a dead 404 link.
13. **P2 — Dual display note still sits under the chip.** Kept.
14. **P3 — No in-app PDF viewer.** Residual.
15. **P2 — Same helper on Flags unmute tab.** Source still resolvable when muted.
16. **P2 — Company vault list already cookie-auth.** Kept.

## Tests
`formatDualDisplay` still requires `sourceRefId`. Chip path is UI; downloads covered by existing document route auth.
