# Build plan — Agentic OS (phases 0–6)

**Status:** Locked delivery order  
**Pack date:** 2026-09-05 (Asia/Calcutta)  
**Implementation:** Phases 0–4 largely shipped in this repo; Phase 5 connector **infra** shipped (Pass 42) — live vendor calls wait on operator secrets. Tick boxes in the same PR as behaviour — do not rewrite the plan.  
**Rule:** Port UX patterns from the demo; **do not** port the demo data plane (corpus-JSON, ephemeral inbox, OpenAI-coupled Luna, serverless-heavy parse).

Functional SoT: Gargi brief v3 (`V3_Requirement_Brief_v3_Gargi_2026-09-03.pdf`). Architecture: `03_ARCHITECTURE.md`. Invariants: `05_DATA_MODEL.md`.

---

## Port vs do-not-port

### Port (reimplement patterns)

- Command-center IA: Command / Inbox / Flags / NAV / Compare / Reports / Ask / Documents.
- Citation / SourceChip UX and “decline rather than guess” Ask contract.
- Flag categories and severity framing (starting catalog; firm-configurable later).
- First-principles Venture OS UI (do not clone v3.heisenbug.in).
- Empty-state / tour narrative.
- Deterministic metric helpers (runway, MOIC, XIRR) — **reimplement with tests**.

### Do not port

- Seed corpus JSON as SoR.
- Ephemeral useState confirms.
- No-auth / no-tenancy assumptions.
- LLM in HTTP request path for heavy extract.
- Serverless-only long PDF/Excel pipelines.
- Hard-coded global V3 portfolio.
- Vendor-locked Luna without provider interface.

---

## Phase 0 — Scaffold + auth + schema + empty shell

**Goal:** Greenfield monorepo boots; a signed-in user in an org sees an empty OS shell; DB + RLS + migrations exist; no fake portfolio data.

### Deliverables

- `pnpm` + Turborepo; `apps/web` (Next.js 15), `apps/api` (Hono), `apps/worker` (BullMQ) stubs.
- Auth (Better Auth): org create, invite, roles stub.
- Postgres + migrations; `org_id` + RLS policies on core tables.
- S3-compatible client stub; BullMQ+Redis hello-world.
- `packages/llm` provider interface; OpenAI default wired behind interface (no production calls required yet).
- Empty shell routes with OS IA labels (Command/Inbox/Flags/NAV/Compare/Reports/Ask/Documents); first-principles UI — not a demo clone (no seed numbers).
- CI: lint, typecheck, migrate-on-test.

### Acceptance criteria

- [x] New clone → `pnpm i` → migrate → web + api + worker start locally.
- [x] User can sign up / join org; unauthenticated routes blocked.
- [x] Locked roles (`org_admin` / `partner` / `analyst` / `viewer`) are real Better Auth AC roles; Org Admin can invite; viewer cannot write (Pass 01).
- [x] Org select refuses non-members (403). Invite accept matches email. Copy-link until SMTP exists.
- [x] Direct SQL as role without `org_id` session cannot read another org rows (RLS proof test).
- [x] No corpus-JSON loaded as production path.
- [x] Empty shell renders; every number surface shows empty / “—” not illustrative demo NAV.
- [x] Heavy parse/flag jobs run in `worker` (inline fallback only if Redis is down).
- [x] CI builds web and runs a Playwright signup→confirm smoke (Pass 33) plus viewer storageState / rituals / optional axe (Pass 35). Same-origin BFF (Pass 31).

---

## Phase 1 — Vault + upload + parse + inbox → book

**Goal:** Real files enter a company vault, parse into proposed extractions, human confirms into a durable book.

### Deliverables

- Company registry (org-scoped) + **company vault** (documents immutable in R2/S3).
- Upload fallback (same pipeline OneDrive will use later).
- Parse pipeline for XLSX + PDF (locators: sheet!cell and/or page).
- Inbox / review queue persisted in DB (not React state).
- Confirm / reject → writes **book facts** with provenance.
- Re-parse creates new extraction version; does not wipe confirms without merge rules.

### Acceptance criteria

- [x] Upload PDF/XLSX → job completes → inbox shows proposed fields with confidence + locator.
- [x] Confirm persists across refresh and redeploy.
- [x] Confirmed fact has `document_id` + locator; UI can open source.
- [x] Missing fields stay `null` (never coerced to 0).
- [x] Second upload of same company period creates versioned extract; prior confirmed values merge per `05_DATA_MODEL.md`.
- [x] No LLM write directly into book tables.

---

## Phase 2 — Standardization + dual currency + corrections

**Goal:** Firm schema, units/FY/restatements, INR Cr + EUR with FX audit, corrections that survive re-parse.

### Deliverables

- Firm metric dictionary + company mapping profiles.
- Unit detector (lakh / crore / USD explicit — never magnitude-only).
- FY Apr–Mar default; calendar override on company profile.
- Restatement model (`supersedes` / current marker).
- Dual currency: store native; convert with `fx_rate` + `fx_date` + source.
- Correction ledger (user, reason, timestamp); merge-on-reparse; human override wins.
- Standardization assist via OpenAI provider (propose only).

### Acceptance criteria

- [x] Ambiguous unit → review queue, not silent convert.
- [x] Every dual-currency display shows rate + date or refuses conversion.
- [x] Restatement keeps prior reported period; marks current.
- [x] Correction survives re-parse automated test (golden).
- [x] Rollups / charts skip nulls; UI “—” / “not reported”.
- [x] Objective cells never authored by LLM commit path.

