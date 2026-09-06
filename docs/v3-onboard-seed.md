# V3 onboard seed

Illustrative multi-company book for V3 Ventures handoff smoke testing. **Not the live book.**

## Run

Prerequisites: Postgres migrated, dev user signed up.

```bash
pnpm db:migrate
# Sign up at http://localhost:3000/signup (or use demo:vc credentials)
SEED_V3_ONBOARD=1 pnpm seed:v3-onboard
```

Optional: attach a specific user as org admin:

```bash
SEED_V3_EMAIL=you@firm.com SEED_V3_ONBOARD=1 pnpm seed:v3-onboard
```

`SEED_DEMO_EMAIL` is also attached when that user exists.

Refuses when `NODE_ENV=production`. Refuses to overwrite an organisation that is not labelled `onboardSeed`.

## What gets loaded

| Entity | Count / notes |
| --- | --- |
| Organisation | `V3 Ventures (ONBOARD_SEED)` / slug `v3-ventures-onboard-seed` |
| Funds | 2 (India Evergreen, Europe & US Evergreen) |
| Companies | 16 public portfolio names |
| Documents + source refs | MIS / board pack per company |
| Metric book | Monthly objective lane via `metric_values` |
| Commentary | Objective + subjective lanes kept separate |
| Inbox | 3 pending metric proposals for confirm workflow |
| Connectors | onedrive / affinity / granola = `not_connected` |
| FX | INR base, EUR display with rate + date + source |

Corpus snapshot: `fixtures/v3-onboard/corpus.json` (see `ATTRIBUTION.txt`).

## Corpus → schema mapping

| Corpus field | `metricKey` | Notes |
| --- | --- | --- |
| `netRevenue` | `net_revenue` | INR crore (India) or EUR million (EU) |
| `grossMarginPct` | `gross_margin_pct` | `percent` |
| `contributionMarginPct` | `contribution_margin_pct` | `percent` |
| `cash` | `cash` | money |
| `netBurn` | `burn` | money |
| `headcount` | `headcount` | `count` |
| `cac` | `cac` | per-customer money |
| `repeatRatePct` | `repeat_rate_pct` | `percent` |
| `revenueVsPlanPct` | — | Derives `plan_revenue` when `netRevenue` present |
| `marketingSpend` | — | **skipped** (no catalog key) |
| `onlineMixPct` | — | **skipped** |
| `paybackMonths` | — | **skipped** (brief: extract only; no schema key) |

Missing fields are omitted — never coerced to zero.

## UI banner

When `organization.metadata` contains `onboardSeed`, Shell shows:

> Onboard seed — illustrative public corpus only. Not the live book.

No frontend branches for individual company names.

## Tests

| Layer | Command | Notes |
| --- | --- | --- |
| Mapping unit | `pnpm --filter @venture-os/db test` | `v3-onboard/map.test.ts` |
| API smoke | `pnpm --filter @venture-os/api test v3-onboard` | needs `DATABASE_URL` |
| Playwright | `pnpm test:e2e v3-onboard` | needs seeded org + `SEED_V3_EMAIL` login |

## RFP coverage matrix (Gargi v3, 3 Sep 2026)

| Requirement | Seed support | Gap / note |
| --- | --- | --- |
| Portfolio dashboard (Command) | Yes — multi-company coverage + NAV pulse | Marks are illustrative |
| Automatic ingestion → inbox confirm | Yes — 3 pending inbox items; rest pre-confirmed in book | Not live OneDrive pull |
| Company tracking rolled to fund | Yes — positions per fund | — |
| NAV | Yes — marks on positions | FX on marks partial vs full dual-display spec |
| Objective vs subjective commentary | Yes — separate `commentary` lanes | Subjective not from live Granola |
| On-demand reports | Endpoints load; book has metrics | Report content depends on book depth |
| 15–40 companies | 16 companies | Expand corpus JSON to scale |
| Missing ≠ 0 | Enforced in mapper + sparse corpus | — |
| FY April–March | `fyStartMonth: 4` | — |
| INR crore + EUR + FX triple | Yes on money metrics | EUR-native cos use EUR unit; INR crore null |
| Cite back to source | `source_refs` on facts | — |
| Connectors | Honest `not_connected` | Live OAuth out of scope |

## Rebuild corpus snapshot

If you need to regenerate the illustrative JSON (e.g. add companies):

```bash
node packages/db/scripts/build-v3-corpus.mjs
```

Prefer editing the builder or hand-editing `fixtures/v3-onboard/corpus.json` over fetching at seed time.
