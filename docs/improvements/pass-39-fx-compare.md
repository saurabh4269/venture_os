# Pass 39 — Dual EUR everywhere + Compare INR Cr column

**Date:** 2026-09-05  
**Surface:** NAV headlines/marks, reports XLSX EUR cells, Compare INR Cr  
**Evidence:** NEXT.md item 5; pass 22 cell-note only.

## Issues

### 1. P0 — NAV showed raw `toLocaleString` with no FX triple

**Wrong:** Lede promised “Dual EUR only with a complete FX triple” but cards and the mark table never showed EUR or a refuse.

**Should:** `formatDualDisplay` on mark cells. Headline EUR only when every sourced mark has a complete triple; otherwise `EUR — (no FX triple)`.

### 2. P0 — Incomplete triple on a mark still stored a guessed EUR

**Wrong:** `toEur` already refuses. UI must not display `valueEur` without rate+date+source.

**Should:** Same helper as Command.

### 3. P1 — Compare parked INR Cr in a Fact note

**Wrong:** Easy to miss. Partners asked for a canonical crore column.

**Should:** Explicit `INR Cr` line (`data-testid=compare-inr-cr`) when convertible; `—` when not (never 0).

### 4. P1 — Compare header did not say the cell is native + INR Cr + EUR

**Wrong:** Cash looked like a single number.

**Should:** Column hint “native · INR Cr · EUR”.

### 5. P1 — CSV export dropped INR Cr and EUR

**Wrong:** CSV was native display only.

**Should:** Extra columns `{metric} (INR Cr)` and `{metric} (EUR)` with — when refused.

### 6. P1 — Reports XLSX money cells had no EUR refuse

**Wrong:** Monthly pack wrote native values. A reader could invent EUR.

**Should:** EUR columns for cash / burn / net_revenue using the stored triple; — without it.

### 7. P1 — NAV cost/bridge still silent on FX

**Wrong:** Cost is usually INR. Do not invent a rate for cost if the mark triple is the only FX on the row.

**Should:** Cost stays native. Mark carries the triple. Headline EUR is marks-only.

### 8. P1 — API NAV positions omitted fx_* 

**Wrong:** UI could not format.

**Should:** Pass through mark fxRate/fxDate/fxSource + computed valueEur.

### 9. P2 — Command / company already dual

**Wrong:** Keep. Do not regress.

### 10. P2 — Inbox proposals are not facts

**Wrong:** Do not show EUR on unconfirmed rows.

### 11. P2 — Percent / months metrics must not grow an INR Cr column

**Wrong:** `toInrCrore` already returns null. Show — / hide the cr line.

### 12. P2 — Mixed-currency compare

**Wrong:** INR Cr is null for EUR-native rows. Do not convert without a triple.

### 13. P2 — Snapshot pack includes FX fields

**Wrong:** Official pack should freeze the same refuse rule.

### 14. P3 — Growth / burn-multiple compare columns

**Wrong:** Not in the metric enum. Residual.

### 15. P3 — Display currency other than EUR

**Wrong:** Firm display currency is EUR. Do not invent USD dual.

### 16. P1 — Unit test for headline EUR refuse when one mark lacks a triple

**Should:** `rollupEur` in core.

## Residual

- Derived compare columns.
- PDF bbox of the FX source cell.
