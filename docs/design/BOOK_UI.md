# Book UI — institutional paper system

**Status:** Implemented in `apps/web` (2026-09-05). Visual north star: Stitch Command mock.  
**Not a product SoT.** Invariants stay in `01_PRODUCT_SPEC.md` / Gargi brief / `AGENTS.md`.

## Tokens

| Token | Hex | Use |
| --- | --- | --- |
| Paper / Paper-2 / Chip | `#f3efe6` / `#ebe6da` / `#fffdf8` | Page, rail, raised surfaces |
| Ink / Muted / Rule | `#1c1915` / `#5c574e` / `#d4cfc3` | Type and 1px rules |
| Forest / Forest soft | `#244c3c` / `#dce8e1` | Primary action, objective lane |
| Subjective / soft | `#3d3a5c` / `#e8e6f0` | Subjective lane only |
| Danger / Warn | `#8b2e2e` / `#8a6a1a` | Errors, coverage gaps, medium flags |

Type: **Source Serif 4** headlines + KPI figures; **IBM Plex Sans** UI. Tabular nums on money. Radius 4–8px. Whisper shadow. Left rail **220px** at ≥1280px. Tablet (≤1279) collapses the rail behind **Menu**. Mobile (<768) stacks cards; touch targets 44px.

**PWA:** `app/manifest.ts` (paper `#f3efe6` / forest `#244c3c`), 192+512 icons, Apple touch icon. Production-only `/sw.js` is network-first for documents and **never intercepts `/api/*`** (so `/api/me` cannot be cached). Install from the browser “Add to Home Screen” / app menu after a production build.

## Command mapping (mock → book)

| Mock | Source | Honesty |
| --- | --- | --- |
| Companies | `pulse.companies` | Count of names |
| Open flags | `pulse.openFlags` | Catalog events only |
| Coverage gaps | companies with no booked MIS period | Derived; not invented docs |
| Uncited figures | booked displays without provenance | `—` if the book has no figures yet |
| Needs a look | pending inbox + open flags | Flags tagged **Objective**. No fake subjective notes |
| Coverage | last booked MIS age; missing = `MIS` | Never invent “Cap table” / quarter labels |
| Portfolio pulse | existing coverage row | Coverage chip is `Booked` / `Gap` / `Review` from evidence — not a health score |
| Last refresh | time this session fetched `/api/command` | Not a connector `lastSyncAt` |

NAV / MOIC remain as headline chips under the KPI strip (product pulse). They are not invented if null.

## Auth, company, inbox, vault (Stitch fold-in)

| Screen | Mock | Honesty |
| --- | --- | --- |
| Sign in / Create account | Centered chip card, tabs, forest CTA, 8–128 hint | Password bounds are real (`MIN`/`MAX_PASSWORD_LENGTH`). No Forgot password, TOS, or Privacy links — those routes are not connected. Footer states AES-at-rest + cite-or-refuse. |
| Company | Stage badge, ownership, flag pills, Objective + Partner view, Evidence trail, Required docs | Ownership from booked positions only; no cite unless a locator exists. Objective = booked cash/burn/runway + net revenue if extracted. Partner view = latest **subjective** commentary (violet-slate), never MIS. Required kinds are only `mis` / `board_pack` / `transcript`. STALE = MIS older than 45 days. No invented SAFE / cap table / Affinity deep link. |
| Inbox | Severity-sorted triage; All / Flags / Docs | Flags = unit ambiguity / unknown unit. Docs = other extracts. Mentions pill is honest empty (not connected). No Mark all read. Owner column is `—` until the book stores an owner. Confirm / Reject unchanged. |
| Connectors | ORG ADMIN badge, masked keys, Rotate / Disconnect / Connect | Save-when-already-has-credentials is **Rotate**. `secretHint` only. Status stays not connected until healthCheck. No plaintext after save. No Billing / Danger zone. |
| Companies | Centered search, STAGE pills, Ownership/Coverage, initial marks, table | Ownership and last MIS from Command coverage only. Coverage chip is Booked / Gap / Review — never a %. Last-note column mapped to Last MIS (no invented partner notes). No Columns control. |
| Flags | Queue table + selected inspector | Severity dots, cite chips, status pills. Inspector: Snooze/Mute (not invented Acknowledge/Resolve). Objective evidence from the detector. Subjective lane is booked partner commentary only — empty shows —. No generated analysis or notification bell. |

## Loop (polish)

On every ritual page the chrome is: **know what matters → see why → verify (cite drawer) → act**. The pipeline under the fixture banner is SOURCE → PROPOSED → REVIEWED → BOOK → ANALYSIS (Inbox = proposed, Flags = reviewed, Vault = source, Ask/Reports/Compare = analysis). Command’s first sentence is whether the book is current and what needs a human. Incomplete NAV says how many values are missing — never a health score.

## Atoms

- **Fact chip** — click opens the citation drawer (file, locator, excerpt, period, confirmed by/at). Unfact = `—`. Open source file from the drawer. Missing fields stay `—`.
- **Objective / subjective** — forest vs violet surfaces; never a single “notes” column.
- **Empty book** — expensive paper, no demo charts, no celebratory “all clear” on an empty org.
- **Refuse** — Ask uses the same honesty weight as the fixture banner.

## Files

- Tokens: `apps/web/src/app/globals.css`, `packages/ui/src/index.ts`
- Shell + Fact: `apps/web/src/components/Shell.tsx`
- Page chrome: `apps/web/src/components/BookUI.tsx`
- Icons: `apps/web/src/components/Icons.tsx`
