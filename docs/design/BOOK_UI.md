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

Type: **Source Serif 4** headlines + KPI figures; **IBM Plex Sans** UI. Tabular nums on money. Radius 4–8px. Whisper shadow. Left rail **220px**.

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

## Atoms

- **Fact chip** — click downloads source. Unfact = `—`.
- **Objective / subjective** — forest vs violet surfaces; never a single “notes” column.
- **Empty book** — expensive paper, no demo charts, no celebratory “all clear” on an empty org.
- **Refuse** — Ask uses the same honesty weight as the fixture banner.

## Files

- Tokens: `apps/web/src/app/globals.css`, `packages/ui/src/index.ts`
- Shell + Fact: `apps/web/src/components/Shell.tsx`
- Page chrome: `apps/web/src/components/BookUI.tsx`
- Icons: `apps/web/src/components/Icons.tsx`
