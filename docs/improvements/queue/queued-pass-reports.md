# Queued pass — Reports

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/reports/page.tsx`, `apps/api/src/routes.ts` (`/api/reports*`), `apps/api/src/reports-export.ts`, `packages/db/src/domain-schema.ts` (`reports`), worker `report` queue  
**Brief SoT:** Monthly portfolio performance sheet; on-demand portfolio + company one-pagers; PDF/PPTX/XLSX; objective vs subjective never blended; minutes not days  
**Out of scope for parallel fix agent:** V3 branded templates, monthly pack cadence, async generation, auth-safe downloads

---

## P0

1. **`one_pager` without `companyId` drafts all companies under a misleading title** — `POST /api/reports` sets `target = cos` when `companyId` omitted, title uses `target[0]?.name` or `"Company"` while `pages` includes everyone (`routes.ts` ~764–788). UI allows Draft one-pager with “All companies” selected. Require `companyId` for `one_pager` or block in UI.

2. **PDF exporter is a toy text stream, truncates at 60 lines** — `simplePdf` in `reports-export.ts` hard-slices lines; large portfolios silently drop content. Not partner-ready; brief expects real PDF templates.

3. **No distinct “monthly portfolio performance sheet” deliverable** — Brief cadence table lists automated monthly sheet (numbers + dual commentary). Only generic `one_pager` / `portfolio` kinds exist; no period parameter, no MIS-month pinning.

4. **Export `<a href={apiUrl(...)}>` likely drops session cookies cross-origin** — Web uses `credentials: "include"` for `fetch` (`apps/web/src/lib/api.ts`) but plain navigation to `NEXT_PUBLIC_API_URL` may 401 depending on SameSite. Need cookie-aware download (`fetch` blob + save) or same-origin BFF proxy.

## P1

5. **Draft dumps every metric row — not a curated one-pager template** — Handler maps all `metricValues` for company (`routes.ts` ~773). Partner one-pager needs fixed field order (revenue, GM, cash, burn, runway, ownership, flags summary).

6. **PPTX keeps only first 10 metrics and first commentary line each lane** — `reports-export.ts` `slice(0, 10)` and `objective[0]` / `subjective[0]`. Rest of book invisible in deck.

7. **XLSX omits commentary lanes entirely** — Sheet is metrics-only; brief monthly sheet requires objective + subjective side-by-side, visibly separate.

8. **No EUR / FX columns in any export** — Dual currency rule ignored in export builders despite book storing `valueEur` + FX triple.

9. **No in-app preview / edit-before-export** — Analysts cannot edit narrative; “edit rather than assemble” brief unmet. List is title + kind + chips only.

10. **Worker `report` queue is stub** — Sync insert+export in API request path; large portfolios will time out. `apps/worker/src/index.ts` report worker returns `{ ok: true }` without building files.

11. **No ownership / NAV / MOIC / flags block in portfolio draft** — Portfolio report is per-company metric dumps only; fund roll-up absent.

12. **`createdAt` not shown in UI table** — Cannot tell which draft is current; no archive/delete.

## P2

13. **No period filter when drafting** — Includes all historical metric versions/periods → noisy exports; should pin `asOf` / latest current version only.

14. **Restatements:** export includes every `version` row — Need “current only” (`restatementOfId` / max version per key+period).

15. **No authz nuance** — Viewer can hit export URLs if cookie present; confirm role matrix (Viewer read OK; draft write restricted — POST uses `requireWrite`, good; document it).

16. **Filename slug strips non-ASCII company names** — Indian legal names may collapse to `report.xlsx`.

17. **No progress / failure toast on Draft buttons** — Double-click creates duplicate drafts; errors throw uncaught.

18. **Objective/subjective not labeled as MIS vs transcript in export body metadata** — Lanes separated in text but no sourceKind / citation ids on commentary lines.

19. **Reports table grows unbounded** — No retention, no “regenerate” replacing prior draft for same kind+period.

20. **Gap vs V3 brand templates** — Typography in PPTX is generic Georgia; no logo/token slot (explicitly later polish, but track as P2 for design-partner trust).

## P3

21. **Empty reports list has no empty-state CTA** — Unlike Flags/Compare.

22. **Kind strings raw (`one_pager`)** — Display labels.

23. **No “download all formats” zip**.

24. **Instrumentation missing** — Brief success: “minutes not days”; no `time_to_draft_ms` logged on POST.
