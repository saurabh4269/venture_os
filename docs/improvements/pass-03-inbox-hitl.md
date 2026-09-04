# Pass 03 — Inbox HITL

**Date:** 2026-09-04  
**Surface:** confirm / edit / reject; persistence; nothing auto-posts; re-parse

## Issues

1. **P1 — Confirm failed silently on unit_ambiguity.** API 400 `unit_must_be_set_by_human`, UI no catch. **Fix:** require unit in UI + error banner.
2. **P1 — Could not edit the proposed number.** Only unit for ambiguity. **Fix:** value input + optional correction note (ledger when value changes).
3. **P1 — No status tabs.** Confirmed/rejected invisible; “persistence” unprovable in UI. **Fix:** pending / confirmed / edited / rejected.
4. **P1 — Buttons stayed enabled while posting.** Double confirm risk. **Fix:** busy per row.
5. **P1 — Low confidence not marked.** **Fix:** row tint under 50%.
6. **P2 — Reject had no error path.** **Fix:** same banner.
7. **P2 — Locator omitted PDF page.** **Fix:** show `p.N` when present.
8. **P2 — Copy implied AI commits.** Already honest; reinforced.
9. **P2 — Viewer still sees Confirm.** Residual (API 403). Role-aware hide later.
10. **P2 — Re-parse duplicates pending rows.** By design (new extract version); merge is on confirm. Documented.
11. **P2 — Nothing auto-posts.** Verified: only confirm writes `metric_values`.
12. **P2 — Period not editable.** Residual (API already accepts patch).
13. **P3 — No bulk confirm.** Residual (dangerous for a book).
14. **P3 — No keyboard shortcuts.** Residual.
15. **P2 — Empty load error missing.** **Fix:** `err` on fetch fail.
16. **P2 — Correction note not required on edit.** Optional; ledger writes when note + value change.

## Tests
Confirm still requires unit for unknown; correction ledger golden in `packages/core`.
