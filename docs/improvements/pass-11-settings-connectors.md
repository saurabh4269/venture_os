# Pass 11 — Settings / connectors

**Date:** 2026-09-04  
**Surface:** FY form, invites, mapping stubs, lastSyncAt

## Issues

1. **P0 — FY was read-only copy.** `POST /api/settings` existed; no form. **Fix:** FY start / base / display save.
2. **P0 — Invite role cast (Pass 01).** Already fixed; Settings uses locked roles + copy-link.
3. **P1 — Mapping / connector IDs would be invented.** **Fix:** explicit mapping stub paragraph; no fake folder IDs.
4. **P1 — lastSyncAt must never be faked.** Connectors have no lastSyncAt. UI still “not connected” only.
5. **P2 — People roster (Pass 01).** Kept.
6. **P2 — Funds empty state (Pass 01).** Kept.
7. **P2 — Domain auto-join still missing.** Residual.
8. **P2 — SMTP still missing.** Residual.
9. **P2 — No role change / remove member.** Residual.
10. **P3 — No audit log viewer.** Residual (SOC2).
11. **P2 — Connector table honest.** Kept.
12. **P2 — Org Admin required for FY write.** API uses `isAdminRole`.
13. **P3 — No theme tokens.** Residual.
14. **P2 — Invite feedback + copy-link.** Pass 01.
15. **P2 — Mapping does not invent Affinity fields.** AGENTS.md rule kept.
16. **P3 — No SSO.** Residual.

## Tests
Auth HTTP + role helpers. Connector rows stay `not_connected`.
