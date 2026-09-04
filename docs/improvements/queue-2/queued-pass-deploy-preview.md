# Queued pass — Deploy & preview (queue-2)

**Repo:** `saurabh4269/venture_os` @ `main` (`925c284`)
**Primary surfaces:** `apps/web/vercel.json`, `apps/web/next.config.ts`, `fly.toml`, `render.yaml`, `docker/Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.env.example`, `docs/cost-hosting.md`, `apps/api/src/auth.ts` / `app.ts`, `packages/config/src/index.ts`
**Brief SoT:** Early-live closed URL for V3 feedback ($0-50 band) — Vercel web + Fly/Render api/worker + Neon/Upstash/R2. Domain code must not import cloud SDKs; deploy stubs must actually boot.
**Why under-covered:** Product/QA agents fixed book rituals; nobody made a preview URL that can sign in.

---

## P0

1. **No same-origin API proxy on Vercel** — `apps/web/vercel.json` has empty rewrites. Browser talks to `NEXT_PUBLIC_API_URL` cross-site (security-session #1). Add rewrite or Next BFF; point client at relative `/api`.

2. **Preview origins cannot be allowlisted as shipped** — `trustedOrigins` / CORS use a single `WEB_URL` (`auth.ts`, `app.ts`). Vercel preview hostnames change per PR. Need `WEB_ORIGIN_PATTERNS` or per-preview `WEB_URL` + API redeploy — document which.

3. **`NEXT_PUBLIC_API_URL` is bake-time** — Next inlines it at `next build`. Preview built with localhost or prod API points at the wrong backend. Prefer relative URLs after proxy (#1).

4. **Container image runs the monorepo in watch mode** — `docker/Dockerfile` CMD is development-oriented; `fly.toml` points at that Dockerfile. Early-live needs a production start command and a frozen install.

5. **Fly auto-stop with zero warm machines** — `fly.toml` sets min_machines_running to 0 and auto_stop. First partner hit cold-starts the API and flaky auth. Keep one warm machine for closed demos or document wake latency.

## P1

6. **No migrate-on-release for Fly** — `render.yaml` migrates in buildCommand; `fly.toml` does not. Fresh Neon means empty schema at boot. Add a release command or one-shot migrate job.

7. **render.yaml omits env checklist** — Only NODE_ENV=production is declared. Add sync:false placeholders for database, Redis, WEB_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET so operators see required keys.

8. **Health lies about Redis** — `/health` always returns redis unknown (`routes.ts`). Orchestrators cannot detect a dead queue URL. Ping Redis before ok:true.

9. **CI never builds web or container images** — `.github/workflows/ci.yml` runs migrate, test, typecheck only. Next production build and Dockerfile breakage stay invisible. Add web build + image build smoke (no registry push).

10. **CI auth env incomplete** — Sets BETTER_AUTH_SECRET and DB URLs but not WEB_URL, BETTER_AUTH_URL, API_URL. Unit tests pass on localhost defaults; misconfig in real hosts is undetected. Assert production loadEnv shape.

11. **Shared DB for all previews mixes tenants** — cost-hosting suggests Neon free. Without branch-per-preview, SEED_DEMO and partner rows collide. Document Neon branches or forbid SEED_DEMO on shared DSN.

12. **Object store missing from deploy stubs** — Compose wires MinIO; Fly/Render stubs never mention R2 endpoint or keys. First vault upload on early-live fails. Extend cost-hosting checklist and stub comments.

13. **Worker process undefined on Fly** — Comment says deploy a second process group (`fly.toml` ~26-27) but there is no processes block or second app. Parse/flag jobs stay queued. Ship worker toml or processes.

14. **Single Dockerfile exposes both web and API ports** — One CMD cannot serve both roles clearly. Split api vs web Dockerfiles or build targets.

## P2

15. **No release identity on /health** — Operators cannot tell which git SHA a preview API runs. Return gitSha/buildTime from deploy-injected env.

16. **Compose is bind-mount watch only** — Fine for local; agents confuse it with production-like. Label DEV ONLY in README or add a prod-profile compose.

17. **SEED_DEMO footgun on shared preview** — Refuse SEED_DEMO=1 when NODE_ENV=production so a dashboard toggle cannot load FIXTURE_ONLY into the partner DB.

18. **No Vercel Deployment Protection notes** — cost-hosting omits password/SSO on Hobby previews. Public preview plus weak rate limits indexes the login form.

19. **Cookie Secure vs edge HTTPS** — Fly force_https terminates TLS at edge; app must still set Secure cookies (security-session #12). Document NODE_ENV pairing.

20. **Hobby hosts sleep** — Session cookies survive while API sleeps; in-flight parse dies. Web should show API waking on first 502/timeout instead of raw Failed to fetch.

21. **No preview smoke after release** — Curl /health, /api/me (null user), and OPTIONS CORS from WEB_URL. Without this, agents declare shipped with a dead URL.

22. **Unlocked install in container build** — Fallback install without freeze drifts preview images. Fail the build on lockfile drift.

## P3

23. **Vercel monorepo filter undocumented** — Document filtering to `@venture-os/web` so api/worker are not built on the wrong platform.

24. **Region pinning** — Fly primary_region iad vs Neon region mismatch adds latency to every getSession DB round-trip; note in cost-hosting.

25. **No rollback runbook** — Early-live needs revert steps for Vercel previous deployment and Fly releases rollback in `docs/cost-hosting.md`.

26. **Migrate DSN confusion** — Relies on `0002_app_role.sql` via superuser MIGRATE_DATABASE_URL. If migrate points at the app role, failure is opaque. Detect and print use superuser DSN for migrate.

---

## Acceptance for this batch

A closed preview URL where: signup → create org → Command loads with session cookie, without editing `auth.ts` per URL, and `/health` reports postgres+redis for the API the web actually calls.
