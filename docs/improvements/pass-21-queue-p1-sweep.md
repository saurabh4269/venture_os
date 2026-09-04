# Pass 21 — remaining queue P1s (company, settings, reports, compare, NAV, flags)

**Branch:** `cursor/qa-fix-pass-batch-1-851c`  
**Queue:** `docs/improvements/queue/queued-pass-*.md` residuals after passes 01–20  
**Rule:** Missing ≠ 0. No invented connector IDs or `lastSyncAt`. IRR only when dated cashflows exist.

## What was wrong

Queue P0s closed in earlier passes. Remaining P1s left partner surfaces incomplete:

1. Company detail could not edit FY / unit / legal name (schema + create wizard only).
2. Booked `positions` never shown; ownership looked like an Affinity hole rather than “not connected, here is the book.”
3. Book table still hand-rolled FX instead of `formatDualDisplay`.
4. Vault hid `createdAt` / SHA; DOCX limitation was silent.
5. Detail upload did not poll parse or deep-link Inbox (wizard already did).
6. No one-pager shortcut from the company page.
7. Company flags omitted human evidence.
8. Funds form captured `name` only (`vintage` / `currency` / `committedCapital` unused).
9. Connectors table used raw kinds, no disabled Connect CTA, no vault fallback.
10. Settings never stated OneDrive-primary / Granola-subjective / Affinity-ownership honestly.
11. Flag-policy thresholds lived only in `FLAG_CATALOG` with no Settings surface.
12. One-pager drafts dumped every metric version instead of a curated field order.
13. XLSX omitted commentary and FX; PPTX sliced 10 rows / first line; PDF hard-cut 60 lines.
14. Reports UI hid `createdAt` and allowed double-click duplicate drafts.
15. Compare had no stage/sector peer filter, no empty-row hide, no catalog labels, no loading/error.
16. Compare did not defend `lane === 'objective'`.
17. NAV hid ownership, fund filter, prior-as-of control, method enum, unmarked prefill, `en-IN` totals, and IRR even when `investedAt` existed.
18. Flags page had no severity / company / key filter; recompute had no busy/error; `detectedAt` unused.

## What changed

- `PATCH /api/companies/:id` + profile editor (FY, unit/currency hint, legal name, sector, stage).
- Company GET returns booked positions (fund name, ownership, cost, instrument, investedAt). No Affinity IDs.
- Book cells use `formatDualDisplay`. Vault shows uploaded-at + SHA. Explicit “DOCX not supported.”
- Upload polls `/api/documents/:id` and links Inbox. One-pager POST from the company page.
- Flags on the company page render catalog label + evidence line.
- Funds POST/UI: vintage, currency, committed capital.
- Connector labels, disabled Connect, vault deep link, honest copy. Read-only flag-policy table from `FLAG_CATALOG` (not a fake editor).
- One-pager uses `ONE_PAGER_METRIC_KEYS` + derived runway when the metric is absent. Pages carry FX + flags.
- XLSX metrics + commentary sheets; PPTX paginates metrics and all commentary lines; PDF is multi-page.
- Reports table shows created-at, kind labels, draft busy/error.
- Compare: stage/sector query + pickers, hide-empty, catalog labels, loading/error, objective-lane filter, CAC in the picker.
- NAV: `priorAsOf`, fund filter, ownership column, method enum, unmarked → prefill, `en-IN`, per-position IRR only with `investedAt` + mark date.
- Flags: severity/company/key filters, recompute busy/error, `detectedAt`.

## Residual

- NAV period lock / approval (gap #19) still later.
- Headline portfolio IRR stays — unless every provenanced position has `investedAt` (we do not invent dates).
- Flag thresholds are catalog defaults; writing them to `org_settings` needs a jsonb contract + migration.
- OneDrive / Affinity / Granola still **not connected**.
- Scheduled monthly pack / worker PDF for huge books still later.
- Ask eval harness still later.
