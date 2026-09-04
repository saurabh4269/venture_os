# Queued pass — E2E happy-path friction (queue-2)

**Repo:** `saurabh4269/venture_os` @ `main` (`925c284`)
**Primary surfaces:** Auth to onboard to Command to company wizard to upload/parse to Inbox confirm; harness gaps in package.json, CI, apps/web tests; Shell.tsx gate; companies/new/page.tsx; auth-http.test.ts (API-only)
**Brief SoT:** Minutes not days and under-15-min onboard are ritual promises — without a browser path they regress silently. Pass 18 residualled No Playwright E2E.
**Why under-covered:** Agents ship HTTP vitest greens; the click-path a partner takes is unowned.

---

## P0

1. **Zero browser E2E runner** — No Playwright/Cypress in tree at 925c284. `apps/web` script is vitest with passWithNoTests. Happy path can break while CI is green. Add Playwright with webServer for web+api or document compose dependency.

2. **Shell auth gate races every navigation** — Shell useEffect depends on router+path (~50-78) and re-fetches /api/me and /api/orgs on each client route change. Fast Nav clicks get Checking organisation or login bounce. Stabilize: fetch once per session; wait for Primary nav in tests.

3. **Cross-origin cookie setup is mandatory for real E2E** — `api.ts` uses absolute NEXT_PUBLIC_API_URL with credentials include. Playwright must cover both origins and CORS until deploy-preview proxy lands. Document localhost:3000 to :4000 in one script.

4. **Company create step has no busy/error guard** — `companies/new/page.tsx` create() (~31-48) awaits API without try/catch or setBusy. Double-submit creates duplicates; failed create throws uncaught. Blocks reliable onboard timing.

5. **Parse polling assumes a live worker** — Wizard pollParse loops 20 times at 800ms (~79-88). Without worker/redis, status stays queued. E2E must run worker or use sync parse fallback; surface timeout for humans/tests.

## P1

6. **Invite happy path cannot use email** — SMTP deferred; Settings copy-link is SoT. E2E must POST /api/invitations as admin, read acceptUrl, open in a fresh context. Add e2e/helpers/invite helper.

7. **No data-testid strategy** — UI uses serif headings and lede prose. Brittle getByText on Checking your organisation will churn. Add stable testids on Shell ready, Command cards, Inbox confirm, wizard steps.

8. **Home slash extra client hop** — `page.tsx` client-redirects via /api/me before /command. Deep-link tests should start at /login or /command, or assert the hop once.

9. **Signup then org create is two requests** — Org create failure still navigates to /onboard (`signup/page.tsx` ~56-68). E2E must handle both Command and onboard landings; slug collision flakes today.

10. **SEED_DEMO path undocumented for E2E** — Seed credentials in .env.example but no Playwright fixture-org doc. Using seed without asserting FIXTURE banner risks false confidence. Expect status to contain FIXTURE_ONLY.

11. **Viewer matrix not in browser** — auth-http covers viewer 403 on POST funds; UI may flash write buttons until useBookSession resolves. E2E storageState for viewer on /companies/new.

12. **Org switch reloads window** — Destroys Playwright in-page state mid-test. Isolate org-switch tests or change app to client refresh (a11y #8 / security #16).

13. **Login open-redirect must be browser-regressed** — After security fix, /login?next=//evil.example must end on /command not external.

14. **Inbox HITL lacks seed builder** — Confirm flow needs parse_jobs + inbox_items. No shared factory for MIS uploaded and parsed. Add db helper for vitest and e2e.

## P2

15. **CI has no e2e job** — `.github/workflows/ci.yml` stops at unit/typecheck. Even a smoke grep on compose services would catch cookie/CORS breaks.

16. **Suspense fallbacks multiply loading screens** — login/signup/invite wrap in Suspense with Loading. Tests need wait for heading not first paint.

17. **Reports and source downloads use blob clicks** — downloadAuthed creates an anchor download (`api.ts` ~41-67). Playwright must listen for download events; add one Fact-chip smoke after seeding a sourced metric.

18. **False green web package** — passWithNoTests hides absence of tests. Remove flag once a smoke exists; fail if zero tests collected.

19. **Auth pages vs Shell dual session reads** — Login useEffect and Shell both hit /api/me. Parallel nav after signIn can race. Wait for /command URL once before clicking Nav.

20. **Invitation expiry edge** — 7-day expiry (`auth.ts` ~39). At least assert expired invite UI branch on invite page.

21. **No accessibility smoke in e2e** — Pair with a11y-shell #25: axe on /login and /command after auth.

22. **Worker/API boot order** — Compose depends_on api without waiting for healthy migrate. E2E globalSetup should poll /health until postgres=up (and redis when fixed).

## P3

23. **Trace/video on failure not configured** — When Playwright is added, enable trace on first retry for agent-friendly triage.

24. **No partner script timing budget** — Brief under-15-min onboard: log time_to_command_ms and time_to_inbox_confirm_ms even if only in test output.

25. **Hard-coded calendar fixtures in older docs** — Ensure e2e seeds use relative periodEnd (last month) so tests do not rot.

26. **Manual QA checklist missing from repo** — Until e2e exists, docs/improvements should list the 8-step click path (signup through one-pager); NEXT.md does not.

---

## Minimal smoke spec (suggested @smoke)

1. Signup unique email + org → Command heading visible + Primary nav.
2. Add company (step 1 only) → detail page.
3. Sign out → /login; back button does not show book data.
4. Viewer storageState cannot submit company form.

Do not invent OAuth, SMTP, or LP room in these tests.
