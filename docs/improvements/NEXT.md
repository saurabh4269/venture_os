# Next — remaining after passes 23–30

**Branch / PR:** `cursor/prod-hardening-passes-23-a53d`  
**Prior:** passes 01–22 on `main` @ `925c284` (PR #2)

## Closed in this batch

- **23 NAV period lock** — unofficial vs locked as-of; Partner/Org Admin lock; unlock requires reason; write → `409 period_locked`; audit fields; RLS.
- **24 Flag policy** — `org_settings.flag_policy` jsonb; Settings editor; Flags job uses firm thresholds.
- **25 Monthly pack** — objective + subjective columns; stronger XLSX; worker `runReportJob` artifact (inline fallback).
- **26 Ask eval** — `refuseUnsourcedDigits` + golden harness (`ask.eval.test.ts`).
- **27 Deep UX** — skip-link, focus, nav IA, loading/error on Settings/Reports/Ask/NAV.
- **28 Onboarding** — timed script `docs/improvements/onboarding-15min.md`; wizard error/busy + sample file pointer.
- **29 Deploy docs** — Vercel + Neon + Upstash + Fly/Render with real `.env.example` names.
- **30 Security** — origin allow-list, invite 410, auth rate-limit stub, RLS regression on new tables.

## Still later (do not invent)

1. **NAV multi-approver / pack snapshot** — single lock row is official; no second signature, no frozen artifact of the locked pack.
2. **Per-company / per-fund flag policy** — firm jsonb only.
3. **Scheduled monthly pack + email** — on-demand + worker artifact only. No cron.
4. **Live Ask eval vs seeded org** — goldens are evidence-string unit tests. No `SEED_DEMO` in CI.
5. **INR Cr canonical compare column** — cell note when convertible (pass 22). Dual EUR still needs an FX triple.
6. **Growth / burn-multiple derived compare columns** — not in the metric enum.
7. **Redis-backed rate-limit / session rotation / SSO**.
8. **SOC2 audit-log viewer**.

## Explicitly deferred (need OAuth or Phase 6)

- OneDrive / Affinity / Granola — stub + **not connected**. Never invent folder IDs or `lastSyncAt`.
- SMTP / domain auto-join.
- LP / ILPA room.
- PDF bbox / cell highlight inside the file (locator text is shown).
- Billing.

## How to continue

1. Open `cursor/<slug>-a53d` off latest `main` after merge.
2. Write `docs/improvements/pass-NN-*.md` (≥15 items) then fix P0/P1.
3. `pnpm typecheck && pnpm test` before push.
4. Do not copy v3.heisenbug.in. Missing ≠ 0. LLM never commits facts.
