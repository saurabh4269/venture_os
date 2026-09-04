# Pass 18 — Route guards (regression tests)

**Date:** 2026-09-04  
**Surface:** auth-http + book writes

## Issues

1. **P1 — No HTTP test that one-pager invents a name.** **Fix:** POST without `companyId` → 400 `company_id_required`.
2. **P1 — No HTTP test that company GET always has `sourceRefs` + KPI.** Empty company returns `[]` and cash `—`, not 0.
3. **P1 — No viewer write matrix.** **Fix:** invite viewer, POST `/api/funds` → 403 `viewer_cannot_write`.
4. **P2 — Last-admin already tested (Pass 14).** Kept.
5. **P2 — Foreign role PATCH 404.** Kept.
6. **P2 — Invite locked roles.** Kept (Pass 01).
7. **P3 — No flags-job integration test.** Residual (needs seeded metrics).
8. **P3 — No compare restatement HTTP test.** Residual; core unit covers `seriesFor`.
9. **P2 — Company create in the test uses a unique name.** No fixture portfolio.
10. **P2 — Viewer accept still sets org.** Read path works; write does not.
11. **P3 — Web component tests still missing.** Residual.
12. **P2 — Logout still last** so earlier tests keep `adminCookie`.
13. **P2 — Reports portfolio without company still allowed.** Not asserted here (correct behaviour).
14. **P2 — KPI cash display is — on a name with no inbox confirm.** missing ≠ 0.
15. **P3 — No Playwright E2E.** Residual.
16. **P2 — Tests skip without DATABASE_URL.** Same as the rest of the suite.

## Tests
`auth-http.test.ts` now 12+ cases (invite, last-admin, one-pager, viewer write, logout).
