# Queued pass — Compare

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/compare/page.tsx`, `apps/api/src/routes.ts` (`GET /api/compare`), helpers `formatDualDisplay` / `runwayMonths` in `packages/core`  
**Brief SoT:** Gargi v3 cross-company comparison — chosen metrics, stage/period normalized, export, peer benchmarking  
**Out of scope for parallel fix agent:** metric picker UI, period alignment, export

---

## P0

1. **No metric picker in UI** — API accepts `?metrics=` (`routes.ts` ~604) but page always calls `/api/compare` with defaults. Brief: “any set of companies compared on a *chosen* metric set.”

2. **No period alignment** — Each cell independently takes latest `periodEnd` per company; matrix can mix Mar vs Jun without labeling. Brief requires normalized reporting period.

3. **No stage / sector normalization or peer filter** — All companies dumped into one matrix; brief asks peer benchmarking inside a sector and stage-aware compare.

4. **One-pager-style export missing** — Brief: “Comparison view *and export*.” Page has table only; no CSV/XLSX.

## P1

5. **`periodEnd` returned but never rendered** — Cell type includes `periodEnd`; UI ignores → silent misalignment risk (P0#2 amplified).

6. **No company multi-select** — Cannot compare “these 4 consumer brands”; always full portfolio including empty books.

7. **Runway cell uses single burn, not 3-mo average** — Same brief gap as flags (`runwayMonths(cash, burn)` in compare handler).

8. **Derived runway provenance incomplete** — `sourceRefId` set only if *both* cash and burn refs exist, but chip uses cash’s ref only; no dual citation; `Fact` gets no `href` to open source.

9. **Default metric set omits brief compare set** — Brief examples: growth, GM, burn multiple, CAC, payback, revenue per head. Defaults: `net_revenue,cash,burn,gross_margin_pct,runway_months` — no CAC/payback/rev-per-head (and no derived helpers).

10. **Units not normalized across companies** — `formatDualDisplay` shows native unit/currency per cell; lakh vs crore vs USD side-by-side without canonical INR Cr column.

11. **Restatement / version selection unspecified** — Filter sorts by `periodEnd` only in compare path for non-runway keys; if multiple versions same end, array order from full table scan is undefined → flaky cells.

12. **Empty / all-dash rows clutter** — Companies with no confirmed metrics still occupy rows; no “hide empty” toggle.

## P2

13. **Column headers are raw `metricKey`s** — No human labels from catalog (`packages/core/src/catalog.ts` if present / schema).

14. **No sort-by-column** — Cannot rank portfolio by runway or GM from the matrix.

15. **No error / loading / retry UX** — `useEffect` fetch; failure leaves blank forever; no empty vs error distinction beyond matrix length.

16. **FX note shown via `Fact` note prop inconsistently** — Dual display may refuse EUR; partners need explicit “native only” column pair for fair compare.

17. **No deep link from Flags / Command** — Cannot open Compare pre-filtered to flagged names.

18. **Growth rate metric absent** — Brief “growth”; no MoM/YoY derived column in API.

19. **Burn multiple not computed** — Common VC compare metric; not in schema enum or compare handler.

20. **Accessibility: wide table no sticky first column** — Horizontal scroll loses company names (CSS/`globals.css`).

## P3

21. **No keyboard / URL state for selected metrics** — Refresh loses analyst configuration once picker exists; design `?metrics=&period=&companyIds=` now.

22. **Sector header grouping** — Nice-to-have peer sections.

23. **Compare ignores `lane`** — Could theoretically mix subjective if ever stored as metrics (defense in depth: filter `lane === 'objective'`).

24. **No snapshot / shareable compare ID** — On-demand only; cannot pin “IC compare 2026-Q2.”
