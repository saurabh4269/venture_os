# Pass 01 — Auth & org

**Date:** 2026-09-04  
**Surface:** signup, login, org create, roles, logout, unauthorized routes  
**Evidence:** API curl against local Hono (`:4000`) + code review of Better Auth organization plugin 1.7.2 + UI read-through.

## Issues

### 1. P0 — Org Admin cannot invite anyone

**Wrong:** `creatorRole: "org_admin"` is stored on the member row, but Better Auth’s default access-control map only knows `owner` / `admin` / `member`. `POST /api/auth/organization/invite-member` returns `YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION` for the firm creator. Settings “Send invite” is a no-op.

**Should:** Locked roles (`org_admin`, `partner`, `analyst`, `viewer`) are first-class in the AC plugin. Org Admin (and Partner) can create invitations.

**Fix:** `apps/api/src/org-access.ts` + `organization({ ac, roles })`. Invite goes through `POST /api/invitations` which validates the locked role set.

### 2. P0 — Cross-org select is an uncaught 500

**Wrong:** `POST /api/orgs/select` forwarded any `organizationId` to `setActiveOrganization` with no membership check. Foreign / missing IDs threw inside Better Auth and surfaced as `{ error: "internal_error" }` (HTTP 500).

**Should:** 403 `not_a_member` if the caller has no row in `member` for that org. Active org must not change.

**Fix:** Membership lookup before `setActiveOrganization`. Covered by `auth-http.test.ts`.

### 3. P1 — Signed-in user with no org is stranded

**Wrong:** Signup creates the user first. If org create fails (empty slug from `@@@`, duplicate slug, missing Origin), `/api/me` returns `org: null` and every book route returns `select_or_create_an_org`. Settings says “create it from Settings” but Settings itself calls `requireOrg`.

**Should:** Dedicated onboard screen. `/api/me.needsOrg`. `/` and Shell route there instead of flashing Command.

**Fix:** `GET /api/me` includes `needsOrg`. Pages: `/onboard`, home router, Shell gate.

### 4. P1 — Invite flow has no accept path and no email

**Wrong:** Settings called `inviteMember` with a type-cast role and showed no success, no pending list, no link. `sendInvitationEmail` was unset. There is no `/invite` page.

**Should:** Invitation row is SoT. UI lists pending invites with a copy-link. Invitee opens `/invite?id=`, signs up/in with the invited email, accept/reject. Email mismatch is 403.

**Fix:** Invitation CRUD on the API + `/invite` + Settings people table. Honest copy: “Email delivery is not connected.”

### 5. P1 — Session `activeOrganizationId` often unset

**Wrong:** After `organization.create`, Better Auth does not always persist `session.active_organization_id`. `/api/me` papered over this by taking `memberships[0]`, so the user looked fine, but `list-members` / `list-invitations` returned `NO_ACTIVE_ORGANIZATION`.

**Should:** Create + accept + select always call `setActiveOrganization`. Fallback to first membership remains, but only for orgs the user actually belongs to.

**Fix:** `/api/orgs` POST and invite accept set active. Session middleware drops an active id the user is not a member of.

### 6. P1 — Unauthorized book routes flash the OS chrome

**Wrong:** `/` server-redirects to `/command`. Shell fetches `/api/me` after paint and then `replace("/login")`. A VC hitting a deep link sees the rail, empty cards, then a bounce.

**Should:** Home decides login / onboard / command from `/api/me`. Shell renders a quiet “Checking your organisation…” until the session is known. Unauthenticated API stays 401.

**Fix:** Client home + Shell ready-gate. API 401 already existed (`sign_in_required`).

### 7. P1 — Viewer / write rules were stringly-typed

**Wrong:** `requireWrite` only blocked the literal `"viewer"`. `canConfirm` listed roles by hand and treated `owner`/`admin` as special cases in Settings only. `member.replace("_", " ")` showed “org admin” with a leftover underscore.

**Should:** One locked set in `@venture-os/config` (`ROLES`, `isWriteRole`, `isAdminRole`, `isConfirmRole`, `roleLabel`). Aliases `owner`/`admin` → `org_admin`, `member` → `analyst`.

