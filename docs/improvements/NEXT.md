# Next — remaining after passes 01–19

**Branch / PR:** `cursor/qa-fix-pass-batch-1-851c` · https://github.com/saurabh4269/venture_os/pull/2  
**Queue source:** `docs/improvements/queue/` (static review of `main`)

The queued P0s from that review are **closed on this branch**. Do not re-open them as “unfixed on main.” Work residuals below.

## Closed P0s (do not redo)

| Queue item | Where it landed |
| --- | --- |
| Hardcoded Aug-2025 commentary | Company date inputs + inbox `period_required` |
| Org-wide `sourceRefs` on company GET | Scoped to that company’s document IDs |
| Flag catalog vs brief | Catalog + `spend_without_revenue`; `call_concern` / concentration / ownership / key person are catalog-only until Granola/Affinity exist |
| `plan_variance` beat+miss | Below-plan only |
| Refresh wipe / no mute | `snoozed`/`muted` survive recompute; unmute + tabs |
| `mis_late` on new companies | 45-day grace from `createdAt` |
| `prior()` restatement | `seriesFor` / `latestByPeriod` |
| NAV unprovenanced marks in headline | Rollup sums sourced marks only; lists `unprovenanced` |
| Dual MOIC path | `moic: rollup.moic` only |
| Bridge by company | Match by `positionId` |
| FX / memo on mark form | Triple + optional vault file → `sourceRef` |
| One-pager without `companyId` | API 400 + UI block |
| Cookie-less export/download | `downloadAuthed` / `Fact.sourcePath` |
| Compare pickers + export | Company / metric / period + CSV |
| FY form / invite role / mapping stubs | Settings; no fake `lastSyncAt` |
| Shared 3-mo runway + dual display | `runwayMonthsFromBurns`, `formatDualDisplay` |

## Remaining (next agent — do not invent connectors)

### Still P1 / product-complete

1. **NAV period lock / approval** — gap #19. Anyone with write can still change an unofficial as-of.
2. **IRR on NAV** — `xirr` exists; do not invent an investment date. Surface only when dated cashflows exist.
3. **Firm flag-policy thresholds in Settings** — catalog defaults only today.
4. **Reports monthly pack + worker artifacts** — on-demand draft is real; scheduled pack and async PDF for huge books are not.
5. **Compare stage/sector peer filter + INR Cr canonical column.**
6. **Company profile editor** (FY / unit hint / legal name) on the detail page.
7. **Positions / ownership on company detail** — Affinity still **not connected**; show booked `positions` only.
8. **Ask eval harness** — citation fidelity beyond unit tests.

### Explicitly deferred (need OAuth or Phase 2)

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
