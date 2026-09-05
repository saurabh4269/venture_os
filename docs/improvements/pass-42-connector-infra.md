# Pass 42 — Wave A connector infrastructure

**Date:** 2026-09-05  
**Surface:** Settings → Connectors, company mapping, onboard pull, BullMQ `connector.*`, sealed credentials

## Considered / fixed

1. **P0 — Settings Connect was a disabled stub.** Dedicated `/settings/connectors` cards: Save, Test, Connect, Disconnect. Connect disabled until validation or saved creds.
2. **P0 — Credentials would have landed in plaintext jsonb.** `sealed_credentials` AES-256-GCM via `@venture-os/core/server` (`CONNECTOR_SEAL_SECRET` or `BETTER_AUTH_SECRET`). Web barrel does not export `seal`.
3. **P0 — lastSyncAt must stay honest.** Written only after a successful `runConnectorSync`. Settings GET omits the field when null so existing tests still see `undefined`.
4. **P0 — Status invented “connected”.** State machine: `not_connected` → `configured` (save) → `connected` (health ok) / `error`. Never connected without healthCheck.
5. **P0 — OneDrive had no parse path.** Sync downloads Graph `driveItem` files (xlsx/csv/pdf) into the object store and calls `runParseJob` — same inbox as upload.
6. **P0 — Granola could have been treated as MIS.** Transcripts stored as `documents.kind=transcript`, commentary inbox `lane=subjective`. No metric extract.
7. **P0 — Affinity ownership would be invented.** Mapper uses official v2 Company fields only. Ownership only if org configures a number FieldValue id. `TODO(source-of-truth)` documented.
8. **P1 — No env fallback for single-tenant.** `MICROSOFT_*`, `AFFINITY_API_KEY`, `GRANOLA_API_KEY` in `.env.example` + `loadEnv`. UI shows “env default”.
9. **P1 — No Test connection.** `POST /api/connectors/:kind/test` pings official endpoints (Graph `/me` or `/organization`, Affinity `GET /v2/companies?limit=1`, Granola `GET /v1/notes`).
10. **P1 — No OAuth callback.** Authorize URL + signed state + `GET /api/connectors/onedrive/callback` (web BFF already proxies GET). Client-credentials path for app-only.
11. **P1 — No per-company mapping.** Columns + PATCH `/api/companies/:id/connector-mapping` + company page form + onboard optional fields.
12. **P1 — Scheduler would fake work.** `connector.schedule` every 15 minutes no-ops until a row is `connected`, then enqueues `connector.sync`.
13. **P1 — Web crypto barrel risk.** Clients/seal live in `@venture-os/core/server`. `@venture-os/core` exports kinds, status, validate, affinity-map only.
14. **P2 — Existing GET /api/settings test.** Still no `config`; `lastSyncAt` omitted when never synced.
15. **P2 — Playwright onboard.** Mapping is optional on step 1; vault step still exposes `mis-file` immediately after create.
16. **P2 — RLS for new table.** `connector_cursors` forced + policy + GRANT in `0009_connector_infra.sql`.
17. **P2 — Idempotent pull.** Documents store `source` + `external_id`; re-sync skips known Graph/Granola ids.
18. **P3 — Copy.** “Paste keys here — sync starts automatically after a successful test.” Docs: `docs/connectors/README.md`, `ADDING_KEYS.md`.
19. **P3 — Invalid key UX.** Client + API format checks (`grn_` for Granola, min length, tenant shape) before any vendor HTTP.
20. **Residual — Live OAuth.** Needs operator Azure/Affinity/Granola secrets. Tests are mock HTTP only. Do not claim production sync until a real healthCheck against the vendor succeeds.
21. **P0 — Nested parse transaction.** `runParseJob` opens its own `withOrg()` and could not see documents inserted in the still-open sync transaction. OneDrive parse now runs after commit (same inbox pipeline as upload).

## Tests

- Unit: credential validation, status machine, Affinity FIXTURE mapper, seal round-trip.
- Integration: mock Graph/Affinity/Granola HTTP — save → health → OneDrive sync → inbox metric; Granola → subjective commentary inbox.
- Playwright: three connector cards; invalid Affinity key shows error.
