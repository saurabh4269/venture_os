# Connectors — Wave A infrastructure

OneDrive (Microsoft Graph), Affinity CRM, and Granola are wired end-to-end: **save keys → test → connect → sync**. Live vendor calls happen only when credentials are present. Tests use mock HTTP. The UI never invents `lastSyncAt` or a `connected` badge.

**Plug-in contract (2026-09-07):** after a successful Test, sync pulls mapped companies without further engineering. Affinity ownership requires a real field id from `GET /v2/companies/fields` (Load fields in Settings). Granola company links must be `not_…` note ids. OneDrive folders paginate via Graph `@odata.nextLink`. Claude is optional via `LLM_PROVIDER=anthropic` (OpenAI remains default).

Paste-later guide: [`ADDING_KEYS.md`](ADDING_KEYS.md). Secrets model: [`SECURITY.md`](SECURITY.md).

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

- [Get access on behalf of a user](https://learn.microsoft.com/en-us/graph/auth-v2-user)
- [Get access without a user (client credentials)](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [List children](https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0)
- [Download content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)

### Create an Azure app (Microsoft Entra)

1. Azure Portal → Microsoft Entra ID → App registrations → New registration.
2. Name it (e.g. Venture OS). Supported account types: single tenant, or multitenant if you use `common`.
3. **Redirect URI** (Web): `https://<WEB>/api/connectors/onedrive/callback`  
   Local: `http://localhost:3000/api/connectors/onedrive/callback`
4. Certificates & secrets → New client secret. Copy once.
5. API permissions:
   - Delegated (auth code + refresh): `Files.Read.All`, `User.Read`, plus `offline_access` as an OIDC scope on the authorize URL.
   - Application (client credentials): `Files.Read.All`. Admin consent required. App-only listing uses `/drives/{id}/…` or `/users/{id}/drive/…` — set drive id or user id in Settings.
6. Copy Application (client) ID and Directory (tenant) ID.

**Operator test path:** paste client id/secret/tenant → Save → Test (hits `/me` or `/organization`) → Connect (delegated opens Microsoft sign-in) → map company folder id or path → Sync / Pull. Sync follows `@odata.nextLink` and ingests `.xlsx` / `.xls` / `.csv` / `.pdf` / `.docx` into the same parse → Confirm path as upload.

Single-tenant env fallback (no per-org paste):

```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

Verified Graph fields we read: `id`, `name`, `file`, `file.mimeType`, `@odata.nextLink` on children; token `access_token`, `refresh_token`, `expires_in`, `token_type`.

## Affinity

Official docs:

- [Authentication (Bearer API key)](https://developer.affinity.co/pages/external-api-v2/authentication)
- [Get all companies](https://developer.affinity.co/api-reference/2026-07-15/companies/get-all-companies)
- [Get a single company](https://developer.affinity.co/api-reference/2026-07-15/companies/get-a-single-company)
- [Company fields metadata](https://developer.affinity.co/api-reference/2026-07-15/companies/get-metadata-on-company-fields)
- [How to obtain your API key](https://support.affinity.co/hc/en-us/articles/360032633992-How-to-obtain-your-API-Key)

1. Affinity → Settings → Manage Apps → generate an API key (needs “Generate an API key”).
2. Paste into Settings → Connectors → Affinity. Auth: `Authorization: Bearer <key>` to `https://api.affinity.co`.
3. Health check: `GET /v2/companies?limit=1`.
4. Map each book company to an Affinity **numeric** company `id`.
5. Ownership is **not** a first-class Company field. Click **Load Affinity fields** (calls `GET /v2/companies/fields`) and paste a number field id, or type it. Sync calls `GET /v2/companies/{id}?fieldIds=…` — **without `fieldIds`, Affinity returns no field data** (official). We only write `positions.ownership_pct` when that field’s value is a documented number FieldValue (`{ "type": "number", "data": <n|null> }`). Missing `data` stays null.

Verified Company fields: `id`, `name`, `domain`, `domains`, `isGlobal`, `fields[]`.

`TODO(source-of-truth)`: list-specific ownership, cost, shares, instrument — confirm on `/v2/companies/fields` or list-entry fields before mapping.

Env fallback: `AFFINITY_API_KEY=`.

## Granola

Official docs: [https://docs.granola.ai/introduction](https://docs.granola.ai/introduction)

1. Granola desktop → Settings → Connectors → API keys → Create key (`grn_…`). Business/Enterprise; choose personal and/or public note scopes.
2. Health: `GET https://public-api.granola.ai/v1/notes?page_size=1`.
3. Map a company to a note id (`not_…` only — not a UUID). Sync calls `GET /v1/notes/{id}?include=transcript` (413 → `/transcript`). Stores a `transcript` document and a **subjective** Confirm commentary proposal. Never creates objective metric cells.
4. Notes without a generated summary/transcript are excluded by Granola (list) or 404 (get) — we skip, we do not invent.

Verified note fields we read: `id`, `title`, `summary`, `transcript[].speaker.source`, `transcript[].speaker.diarization_label`, `transcript[].text`, list `notes`, `hasMore`, `cursor`.

Env fallback: `GRANOLA_API_KEY=`.

## Claude (brief reasoning layer)

Official: [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) / [Authentication](https://docs.anthropic.com/en/api/getting-started).

- Default remains **OpenAI** (`LLM_PROVIDER=openai`, DECISION D5 / D12).
- To use Claude: set `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=sk-ant-…`, optional `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`).
- Requests use `x-api-key` + `anthropic-version: 2023-06-01`. Propose → Confirm only; never writes the book.

## Jobs

| Queue | Role |
| --- | --- |
| `connector.sync` | Pull artifacts → vault / positions / transcript Confirm |
| `connector.health` | Re-run vendor ping |
| `connector.schedule` | Repeatable 15-minute tick; **no-ops** until a connector is `connected` |

OneDrive files reuse `runParseJob` (same as upload). Granola does not.

## Secrets

Per-org credentials are AES-256-GCM envelopes (`secret_ciphertext` + `secret_nonce` + `secret_key_version`) sealed with `CONNECTOR_SECRETS_KEY` (fallback `CONNECTOR_SEAL_SECRET` / `BETTER_AUTH_SECRET`). The key is never stored in Postgres. `GET /api/settings` does not return `config` or secrets. Org Admin only on `/api/connectors`. Details: [`SECURITY.md`](SECURITY.md).
