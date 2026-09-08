# Dribbble → Venture OS — first-principles audit

**Purpose:** Map selected Dribbble sources to Venture OS product tabs so layout/density ideas can be stolen as *structure*, not as pixels or palette.

**Tabs in scope:** Command · Companies · Confirm · Flags · NAV · Compare · Reports · Sources · Ask

---

## Constraints (non-negotiable)

1. **Tokens stay Scratch.** Surfaces `#FAFAFA` / `#FFFFFF`, ink `#09090B`, muted `#71717A`. Emerald `#059669` = cite/verified only; violet `#5B21B6` = subjective only. No glassmorphism, no neon SaaS gradients, no Dribbble dark-fintech skins.
2. **Honesty: missing ≠ 0.** Empty book shows `—` or chart gaps. Never invent KPIs, portfolio companies, NAV bridges, Ask answers, or fill charts with fabricated zeros.
3. **Inspiration, not copy.** Use shots for IA density, card hierarchy, table+chart composition, and interaction rhythm. Do **not** pixel-copy chrome, illustration, icon sets, or marketing copy. Credits stay with original authors; artifacts under each folder are reference only.

---

## Source map

| # | Folder | Source | Primary tabs | Secondary tabs |
|---|--------|--------|--------------|----------------|
| 01 | `01-data-viz-tag` | [data-visualization-ui tag](https://dribbble.com/tags/data-visualization-ui) | Command, NAV, Reports, Compare | Companies, Flags |
| 02 | `02-social-analytics` | [Social Media Analytics Dashboard](https://dribbble.com/shots/27174110-Social-Media-Analytics-Dashboard-SaaS-UI-UX-Design) | Command, Companies, Reports | Compare, Flags |
| 03 | `03-cashflix-finance` | [CashFlix Personal Finance Dashboard](https://dribbble.com/shots/27279494-CashFlix-Personal-Finance-Dashboard-UI-for-Fintech-Web-App) | NAV, Command, Companies | Reports, Compare |
| 04 | `04-conversational-ai` | [Conversational AI Analytics Dashboard](https://dribbble.com/shots/27610659-Conversational-AI-Analytics-Dashboard-UI-Design) | Ask, Confirm, Sources | Command, Flags |
| 05 | `05-ecommerce-analytics` | [E-commerce Analytics Dashboard](https://dribbble.com/shots/26969985-E-commerce-Analytics-Dashboard-UI) | Command, Compare, Reports | Companies, Flags, NAV |

---

## Tab-by-tab takeaways

### Command
- **Steal from:** 01 (KPI row + sparklines), 02 (overview cards + trend strip), 03 (cash/wealth summary hierarchy), 05 (multi-metric hero + secondary modules).
- **Apply as:** Dense Monday ritual — Companies / Open flags / Needs look / Last sync. Primary path = Needs a look → Confirm inbox. KPI tickers only when values exist.
- **Reject:** Fake AUM hero numbers, decorative orbs, always-on chat rails, lifestyle illustration.

### Companies
- **Steal from:** 02 (entity list + channel/metric side panels), 03 (account/entity cards), 05 (SKU/merchant table density → company table).
- **Apply as:** Virtualized table + company detail with revenue/burn overlays; cite chips on filed metrics.
- **Reject:** Marketing “pipeline theater” company names; inventing portfolio rows to fill empty states.

### Confirm (Inbox)
- **Steal from:** 04 (human-in-the-loop / approval adjacent to AI stream), 02/05 (row actions, status badges).
- **Apply as:** Approval cards for proposed book writes; LLM proposes, human confirms. Toast feedback after accept/reject.
- **Reject:** Auto-commit of agent suggestions; burying confirm behind decorative “AI insight” cards.

### Flags
- **Steal from:** 01/02/05 (alert badges, anomaly callouts, attention lists).
- **Apply as:** Open-flags count on Command; flag list with severity + cite to source doc. Animated badges only for real status.
- **Reject:** Red-everywhere alarm chrome; inventing flags for demo density.

### NAV
- **Steal from:** 03 (personal net-worth / cash flow → fund NAV bridge), 01 (waterfall / area patterns), 05 (composition donuts ≤5 slices).
- **Apply as:** Fund NAV area + waterfall for valuation change; ownership/stage mix donut. Null series = gap, not zero.
- **Reject:** Dark purple “fintech wealth” skins; fake NAV curves.

### Compare
- **Steal from:** 01 (multi-series overlays), 02 (period/channel compare), 05 (peer / cohort bars).
- **Apply as:** Peer company metrics, period toggles, mixed line+column when MIS exists.
- **Reject:** Chart junk (3D, rainbow fills); comparing invented peers.

### Reports
- **Steal from:** 01 (report layout grammar), 02/05 (exportable dashboard modules), 03 (period summaries).
- **Apply as:** Partner-ready report shells that cite Sources; duration pickers for period.
- **Reject:** PDF-looking marketing slides; reports without provenance.

### Sources
- **Steal from:** 04 (citation / evidence adjacent to answers), 01 (data provenance patterns).
- **Apply as:** Vault / document groupings; cite markers linking Ask and filed metrics to files. MIS upload path when connectors absent.
- **Reject:** Decorative file piles with no real vault; hiding missing MIS behind zeros.

### Ask
- **Steal from:** 04 (conversational analytics shell — composer, thread, activity stream).
- **Apply as:** Collapsed Ask by default; open on demand. Prompt input + message scroller + agent activity. **Cite-or-refuse.** Emerald for cited facts; violet for subjective commentary.
- **Reject:** Always-open Ask rail; demo ⌘K with invented Acme / $250M answers; purple AI glow chrome.

---

## Cross-cutting: what to keep vs kill from SaaS Dribbble

| Pattern common on Dribbble | Venture OS stance |
|----------------------------|-------------------|
| Dark neon / glass dashboards | Kill — Scratch light only |
| Dense KPI grids with sample data | Keep density; kill sample data → `—` |
| Left icon rail + content canvas | Keep (match Command SoT rail order) |
| Chat panel glued to analytics | Keep composition for Ask; collapse by default |
| Soft gradients, playful illustration | Kill in logged-in shell |
| Sparklines / small multiples | Keep when series exist; gap when missing |
| Status / approval workflows | Keep for Confirm + Flags |

---

## Folder artifact contract

Each `0N-*/` folder:

| Path | Role |
|------|------|
| `README.md` | Source URL, target tabs, artifact note |
| `shot.png` | Reference capture (from Dribbble / LinkedIn mirror) |
| `v0/` | Scratch / v0 / regenerate artifacts for that source |

`linkedin-mirror.jpg` (if present) is the raw mirror; prefer `shot.png` for handoff viewers.

---

## Success check for any adopt pass

- [ ] No Dribbble palette leaked into `globals.css` / components
- [ ] Empty tenant still shows `—` / gaps (missing ≠ 0)
- [ ] Shot ideas mapped to a real tab, not a new fake nav item
- [ ] Ask still refuses without citation; Confirm still owns writes
- [ ] Motion stays low (~150–300ms); `prefers-reduced-motion` honored