**Fix:** Shared helpers + tests. Context and Settings use them.

### 8. P1 — RLS isolation test skipped locally

**Wrong:** `packages/db/src/rls.test.ts` read `process.env.DATABASE_URL` without loading `.env`. Turbo `pnpm test` skipped the only tenancy proof. CI happened to inject the var.

**Should:** Same proof runs locally after `pnpm db:migrate`.

**Fix:** `loadEnv()` at the top of the file.

### 9. P1 — Logout is brittle

**Wrong:** Better Auth `sign-out` requires `Content-Type: application/json`. A bare POST (and some clients) get `UNSUPPORTED_MEDIA_TYPE` and the session stays live. Shell only called `authClient.signOut()`.

**Should:** First-party `POST /api/logout` that uses the session headers. UI prefers that, falls back to the client.

**Fix:** `/api/logout` + Shell.

### 10. P2 — Signup / login forms fail a11y and double-submit

**Wrong:** Labels wrap inputs but have no `htmlFor`/`id`. No `autocomplete`. No `aria-live` / `role="alert"`. Submit button stays enabled. No password confirm. Duplicate-email copy is the raw Better Auth string.

**Should:** Associated labels, username/current-password/new-password, polite live region, disabled busy state, confirm field, mapped errors (“already on the book”).

**Fix:** Login / signup / onboard rewritten.

### 11. P2 — Empty org slug from symbol-only names

**Wrong:** UI slugger turns `@@@` into `""`. Better Auth then 400s `Too small: expected string to have >=1 characters` after the user row exists.

**Should:** If the slug is empty, assign `org-<base36 time>` and still create the firm.

**Fix:** `slugifyOrg` + API `/api/orgs` fallback. Signup shows the computed slug.

### 12. P2 — No member roster on Settings

**Wrong:** A Partner cannot see who is on the book. Roles are invisible except a one-line rail label.

**Should:** People table (name, email, role) from `GET /api/members` (active org only).

**Fix:** Settings People section.

### 13. P2 — Logged-in users can re-open /login and /signup

**Wrong:** No session check on auth pages. Easy to create a second user in the same browser profile by mistake.

**Should:** If a session exists, send them to command, onboard, or the invite they came from.

**Fix:** `useEffect` on login/signup.

### 14. P2 — Settings invite used a fake Better Auth role

**Wrong:** `role: invite.role as "member"` so TypeScript compiled while runtime sent `org_admin` / `partner` / `analyst` / `viewer` — all unknown to default AC (see #1). No error surface.

**Should:** POST our invitations API with the locked enum. Show success + copy-link or an alert.

**Fix:** Settings form.

### 15. P2 — Funds empty state missing

**Wrong:** Settings Funds is a blank `<ul>` with an add box. New orgs have zero funds until the first company auto-creates “Main fund”.

**Should:** Say so, so a VC does not think the add failed.

**Fix:** Empty copy on Settings.

### 16. P3 — No forgot-password / email verification

**Wrong:** Password reset and verify-email are unset. Fine for the design-partner LAN; not SOC2.

**Should:** Stay honest (out of scope) rather than ship a dead “Forgot password?” that 404s.

**Fix:** Left out of the UI. Noted on the gap matrix (SOC2 row). Residual.

### 17. P3 — Health reports Redis as `unknown`

**Wrong:** `/health` never pings Redis. Not auth, but it hid a down queue during this pass.

**Should:** Report `up`/`down`. Deferred to a later ops pass unless it blocks parse.

### Residual

- Domain verification / auto-join still missing (gap #2).
- No SMTP. Invites are copy-link only.
- No SSO. Session hardening (rotation, idle timeout) later.
- Role *change* / remove-member UI not built (API can be added next pass).
- Rate-limit on signup/login not added.

## Tests added

- `packages/config/src/roles.test.ts` — aliases, write/confirm, slug.
- `apps/api/src/context.test.ts` — `canConfirm`.
- `apps/api/src/auth-http.test.ts` — 401, needsOrg, cross-org 403, invite + email mismatch, accept, member list, logout.
- RLS test now loads `.env` so it actually runs locally.
