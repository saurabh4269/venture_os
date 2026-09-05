# Connector secrets — operator model

Wave A stores Microsoft / Affinity / Granola credentials so a later paste in Settings works without code changes. This document is the security contract. **No live vendor keys belong in git.**

Related: [`ADDING_KEYS.md`](ADDING_KEYS.md) (how to paste), [`README.md`](README.md) (vendor setup).

## Layers

1. **Never plaintext in SoR.** API keys, client secrets, and OAuth refresh/access tokens are AES-256-GCM sealed. Postgres holds `secret_ciphertext`, `secret_nonce`, `secret_key_version`, `secret_updated_at`, status, and non-secret `config` (auth mode, ownership field id, Graph drive/user ids). The key is **not** in the database.
2. **Dedicated envelope key.** Prefer `CONNECTOR_SECRETS_KEY` in the environment / secret manager (32+ characters). Fallbacks: `CONNECTOR_SEAL_SECRET`, then `BETTER_AUTH_SECRET`. Rotation uses `CONNECTOR_SECRETS_KEY_VERSION` (default `1`) and optional `CONNECTOR_SECRETS_KEY_PREVIOUS` to decrypt `key_version - 1`, then re-encrypts on the next save/test/sync.
3. **API never returns secrets.** `GET /api/connectors` (Org Admin only) returns status, `hasCredentials`, a mask (`••••` + last 4 when the value is ≥ 8 chars), and metadata. `GET /api/settings` returns kind + status only — no `config`, no ciphertext. After Save, the UI clears client secret / API key / client id / tenant id from React state.
4. **RBAC.** Only **Org Admin** may GET `/api/connectors` or Save / Test / Connect / Disconnect. Partners are not included: they lock NAV; they do not hold vendor keys. Analysts and viewers receive `403`. Analysts may enqueue **sync** (pull into the existing parse/inbox path) without reading credentials. Company folder / Affinity id / Granola note mappings are not secrets; write roles may edit them.
5. **Audit.** `connector_audits` records `save`, `rotate`, `disconnect`, `test`, `connect`, `sync`, `oauth_callback` with `org_id`, `actor_user_id` (null for scheduler / OAuth redirect), `kind`, timestamp. Never the secret material.
6. **Transport.** Production cookies are Secure when `BETTER_AUTH_URL` is `https://` or `NODE_ENV=production`. Mutating requests require a trusted `Origin`. Save and Test connection are rate-limited (30 / 15 minutes per org+user).
7. **Disconnect** nulls ciphertext, nonce, key version, the legacy `sealed_credentials` blob, and `last_sync_at`.
8. **Env vs org.** Org-sealed credentials win. Env (`MICROSOFT_*`, `AFFINITY_API_KEY`, `GRANOLA_API_KEY`) is a **single-tenant fallback** only. Env keys stay in process environment — they are never copied into `org_settings` jsonb. Status stays `configured` until Test connection succeeds.

## Precedence (resolve)

1. Org envelope (`secret_ciphertext` + `secret_nonce`) if it unseals and has the required fields for that kind.
2. Legacy `sealed_credentials` blob (migrated to the envelope on next write).
3. Process env fallback (single-tenant).
4. Otherwise `not_connected`.

## What is not a secret

Azure **application (client) id** and **tenant id** are identifiers. They are still not echoed after save (mask / empty fields). Affinity **ownership field id** and Graph **drive/user id** are mapping metadata in `config`, not tokens.

## Operator checklist

- Set `CONNECTOR_SECRETS_KEY` in the host secret store before any production paste.
- Use HTTPS for `WEB_URL` / `BETTER_AUTH_URL` in production.
- Rotate: put the current key in `CONNECTOR_SECRETS_KEY_PREVIOUS`, install the new key as `CONNECTOR_SECRETS_KEY`, bump `CONNECTOR_SECRETS_KEY_VERSION`, then Test each connector (re-encrypts).
- Never log request bodies that contain pasted keys. API `log()` redacts `apiKey`, `clientSecret`, tokens, and ciphertext fields.
- Tests use mock HTTP only. Do not claim a live Graph/Affinity/Granola connection without a real health check.
