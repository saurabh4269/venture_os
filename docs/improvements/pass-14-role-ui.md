# Pass 14 — Role-aware UI + member admin

**Date:** 2026-09-04  
**Surface:** Shell session, write buttons, Settings people

## Issues

1. **P1 — Viewer saw Confirm / Mute / Add mark / Draft / Invite.** API 403 only. **Fix:** hide write controls when `!canWrite`; FY/invite/role when `!isAdmin`.
2. **P1 — No member role change.** Roster was read-only. **Fix:** `PATCH /api/members/:id` with locked roles.
3. **P1 — No member remove.** **Fix:** `DELETE /api/members/:id`.
4. **P0 — Last admin could be demoted.** Empty org with no admin. **Fix:** `400 last_admin` on demote/remove of the sole Org Admin.
5. **P1 — Cross-org role patch.** Other firm’s admin must not see the row. **Fix:** scoped to active `organizationId` → 404.
6. **P2 — Settings FY used `requireWrite` + extra admin check.** **Fix:** `requireAdmin`.
7. **P2 — `useBookSession` above `<Shell>` saw default context.** Pages are the parent. **Fix:** hook also reads `/api/me`.
8. **P2 — Aliases owner/admin/member.** Client `canonicalizeRole` matches config.
9. **P2 — Companies “Add” hidden for viewer.** Kept list + open.
10. **P2 — Reports export still available to viewer.** Read path; drafts hidden.
11. **P2 — Command empty-state CTA hidden for viewer.** Copy asks them to request an admin.
12. **P2 — Inbox value/unit/period editors hidden for viewer.** They can still read pending.
13. **P3 — No “you are view-only” banner.** Residual.
14. **P2 — Cannot remove last admin even via DELETE.** Same code.
15. **P2 — Invalid role 400.** Locked set only.
16. **P3 — No audit log of role changes.** Residual (SOC2).

## Tests
`auth-http.test.ts`: last_admin demote, analyst→partner, foreign org 404.
