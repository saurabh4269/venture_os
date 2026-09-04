# Pass 32 — Security + session

**Date:** 2026-09-05  
**Surface:** cookies, open redirect, production secret, invites, headers, logout  
**Evidence:** `docs/improvements/queue-2/queued-pass-security-session.md`.

## Issues

### 1. P0 — Cross-site Lax cookies

**Wrong:** Split Vercel↔Fly host dropped session on `/api/me`.

**Should:** Same-origin BFF (pass 31). Keep `SameSite=Lax`. Split-host without BFF needs `SameSite=None; Secure` — documented, not the default.

### 2. P0 — Static trusted origins

**Wrong:** localhost + one `WEB_URL`.

**Should:** Shared origin module (pass 31) for CORS, Better Auth, mutating Origin check.

### 3. P0 — Open redirect on `next`

**Wrong:** `next.startsWith("/")` accepted `//evil.example`.

**Should:** `safeNextPath` — reject `//`, `://`, `\`. Default `/command`.

**Fix:** `@venture-os/config/paths`; login page; Playwright.

### 4. P0 — Weak `BETTER_AUTH_SECRET` in production

**Wrong:** Zod default `dev-only-change-me-to-a-long-random-string`.

**Should:** Fail closed: no public default, min 32, reject the documented dummy.

### 5. P0 — Invite GET leaked email; list was org-wide

**Wrong:** Unauthenticated GET returned full email. List was `requireOrg` so every member saw `acceptUrl`.

**Should:** Public GET: `emailMasked`, full `email` + `canAccept` only on session email match. List: `requireAdmin`. Do not put a mask into `?email=`.

### 6. P1 — Auth rate limit incomplete

**Wrong:** Sign-in/up only.

**Should:** Same in-memory window on invite accept/reject.

### 7. P1 — Unlimited org create

**Wrong:** Any signed-in user could mint orgs.

**Should:** Cap (5) where the user is already `org_admin`.

### 8. P1 — Session TTL unset

**Wrong:** Library default undocumented.

**Should:** `expiresIn` 7d, `updateAge` 24h.

### 9. P1 — `AppSession` type-lied `user: null`

**Wrong:** `null as unknown as AppUser`.

**Should:** `user: AppUser | null`; `requireUser` narrows.

### 10. P1 — Cookie `secure` vs TLS

**Wrong:** Only `NODE_ENV === "production"`.

**Should:** `cookieSecure()` from `COOKIE_SECURE` / `https` Better Auth URL / production.

### 11. P1 — No security headers

**Wrong:** Clickjackable login on a preview URL.

**Should:** `frame-ancestors 'none'`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS when Secure. Hono + `next.config.ts`.

### 12. P1 — Logout not idempotent

**Wrong:** `requireUser` → 401 on double-click / e2e teardown.

**Should:** 200 `{ ok: true }` with or without a session.

### 13. P2 — Invite reject lacked email-match

**Wrong:** Any signed-in user could reject.

**Should:** Same email gate as accept.

### 14. P2 — PII in invitation logs

**Wrong:** Full email in `invitation_created`.

**Should:** Mask in production.

### 15. P2 — SEED_DEMO in production

**Wrong:** Dashboard toggle could load FIXTURE_ONLY.

**Should:** `loadEnv` throws (shared with pass 31).

### 16. P3 — `__Host-` cookie rename / session revoke on member DELETE

**Wrong:** Would break Better Auth cookie names; leftover sessions until expiry.

**Should:** Residual. No rename. No invented session-revoke API.

## Residual

- Redis-backed rate limit / SSO / idle rotation viewer.
- SMTP still absent — copy-link only; no verified-email badge.
- CSRF token not added; Origin check + Lax + BFF.
