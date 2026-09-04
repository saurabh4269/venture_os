# Queued pass — Connectors / settings stubs

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/settings/page.tsx`, `apps/api/src/routes.ts` (`/api/settings`, `/api/funds`), `packages/db/src/domain-schema.ts` (`connectors`, `orgSettings`), onboard `companies/new/page.tsx`, AGENTS.md connector rules  
**Brief SoT:** OneDrive primary ingest, Affinity ownership/CRM, Granola transcripts; 15-min onboard with folder map; settings must say **not connected** (never fake sync)  
**Out of scope for parallel fix agent:** real OAuth, Graph delta, Affinity sync — but stub UX, settings forms, invite roles, policy hooks are fair game

---

## P0

1. **Settings UI cannot edit FY / currencies though API supports it** — `POST /api/settings` upserts `fyStartMonth`, `baseCurrency`, `displayCurrency`; page only prints values (`settings/page.tsx`). Org admins stuck at seed defaults.

2. **Invite role cast to Better Auth `"member"`** — `authClient.organization.inviteMember({ role: invite.role as "member" })` while select offers `org_admin|partner|analyst|viewer`. Likely wrong role persisted vs product RBAC (`packages/schema` `RoleSchema`). Verify/fix mapping — P0 authz bug if everyone lands as member.

3. **No per-company OneDrive folder / Affinity ID / Granola mapping UI** — Brief 15-min onboard: map folder + Affinity ID + template. Wizard step 2 text says “OneDrive stub” but collects nothing; `connectors.config` jsonb unused. Blocker for Phase 5 even as *stub fields* labeled not connected.

4. **Connectors table is display-only with no “Connect” CTA / interface contract** — Status correctly `not_connected` (good), but no documented OAuth start routes, no disabled button with tooltip, no link to upload fallback. Agents may invent Graph fields — need explicit stub component + types without vendor field fantasy.

## P1

5. **Invite form: no success/error feedback; no `load()`** — Silent failure; user double-submits.

6. **Domain verification / auto-join still missing** — Gap matrix #2 `partial`; Settings has zero domain UI.

7. **Funds UI only captures `name`** — Schema has `vintage`, `currency`, `committedCapital`; POST body in routes may accept more — confirm and expose. Multi-vehicle V3 needs currency per fund for NAV.

8. **No flag-policy / threshold editor** — Product: firm-configurable flag spectrum. Thresholds live only as code defaults in `FLAG_CATALOG`.

9. **No metric-schema customization entry point** — SaaS-ready org model lists metric schema under org; Settings silent.

10. **Viewer role can open Settings page** — Rail always shows Settings; should hide Connect/Invite/Fund mutations for Viewer (API may 403 on write — confirm `requireWrite` / org_admin checks; UI should match).

11. **`POST /api/settings` role check includes `"owner"` / `"admin"` strings** — May not match Better Auth org roles (`org_admin`); risk of permanent 403 for real admins or accidental allow. File: `routes.ts` ~842.

12. **Connectors seeded on GET (side-effectful read)** — `GET /api/settings` inserts three rows if empty. Prefer migration/seed; GET should be pure.

13. **Upload remains default path in product UX** — Correct fallback, but Settings should state “Primary path: OneDrive (not connected) → use company vault upload” with deep link.

14. **No secrets/vault story for future OAuth tokens** — `connectors.config` plain jsonb; AGENTS require encrypted-at-rest tokens. Document + reserve encrypted column before OAuth lands (avoid storing tokens in plaintext config).

## P2

15. **No last-sync field (correct)** — Keep forever until OAuth; add UI test that forbids fabricating `lastSyncAt` (regression guard per AGENTS).

16. **Granola absence blocks subjective auto-draft** — Settings should explain subjective commentary = human-only until Granola connected (company page mentions it; Settings does not).

17. **Affinity absence blocks ownership truth** — NAV/ownership cards will stay manual marks; Settings should say ownership edits are manual until Affinity connects.

18. **Invite email placeholder `@firm` without domain claim** — Tie to org verified domains when built.

19. **No audit log of settings / connector / invite actions** — SOC2 gap matrix #28; at least append-only event table stub.

20. **LP / ILPA room copy is fine (Phase 2)** — Ensure no nav item pretends it exists (Shell has no LP item — good); keep copy only under Settings.

21. **Multi-tenant connector rows lack unique(orgId, kind)** — Check schema; duplicate seed possible under races on GET insert.

22. **Onboard wizard does not create/link `positions` or fund** — Company without position never appears usefully on NAV; Settings funds list disconnected from company create (`fundId` optional on `CreateCompanySchema` but wizard omits).

## P3

23. **Connector kind labels raw (`onedrive`)** — Display “Microsoft OneDrive”, etc.

24. **No “request access / notify eng when OAuth ready”** — Internal design-partner ops nicety.

25. **Settings page title “Organisation” vs rail “Settings”** — Naming consistency.

26. **Empty funds list has no explanation** — NAV depends on funds+positions; empty-state should CTA “Add fund then attach positions on company.”
