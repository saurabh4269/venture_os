# Pass 37 — NAV locked as-of pack snapshot

**Date:** 2026-09-05  
**Surface:** official quarter freeze to object storage  
**Evidence:** NEXT.md item 1; pass 23 residual; gap #19.  
**Design pick:** pack snapshot of the locked as-of — not a second signature. Multi-approver needs an undefined second actor; a frozen pack does not invent one.

## Decision (also D7)

On `POST /api/nav/lock` the API writes a versioned JSON pack to the object store (`nav-packs/{orgId}/{asOf}/{sha256}.json`) and stores `snapshot_key`, `snapshot_sha256`, `snapshot_at` on `nav_period_locks`. Unlock keeps the last official pack. Relock replaces it with a new hash. GET `/api/nav` returns snapshot metadata. GET `/api/nav/snapshot?asOf=` returns the frozen bytes (org-scoped). The pack is computed by deterministic code from positions + sourced marks — no LLM.

## Issues

### 1. P0 — Lock was a status bit only

**Wrong:** Unlock + rewrite lost the official quarter. Partners circulating a pack had no frozen artifact.

**Should:** Snapshot the rollup + per-position marks (cost, mark, as-of, sourceRefId, FX triple) at lock time.

### 2. P0 — Snapshot must not invent marks

**Wrong:** Filling unmarked names with 0 would mint a fake official NAV.

**Should:** Same `rollupNav` rules: unmarked listed; unprovenanced excluded from headline.

### 3. P0 — Snapshot without RLS / org key prefix

**Wrong:** A global key would leak packs.

**Should:** Key includes `orgId`. GET uses `withOrg`. RLS on new columns (same row).

### 4. P1 — Unlock deleted the official story

**Wrong:** Clearing snapshot on unlock would hide what was circulated.

**Should:** Keep last official key/sha/at. Status becomes unofficial; UI says “last official pack”.

### 5. P1 — Relock without a new hash

**Wrong:** Overwriting the same key would mutate history in place.

**Should:** New sha256 object. Old object may remain (no delete). Row points at the latest.

### 6. P1 — Viewer could fetch another org’s snapshot

**Wrong:** Object store is not RLS. API must scope.

**Should:** `requireOrg` + key from the lock row only. Never accept a client-supplied key.

### 7. P1 — Lock HTTP test did not assert a snapshot

**Wrong:** Status-only test would miss a no-op put.

**Should:** Lock → period.snapshotSha256 present → GET snapshot → asOf + rollup match.

### 8. P1 — UI hid that a pack existed

**Wrong:** “locked (official)” with no download/meta.

**Should:** Show sha prefix + as-of. Link/button `nav-snapshot` when a key exists.

### 9. P1 — Migration required

**Wrong:** Columns cannot appear only in Drizzle types.

**Should:** `0008_nav_snapshot_flag_audit.sql`.

### 10. P1 — Hash must be of canonical JSON

**Wrong:** Keying on lock id alone does not prove contents.

**Should:** SHA-256 of the UTF-8 snapshot body.

### 11. P2 — Fund-scoped lock still org-wide

**Wrong:** One as-of for the org.

**Should:** Residual. Snapshot is the all-funds book at that as-of (fund filter is a view, not a second official).

### 12. P2 — Multi-approver still absent

**Wrong:** Intentional. One Partner/Org Admin lock is official.

### 13. P2 — Object store fs vs S3

**Wrong:** `S3_ENDPOINT=fs` writes `uploads/`. Compose MinIO uses S3.

**Should:** Same `createObjectStore()`.

### 14. P2 — Snapshot GET 404 when unofficial and never locked

**Wrong:** Do not invent a pack.

**Should:** `404 snapshot_not_found`.

### 15. P2 — Core unit test on builder

**Wrong:** HTTP-only would miss a null→0 bug.

**Should:** `nav-snapshot.test.ts`.

### 16. P3 — PDF of the locked pack

**Wrong:** JSON is the SoT artifact. Reports remain on-demand from the *current* book.

## Residual

- Second signature / LP sign-off.
- Per-fund official pack.
- Snapshot PDF pretty-print.
- `hashNavPackSnapshot` lives on `@venture-os/core/server` so Next client bundles never pull `node:crypto`.
