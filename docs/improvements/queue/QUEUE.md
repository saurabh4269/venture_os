# Improvements queue — next cloud agent batches

**Generated:** 2026-09-05 (IST)  
**Source:** `saurabh4269/venture_os` @ `main` via `gh api` (no clone)  
**Scope:** QA workflows the parallel fix agent is **not** yet fixing — Flags, NAV, Compare, Reports, Company detail, Connectors/settings stubs  
**Status:** P0s in these queue files are implemented on `cursor/qa-fix-pass-batch-1-851c` (passes 06–20). Remaining work: `docs/improvements/NEXT.md`.

**Rule:** Box files only; do **not** push to GitHub from this queue work

---

## Batch priority order

Work top-down. Each batch should stay inside one area file unless a P0 cross-cuts (noted). Prefer P0→P1 within a batch; leave P3 for polish sweeps.

| Order | Batch | Queue file | Why this order | Suggested agent focus |
| --- | --- | --- | --- | --- |
| **1** | **Company detail — data integrity** | `queued-pass-company-detail.md` | Hardcoded commentary period + org-wide `sourceRefs` leak are live correctness/privacy bugs affecting Reports/Ask/Flags downstream | P0 #1–2 first; then KPI strip + locator click-through (P0 #3–4, P1) |
| **2** | **Flags — catalog + detector truth** | `queued-pass-flags.md` | False-positive / wrong-prior / missing brief categories destroy partner trust in the ritual | P0 catalog + plan_variance + mute model + new-company mis_late; P1 prior()/evidence refs |
| **3** | **NAV — headline integrity** | `queued-pass-nav.md` | Unprovenanced marks in rollup + conflicting MOIC + no IRR/lock block quarterly NAV deliverable | P0 #1–4; bridge by positionId; FX/source on mark form |
| **4** | **Reports — draft correctness + exports** | `queued-pass-reports.md` | One-pager-without-company bug + toy PDF + cookie-less downloads break “minutes not days” | P0 #1–4; curated template + commentary in XLSX (P1) |
| **5** | **Compare — analyst control** | `queued-pass-compare.md` | Without metric/period/company controls, Compare stays demo-grade | P0 picker + period align + export; runway 3-mo avg shared with Flags |
| **6** | **Connectors / settings stubs** | `queued-pass-connectors-settings.md` | OAuth not in scope yet; still unblock FY edit, invite RBAC, mapping stub fields, admin UX | P0 settings form + invite role mapping + mapping stubs; no fake `lastSyncAt` |

---

## Cross-batch shared fixes (do once, reference everywhere)

1. **3-month average burn → runway** — `packages/core/src/metrics.ts` (+ Flags job, Compare handler, Company headline). Brief §5 cash fields.  
2. **`formatDualDisplay` / provenance chips** — reuse on NAV marks, Compare cells, Company book, Report exports.  
3. **Authenticated file download helper** — blob `fetch` with `credentials: "include"` for report exports *and* document openers if cross-origin.  
4. **Firm flag policy thresholds** — Settings (batch 6) feeding `FLAG_CATALOG` defaults (batch 2).

---

## Parallelism guidance

- Batches **2 + 3** can run in parallel after batch **1** P0 lands (company refs leak otherwise pollutes flag evidence UX).  
- Batch **5** should wait on runway helper from batch **2** (or land shared metric helper first as a tiny batch 0).  
- Batch **6** can run parallel to **4/5** if invite/role fix is isolated from report auth download work.

---

## File index

| File | Area | Min issues |
| --- | --- | --- |
| `queued-pass-flags.md` | Flags | 24 (P0–P3) |
| `queued-pass-nav.md` | NAV | 24 |
| `queued-pass-compare.md` | Compare | 24 |
| `queued-pass-reports.md` | Reports | 24 |
| `queued-pass-company-detail.md` | Company detail | 25 |
| `queued-pass-connectors-settings.md` | Connectors/settings | 26 |

Each issue cites concrete repo paths under `apps/web`, `apps/api`, `packages/core`, `packages/db`, `packages/schema`, or `apps/worker`.

---

## Explicitly deferred (do not invent in these batches)

- Real Microsoft Graph / Affinity / Granola OAuth field lists (AGENTS.md: stub + **not connected** only).  
- LP / ILPA data room (Phase 2).  
- SOC2 full program / billing.  
- PPTX cinematic brand polish beyond readable exports (ok as P2/P3 only).
