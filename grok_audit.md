# grok_audit.md — Venture OS live UX/product handoff

> **For:** coding agent  
> **Product:** https://www.ventureos.xyz (redirects from ventureos.xyz)  
> **Auth used:** `dummy@v3.com` / `12345678`  
> **Scope:** **Logged-in app only** (marketing/homepage left alone per product owner)  
> **Audit date:** 2026-09-08 IST  
> **Screenshots:** `venture-os-handoff/live-audit-shots/` on the auditor box (not in this commit unless attached separately)  
> **Severity:** P0 block · P1 workflow/confusing · P2 polish

## Product constraints (do not violate)

- Tokens: bg `#FAFAFA` (or current cream if intentional), ink `#09090B`, cite emerald `#059669`, subjective violet `#5B21B6`. Avoid noisy SaaS glass/orbs.
- Honesty: missing ≠ 0; empty = `—`; no invented KPIs in live book views.
- Objective vs subjective commentary stay separate.
- Prefer calm Swiss density; motion 150–300ms; honor `prefers-reduced-motion`.
- Do **not** hardcode company-specific UI for Hosteller / SuperYou / etc.

---

## Executive summary (what to fix first)

1. **Unify Inbox ↔ Confirm terminology & routes** — Ask refuses with “confirm in Inbox” but `/inbox` → `/confirm`; rail says Confirm not Inbox.
2. **Stop fixture/aggregation copy leaks** on Command (“unit ambiguity, unit ambiguity…” / “metric, metric…”).
3. **Ask corpus gap** — runway under 6 months refuses while company detail shows runway; either wire Ask to booked metrics or change suggested questions / copy.
4. **Presentation rounding** — Flags evidence shows `4.504615384615385` / `1.0833333333333333`.
5. **Settings discoverability** — Settings not in main rail; Sources renamed from Vault with all cards `Queued` and no progress.
6. **Reports cards** — generate/download affordance ambiguous; date locale inconsistency.
7. **Onboard** — `/onboard` silently redirects to `/command`.
8. **Units & FX clarity** — mixed INR crore / USD thousand / EUR million; runway unlabeled; NAV date pair unlabeled.

---

## Checklist for coding agent (ordered)

### A. Navigation & IA (P1)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| A1 | Rail has Confirm, Sources; no Inbox / Ask / Vault / Settings | Add Ask + Settings to rail (or overflow). Pick **one** name for pending queue: Confirm **or** Inbox; keep URL + copy + Ask refusals in sync. |
| A2 | `/inbox` redirects to `/confirm` | Either alias with banner “Inbox = Confirm queue” or remove `/inbox` and fix Ask copy to say Confirm. |
| A3 | `/onboard` → `/command` silently | Show “Already onboarded” empty state or remove route; don’t silent-redirect. |
| A4 | Settings only via side path (`← Book`) | Link Settings from rail footer / org menu. |
| A5 | Collapsed rail (~72px) has no tooltips in capture | Tooltips + `aria-label` on every icon; keyboard focus. |

