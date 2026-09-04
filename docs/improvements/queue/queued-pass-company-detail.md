# Queued pass — Company detail page

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/companies/[id]/page.tsx`, `apps/api/src/routes.ts` (`GET /api/companies/:id`, upload, commentary), onboard wizard `apps/web/src/app/companies/new/page.tsx`  
**Brief SoT:** Live per-company record — stage, ownership, valuation, NAV, MOIC/IRR, cash, burn, runway, last round; drill-to-source; dual commentary; vault; ≤15 min onboard  
**Out of scope for parallel fix agent:** headline KPI strip, time series, commentary period UX, source locator precision

---

## P0

1. **Commentary save hardcodes Aug 2025 period** — `addNote` posts `periodStart: "2025-08-01"`, `periodEnd: "2025-08-31"` (`companies/[id]/page.tsx` ~50–51). Every note lands on wrong month; corrupts monthly sheet / reports.

2. **`GET /api/companies/:id` loads all org `sourceRefs`** — `tx.select().from(sourceRefs).where(eq(sourceRefs.orgId, s.orgId))` (`routes.ts` ~203). Leaks other companies’ excerpts to the client and blows payload size. Scope refs to this company’s document ids.

3. **No headline KPI strip** — Page jumps to raw metric table. Brief/company tracking needs cash, burn, runway, ownership, NAV/MOIC, last round as facts-with-provenance at top (Command-like cards).

4. **Source click opens whole file, not cell/page** — `Fact` href = `/api/documents/${documentId}/file` only; locator (`sheet`/`cell`/`page` on `sourceRefs`) never used. Brief: one-click to cell.

## P1

5. **All metric versions listed with no “current only” filter** — Restatements appear as duplicate rows (`version` column only). Partners need current vs history toggle.

6. **No time series / sparklines** — Brief: trend against earlier months; table is flat history dump.

7. **Flags subsection omits evidence and links** — Only `flagKey · severity`; should deep-link to Flags or inline evidence JSON→readable.

8. **Upload has no parse status / inbox deep link after success** — `Upload` calls onDone reload; user may not notice pending inbox items (wizard step 3 does; detail page does not).

9. **No edit profile / FY override / unit hint on detail** — Fields exist on create (`companies/new`) and schema (`fyStartMonth`, `unitHint`, `currencyHint`) but detail is read-only header.

10. **No position / ownership / Affinity stub fields** — Ownership mostly from Affinity per brief; company page never shows `positions` or connector mapping IDs.

11. **404 / error loading** — Failed fetch leaves perpetual “Loading company…” (`if (!data)`).

12. **Dual EUR display ad-hoc** — Inline FX note logic duplicates `formatDualDisplay` incompletely; prefer shared helper for consistency with Compare.

13. **Default commentary lane is `subjective`** — Unusual default on MIS-centric page; risk of mis-filing objective notes (API gate helps for MIS sourceKind, but human notes allowed on either).

14. **Commentary list hides period** — API returns `periodEnd`; UI renders body only → after P0#1 fix, still need period labels + lane badges.

## P2

15. **Vault list missing period / uploadedAt / sha** — Hard to pick “latest MIS.”

16. **No document kind filter** — MIS vs board_pack vs transcript mixed; subjective lane depends on transcripts (Granola not connected).

17. **Accept attribute blocks DOCX** — Gap matrix: no DOCX parse yet; UI correctly limits, but brief packs sometimes arrive as DOCX — show explicit “DOCX not supported” empty hint.

18. **No derived runway shown when cash+burn present but `runway_months` metric absent** — Compute via `runwayMonths` for headline strip (deterministic).

19. **Company header claims “FY Apr–Mar unless overridden” without showing actual `fyStartMonth`** — Read from company row and display.

20. **No link to Compare / prefiltered Ask** — Ritual shortcuts missing.

21. **Upload `kind` hidden fixed `mis`** — Cannot upload board pack / transcript from detail without changing code.

22. **Metrics table missing currency dual column and confirmedBy/At** — Auditability gap vs corrections model.

## P3

23. **Onboard wizard skip goes to detail before extract** — OK, but detail empty-state should repeat “go to Inbox” CTA (partially present).

24. **No print / one-pager shortcut** — Button to `POST /api/reports` one_pager for this `companyId`.

25. **Accessibility: two commentary columns rely on color alone** (`lane-obj` / `lane-sub`) — Keep text labels (present) but ensure contrast.
