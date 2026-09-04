# Queued pass — NAV

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/nav/page.tsx`, `packages/core/src/nav.ts`, `apps/api/src/routes.ts` (`GET /api/nav`, `POST /api/nav/marks`), `packages/db/src/domain-schema.ts` (`positions`, `marks`), worker `nav` queue in `apps/worker/src/index.ts`  
**Brief SoT:** Gargi v3 NAV report cadence; gap #18–19; build plan Phase 3 (approval/lock later)  
**Out of scope for parallel fix agent:** period lock/approval, IRR wiring, dual FX on marks UI

---

## P0

1. **IRR/XIRR never surfaces on NAV page** — `packages/core/src/metrics.ts` implements `xirr`, build plan claims IRR shipped, but `GET /api/nav` and `nav/page.tsx` only show Cost / NAV / MOIC / Bridge Δ. No cashflow series from positions+marks → IRR stays unreachable.

2. **Marks without `sourceRefId` still enter rollup totals** — UI `Fact` greys unverified chips, but `rollupNav` sums every present `mark` (`packages/core/src/nav.ts`). Anti-hallucination rule: headline NAV must not include unprovenanced marks (or must label incomplete + exclude).

3. **No quarterly period lock / approval** — Page lede admits “Approval / period lock is later.” Brief NAV deliverable needs versioned signed-off quarter; anyone with write can POST marks that silently change headlines (`POST /api/nav/marks`).

4. **Duplicate / conflicting MOIC in API payload** — Handler returns `rollup` (with `headlineMoic` rules) *and* top-level `moic: moic(rollup.nav.total, rollup.cost.total)` (`routes.ts` ~560). Top-level `moic()` ignores incompleteness; clients can show a MOIC the rollup intentionally blanked.

## P1

5. **Bridge keys by `companyId`, not `positionId`** — `navBridge` Map is company-scoped (`packages/core/src/nav.ts`). Two positions in one company (multi-fund) collapse; wrong prior/current pairing.

6. **`defaultPriorAsOf` = calendar −3 months, not quarter-end / FY** — Not Apr–Mar aware; bridge prior can land mid-quarter. File: `packages/core/src/nav.ts`; API query `priorAsOf` unused in UI.

7. **Mark form collects no FX triple / currency / source ref** — Schema supports `fxRate`, `fxDate`, `fxSource`, `sourceRefId`, `currency`; UI only value/method/rationale (`nav/page.tsx`). Dual INR Cr + EUR display impossible for marks.

8. **Free-text `method` with default `last_round`** — No enum (last_round / DCF / bid / write-down); no methodology policy doc link. Inconsistent marks poison bridge narrative.

9. **Ownership % / cost basis / valuation not shown as first-class cards** — `positions.ownershipPct` returned inside `position` object but unused in table. Brief dashboard/NAV: ownership + valuation + MOIC together.

10. **Cost / NAV cards print raw numbers** — No `en-IN` crore formatting, no currency label, no “incomplete” count beyond a lede. `rollup.nav.missing` unused in UI.

11. **Unmarked list is text-only** — Cannot jump to prefilled “Add mark” for that position; high friction for quarterly close.

12. **No fund filter** — Multi-vehicle orgs (India / Europe) see blended table; brief fund-level roll-up needs fund selector.

## P2

13. **Bridge table omits `priorAsOf` / `currentAsOf` columns** — API provides them; UI hides mark-date mismatch (e.g. prior mark from 18 months ago still “prior”).

14. **No mark history / audit trail UI** — Marks append-only in DB but page only shows latest ≤ asOf. Cannot see who changed what (`createdBy` unused).

15. **Worker `nav` queue is a no-op** — `apps/worker/src/index.ts` returns `{ ok: true }` only. Long recompute / snapshot jobs not real.

16. **Position `<select>` labels = company name only** — Duplicate names / multi-fund ambiguous; should show `fundName · companyName`.

17. **Null mark value allowed without confirmation** — POST accepts `value: null`; can wipe contribution to rollup without explicit “clear mark” UX.

18. **No NAV export (PDF/XLSX)** — Brief quarterly NAV report; Reports page is separate generic draft, not NAV-packaged bridge + methodology.

19. **`rollupNav` dead code path** — Intermediate `moic` computed then `void moic`; confusing for next agent — clean up + document headline rules in one place.

20. **As-of date defaults to “today” not last quarter-end** — Analysts opening NAV mid-quarter get a moving target; prefer last locked or last calendar quarter end.

## P3

21. **No empty state when `positions.length === 0`** — Page renders cards only if `data` truthy; empty positions still show 0-ish cards without CTA to create fund/position.

22. **Rationale not displayed in table** — Collected on write, never read back in UI columns.

23. **Tests cover only two bridge cases** — `nav.test.ts` lacks multi-position same company, incomplete cost, FX, and MOIC headline edge cases.

24. **No deep-link `?asOf=` / `?fundId=` from Command** — Ritual navigation friction.