**Refs:** [beUI Animated Sidebar](https://beui.dev/components/motion/animated-sidebar) · [Preview Rail](https://beui.dev/components/motion/preview-rail) · [Tooltip](https://beui.dev/components/motion/tooltip) · [Drawer](https://beui.dev/components/motion/drawer)

### B. Command `/command` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| B1 | Needs-a-look rows: `unit ambiguity, unit ambiguity…` / `metric, metric…` | Dedupe reason tags; human labels (“Unit unclear”, “Metric type”); cap list + “+N more”. |
| B2 | Jargon: book as of close, MOIC, NAV, IRR without gloss | Inline glossary tooltips or plain helpers under KPIs. |
| B3 | Refresh shows clock `03:35` without date/TZ | Show `Updated · 8 Sep 2026, 3:35pm IST` (user TZ). |
| B4 | KPI density OK but no sparklines | Optional mini trends when ≥2 periods exist. |

**Refs:** [Apex sparklines](https://apexcharts.com/javascript-chart-demos/sparklines/) · [beUI Number](https://beui.dev/components/motion/number) · [Animated Badge](https://beui.dev/components/motion/animated-badge) · Dribbble [Tactyc dashboard](https://dribbble.com/shots/25782652-Tactyc-Dashboard-Financial-and-Portfolio-Management)

### C. Companies + detail (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| C1 | Summary `Booked 0` with cash/burn/NAV elsewhere | Clarify what “Booked” means vs Review/Flags; don’t imply empty book incorrectly. |
| C2 | Mixed units in Performance table | Firm display currency toggle (INR crore / EUR) + unit column; never silently mix without legend. |
| C3 | Coverage column all `Review` | Make clickable → Confirm filtered; explain meaning. |
| C4 | Runway `4.505` unlabeled; flags RUNWAY SHORT / MIS LATE | Label **months**; round to 1 decimal; badge glossary. |
| C5 | Booked trend chart no legend in fold | Always show legend + period axis; null gaps not zeros. |

**Refs:** [beUI Table](https://beui.dev/components/motion/table) · [Apex line + nulls](https://apexcharts.com/javascript-chart-demos/line-charts/null-values/) · [Chart.js line](https://www.chartjs.org/docs/latest/charts/line.html) · [Apex mixed](https://apexcharts.com/javascript-chart-demos/mixed-charts/line-column-area/)

### D. Confirm queue `/confirm` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| D1 | User-facing `gross_margin_pct` snake_case | Display formula-book label (“Gross margin %”). |
| D2 | Evidence hard to scan (`WEAK`, cell refs) | Larger cite chips; open source preview. |
| D3 | Mobile: Confirm/Reject below fold | Sticky action bar on mobile. |

**Refs:** [beUI Approval Card](https://beui.dev/components/agents/approval-card) · [Citations](https://beui.dev/components/agents/citations) · [Swipeable List](https://beui.dev/components/blocks/swipeable-list) · [Toast stack](https://beui.dev/components/motion/animated-toast-stack)

### E. Flags `/flags` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| E1 | Raw float precision in evidence | Format for display; keep full precision in cite/debug only. |
| E2 | `MED FLAG`, `OBJECTIVE FACT`, `Source 1 Source 2` | Plain labels + descriptive source titles/links. |

### F. NAV `/nav` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| F1 | Two date inputs unlabeled (`06/30/2026`, `03/30/2026`) | Label “As of” / “Prior”; prefer ISO or `30 Jun 2026`. |
| F2 | `UNOFFICIAL` + Lock — good; ensure Lock confirm dialog | Confirm modal before lock. |
| F3 | Mark form vs table save unclear | Explicit Save mark CTA; toast on success. |
| F4 | Cost/NAV cards bare numbers | Show currency + crore/million; optional waterfall for bridge. |

**Refs:** [Apex waterfall](https://apexcharts.com/javascript-chart-demos/waterfall-charts/) · [Apex area](https://apexcharts.com/javascript-chart-demos/area-charts/)

### G. Compare `/compare` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| G1 | `Peers (13)` vs `6 of 13` fingerprints unexplained | Helper: “Charts use peers with complete metrics for selected columns.” |
| G2 | Radar below fold / weak legend | Sticky chart header; metric chips. |

**Refs:** [Apex radar](https://apexcharts.com/javascript-chart-demos/radar-charts/) · [beUI Tabs](https://beui.dev/components/motion/tabs)

### H. Reports `/reports` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| H1 | Three large cards look inert | Clear primary `Generate` / `Open draft` buttons. |
| H2 | Draft title `2026-09-08` vs body `9/7/2026` | Single date format (prefer `8 Sep 2026`). |

### I. Sources `/sources` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| I1 | All visible files `Queued` with no progress/error | Status: Queued / Parsing / Ready / Failed + error detail; progress. |
| I2 | “Sources” vs historical “Vault” naming | Pick one product term; update docs + rail. |
| I3 | Truncated filenames | Tooltip with full name; type icon by MIS/board/transcript. |

**Refs:** [beUI File Upload](https://beui.dev/components/blocks/file-upload) · [File Tree](https://beui.dev/components/motion/file-tree) · Rare UI folder (use only if calm): https://rareui.com

### J. Ask `/ask` (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| J1 | Suggested Q “runway under 6 months” refuses despite UI runway | Wire Ask to confirmed/booked metrics **or** remove suggestion until wired; refusal must say Confirm not Inbox if that’s the route. |
| J2 | No chat history nav | Simple past-thread list. |
| J3 | Loading / cite UX | Grounded answers need cite chips. |

**Refs:** [beUI Prompt Input](https://beui.dev/components/agents/prompt-input) · [Message / Scroller](https://beui.dev/components/agents/message) · [Citations](https://beui.dev/components/agents/citations) · [Agent Activity](https://beui.dev/components/agents/agent-activity) · [Loading States](https://beui.dev/components/agents/loading-states) · [Command Palette](https://beui.dev/components/blocks/command-palette)

### K. Settings `/settings` (P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| K1 | No unsaved indicator on Formula book | Dirty state + discard confirm. |
| K2 | Connectors / Firm / Funds / People | Ensure empty connectors stay `not_connected` honestly. |

### L. Mobile ~390px (P1–P2)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| L1 | Confirm/Reject below fold | Sticky footer actions. |
| L2 | Table headers above stacked cards | Hide redundant column headers on card layout. |
| L3 | Menu contents not fully audited | Verify Menu lists all primary destinations + Settings. |

**Refs:** [beUI Bottom Sheet](https://beui.dev/components/motion/bottom-sheet) · Dribbble [Investing mobile portfolio](https://dribbble.com/shots/25404518-Investing-Mobile-App-Design-Concept-For-Portfolio-Management)

### M. Login `/login` (P2 only — in scope because auth gate)

| ID | Issue | Suggested fix |
|----|--------|----------------|
| M1 | No password show/hide | Add toggle. |
| M2 | Sparse card OK | Keep; match product tokens (avoid accidental black-on-black CTAs). |

**Refs:** [beUI Sign Up Form](https://beui.dev/components/blocks/signup-form) · [Input](https://beui.dev/components/motion/input)

---

## UI/UX suggestions (beyond bugs)

1. **Morning ritual IA:** Command primary CTA should deep-link to Confirm filtered by “Needs a look”, then Flags — match partner Monday habit.
2. **Chart honesty:** use Apex/Chart.js **null/gap** demos whenever a month is missing — never draw to zero.
3. **Cite chips everywhere** figures appear (Command KPIs, company cards, NAV, Flags evidence).
4. **Coverage heatmap** (company × month MIS received) — [Apex heatmap](https://apexcharts.com/javascript-chart-demos/heatmap-charts/).
5. **Sector allocation** — [Apex treemap](https://apexcharts.com/javascript-chart-demos/treemap-charts/) or restrained donut (≤5 slices).
6. **Motion budget:** adopt beUI rail/tabs/toasts; skip RareUI Fluid Orb / Gravity Letters in logged-in shell.
7. **Competitive IA (inspiration only):** [Visible Portfolio Intelligence](https://visible.vc/portfolio-intelligence/) · [Carta Data Explorer](https://carta.com/explore-erp/venture-capital/data-explorer/) · [Archstone metrics](https://www.archstone.app/features/portfolio-tracker/metrics-dashboard) · Dribbble [Vestberry](https://dribbble.com/shots/27428167-Vestberry-Website) · [FundHive](https://dribbble.com/shots/25739912-FundHive-Investment-Management-Dashboard) · [Asset Mgmt dashboard](https://dribbble.com/shots/25577914-Asset-Management-Investment-Platform-Dashboard)

---

## Resource catalog (deep links)

Prefer calm Swiss density. Keep product tokens: bg `#FAFAFA`, ink `#09090B`, emerald cite `#059669`, violet subjective `#5B21B6`. Avoid glassmorphism and noisy SaaS palettes. Respect `prefers-reduced-motion`.

## beUI (https://beui.dev)

| Component | Use for | Link |
|---|---|---|
| Animated Sidebar | App rail expand/collapse + mobile sheet | https://beui.dev/components/motion/animated-sidebar |
| Preview Rail | Compact icon rail with hover destination preview | https://beui.dev/components/motion/preview-rail |
| Bounce Sidebar | Active indicator motion on rail | https://beui.dev/components/motion/bounce-sidebar |
| Table | Companies / NAV / metrics tables (virtualized) | https://beui.dev/components/motion/table |
| Command Palette | ⌘K Ask / jump | https://beui.dev/components/blocks/command-palette |
| Morphing Search | Global search morph | https://beui.dev/components/blocks/morphing-search |
| Approval Card | Inbox confirm / human-in-the-loop | https://beui.dev/components/agents/approval-card |
| Tool Approval | Connector / tool permission gates | https://beui.dev/components/agents/tool-approval |
| Citations | Cite markers + source list for Ask / commentary | https://beui.dev/components/agents/citations |
| Prompt Input | Ask OS composer | https://beui.dev/components/agents/prompt-input |
| Message / Message Scroller | Ask conversation thread | https://beui.dev/components/agents/message · https://beui.dev/components/agents/message-scroller |
| Agent Activity | Reasoning / tool stream for Ask | https://beui.dev/components/agents/agent-activity |
| Loading States | Ask / ingestion loading | https://beui.dev/components/agents/loading-states |
| Number Animation | KPI tickers on Command (only when values exist) | https://beui.dev/components/motion/number |
| Animated Badge | Flag / inbox status | https://beui.dev/components/motion/animated-badge |
| Tabs | Screen-level segment controls | https://beui.dev/components/motion/tabs |
| Input / Select / Combobox | Forms, filters | https://beui.dev/components/motion/input · https://beui.dev/components/motion/select · https://beui.dev/components/motion/combobox |
| Drawer / Bottom Sheet | Mobile nav / filters | https://beui.dev/components/motion/drawer · https://beui.dev/components/motion/bottom-sheet |
| File Upload | MIS upload fallback path | https://beui.dev/components/blocks/file-upload |
| Swipeable List | Mobile inbox rows | https://beui.dev/components/blocks/swipeable-list |
| Animated Toast Stack | Confirm/reject feedback | https://beui.dev/components/motion/animated-toast-stack |
| Tooltip | Rail icon labels | https://beui.dev/components/motion/tooltip |
| Sign Up Form | Auth polish | https://beui.dev/components/blocks/signup-form |
| Loader | Page/skeleton calm loaders | https://beui.dev/components/motion/loader |

Registry: https://beui.dev/r · install via shadcn registry JSON.

## Rare UI (https://rareui.com)

Use sparingly — many pieces are decorative. Prefer for tasteful accents only.

| Piece | Use for | Link |
|---|---|---|
| Rare UI home / install | Browse + `npx shadcn@latest add swamimalode07/rare-ui/...` | https://rareui.com |
| Folder component | Vault / document groupings (if calm enough) | https://rareui.com (Folder component on homepage) |
| Duration Picker | Period selectors on Compare / Reports | https://rareui.com |
| OTP Input | Future 2FA | https://rareui.com |

Caveat: verify each component against Swiss/minimal bar; skip Fluid Orb / Gravity Letters for product chrome.

## ApexCharts (https://apexcharts.com)

| Demo | Use for | Link |
|---|---|---|
| Line charts index | Revenue / burn / headcount time series | https://apexcharts.com/javascript-chart-demos/line-charts/ |
| Line + missing/null | Honest gaps when MIS missing (not zero) | https://apexcharts.com/javascript-chart-demos/line-charts/null-values/ |
| Area charts | Portfolio / fund NAV area | https://apexcharts.com/javascript-chart-demos/area-charts/ |
| Area missing/null | Same honesty pattern | https://apexcharts.com/javascript-chart-demos/area-charts/null-values/ |
| Mixed line+column+area | Company detail: revenue + burn overlay | https://apexcharts.com/javascript-chart-demos/mixed-charts/line-column-area/ |
| Sparklines | Command KPI row mini trends | https://apexcharts.com/javascript-chart-demos/sparklines/ |
| Treemap | Sector / ownership allocation | https://apexcharts.com/javascript-chart-demos/treemap-charts/ |
| Heatmap | Coverage matrix (company × month MIS received) | https://apexcharts.com/javascript-chart-demos/heatmap-charts/ |
| Waterfall | NAV bridge / valuation change | https://apexcharts.com/javascript-chart-demos/waterfall-charts/ |
| Donut | Ownership / stage mix (≤5 slices) | https://apexcharts.com/javascript-chart-demos/pie-donut-charts/ |
| Dashboard concepts | Layout inspiration only | https://apexcharts.com/javascript-chart-demos/dashboards/ |

Docs hub: https://apexcharts.com/docs/installation/

## Chart.js (https://www.chartjs.org)

| Doc | Use for | Link |
|---|---|---|
| Line | Company metric trends | https://www.chartjs.org/docs/latest/charts/line.html |
| Bar | Peer compare | https://www.chartjs.org/docs/latest/charts/bar.html |
| Doughnut | Fund composition | https://www.chartjs.org/docs/latest/charts/doughnut.html |
| Area (via fill) | Cumulative NAV | https://www.chartjs.org/docs/latest/charts/area.html |
| Samples | Patterns | https://www.chartjs.org/docs/latest/samples/ |

Prefer Apex for denser financial dashboards; Chart.js if already in stack / lighter deps.

## Dribbble (inspiration — do not copy pixel-for-pixel)

Search starting points:
- https://dribbble.com/search/venture-capital-dashboard
- https://dribbble.com/search/portfolio-analytics-dashboard
- https://dribbble.com/search/investment-crm
- https://dribbble.com/search/minimal-sidebar-dashboard
- https://dribbble.com/search/fintech-data-table

Product comps (live SaaS references for IA, not visual theft):
- Visible Portfolio Intelligence: https://visible.vc/portfolio-intelligence/
- Carta Data Explorer VC: https://carta.com/explore-erp/venture-capital/data-explorer/
- Archstone metrics dashboard: https://www.archstone.app/features/portfolio-tracker/metrics-dashboard

## Constraints when adopting motion/charts
1. Motion dial low (~150–300ms); honor reduced-motion.
2. Empty / missing series → gap or `—`, never fabricated zeros.
3. Emerald only for cite/objective; violet only for subjective.
4. No decorative orbs / gravity letters in logged-in shell.

### Concrete Dribbble shots (IA / density inspiration)
| Shot | Why | Link |
|---|---|---|
| Vestberry Website | VC portfolio OS marketing + product clarity | https://dribbble.com/shots/27428167-Vestberry-Website |
| Tactyc Dashboard | Financial portfolio dashboard density | https://dribbble.com/shots/25782652-Tactyc-Dashboard-Financial-and-Portfolio-Management |
| Asset Management Dashboard | Multi-asset overview / table+chart layout | https://dribbble.com/shots/25577914-Asset-Management-Investment-Platform-Dashboard |
| FundHive Dashboard | Investment management shell + onboarding | https://dribbble.com/shots/25739912-FundHive-Investment-Management-Dashboard |
| Investing Mobile Portfolio | Phone portfolio patterns | https://dribbble.com/shots/25404518-Investing-Mobile-App-Design-Concept-For-Portfolio-Management |


---

## Appendix — raw per-screen notes

# Venture OS live audit (logged-in UX)

**Run:** 2026-09-08, Chrome desktop at 1280px; mobile emulation at 390px. Authenticated with the supplied test account. Marketing/homepage intentionally skipped per steering update.

## Severity key
- **P0:** blocks core use or data safety
- **P1:** materially confusing/broken workflow
- **P2:** polish, copy, consistency, or minor usability

## Global / shell
- **P1:** The authenticated rail exposes Command, Companies, Confirm, Sources, Flags, NAV, Compare, Reports; requested Inbox, Ask, Vault, and Settings are not present in the rail. Ask's refusal explicitly says “Upload a source or confirm the figure in Inbox,” but `/inbox` redirects to `/confirm`; this is a broken terminology/route handoff.
- **P2:** Rail collapse works: expanded rail is ~248px with grouped labels; collapsed rail is icon-only (~72px) with no visible text/tooltips in the captured state. It saves horizontal space but is not self-explanatory.
- **P2:** Mobile switches to a dark top bar with lime square logo, “Venture OS / V3 Ventures,” and a `Menu` button. Desktop rail is replaced rather than compressed; this is a sensible pattern, but menu contents were not exposed in the static capture.

## Login — `/login`
Screenshot: `live-audit-shots/02-login.png`
- **P0:** None observed. Login succeeded with supplied credentials.
- **P2:** Very sparse centered card. Tabs are `Sign in` and `Create account`; password helper says `8 to 128 characters`. No password visibility toggle or recovery link visible.

## Command — `/command`
Screenshot: `live-audit-shots/03-command.png`
- **P0:** None observed.
- **P1:** Hero says `Needs a human.` with `Confirm (55)` and `Flags (24)`, while `Coverage gaps` is 0. The screen is operationally clear but uses unexplained internal jargon (`book as of close`, `MOIC`, `NAV`).
- **P1:** “Needs a look” rows contain visibly broken/repetitive copy: `5 rows ready to confirm · unit ambiguity, unit ambiguity, unit ambiguity.` and `15 rows ready to confirm · metric, metric, metric.` This looks like fixture/aggregation leakage.
- **P2:** Summary cards: `Companies 13`, `To confirm 55`, `Open flags 24`, `Coverage gaps 0`, `NAV 76.1`, `MOIC 1.27x`. NAV helper says `As booked`; MOIC helper says `IRR 11.2% · 2 uncited`—the mixed terminology is not explained.
- **P2:** Refresh control is top-right with a time (`03:35`); no visible last-updated date/time zone.

## Companies — `/companies`
Screenshot: `live-audit-shots/05-companies.png`
- **P0:** None observed.
- **P1:** Portfolio summary reports `Booked 0` and `Gaps 0` alongside `Review 13` and `Open flags 24`; this may be correct, but zero booked data with populated cash/burn/NAV elsewhere needs clearer explanation.
- **P2:** `Performance` table has search, `All stages`, `Ownership`, and `Export`. Rows use mixed currencies/units (`INR 4.88 crore`, `USD 823.41 thousand`, `EUR 6.33 million`) without a visible portfolio currency switch.
- **P2:** “Coverage” values are simply `Review` for visible rows; no explanation or click affordance is shown.

## Company detail — Creme Castle
Screenshot: `live-audit-shots/06-company-detail.png`
- **P0:** None observed.
- **P1:** Header shows `RUNWAY SHORT` and `MIS LATE`, while metric cards show cash `INR 4.88 crore`, burn `INR 1.14 crore`, runway `4.505`, net revenue `INR 10.41 crore`, and `2 open flags`. Unit for runway is omitted, so 4.505 could be months but is not labeled.
- **P2:** Tabs are `Overview`, `Book`, `Commentary`, `Flags`, `Sources`, `Links`; header actions are `Compare`, `Edit profile`, `Draft one-pager`. Chart is titled `Booked trend` but has no visible legend in the initial viewport.

## Confirm / pending queue — `/confirm`
Screenshot: `live-audit-shots/07-confirm.png`
- **P0:** None observed; no confirmation/rejection was submitted.
- **P1:** Queue has `Pending` and `All kinds (55)`. Each item (e.g. `Deconstruct`, `The Hosteller`) shows an editable metric (`gross_margin_pct 68`), dates, `Set unit (required)`, correction note, and `Confirm`/`Reject`. Requiring a unit is good validation, but the raw snake_case field name is user-facing.
- **P2:** Evidence column uses tiny `WEAK` badges and terse text such as `Monthly MIS cell B3` / `Financials cell B4`; evidence/source context is hard to scan.

## Inbox — `/inbox`
Screenshot: `live-audit-shots/17-inbox-redirect-confirm.png`
- **P1:** `/inbox` does not render an Inbox; it redirects to `/confirm`. This directly conflicts with the Ask refusal copy referring to Inbox and means a user cannot distinguish “inbox” from “confirm queue.”
- **P2:** Treating Confirm as the pending inbox works functionally (55 pending items visible), but the nav label and URL should be unified or an actual Inbox should be added.

## Flags — `/flags`
Screenshot: `live-audit-shots/08-flags.png`
- **P0:** None observed.
- **P1:** 24-item list has filters `Open`, `Severity`, `Company`, `All flags`, plus search. Selected `Creme Castle / Runway short` detail includes `Snooze 14d`, `Mute`, and an Evidence panel. The evidence values expose raw precision (`1.0833333333333333`, `4.504615384615385`) instead of presentation rounding.
- **P2:** Severity colors are red/amber with small text; selected panel labels `MED FLAG`, `OBJECTIVE FACT`, and `Source 1 Source 2` are jargon-heavy and the sources are not descriptive links.

## NAV — `/nav`
Screenshot: `live-audit-shots/09-nav.png`
- **P0:** None observed.
- **P1:** Header says `Q2 2026 · UNOFFICIAL` and includes a `Lock` action. Date filters are `06/30/2026` and `03/30/2026`; the meaning/order of the two dates is not labeled.
- **P2:** KPI cards show `Cost 60`, `NAV 76.1` (`vs prior 6.5`), `MOIC 1.27x`, `IRR 10.6%`. Right-side `Mark this quarter` form uses `Select position…`, `Mark value`, `Last round`, `Short rationale`; this is clear but sits beside a table with no visible save/submit in the first viewport.

## Compare — `/compare`
Screenshot: `live-audit-shots/10-compare.png`
- **P0:** None observed.
- **P1:** Copy says `Toggle peers to reshape the radar, columns, and scatter. Charts only include names you leave on.` but current view reports `Peers (13)` and `6 of 13` fingerprints. The relationship between selected peers and the 6/13 chart count is not explained.
- **P2:** Filter controls are `Latest period`, `All stages`, `All sectors`, `Columns: Cash`, `Peers (13)`, `Metrics (5)`, and `Hide empty`. Radar chart is partially below the initial viewport; a legend/metric explanation is not immediately visible.

## Reports — `/reports`
Screenshot: `live-audit-shots/11-reports.png`
- **P0:** None observed.
- **P1:** Three large report choices—`Company one-pager`, `Portfolio pack`, `Monthly pack`—look like cards but have no explicit `Create`, `Generate`, or download affordance in the captured state; clickability is ambiguous.
- **P2:** Draft list includes repeated titles such as `Portfolio draft · 2026-09-08` and `Monthly pack · 2026-09-08`, with dates displayed as `9/7/2026` despite the title being 2026-09-08. Locale/date consistency issue.

## Sources / Vault equivalent — `/sources`
Screenshot: `live-audit-shots/12-sources-vault.png`
- **P0:** None observed.
- **P1:** Page is labeled `Sources`, not Vault. It reports `60 of 60`; visible spreadsheet cards all show `Queued`, including files such as `creme-castle-FY26-M4-M5...`, `hosteller-Aug2025-lakhs.xlsx`, `ugaoo-FY26-Q1.xlsx`, and `wild-2025-Q2-USD.xlsx`. If `Queued` is a processing state, there is no progress/error detail.
- **P2:** Spreadsheet thumbnails are generic placeholders; truncated filenames make source identification difficult. Search and `All types` filter are present.

## Ask — `/ask`
Screenshots: `live-audit-shots/13-ask-before.png`, `14-ask-answer.png`
- **P1:** Submitted the suggested question `Which companies have runway under 6 months?`. Response was: `Not in the book / corpus — I will not guess. Upload a source or confirm the figure in Inbox.` This is a valid refusal pattern, but it exposes the missing Inbox route and is surprising given the Command/Company screens display runway values.
- **P2:** Initial screen offers three suggested questions: `What is the latest confirmed cash?`, `Which companies have runway under 6 months?`, `Summarise open flags with evidence.` Composer placeholder is `Ask about confirmed cash, runway, flags...`; company scope defaults to `All companies`.
- **P2:** After answer, `New chat` appears and composer changes to `Ask a follow-up...`; no visible conversation/history navigation.

## Settings — `/settings`
Screenshot: `live-audit-shots/15-settings.png`
- **P0:** None observed; no settings were changed.
- **P1:** Settings is a separate shell from the main rail: top-left `← Book`, top-right `V3 Analyst / Org Admin`; left tabs are `Formula book`, `Flag policy`, `Connectors`, `Firm`, `Funds`, `People`. It is not reachable from the visible main navigation.
- **P2:** Formula book editor shows labels/aliases and units (`Net revenue`, `Gross revenue`, `GMV`, `Gross margin`, etc.) with a `Save formula book` button. The page does not visibly indicate unsaved changes or provide a reset/audit trail.

## Onboard — `/onboard`
Screenshot: `live-audit-shots/16-onboard-redirect.png`
- **P1:** `/onboard` redirects to `/command`; no onboarding flow or onboarding nav item is present. If onboarding is intentionally absent for an existing org, the route should return a clear not-available state rather than silently landing on Command.

## Mobile (~390px viewport)
Screenshot: `live-audit-shots/18-mobile-390-confirm.png`
- **P1:** At 390px responsive emulation, the rail becomes a top bar with `V3 Ventures` and `Menu`; Confirm content reflows into a single column. The table headings (`SEVERITY`, `ENTITY`, `SUMMARY`, `ACTIONS`) remain visible above stacked cards, which is readable but consumes vertical space.
- **P2:** Each pending card keeps two date inputs side-by-side and a full-width correction-note field; controls fit at 390px, but the Confirm/Reject action row is pushed below the fold. No horizontal overflow was observed in the capture.
- **P2:** Mobile nav was observed in DevTools emulation (390×569 responsive viewport). Menu contents were not opened to avoid changing workflow state.

## Screenshot inventory
`02-login.png`, `03-command.png`, `04-rail-collapsed.png`, `05-companies.png`, `06-company-detail.png`, `07-confirm.png`, `08-flags.png`, `09-nav.png`, `10-compare.png`, `11-reports.png`, `12-sources-vault.png`, `13-ask-before.png`, `14-ask-answer.png`, `15-settings.png`, `16-onboard-redirect.png`, `17-inbox-redirect-confirm.png`, `18-mobile-390-confirm.png`.


---

## Acceptance criteria for a fix pass

- [ ] One canonical name for pending queue; Ask + rail + URLs agree
- [ ] No duplicated reason strings on Command needs-a-look
- [ ] Runway / money / % display rounding; full precision only in cite debug
- [ ] Ask either answers runway from book or stops suggesting that question; refusal copy uses correct route name
- [ ] Sources show real processing states; Settings reachable from shell
- [ ] Reports have explicit Generate; dates consistent
- [ ] `/onboard` not a silent redirect
- [ ] Mobile Confirm actions sticky; rail tooltips when collapsed
- [ ] Charts gap on missing months; no fake zeros

---

*Generated by Grok Bot (V3 Ventures agent) from a live Chrome walk of www.ventureos.xyz after login, 2026-09-08.*
