# Queued pass — Security & session (queue-2)

**Repo:** `saurabh4269/venture_os` @ `main` (`925c284` after merge of PR #2)  
**Primary surfaces:** `apps/api/src/auth.ts`, `apps/api/src/app.ts`, `apps/api/src/context.ts`, `apps/api/src/routes.ts` (me/orgs/logout/invitations), `apps/web/src/lib/auth-client.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/app/login/page.tsx`, `packages/config/src/index.ts`, `packages/db/src/auth-schema.ts`  
**Brief SoT:** Design-partner auth must not leak the book across orgs; cookies must survive the intended web↔API split; invite copy-link is honest (no SMTP) but must not widen the attack surface.  
**Why under-covered:** Passes 01/14/18 closed invite AC + membership select + viewer writes. Session hardening, cross-site cookies, preview origins, rate limits, and open-redirect hygiene were left residual.

---

## P0

1. **Cross-site session cookies will not stick on early-live split host** — Web (Vercel) and API (Fly/Render) are different sites. Auth sets `sameSite: "lax"` + `secure` only when `NODE_ENV === "production"` (`auth.ts` ~25–31). Credentialed `fetch` from `*.vercel.app` → API host is cross-site; browsers will not send `Lax` cookies on XHR/fetch. Result: login appears to work on `/api/auth/*` then `/api/me` returns `user: null`. **Fix direction:** same-origin BFF/proxy rewrite *or* `SameSite=None; Secure` with explicit preview/prod origin allowlists (see deploy-preview batch).

2. **`trustedOrigins` / CORS allowlists are static localhost + single `WEB_URL`** — `auth.ts` ~15 and `app.ts` ~16 hardcode `http://localhost:3000` / `4000` and one env URL. Every Vercel preview URL is a new origin → CORS + Better Auth origin check fail. Design-partner “share this preview” is broken without editing secrets per URL.

3. **Login `next` is an open redirect** — `login/page.tsx` ~13, ~22, ~40: `next.startsWith("/")` accepts protocol-relative `//evil.example/phish`. After sign-in the router navigates there. Restrict to single-slash app paths (reject `//`) or a fixed allowlist of routes.

4. **`BETTER_AUTH_SECRET` has a weak zod default** — `packages/config/src/index.ts` ~30: `.default("dev-only-change-me-to-a-long-random-string")`. A production process that forgets the secret still boots and signs cookies with a public string. **Fail closed** in `NODE_ENV=production` (no default; min 32).

5. **Unauthenticated `GET /api/invitations/:id` leaks invite target** — `routes.ts` ~242–257 returns email, role, status, orgName with no auth. Copy-link UX needs *some* public payload, but combine with server logs (`auth.ts` `invitation_created` logs email + id) and Settings `acceptUrl` visible to every org member (`GET /api/invitations` only `requireOrg`, not admin — ~225). Tighten: public GET returns orgName + status + masked email; full email only after session email match; list endpoint `requireAdmin`.

## P1

6. **No rate limit on signup / sign-in / invite accept** — Pass 01 residual. `emailAndPassword` enabled (`auth.ts` ~20–24) with no Better Auth rateLimit / edge throttle. Credential stuffing against a public design-partner URL is free.

7. **Unlimited org creation** — `allowUserToCreateOrganization: true` (`auth.ts` ~37) + first-party `POST /api/orgs`. Any signed-in user can mint orgs (and trigger `ensureOrgDefaults`). Cap per user or gate behind invite-only once the firm book exists.

8. **Session lifetime / idle / rotation unset** — `betterAuth({...})` has no `session.expiresIn`, `updateAge`, or cookie cache config. Default library lifetime may be fine for LAN demo; for a shared preview URL document and set idle timeout + absolute expiry; rotate on privilege change (role PATCH).

9. **`sessionMiddleware` type-lies a null user** — `context.ts` ~28: `user: null as unknown as AppUser`. Callers that forget `requireUser` can read `.id` and throw oddly. Prefer `AppSession | { user: null }` and narrow at helpers.

10. **Raw `/api/auth/*` still mounted beside locked invitation API** — `app.ts` ~23. First-party `POST /api/invitations` validates `ROLES`, but organization plugin HTTP paths may still accept legacy role names depending on AC. Audit and either disable invite via plugin HTTP or assert AC rejects non-locked roles in `auth-http.test.ts`.

11. **`emailVerified` never enforced** — Schema has `email_verified` (`auth-schema.ts` ~9); no verification plugin / gate. Fine while SMTP deferred — but then refuse to show a “verified” badge and document that any email string is trust-on-first-use (invite email match is the only proof).

12. **Cookie `secure` keyed off `NODE_ENV` not TLS** — Staging with `NODE_ENV=development` on HTTPS sends non-Secure cookies; reverse is also a footgun. Tie Secure to `BETTER_AUTH_URL` scheme or an explicit `COOKIE_SECURE=1`.

13. **Security headers absent** — Neither Hono app nor `next.config.ts` sets CSP, `frame-ancestors`, HSTS, `Referrer-Policy`, `X-Content-Type-Options`. Clickjacking the login form on a preview URL is trivial without `frame-ancestors 'none'`.

14. **`/health` is unauthenticated and chatty** — `routes.ts` ~74–84 returns postgres up/down (redis always `unknown`). Keep for orchestrators but avoid coupling to auth internals; do not expand with secret presence checks.

## P2

15. **Logout not idempotent for already-cleared cookies** — `POST /api/logout` calls `requireUser` then `signOut` (~162–165). Double-click / e2e teardown gets 401 instead of `{ ok: true }`. Soft-success when no session.

16. **Org switch uses full `window.location.reload()`** — `Shell.tsx` ~83. Session cookie must already be updated; a failed select still reloads into a confusing state. Prefer client re-fetch of `/api/me` + router.refresh; surface `not_a_member`.

17. **Invitation reject lacks email-match guard parity** — Accept checks email (~290–291); reject (~309–317) only `requireUser`. Wrong-account reject could mark invite rejected for the rightful invitee depending on Better Auth behaviour — assert in HTTP test.

18. **Password policy is length-only (8)** — No breached-password check, no blocklist of `password123` (tests use exactly that). For design partner keep 8+ but reject obvious fixtures on non-test env.

19. **CORS `allowHeaders` includes `Authorization` while the app is cookie-session** — Suggests bearer tokens are welcome; none are issued. Either implement token auth for workers or drop the header to avoid false security reviews.

20. **PII in structured logs** — `invitation_created` logs email (`auth.ts` ~42–47). Hash or redact in production `LOG_LEVEL`.

21. **Fixture/demo defaults ship in config schema** — `SEED_DEMO_PASSWORD` default (`config` ~48). Ensure production boot refuses `SEED_DEMO=1` (hard throw).

22. **No CSRF token beyond Origin check** — Relies on Better Auth trustedOrigins + SameSite. When SameSite becomes `None` for split deploy, Origin/Referrer enforcement must be mandatory and tested (forge POST without Origin → 403).

## P3

23. **No `__Host-` / `__Secure-` cookie name prefix** — Optional hardening once on dedicated API host with path `/`.

24. **Sign-out UI race** — Shell `signOut` pushes `/login` even if API fails after `authClient.signOut` fallback (~86–92); leftover org name can flash. Clear React state first.

25. **Member DELETE does not invalidate sessions** — Removing a member (`routes.ts` ~209) leaves Better Auth sessions able to hit `/api/me` until expiry (orgId fallback may move them). Revoke sessions for `userId` on remove/role demotion.

26. **Documentation gap** — README happy path does not warn that cross-subdomain cookies need the BFF or `SameSite=None` checklist before any Vercel↔Fly demo.

---

## Suggested tests (do not invent product behaviour)

- HTTP: Origin `https://preview-foo.vercel.app` against API with only `WEB_URL=https://app.example` → CORS/auth reject (expected until allowlisted).
- Login `next=//evil.test` → forced `/command`.
- Production `loadEnv` without `BETTER_AUTH_SECRET` → throw.
- Invite public GET shape (masked) + admin-only list.
- Logout twice → 200.