---

## Phase 3 — Dashboard / NAV / flags / compare

**Goal:** Live surfaces reading **only** from the standardized book.

### Deliverables

- Portfolio dashboard (stage, ownership, valuation, NAV, MOIC/IRR, cash, burn, runway, last round) — filterable; drill-to-source.
- Quarterly NAV: versioned marks, bridge, history; deterministic math in code.
- Flag engine v1 from agreed catalog + evidence payload; firm thresholds in `org_settings.flag_policy`.
- Cross-company compare on chosen metrics; period/stage normalized; null-safe.

### Acceptance criteria

- [x] Dashboard numbers match SQL over book (spot-check fixtures); no seed JSON.
- [x] NAV / MOIC / IRR / runway computed in deterministic modules with unit tests — LLM not in path.
- [x] Every visible figure has provenance or is explicitly derived (formula documented).
- [x] Flags only from catalog; each flag carries evidence refs.
- [x] Compare does not treat null as 0.
- [x] Empty org shows empty states, not demo companies.
- [x] Period-over-period NAV bridge from booked marks (Pass 23: as-of lock / unlock with reason).
- [x] Runway uses last-three-month average burn; flag mute/snooze survive refresh; plan variance is below-plan only (Pass 07/04).
- [x] Compare pickers (company / metric / period) + CSV; NAV MOIC from rollup only; bridge by position (Pass 08/10).

---

## Phase 4 — Ask + commentary + reports

**Goal:** Cited Ask; split commentary; on-demand reports from the book.

### Deliverables

- Org-scoped Ask: FTS (+ book facts); hard refuse without citation; numeric post-check.
- Monthly sheet: **objective** commentary (from MIS) and **subjective** commentary (from transcripts only) in separate columns — never blended.
- Report generation (PDF / PPTX / XLSX) async in worker; templates read book only.

### Acceptance criteria

- [x] Ask with insufficient evidence returns explicit not-available / refuse — eval case in CI.
- [x] Ask refuses on token non-overlap and on invented numerals (Pass 05).
- [x] One-pager requires companyId; exports use session credentials (Pass 09).
- [x] Citation resolves to real chunk/page/cell; fake locators fail tests.
- [x] Subjective commentary pipeline rejects MIS-only input (no transcript → no subjective draft).
- [x] Report job does not run inside serverless HTTP; artifacts land in the object store when Redis is up; inline fallback if Redis is down (Pass 25).
- [x] Report headlines match book queries bit-for-bit for fixture org.

---

## Phase 5 — Connectors + domain onboarding

**Goal:** Real source systems + ≤15-minute company onboard without engineering.

### Deliverables

- OneDrive / Microsoft Graph: OAuth, folder map, delta/webhook or poll, same parse pipeline as upload.
- Affinity stub→real: ownership / company link; **no invented field names** (fixture + `TODO(source-of-truth)` until verified).
- Granola: transcripts → subjective commentary source only.
- Domain verification / auto-join; company onboarding wizard (folder + IDs + FY/currency + template → first ingest).
- UI labels **not connected** until OAuth + sync succeed.

### Acceptance criteria

- [ ] Connected OneDrive folder yields inbox items without manual re-key of file bytes.
- [x] Disconnect / not-connected states honest (no fake success). *(Pass 42: status machine + wipe on disconnect)*
- [x] New company path measured: create → map → first structured output ≤15 minutes on happy path. *(upload fallback; connector map waits on OAuth)*
- [x] Granola-linked subjective text never written into objective metric cells. *(Pass 42: transcript + commentary lane only)*
- [x] Affinity sync does not invent CRM fields not in stub/docs. *(Pass 42: verified v2 map + optional field id)*

---

## Phase 6 — Billing + LP room

**Goal:** SaaS monetization stub→Stripe; LP / fundraising data room (ILPA-aligned) for broader sell — not a V3 day-1 blocker but required to sell to other firms.

### Deliverables

- Entitlements + Stripe billing (seats / usage hooks from earlier instrumentation).
- **LP / fundraising data room** (third data-room type): ILPA-style folders, ACL, export packs.
- Firm library polish; retention / export-delete hooks.
- Platform admin vs org admin boundaries audited.

### Acceptance criteria

- [ ] Plan/entitlement gates a feature without code fork per customer.
- [ ] LP room is org-scoped, separate from company vaults; Viewer/LP roles cannot see unrelated vaults.
- [ ] Billing webhook updates entitlements idempotently.
- [ ] Data export/delete for an org does not touch other orgs (RLS + integration test).

---

## Phase dependency graph (do not casually reorder)

```
0 scaffold/auth/schema/shell
  → 1 vault/upload/parse/inbox→book
    → 2 standardization/FX/corrections
      → 3 dashboard/NAV/flags/compare
      → 4 Ask/commentary/reports
        → 5 connectors/onboarding
          → 6 billing/LP room
```

Phases 3 and 4 may overlap after Phase 2 invariants are green. Connectors (5) must not precede a working upload→book path (1–2).

---

## Definition of done (any PR touching numbers)

- Fact written only via approved ingest/correct API.
- Provenance present or field marked non-factual.
- Null handling tested.
- Re-parse + correction test where extract path changes.
- No LLM in NAV/rollup path.
- Ask path has refuse-without-citation coverage when Ask code changes.
