# Pass 25 — Reports monthly pack

**Date:** 2026-09-04  
**Surface:** Reports draft + XLSX + worker artifact  
**Evidence:** Gargi §2 portfolio performance sheet; NEXT.md item 3; build plan Phase 4 worker checkbox.

## Issues

### 1. P0 — No monthly sheet

**Wrong:** Only one-pager and portfolio dump. Brief asks a monthly pack: numbers + objective + subjective side by side.

**Should:** Kind `monthly_pack` with a Monthly worksheet.

**Fix:** `buildMonthlyPackRow` + export.

### 2. P0 — Lanes could blend in one cell

**Wrong:** A single “commentary” column would violate the hard product rule.

**Should:** Separate Objective and Subjective columns. Missing lane is —.

**Fix:** XLSX Monthly + Lanes sheets.

### 3. P1 — Worker report job was a no-op

**Wrong:** `return { ok: true }` without an artifact.

**Should:** `runReportJob` writes XLSX to the object store and sets `storage_key` / `artifact_status`.

**Fix:** `packages/db/src/report-job.ts` + worker.

### 4. P1 — No artifact columns

**Wrong:** `reports` had jsonb body only.

**Should:** `storage_key`, `artifact_status` (`inline` | `queued` | `ready` | `failed`), `artifact_error`.

**Fix:** Migration 0007.

### 5. P1 — Redis down = pack never lands

**Wrong:** Queue-only would strand the draft.

**Should:** `enqueueReport` falls back to inline `runReportJob` (same pattern as parse).

**Fix:** `queues.ts`.

### 6. P1 — Period pin ignored commentary

**Wrong:** Metrics could pin `periodEnd` while notes from another month appeared.

**Should:** Filter commentary by the same period when set.

**Fix:** Reports POST.

### 7. P1 — Missing metrics shown as 0

**Wrong:** Easy in Excel.

**Should:** `—` for null. Unit test on pack row.

**Fix:** `reports.test.ts`.

### 8. P1 — UI had no monthly CTA

**Wrong:** Partners would not find the pack.

**Should:** “Draft monthly pack” + kind label.

**Fix:** Reports page.

### 9. P2 — Portfolio kind reused one-pager curation

**Wrong:** After this pass, portfolio still dumps latest-by-metric; monthly and one-pager share curated keys.

**Should:** Explicit branch. Invalid kind → 400.

**Fix:** `ReportKindSchema`.

### 10. P2 — PDF/PPTX had no monthly title

**Wrong:** Pack looked like a generic portfolio.

**Should:** Title `Monthly pack · {period}`.

### 11. P2 — Subjective from MIS

**Wrong:** Existing commentary gate remains; pack only reads booked lanes.

**Should:** Do not invent subjective from metrics.

### 12. P2 — Busy/error on draft

**Wrong:** Double-click could enqueue two packs.

**Should:** Busy flag includes `monthly_pack`.

### 13. P2 — Empty org pack

**Wrong:** A pack with no companies should still be a draft, not a fake V3 list.

**Should:** Empty pages/rows. Missing ≠ demo.

### 14. P2 — On-demand export still works if worker fails

**Wrong:** Failed artifact would 404 exports.

**Should:** GET export still builds from `body` jsonb.

### 15. P3 — Scheduled first-of-month cron

**Wrong:** Not connected.

**Should:** Deferred. On-demand only.

### 16. P3 — PPTX cinematic polish

**Wrong:** Out of scope.

**Should:** Readable table is enough.

## Residual

- Scheduled pack / email distribution.
- Artifact download URL separate from on-demand export (storage_key is recorded).
