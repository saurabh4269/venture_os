# Adding connector keys

You do not need an engineer after this pack. Paste credentials in the product (or env for a single-tenant deploy). Sync starts after a **successful Test connection**.

## In the product (preferred)

1. Sign in as **Org Admin**.
2. Open **Settings → Connectors** (`/settings/connectors`).
3. Pick a card. Paste the values. Click **Save**.
4. Click **Test connection**.  
   - Success → status becomes **connected**. Sync is queued.  
   - Failure → status **error** and the vendor message is shown. We do not invent a last-sync time.
5. **Connect** stays disabled until the form validates (or keys are already saved). OneDrive delegated mode opens Microsoft sign-in.
6. **Disconnect** wipes ciphertext / nonce / key version and last-sync for that connector.
7. On each company (or the onboard wizard), paste:
   - OneDrive folder **id** and/or path (e.g. `/MIS`)
   - Affinity company **id** (digits)
   - Granola note **id** (`not_…`)
8. Upload remains the fallback. **Pull from OneDrive** appears when that connector is connected.

Help copy on the page: *Paste keys here — sync starts automatically after a successful test.*

Azure / Affinity / Granola setup steps: [`README.md`](README.md). Redirect URI:

```
https://<WEB>/api/connectors/onedrive/callback
```

Local web: `http://localhost:3000/api/connectors/onedrive/callback`.

## Single-tenant env fallback

Copy `.env.example` → `.env`. If the org has not pasted keys, these defaults are used (still **configured**, not **connected**, until Test succeeds):

```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
AFFINITY_API_KEY=
GRANOLA_API_KEY=
# Preferred envelope key (32+). Else CONNECTOR_SEAL_SECRET, else BETTER_AUTH_SECRET.
CONNECTOR_SECRETS_KEY=
CONNECTOR_SECRETS_KEY_VERSION=1
```

**Precedence:** org-sealed envelope (multi-tenant) wins over env fallback (single-tenant). Env keys are never written into `org_settings`. Status stays **configured** until Test succeeds.

Threat model and rotation: [`SECURITY.md`](SECURITY.md).

Never commit a live `.env`. Fixtures and tests use mock HTTP only.
