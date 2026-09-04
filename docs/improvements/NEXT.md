# Next — remaining after passes 01–22

**Branch / PR:** `cursor/qa-fix-pass-batch-1-851c` · https://github.com/saurabh4269/venture_os/pull/2  
**Queue source:** `docs/improvements/queue/` (static review of `main`)

Queued P0s **and** the remaining P1 sweep in those files are implemented on this branch (pass 21). Do not re-open them as “unfixed on main.”

## Closed in pass 22

- NAV as-of defaults to last calendar quarter-end; empty mark requires clear confirmation; rationale column.
- Vault kind/period filter; book confirmedBy/At.
- Reports optional `periodEnd`; non-ASCII filename suffix.
- Compare URL state + sticky first column; Flags → Compare deep link.
- Settings connectors never return `config` / `lastSyncAt`; unique `(org_id, kind)`.
- Onboard fund picker. `mark_stale` never-marked is `low`.

## Closed in pass 21

- Company profile editor, booked positions, dual-display book, vault SHA/DOCX, upload parse + Inbox, one-pager shortcut, flag evidence.
- Settings fund fields, connector labels + disabled Connect + vault fallback, honest OneDrive/Granola/Affinity copy, read-only flag-policy table.
- Curated one-pager, XLSX commentary+FX, paginated PPTX/PDF, reports createdAt + busy.
- Compare stage/sector, hide-empty, catalog labels, loading/error, objective-lane filter.
- NAV priorAsOf, fund filter, ownership, method enum, unmarked prefill, `en-IN`, dated-only IRR.
- Flags severity/company/key filters, recompute busy/error, `detectedAt`.

## Still later (do not invent)

1. **NAV period lock / approval** — gap #19. Write role can still change an unofficial as-of.
2. **Firm flag-policy persistence** — Settings shows catalog defaults only; writing thresholds needs `org_settings` jsonb + migration.
3. **Reports monthly pack + worker artifacts** — on-demand draft is real; scheduled pack is not.
4. **Ask eval harness** — citation fidelity beyond unit tests.
5. **INR Cr canonical compare column** — native unit stays primary; INR Cr is shown on the cell note when `toInrCrore` can convert (pass 22). Dual EUR still needs an FX triple.
6. **Growth / burn-multiple derived compare columns** — not in the metric enum; do not invent.

## Explicitly deferred (need OAuth or Phase 2)

- OneDrive / Affinity / Granola — stub + **not connected**. Never invent folder IDs or `lastSyncAt`.
- SMTP / domain auto-join.
- SOC2 audit log viewer.
- LP / ILPA room.
- PDF bbox / cell highlight inside the file (locator text is shown).

## How to continue

1. Keep this branch or open `cursor/<slug>-851c` off latest `main` after merge.
2. Write `docs/improvements/pass-NN-*.md` (≥15 items) then fix P0/P1.
3. `pnpm typecheck && pnpm test` before push.
4. Do not copy v3.heisenbug.in. Missing ≠ 0. LLM never commits facts.
