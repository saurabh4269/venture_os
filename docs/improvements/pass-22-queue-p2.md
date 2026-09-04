# Pass 22 — queue P2 residuals (safe, no invented connectors)

**Branch:** `cursor/qa-fix-pass-batch-1-851c`  
**After:** pass 21 P1 sweep

## Items

1. NAV as-of defaults to last calendar quarter-end, not “today.”
2. Empty mark value requires an explicit clear confirmation — no silent null wipe.
3. Rationale shown on the NAV table.
4. Company vault: period, kind filter; book table shows confirmedBy/At.
5. Reports accept optional `periodEnd`; filenames keep a stable suffix so non-ASCII titles do not collapse to `report`.
6. Compare URL state (`metrics`, `companyIds`, `period`, `stage`, `sector`) + sticky first column.
7. Flags row links to Compare pre-filtered to that company.
8. GET `/api/settings` returns connector kind+status only — never `config` or `lastSyncAt`.
9. Unique `(org_id, kind)` on connectors (migration 0006).
10. Onboard wizard can attach an existing fund (still creates a booked position; no Affinity ID).
11. `detectMarkStale` unit coverage for missing vs stale marks.
12. `lastCalendarQuarterEnd` helper in fiscal.
13. Settings HTTP assertion: connectors have no `lastSyncAt`.
14. Company Ask link already carried `companyId`; Compare deep-link from Flags closes the ritual gap.
15. Residual: period lock, persisted flag policy, monthly pack, OAuth — still later.
