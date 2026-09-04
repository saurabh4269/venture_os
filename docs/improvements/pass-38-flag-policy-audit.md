# Pass 38 — Firm flag-policy UX (validation + audit)

**Date:** 2026-09-05  
**Surface:** Settings flag policy editor; `flag_policy_audits`  
**Evidence:** NEXT.md item 2; pass 24 residual (per-company deferred).  
**Design pick:** firm policy polish — not per-company override. Per-company appetite needs a second product rule (who wins when firm and company disagree). Validation + audit close the Partner-visible hole first.

## Issues

### 1. P0 — Invalid thresholds could look saved

**Wrong:** Client skipped non-finite numbers silently. A typo `e` left the previous firm value without an error.

**Should:** Field-level 400 `invalid_flag_policy` with `fields.{key}`.

### 2. P0 — No upper bounds

**Wrong:** Runway 10_000 months or burn-up 99 would persist. Detectors would never fire (or always fire for ratios > 1 treated as percent-like).

**Should:** Catalog bounds (months 0–36, days 0–365 / 3650, ratios 0–1). 0 stays valid for evidence-gated keys.

### 3. P0 — Policy writes had no audit row

**Wrong:** Partners could not see who last changed runway from 6 → 4.

**Should:** `flag_policy_audits` (before/after jsonb, changed_by, changed_at). RLS + GRANT.

### 4. P1 — Viewer POST already 403

**Wrong:** Keep. Audit insert only after admin write.

### 5. P1 — Settings table hid bounds

**Wrong:** A ratio field looked like a free number.

**Should:** Show “0–1 ratio” / “0–36 months” next to the input. `aria-invalid` on errors.

### 6. P1 — Save copy still said only “recompute”

**Wrong:** Fine to keep. Add “Last change: {name} at {time}.”

### 7. P1 — Infinity / NaN

**Wrong:** `Number("Infinity")` is finite? No — `Number.isFinite` rejects. Keep that in `validateFlagPolicyThresholds`.

### 8. P1 — Unknown keys on POST

**Wrong:** Zod `FlagKeySchema` already drops? `z.record(FlagKeySchema, …)` strips unknown in Zod 3. Still validate remaining.

### 9. P1 — Empty `{}` must not zero the catalog

**Wrong:** Pass 24 already. Audit `after: {}` is “back to defaults,” not 0.

### 10. P1 — RLS isolation for audits

**Wrong:** New tenant table.

**Should:** `RLS_TABLES` + isolation test.

### 11. P1 — Flags page still said “catalog defaults”

**Wrong:** Firm policy has shipped.

**Should:** “Thresholds: Settings → Flag policy (firm). Recompute to apply.”

### 12. P2 — No auto-recompute on save

**Wrong:** Intentional (pass 24). Avoid surprise flags.

### 13. P2 — Per-company / per-fund override

**Wrong:** Deferred. Firm jsonb only.

### 14. P2 — Audit viewer is a table, not SOC2 export

**Wrong:** Last 20 rows on Settings. No CSV dump.

### 15. P2 — First save from `{}` still audits

**Wrong:** Should. Before is `{}`.

### 16. P3 — Severity bands in policy

**Wrong:** Still code-side.

## Residual

- Per-company override.
- Auto-recompute.
- SOC2 export of audits.
