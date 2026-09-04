# Pass 24 — Firm flag-policy persistence

**Date:** 2026-09-04  
**Surface:** Settings → Flag policy; Flags job  
**Evidence:** NEXT.md item 2; data model FlagPolicy; Settings previously read-only catalog defaults.

## Issues

### 1. P0 — Flags job ignored the firm

**Wrong:** `detectAll` used catalog defaults only. A Partner who wanted runway < 4 months still got 6.

**Should:** Job reads `org_settings.flag_policy` jsonb.

**Fix:** `parseFlagPolicyJson` + `runFlagJob`.

### 2. P0 — Settings pretended thresholds could not persist

**Wrong:** Copy: “we will not pretend threshold edits persist.” Honest, but blocked the brief.

**Should:** Org Admin editor writes jsonb. Missing keys keep catalog defaults.

**Fix:** `POST /api/settings/flag-policy`.

### 3. P1 — No column

**Wrong:** `org_settings` had FY/currency only. RLS listed the table; policy lived in code.

**Should:** `flag_policy jsonb NOT NULL DEFAULT '{}'`.

**Fix:** Migration 0007.

### 4. P1 — Invalid JSON / unknown keys

**Wrong:** A typo key could look like a new flag category (forbidden).

**Should:** Parse only `FlagKeySchema` keys; ignore negatives and non-numbers.

**Fix:** `parseFlagPolicyJson`.

### 5. P1 — Viewer could have written policy if we used requireWrite

**Wrong:** Firm risk appetite is an Org Admin decision.

**Should:** `requireAdmin`. Viewer POST → 403.

**Fix:** HTTP test.

### 6. P1 — GET still returned catalog-only

**Wrong:** UI could not show “this firm” vs default.

**Should:** `{ key, label, defaultThreshold, threshold }`.

**Fix:** Settings GET.

### 7. P1 — Detectors did not accept overrides

**Wrong:** `detectAll` hard-coded 6 / 45 / 0.2.

**Should:** Optional `policy` on input.

**Fix:** `flags.ts` + unit test (runway 5 months fires at 6, silent at 3).

### 8. P1 — Flags page catalog did not show applied thresholds

**Wrong:** Partners could not see which band raised a flag.

**Should:** Evidence already includes `threshold`. GET `/api/flags` also returns `policy`.

**Fix:** Flags GET.

### 9. P2 — Empty policy object must not zero every threshold

**Wrong:** `{}` coalesced to 0 would raise every runway flag.

**Should:** Missing ≠ 0. Default catalog.

**Fix:** `resolveFlagThresholds`.

### 10. P2 — RLS: org A policy readable as org B

**Wrong:** jsonb on a tenant table still needs isolation.

**Should:** Existing `org_settings` RLS + regression test.

**Fix:** `rls.test.ts`.

### 11. P2 — Save without recompute

**Wrong:** Partners expect Flags to change immediately.

**Should:** Honest copy: “Recompute Flags to apply.” We do not silently enqueue on save (avoids surprise).

**Fix:** Settings UI.

### 12. P2 — Call-concern / ownership flags have threshold 0

**Wrong:** An editor showing 0 looks like “disabled.”

**Should:** 0 is a valid catalog default (those detectors are evidence-gated, not magnitude).

**Fix:** Leave 0; do not hide.

### 13. P2 — No Zod on the POST body

**Wrong:** Stringly thresholds.

**Should:** `FlagPolicySchema`.

### 14. P2 — ensureOrgDefaults did not need a policy seed

**Wrong:** Seeding invented thresholds.

**Should:** Default `{}`.

### 15. P3 — Per-company overrides

**Wrong:** Not in this pass.

**Should:** Deferred. Firm-level only.

### 16. P3 — Spectrum / severity bands in policy

**Wrong:** Catalog severity still code-side.

**Should:** Deferred.

## Residual

- No per-fund policy.
- Recompute is still a button, not automatic on save.
