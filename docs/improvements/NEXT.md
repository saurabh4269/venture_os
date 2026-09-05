# Next — remaining after passes 35–42

**Branch / PR:** `cursor/wave-a-connector-infra-11d6`  
**Prior:** passes 35–41 on `main` @ `a22207f`

## Closed in this batch

- **35 Playwright hardening** — viewer `storageState`; Flags / NAV / Ask refuse (unsourced question digits) / inbox reject + `inbox-ready` poll; axe optional in CI (`PLAYWRIGHT_AXE=1`, `continue-on-error`).
- **36 Redis rate-limit** — sliding-window Lua on `REDIS_URL`; memory fallback if Redis is down; session notes (7d / 24h refresh, no SSO).
- **37 NAV pack snapshot** — lock writes a deterministic JSON pack to the object store; unlock keeps the last official sha; GET `/api/nav/snapshot`.
- **38 Flag policy UX** — threshold bounds + field errors; `flag_policy_audits` + Settings table. Per-company override still deferred.
- **39 Dual EUR + Compare INR Cr** — NAV headlines/marks use `formatDualDisplay` / `rollupEur`; Compare shows an explicit INR Cr line; monthly XLSX EUR columns refuse without a triple.
- **40 `pnpm demo:vc`** — Compose (or native) + migrate + signup + FIXTURE seed + membership attach.
- **41 UX/copy** — signup empty-book, login session, Flags firm policy, Reports EUR refuse, viewer heading.

## Still later (do not invent)

1. **NAV multi-approver / LP sign-off** — one Partner/Org Admin lock + frozen pack is official. No second signature.
2. **Per-company / per-fund flag policy** — firm jsonb + audit only.
3. **Scheduled monthly pack + email** — on-demand + worker artifact only. No cron.
4. **Live Ask eval vs seeded org** — goldens remain unit tests. No `SEED_DEMO` in CI.
5. **Growth / burn-multiple derived compare columns** — not in the metric enum.
6. **SSO / session revoke-on-remove / per-email rate-limit / captcha**.
7. **SOC2 audit-log viewer** — lock + policy audit rows exist; no export UI.
8. **Compose-attached Playwright / Fact download event**.
9. **Live Fly/Vercel smoke after a real release** (needs operator credentials).
10. **PDF bbox / cell highlight** inside the source file.

## Closed in Pass 42

- **Connector infra** — sealed per-org creds, env fallbacks, Graph/Affinity/Granola clients (official fields only), BullMQ `connector.sync` / `health` / schedule no-op, Settings → Connectors cards, company mapping, onboard pull, mock-HTTP tests, Playwright cards + invalid key.

## Explicitly deferred (need operator secrets or Phase 6)

- Live OneDrive / Affinity / Granola against production APIs — paste keys in Settings or env. Infra is ready; do not claim connected without a real healthCheck.
- SMTP / domain auto-join.
- LP / ILPA room.
- Billing.

## How to continue

1. Open `cursor/<slug>-11d6` off latest `main` after merge.
2. Do not reopen 23–42 P0s.
3. Write `docs/improvements/pass-NN-*.md` (≥15 items) then fix P0/P1.
4. `pnpm typecheck && pnpm test` before push. CI also builds web and runs Playwright.
5. Do not copy v3.heisenbug.in. Missing ≠ 0. LLM never commits facts.
