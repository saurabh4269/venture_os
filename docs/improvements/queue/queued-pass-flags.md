# Queued pass — Flags

**Repo:** `saurabh4269/venture_os` @ `main`  
**Primary surfaces:** `apps/web/src/app/flags/page.tsx`, `packages/core/src/flags.ts`, `packages/db/src/flags-job.ts`, `apps/api/src/routes.ts` (`GET/POST /api/flags*`), `packages/schema/src/index.ts` (`FlagKeySchema`)  
**Brief SoT:** Gargi v3 §6 risk/anomaly + §7 flag starting set; gap matrix #24; product spec §8  
**Out of scope for parallel fix agent (assume still open):** mute/snooze, catalog expansion, policy UI, evidence UX

---

## P0

1. **Brief flag categories missing from catalog** — `FlagKeySchema` / `FLAG_CATALOG` only have 7 keys (`runway_short`, `mis_late`, `burn_up`, `gm_compression`, `plan_variance`, `mark_stale`, `cash_unreported`). Brief requires also: spend rising without revenue growth, customer concentration shift, ownership/governance change, key person departure, concerns on call absent from MIS. Files: `packages/schema/src/index.ts`, `packages/core/src/flags.ts`.

2. **`plan_variance` fires on beat and miss** — `detectPlanVariance` uses `Math.abs(v)`; brief says “Revenue below plan beyond an agreed band.” Over-performance should not be the same severity (or same flag). File: `packages/core/src/flags.ts`.

3. **Refresh clears then re-inserts — no mute/snooze, destroys identity** — `runFlagJob` sets all open rows to `cleared` then inserts new rows (`packages/db/src/flags-job.ts`). Schema has no `muted_until`, `muted_by`, `reason`. Gap analysis / product require attributable mute/snooze so FP does not train the team to ignore flags. Files: `packages/db/src/domain-schema.ts` (`flagEvents`), `flags-job.ts`, flags UI.

4. **`mis_late` on brand-new companies = FP spam** — `detectMisLate(null, …)` always raises `no_confirmed_mis`. Every newly onboarded company with no book yet becomes an open flag. Need grace from `companies.createdAt` or only after first expected MIS window. Files: `packages/core/src/flags.ts`, `flags-job.ts`.

## P1

5. **Evidence UI is raw `JSON.stringify`** — `apps/web/src/app/flags/page.tsx` dumps evidence as `<code>`. Partners need human labels (runway months, threshold, period) + severity chip + link to company / source. Catalog `label` unused.

6. **`sourceRefIds` collected but never shown or clicked** — Job stores refs; GET `/api/flags` returns them; UI ignores. Brief: ranked list *with evidence* and one-click source. Wire `Fact`/document links like company page.

7. **Broken evidence ref selection** — `flags-job.ts` filters `m.metricKey === hit.flagKey` (flag keys never equal metric keys). Refs often only cash/burn slice, wrong for GM/plan/mark flags.

8. **`prior()` confuses restatement versions with prior period** — Metrics ordered by `periodEnd, version` desc; `prior()` takes `matches[1]`, which may be same period different version, not prior month. Corrupts `burn_up` / `gm_compression` / `cash_unreported`. File: `packages/db/src/flags-job.ts`.

9. **Runway detector uses single-period burn, not 3-mo average** — Brief: runway = closing cash / average burn over last three months. `runwayMonths` / `detectRunwayShort` use one burn point (`packages/core/src/metrics.ts`, `flags.ts`).

10. **`burn_up` ≠ brief “spend rising without matching revenue growth”** — Detector only compares burn MoM; never checks revenue growth. Either rename or add paired detector.

11. **No severity / company / key filters or sort** — Flags page is a flat table; brief wants a *ranked* list. No query params on `GET /api/flags`.

12. **Hard-coded thresholds, not firm flag policy** — `FLAG_CATALOG.defaultThreshold` never read from `orgSettings` / policy table. Product spec: firm-configurable spectrum. Settings has no flag-policy UI.

13. **`mark_stale` only inspects `pos[0]`** — Multi-position companies ignore other funds’ marks (`flags-job.ts`).

## P2

14. **No tests for `detectMisLate` / `detectMarkStale` / `detectAll` integration** — `flags.test.ts` covers subset only; date-boundary and null-MIS cases untested.

15. **UI shows `flagKey` snake_case, not `FLAG_CATALOG.label`** — Poor partner UX (`flags/page.tsx`).

16. **No link from flag row → `/companies/[id]`** — Company name is plain text.

17. **Recompute button has no loading / error state** — Failed POST leaves stale table; empty state message ambiguous (“quiet” vs “unconfirmed” vs “job failed”).

18. **`mark_stale` with no mark is always `med`** — Same severity as short runway path for missing MIS; triage noise. Consider `low` + separate “never marked” key.

19. **Worker `flags` queue OK, but no SLA / last-run indicator** — Analysts cannot see whether detectors are stale vs book. Optional `detectedAt` shown nowhere in UI.

20. **Open flags on company detail omit evidence** — `companies/[id]/page.tsx` lists `flagKey · severity` only; inconsistent with Flags page contract.

## P3

21. **No FP / precision telemetry** — Gap analysis success metric “few enough false positives”; no mute rate, clear rate, or time-to-ack instrumentation.

22. **Catalog not versioned** — Adding keys will break older stored `flag_key` rows without migration/docs; need catalog version in evidence or policy.

23. **Empty-state copy blends “quiet book” and “unconfirmed headlines”** — Split CTAs: go to Inbox vs confirm quiet.

24. **CSS `sev-*` classes assumed** — Verify `globals.css` covers `low|med|high`; missing class = invisible severity.
