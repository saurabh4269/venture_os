# Pass 30 — Security pass

**Date:** 2026-09-04  
**Surface:** cookies, CSRF origin, invites, rate-limit stub, RLS regression  
**Evidence:** NEXT.md item 8; gap #28; Better Auth already sets httpOnly / SameSite=Lax / Secure-in-prod.

## Issues

### 1. P0 — Cross-org NAV lock / flag policy isolation untested

**Wrong:** New tables without a regression would ship a tenancy hole.

**Should:** RLS test: org A cannot read org B locks or `flag_policy`.

**Fix:** `rls.test.ts`.

### 2. P0 — Expired invite still accepted

**Wrong:** Better Auth has `invitationExpiresIn` (7d) but our accept path did not re-check `expires_at`.

**Should:** `410 invitation_expired`. Pending row marked `expired`.

**Fix:** Accept + GET. HTTP test.

### 3. P1 — Auth had no rate-limit stub

**Wrong:** Signup/login unbounded on a public preview.

**Should:** In-memory 20 / 15 min / IP on sign-in and sign-up. Not Redis. Not multi-instance.

**Fix:** `rate-limit.ts` + 429 `rate_limited`.

### 4. P1 — Mutating `/api/*` accepted any Origin

**Wrong:** Cookie is SameSite=Lax (good) but an explicit allow-list is defense in depth.

**Should:** If `Origin` is present and not trusted (`WEB_URL`, `API_URL`, localhost) → `403 untrusted_origin`.

**Fix:** `app.ts`. Test with `https://evil.example`.

### 5. P1 — Missing Origin still allowed

**Wrong:** Same-site navigations and some clients omit Origin. Blocking those breaks the book.

**Should:** Only reject a *present* untrusted Origin. Do not invent CSRF tokens.

### 6. P1 — Cookie flags undocumented

**Wrong:** Session hardening looked “missing” on the gap matrix.

**Should:** Confirm httpOnly + SameSite=Lax + Secure when `NODE_ENV=production`. No `__Host-` rename (would break Better Auth).

### 7. P1 — Viewer lock / policy writes

**Wrong:** Covered in 23/24 tests; keep 403.

### 8. P1 — Cross-org member PATCH already 404

**Wrong:** Pass 14. Do not regress.

### 9. P2 — Rate-limit is per-process

**Wrong:** Two Fly machines = two counters.

**Should:** Document as stub. Redis limiter later.

### 10. P2 — Invite GET leaked pending after expiry

**Wrong:** Status stayed `pending` until accept.

**Should:** GET reports `expired` and updates the row.

### 11. P2 — Friendly UI for expiry / rate-limit / period_locked

**Wrong:** Raw codes.

**Should:** `friendlyAuthError`.

### 12. P2 — Health still does not prove RLS

**Wrong:** `/health` is liveness. Isolation stays in Vitest.

### 13. P2 — No audit-log viewer

**Wrong:** Lock fields exist; SOC2 viewer later.

### 14. P2 — SMTP still absent

**Wrong:** Copy-link only. Do not add a fake mailer.

### 15. P3 — SSO / idle timeout / rotation

**Wrong:** Deferred.

### 16. P3 — Turnstile / captcha

**Wrong:** Rate-limit stub is enough for design-partner LAN.

## Residual

- Redis rate-limit.
- SOC2 audit viewer (gap #28 still partial).
- Domain verification.
