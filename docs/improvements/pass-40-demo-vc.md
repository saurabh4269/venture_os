# Pass 40 — Live operator runbook (`pnpm demo:vc`)

**Date:** 2026-09-05  
**Surface:** one-command Compose + migrate + signup + FIXTURE seed  
**Evidence:** NEXT.md how-to-run; seed created an org with no login.

## Issues

### 1. P0 — Seed created `org_fixture_only` with no user

**Wrong:** `SEED_DEMO=1 pnpm seed:demo` left a book nobody could open. Partners bounced at signup into an empty org.

**Should:** After API is up, sign up `SEED_DEMO_EMAIL` (or attach if the user exists) and add `org_admin` membership on the fixture org.

### 2. P0 — No one-command path

**Wrong:** README listed Compose and seed as two tribal steps.

**Should:** `pnpm demo:vc` → `.env` if missing → Compose (or native wait) → migrate → health → signup → seed → print URL + FIXTURE_ONLY warning.

### 3. P0 — Production seed still forbidden

**Wrong:** Keep the throw when `NODE_ENV=production`.

### 4. P1 — Credentials were only in `.env.example`

**Wrong:** Operator had to hunt.

**Should:** Script prints email/password and “not the live book.”

### 5. P1 — Compose api already migrates; double migrate must be idempotent

**Wrong:** Fine (`_migrations` table). Script still migrates for native.

### 6. P1 — Health wait was missing

**Wrong:** Seed against a down Postgres looks like a product bug.

**Should:** Poll `/health` `postgres=up` (and Redis when using Compose).

### 7. P1 — Docker optional

**Wrong:** Cloud/CI agents may lack Compose.

**Should:** If `docker compose` is missing or unhealthy, use `DATABASE_URL` + `pnpm db:migrate` + existing `pnpm dev`. Document both.

### 8. P1 — Fixture banner must appear after org switch

**Wrong:** User lands on their signup org (empty), not the fixture, unless we set active org.

**Should:** Seed sets `session.active_organization_id` when a session exists; script tells the operator to pick **Fixture Capital (FIXTURE_ONLY)** in the org switcher if they still see an empty Command.

### 9. P1 — README Demo section did not mention `demo:vc`

**Should:** Lead with it.

### 10. P2 — MinIO vs `S3_ENDPOINT=fs`

**Wrong:** Native path should force fs if MinIO is down.

**Should:** Script exports `S3_ENDPOINT=fs` for native.

### 11. P2 — Worker down → parse queued

**Wrong:** Already documented. demo:vc starts Compose worker when using Docker.

### 12. P2 — OpenAI key optional

**Wrong:** Ask refuses without it. Script must not require a key.

### 13. P2 — Re-running seed duplicates companies

**Wrong:** Current seed always inserts a new company.

**Should:** Skip company insert if Fixture Apparel Co already exists in that org.

### 14. P2 — AGENTS.md how-to-run stale

**Should:** Add `pnpm demo:vc`.

### 15. P3 — Live Fly smoke

**Wrong:** Needs operator credentials. Residual.

### 16. P1 — Script exit codes

**Wrong:** Must be non-zero when migrate or seed fails. Do not print a fake “ready.”

## Residual

- Hosted Fly/Vercel click-path after a real release.
- SMTP so the fixture user can reset a password.
