# Connectors — Wave A infrastructure

OneDrive (Microsoft Graph), Affinity CRM, and Granola are wired end-to-end: **save keys → test → connect → sync**. Live vendor calls happen only when credentials are present. Tests use mock HTTP. The UI never invents `lastSyncAt` or a `connected` badge.

Paste-later guide: [`ADDING_KEYS.md`](ADDING_KEYS.md).

## Status

| Status | Meaning |
| --- | --- |
| `not_connected` | No org-sealed credentials and no env fallback |
| `configured` | Keys saved (or env fallback present); health not yet successful |
| `connected` | Last health check succeeded |
| `error` | Last health or sync failed; last successful sync time is left as-is |

`lastSyncAt` is written only after a real sync that completed without throwing.

## OneDrive / Microsoft Graph

Official docs:

- [OAuth 2.0 on behalf of a user](https://learn.microsoft.com/en-us/graph/auth-v2-user)
- [List folder children](https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0)
- [Download driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)

### Create an Azure app

1. Azure Portal → Microsoft Entra ID → App registrations → New registration.
2. Name it (e.g. Venture OS). Supported account types: single tenant, or multitenant if you use `common`.
3. **Redirect URI** (Web): `https://<WEB>/api/connectors/onedrive/callback`  
   Local: `http://localhost:3000/api/connectors/onedrive/callback`
4. Certificates & secrets → New client secret. Copy once.
5. API permissions:
   - Delegated (auth code + refresh): `Files.Read.All`, `User.Read`, plus `offline_access` as an OIDC scope on the authorize URL.
   - Application (client credentials): `Files.Read.All`. Admin consent required. App-only listing uses `/drives/{id}/…` or `/users/{id}/drive/…` — set drive id or user id in Settings.
6. Copy Application (client) ID and Directory (tenant) ID.

Single-tenant env fallback (no per-org paste):

```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

Verified Graph fields we read: `id`, `name`, `file`, `file.mimeType`, `@odata.nextLink` on children; token `access_token`, `refresh_token`, `expires_in`, `token_type`.

## Affinity

Official docs:

- [API v2 — Get all companies](https://developer.affinity.co/api-reference/2026-07-15/companies/get-all-companies)
- [How to obtain your API key](https://support.affinity.co/hc/en-us/articles/360032633992-How-to-obtain-your-API-Key)

1. Affinity → Settings → Manage Apps → generate an API key (needs “Generate an API key”).
2. Paste into Settings → Connectors → Affinity. Auth: `Authorization: Bearer <key>` to `https://api.affinity.co`.
3. Health check: `GET /v2/companies?limit=1`.
4. Map each book company to an Affinity **numeric** company `id`.
5. Ownership is **not** a first-class Company field. Optional: paste a field id from `GET /v2/companies/fields`. We only write `positions.ownership_pct` when that field’s value is a documented number FieldValue (`{ "type": "number", "data": <n|null> }`). Missing `data` stays null.

Verified Company fields: `id`, `name`, `domain`, `domains`, `isGlobal`, `fields[]`.

`TODO(source-of-truth)`: list-specific ownership, cost, shares, instrument — confirm on `/v2/companies/fields` or list-entry fields before mapping.

Env fallback: `AFFINITY_API_KEY=`.

## Granola

Official docs: [https://docs.granola.ai/introduction](https://docs.granola.ai/introduction)

1. Granola desktop → Settings → Connectors → API keys → Create key (`grn_…`). Business/Enterprise.
2. Health: `GET https://public-api.granola.ai/v1/notes`.
3. Map a company to a note id (`not_…`). Sync stores a `transcript` document and a **subjective** inbox commentary proposal. It never creates objective metric cells.

Verified note fields we read: `id`, `title`, `summary`, `transcript[].speaker.source`, `transcript[].speaker.diarization_label`, `transcript[].text`, list `notes`, `hasMore`, `cursor`.

Env fallback: `GRANOLA_API_KEY=`.

## Jobs

| Queue | Role |
| --- | --- |
| `connector.sync` | Pull artifacts → vault / positions / transcript inbox |
| `connector.health` | Re-run vendor ping |
| `connector.schedule` | Repeatable 15-minute tick; **no-ops** until a connector is `connected` |

OneDrive files reuse `runParseJob` (same as upload). Granola does not.

## Secrets

Per-org credentials are AES-256-GCM sealed (`@venture-os/core/server`) with `CONNECTOR_SEAL_SECRET` or `BETTER_AUTH_SECRET`. Never stored in git. `GET /api/settings` does not return `config` or secrets.
