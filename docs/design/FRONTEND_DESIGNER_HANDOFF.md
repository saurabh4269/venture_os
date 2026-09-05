# Frontend / UI designer handoff — Venture OS

**Audience:** Product / UI designer producing IA, wireframes, and a first-principles visual system  
**Product:** Venture OS — cited portfolio operating system for VC investment teams  
**Design partner:** V3 Ventures  
**Live preview (working product, not a visual template):** https://venture-os-saurabh-gupta.vercel.app  
**This file is not source of truth.** It cites locked product docs. If this brief and those docs disagree, **the numbered docs win**. If those docs and the Gargi brief disagree on **V3 functional behavior**, **the Gargi brief wins**.

**Shipped visual system:** [`BOOK_UI.md`](BOOK_UI.md) — paper / forest / dual-lane tokens, 220px rail, Command KPI + pulse layout.

---

## 0. How to use this file

1. Read this for product context, screen inventory, and wireframe briefs.
2. Confirm any number, field, workflow, or connector claim against the SoT list in §11.
3. Open the live preview to see *what exists today* (dense functional shell). Do **not** treat that look as the target visual system.
4. Design first-principles for Venture OS. **Do not copy** [v3.heisenbug.in](https://v3.heisenbug.in/) (tokens, chrome, layout, or illustration). That site is a **narrative walkthrough only**.

---

## 1. Higher-level product idea

Venture OS is the **central operating layer** for a VC investment team.

Today, each portfolio company emails a monthly MIS pack (Excel / PDF). An analyst opens it, re-keys figures into trackers, and writes what changed — for every company, every month. Call notes live in personal files. NAV is rebuilt in Excel each quarter. The live picture is always stale.

Venture OS inverts that:

1. **Data arrives** from source systems (OneDrive for MIS, Affinity for ownership, Granola for founder-call transcripts) or a controlled **upload fallback**.
2. Messy company packs are **standardized into a firm book** — one schema, one period model, dual currency, explicit units.
3. **Nothing auto-posts.** A human-in-the-loop **Inbox** confirms (or rejects / edits) proposed extracts. Confirmed rows become **facts** with provenance (source file + cell/page locator).
4. **Objective commentary** (what the numbers support, from MIS) and **subjective commentary** (what the founder said, from transcripts / human judgement) stay **visibly separate**. Never blended.
5. Command, Flags, NAV, Compare, Ask, and Reports **read only from the standardized book** — never from ad-hoc Excel.

**Cite or refuse.** Every user-visible figure needs a source, or it must not display as fact. Ask must say “not available” rather than estimate. Missing is **not** zero: UI shows `—` / “not reported”.

**Who it is for now:** V3 Ventures (India + Europe/US evergreen vehicles; consumer brands). Scale: **15–40 companies** per org initially; architecture must not hard-cap there.

**Who it is for later:** the same product sold to other VC firms as **multi-tenant SaaS** (one org per firm, roles, connectors, firm metric schema and flag policy). Tenancy is already in the product; billing / LP portal are out of scope.

**Positioning (wedge):** owns MIS ingest → standardization → live book → cited Ask → dual commentary → flags → partner-ready drafts. Integrates with Affinity / Carta / Visible later. Does **not** replace CRM, fund accounting, or cap-table admin in V1.

---

## 2. Users, roles, and daily ritual

### Roles (locked)

| Role | Can | Cannot |
| --- | --- | --- |
| **Org Admin** | Billing later, connectors, invites, FY / flag policy, confirm extracts, marks, Ask, reports | — |
| **Partner** | Read all, confirm extracts, edit marks, lock/unlock NAV, Ask, reports | Connector keys, invite/role admin, flag-policy edit |
| **Analyst** | Ingest, confirm/edit extracts, draft reports, Ask | Connector change, lock NAV, invite/role admin |
| **Viewer** | Read dashboard / reports | Confirm inbox, write marks, change connectors |

Platform super-admin is internal and audited — not a firm role.

### Morning loop (design for this, not a generic SaaS dashboard)

1. Open **Command** — fund pulse + “needs a look” (pending inbox + open flags).
2. Clear **Inbox** — confirm / edit units / reject proposed extracts.
3. Drill a **company** — book, dual commentary, vault, flags.
4. Rituals as needed: **Flags**, **NAV** (quarterly), **Compare**, **Ask**, **Reports**.

### Onboarding (must feel like a product, not an IT project)

Target from the brief: a new company producing structured output in **≤15 minutes** without engineering.

1. Sign up with work email → create Organisation (you are Org Admin), or accept an invite.
2. Create Fund(s) and reporting currency defaults.
3. Connect sources *or* start upload-only.
4. Add first portfolio company → first file (upload or OneDrive pull) → human confirms Inbox → Command has a live row.

**Not yet connected (design honestly):** domain auto-join, SMTP invites (copy-link only), SSO, password reset by email.

---

## 3. Feature inventory

Aligned with [`01_PRODUCT_SPEC.md`](../01_PRODUCT_SPEC.md), [Gargi brief v3](../brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md), [`02_GAP_MATRIX.md`](../02_GAP_MATRIX.md), and current `apps/web` routes. Status is **this repo**, not the old demo.

Legend: **shipped** = real end-to-end in this product · **partial** = real surface, remaining work noted · **missing** = not in V1 UI.

### 3.1 Auth and firm setup (Phase 0 — shipped)

| Feature | Route | Status | Designer notes |
| --- | --- | --- | --- |
| Sign in | `/login` | shipped | Work email + password. Sessions 7 days. No SSO / reset. |
| Sign up + create org | `/signup` | shipped | Creator becomes Org Admin. Empty book — no demo numbers. |
| Finish org create | `/onboard` | shipped | Signed-in user with no org. Domain auto-join is **not** connected. |
| Accept / decline invite | `/invite?id=` | shipped | Copy-link until SMTP exists. Email must match. Roles locked. |
| Org switcher | shell chrome | shipped | Multi-org membership. Membership-checked select. |
| FIXTURE_ONLY banner | shell chrome | shipped | When org is labelled fixture: “illustrative rows — do not report these figures.” Never style this as a toast you can dismiss away from the book. |

### 3.2 Book: companies, vault, inbox (Phases 1–2 — shipped)

| Feature | Route | Status | Designer notes |
| --- | --- | --- | --- |
| Company list | `/companies` | shipped | Coverage only. Empty state = empty book. |
| 15-min onboard wizard | `/companies/new` | partial | Profile → first file (upload or OneDrive pull) → Inbox. Live pull needs operator secrets. |
| Company detail | `/companies/[id]` | shipped | Headlines, positions, book table, **dual commentary**, flags, per-company vault, connector mapping. |
| Company vault (org-wide) | `/vault` | shipped | Immutable source files + parse status. Firm library is thin. **LP room is Phase 2 / missing.** |
| HITL inbox | `/inbox` | shipped | Propose ≠ fact. Tabs: pending / confirmed / edited / rejected. Unit ambiguity must be resolved before confirm. |
| Units / FY / FX / restatements / corrections | company + inbox | shipped | Ambiguous unit → inbox, never silent convert. FY Apr–Mar default. Dual INR Cr + EUR only with FX **rate + date + source**. Restatements keep history. Corrections survive re-parse. |

### 3.3 Rituals (Phase 3 — shipped)

| Feature | Route | Status | Designer notes |
| --- | --- | --- | --- |
| Command (live dashboard) | `/command` (also `/`) | shipped | Pulse cards + coverage table. Headlines are booked facts. Incomplete NAV says so. |
| Flags | `/flags` | shipped | Catalog detectors + evidence. Firm thresholds in Settings. Mute / snooze / unmute. 0 flags is 0 (not “healthy” invented copy). |
| NAV | `/nav` | partial | Marks, rollup, PoP bridge, period lock/unlock, official pack snapshot. Multi-approver / LP sign-off later. |
| Compare | `/compare` | shipped | Objective book only. No imputation. Stage/sector filter peers — does not invent a peer set. CSV export. |

### 3.4 Ask + reports (Phase 4 — shipped)

| Feature | Route | Status | Designer notes |
| --- | --- | --- | --- |
| Cited Ask | `/ask` | shipped | FTS + book. Refuse without evidence. Citations must resolve to a real file. Invented numerals refused. |
| Reports | `/reports` | shipped | One-pager (requires company), portfolio, monthly pack. PDF / PPTX / XLSX. Monthly pack keeps objective / subjective in **separate columns**. |

### 3.5 Firm settings + connectors (Phase 5 infra — partial)

| Feature | Route | Status | Designer notes |
| --- | --- | --- | --- |
| Settings | `/settings` | partial | FY + display currency, people + roles, copy-link invites, funds, connector **status table**, flag policy + audit. Metric dictionary still a stub. |
| Connector keys | `/settings/connectors` | partial | OneDrive / Affinity / Granola. Status stays **not connected** until health check. Never invent `lastSyncAt`. Live vendor calls wait on operator secrets. |

### 3.6 Out of scope / missing (do not wireframe as V1)

| Feature | Gap # | Notes |
| --- | --- | --- |
| Billing / plans for other VCs | 29 | Phase 6 |
| LP / fundraising data room (ILPA) | 30 | Phase 6 |
| Domain join + SMTP | 2 | Copy-link invites only |
| SSO / password reset | 1, 28 | Auth is Better Auth email+password today |
| Replacing Affinity / Carta / Visible | spec §6 | Integrate later; do not design a CRM or cap table |
| Mobile-native apps | spec §6 | Responsive desktop + usable tablet; not a phone-first product |
| Perfect 90% auto-ingest with no HITL | spec §6 | High-confidence propose + mandatory review for low confidence |
| DOCX / layout OCR / bbox highlight | 8, 16 | XLSX/CSV + PDF text; locator chips, not pixel-perfect page overlays yet |
| Multi-approver NAV / LP sign-off | 19 | Single Partner/Admin lock is enough for V1 |

### 3.7 Standard field groups (book schema — starting set)

From the Gargi brief §5. V3 may still finalize labels; **do not invent extra metrics**.

| Group | Fields | UI rule |
| --- | --- | --- |
| Financial | Revenue (gross/net), COGS, GM, OpEx by category, EBITDA, P&L | Dual INR Cr + EUR when FX triple exists |
| Cash | Closing cash, monthly burn, runway (cash / avg last-3-month burn) | Runway is derived; blank if inputs missing |
| Operating | Headcount, customers/users, orders, AOV, retention/churn | Sector-variable; absent = — |
| Unit economics | CAC, contribution margin, payback | Extract where present; **do not compute** unless every input exists |
| Ownership | Stake, last round, post-money, cost, cap-table changes | Mostly Affinity — only after a mapped numeric field id + successful sync |
| Qualitative | Founder priorities / risks / asks | **Transcripts / subjective lane only** — never inferred from MIS |

### 3.8 Flag starting catalog (firm-configurable)

Brief set + shipped detectors. Spectrum UX is TBD with V3 — keep policy **data-driven**, not decorative traffic lights.

Shipped keys (labels in product): Runway short · MIS late · Burn up · GM compression · Below plan · Mark stale · Cash unreported · Revenue down · Headcount drop · Concern on a call · Spend rising without revenue · Customer concentration shift · Ownership / governance change · Key person departure.

A flag **does not fire** without evidence. Missing inputs ≠ flag.

---

## 4. Information architecture

### 4.1 Route map (current `apps/web`)

```
Unauthenticated
  /                 Long-scroll marketing landing (Stitch). Soft-redirect if session cookie.
                    Desktop: two-column hero. ≤960px: stacked hero / trust / clarity /
                    vertical STAGE timeline / steps / forest CTA. CTAs: Get started → /signup,
                    Log in → /login. No waitlist, no invented logos or portfolio figures.
  /security         Optional methodology (no Terms/Privacy contract, no invented certifications)
  /login
  /signup
  /invite?id=

Signed in, no org
  /onboard

Signed in, in org  (left rail)
  Morning
    /command          Fund pulse
    /companies        Names on the book
    /companies/new    15-min onboard
    /companies/[id]   Company operating page
    /inbox            Confirm before it posts
  Rituals
    /flags            Catalog risks
    /nav              Marks and lock
    /compare          Peer metrics
    /ask              Cite or refuse
    /reports          Packs from the book
  Firm
    /vault            Source files
    /settings         Firm, people, policy
    /settings/connectors
```

`/` is the public marketing landing. A signed-in visitor is soft-redirected to `/command` (or `/onboard`) after first paint — the landing HTML does not wait on `/api/me`.

### 4.2 Shell (global chrome)

Design a **dense desktop-first institutional shell**, not a marketing site.

| Zone | Today | Design brief |
| --- | --- | --- |
| Left rail | Brand “Venture OS / the book”; grouped nav (Morning / Rituals / Firm); account + role + sign out | Keep ritual grouping. Active state must be obvious. Collapse to a menu on narrow viewports (already has a Menu toggle). |
| Top bar | Org switcher | Firm name is a first-class object. Switching orgs must feel irreversible enough that you notice (same book chrome, different data). |
| Fixture banner | Full-width alert when org is `FIXTURE_ONLY` | Persistent, high-contrast, not a snackbar. Copy must stay honest. |
| Skip link | “Skip to book” | Keep. Institutional users tab. |
| Provenance | `Fact` chips — click downloads source (session cookie) | Recurring atom. Unfact = `—` chip, not a grey zero. FX note sits under the chip (rate + date + source). |

**Do not** add a global search that pretends to answer numbers. Number questions go to **Ask** (cite or refuse). File finding can later live in Vault.

### 4.3 Language (use these names in UI)

| Use | Do not use |
| --- | --- |
| **Book** (confirmed facts) | “Database”, “spreadsheet”, “AI memory” |
| **Inbox** / confirm | “Approve AI”, “magic import” |
| **Company vault** | Overloading “data room” for company files |
| **Firm library** | — |
| **LP data room** | Only if/when Phase 6 exists |
| **Objective** / **Subjective** | A single “Notes” or “AI summary” column |
| **not connected** | “Connected” / a green dot before health check |
| **—** / not reported | `0`, `$0`, empty string that looks like zero |
| **Needs a look** | “You’re all caught up!” when the book is empty |

### 4.4 User journeys to wireframe end-to-end

1. **Empty firm:** signup → org → empty Command → add company → upload MIS → Inbox confirm → Command row with chips.
2. **Invite:** Org Admin copies link → teammate signup/login → `/invite` accept → Command as offered role (Viewer is read-only).
3. **Monthly ritual:** Command “needs a look” → Inbox → company dual commentary → Flags.
4. **Quarterly NAV:** NAV as-of + prior → unmarked chips → add mark (method + rationale + optional memo + FX triple) → lock → download official pack.
5. **Ask:** question → cited answer **or** refuse banner + empty/unresolved citations.
6. **Connectors:** Settings status table → Connectors paste keys → Test → Connect. Status stays not connected until test succeeds.

---

## 5. Screen-by-screen design brief

Each screen: job, layout, states, constraints. Wireframe at **1440×900** first; then a ~768 tablet collapse. Phone is secondary.

### 5.1 Command — `/command`

**Job:** One glance: is the book current, and what needs a human?

**Layout (suggested)**

- Title + one-line lede (facts only; missing is —).
- Pulse cards: Names · NAV (as-of, with “incomplete · N unmarked” when incomplete) · MOIC · Needs a look (inbox count + flag count).
- **Needs a look** list: inbox rows → `/inbox`; flag rows → `/flags`.
- Coverage table: Company · Stage · Own. · Last MIS · Cash · Burn · Runway · Mark · Flags. Company name → `/companies/[id]`. Cash/burn/runway/mark are **Fact chips** (click = source). FX note under converted figures.

**States**

| State | Treatment |
| --- | --- |
| Loading | “Loading the book…” — no skeleton numbers |
| Empty org | No companies. Writer: CTA to add company (15-min path). Viewer: ask Org Admin. |
| Incomplete NAV | Show partial total **and** say incomplete. Do not hide the gap. |
| 0 flags + 0 inbox | Needs-a-look = 0. Not a celebratory empty illustration that implies “all healthy” if coverage is also empty. |
| Error | Inline alert, not a toast that vanishes. |

**Constraints:** Headlines from deterministic code only. Runway = cash / average of last three reported burns. Click chip downloads source.

### 5.2 Companies list — `/companies`

**Job:** Coverage of names on the book.

**Layout:** Title + lede + primary “Add company” (writers). Table: Name · Sector · Stage · Country. Empty = empty book + 15-min CTA.

**Do not** put fake “health scores” or invented last-updated graphs on this list. Last MIS and flags live on Command / company.

### 5.3 Onboard company — `/companies/new`

**Job:** 15-minute path to first structured output.

**Steps (keep three; they are the product)**

1. **Profile** — name, sector, stage, country, FY start month (default 4 = April), unit hint (crore / lakh / million), fund, optional vendor ids (OneDrive folder, Affinity company id, Granola note id). Paste vendor values only — never invent folder/CRM fields.
2. **Vault** — upload XLSX/XLS/CSV/PDF **or** “Pull from OneDrive” if connected. Skip allowed. Honest copy when OneDrive is not connected.
3. **Confirm inbox** — parse status + link to Inbox. **Nothing auto-posts.**

**Viewer:** read-only explanation, no form.

### 5.4 Company detail — `/companies/[id]` (dual commentary)

**Job:** The monthly operating page: numbers + two commentary lanes + source files.

**Layout (this is the hardest visual problem — spend the most time here)**

1. **Identity** — name, legal name, sector / stage / country, FY, unit/currency hints. Actions: Compare, Ask (scoped), Inbox, Flags, Edit profile, Draft one-pager.
2. **KPI strip** — Cash · Burn · Runway (3-mo) as Fact chips + FX notes.
3. **Positions** — fund, instrument, ownership, cost, invested. Empty: “No positions… add a fund in Settings.” Affinity ownership only after mapped field + sync.
4. **Book table** — Metric · Value (dual display) · Period · Locator (sheet/cell + excerpt) · Lane · Version · Confirmed (who/when). Toggle “current version only” (restatements stay available).
5. **Dual commentary (required split)** — two columns, never a single feed:
   - **Objective (MIS)** — what the numbers support. Visual: “paper / measured”.
   - **Subjective (calls / judgement)** — founder priorities, risks, asks. Visual: distinct lane (today: purple-tinted). Empty lane shows `—`, not “no insights yet” generated text.
6. **Add commentary** (writers) — lane picker + period dates + body. Subjective notes here are human judgement. MIS extracts cannot be confirmed as subjective.
7. **Flags** — catalog label + severity + evidence line.
8. **Vault** — kind filter, download chips, SHA, period. Upload (MIS / board pack / transcript / mark memo / other). DOCX not supported — say so.
9. **Connector mapping** (writers) — optional vendor ids + Pull from OneDrive.

**States:** not found · no confirmed facts (CTA Inbox) · restatement history visible when toggle off · fixture org inherited from shell.

**Constraints:** Subjective lane **rejects MIS-only source**. Dual EUR only with complete FX triple; else refuse conversion (native + “EUR —”).

### 5.5 Inbox — `/inbox`

**Job:** Human confirm is the write-gate to the book.

**Layout**

- Lede: “AI / parser proposes. You confirm, edit units or values, or reject. Nothing here is a fact until you say so.”
- Status tabs: pending · confirmed · edited · rejected.
- Table: Company · Kind · Proposal (value, period, unit, correction note) · Locator (sheet/cell/page + excerpt) · Confidence · Confirm / Reject.

**Critical interactions**

- `unit_ambiguity` or `unknown` unit: **must** set unit (crore / lakh / million / unit / percent) before Confirm. Do not allow a guess.
- Low confidence (<50% today) visually flagged — still a human decision, not auto-reject.
- Value may be edited to `—` (null). Missing stays missing.
- Viewer: no confirm/reject controls.

**Empty pending:** “Queue is clear. Upload a pack from Companies if you expect extracts.” — not “You’re done!” if the book is empty.

### 5.6 Vault — `/vault`

**Job:** Firm-wide list of immutable source files.

**Layout:** Table File (download chip) · Company · Kind · Parse (status + error).

**Empty:** “No documents. Open a company and upload.”

**Copy:** “Company vault — MIS, board packs, transcripts. Firm library is thin. LP room is Phase 2.” Do not design an LP diligence tree in V1.

### 5.7 Flags — `/flags`

**Job:** Ranked, evidenced exceptions — only from the catalog.

**Layout**

- Title + Recompute (writers). Copy: missing inputs do not fire a flag; mute/snooze survive recompute; thresholds from Settings.
- Tabs: open · snoozed · muted.
- Filters: severity (high / med / low) · company · catalog flag.
- Table: Company (link + Compare) · Flag label · Severity · Detected · Evidence (key/value + source chips + note + snooze until) · Snooze 14d / Mute / Unmute.

**Empty open:** “No open flags for this filter — either the book is quiet, or headlines are still unconfirmed.” Do not invent a green “all clear” badge that looks like a health score.

**Severity:** use color as reinforcement, not the only signal (name the severity). Spectrum / more granular policy is TBD with V3 — leave room in Settings, don’t over-brand a rainbow.

### 5.8 NAV — `/nav`

**Job:** Quarterly marks, fund roll-up, period-over-period bridge, official lock.

**Layout**

- Controls: as-of · prior as-of · fund filter.
- Period status: unofficial vs **locked (official)** + snapshot fingerprint + last unlock reason.
- Lock / Unlock (Partner + Org Admin). Unlock **requires a reason**. Download official pack when frozen.
- Pulse cards: Cost · NAV (INR + EUR or “EUR — (no FX triple)”) · MOIC · IRR · Bridge Δ.
- Honesty lines: Unmarked (chips prefill the mark form) · Unprovenanced marks (excluded from headline until a memo is attached) · Unexplained bridge.
- Period bridge table: Company · Prior · Prior as-of · Current · Current as-of · Δ.
- Positions table: Company · Fund · Ownership · Cost · Mark (Fact chip) · As-of · Method · IRR · Rationale.
- Add mark (writers, unlocked): position, value, method (last round / DCF / bid / write-down / other), rationale, FX triple, optional memo, confirm-clear (null mark).

**Constraints**

- Incomplete rollup **says incomplete**. MOIC blank unless complete. IRR only when every sourced mark has `investedAt` — never invent an investment date.
- Headline NAV excludes unprovenanced marks.
- Locked as-of cannot be rewritten until unlock with reason.
- EUR headline refuses unless every sourced mark has a complete FX triple.

### 5.9 Compare — `/compare`

**Job:** Cross-company metric grid, period/stage normalized, null-safe.

**Layout**

- Filters: period (latest per company **or** a shared period) · stage · sector · hide empty rows · Export CSV.
- Company checkboxes (uncheck to exclude; do not invent peers).
- Metric checkboxes (starting set: net revenue, cash, burn, GM %, runway, headcount, plan revenue, CAC).
- Grid: company × metric. Each cell: native Fact chip · INR Cr · EUR. Sort by clicking a metric header.

**Constraints:** Confirmed **objective** book only. No imputation, no peer-average fill. Empty cell is —. Stage/sector filter does not fabricate a cohort.

### 5.10 Ask — `/ask`

**Job:** Plain-language Q&A over the book + files. Cite or refuse.

**Layout**

- Optional company scope.
- Question field (plain language, e.g. “What was last confirmed cash?”).
- **Answer** (pre-wrap) **or** a refuse **banner** (same visual weight as fixture honesty — not a cute chatbot shrug).
- **Citations list:** each item is a source chip (download) + excerpt. Unresolved = the word “unresolved”, never a fake link. Empty citations on refuse.

**Do not** design streaming “thinking” that invents a number before citations exist. If you show a thinking state, it is “Searching the book…”.

### 5.11 Reports — `/reports`

**Job:** On-demand drafts from the book; analyst edits rather than assembles.

**Kinds**

| Kind | Requires | Content rule |
| --- | --- | --- |
| One-pager | **Company required** — refuse to invent a name | Fixed field order: revenue, GM, cash, burn, runway, flags |
| Portfolio | — | Fund/book roll-up from confirmed facts |
| Monthly pack | Optional period | **Separate columns** for objective vs subjective |

**Layout:** period date · company select · three draft actions · table of drafts with PDF / PPTX / XLSX chips.

**Constraints:** Narrative cannot invent numbers. EUR columns refuse without FX triple. Exports are real files (cookie auth).

### 5.12 Settings — `/settings`

**Job:** Firm defaults, people, funds, connector honesty, flag policy.

**Sections to give visual hierarchy (today they stack; they need a settings IA)**

1. FY + base/display currency (Org Admin edit; others read).
2. Mapping — metric dictionary is a **stub**. Do not fake a mapping studio. Company vendor ids live on the company page.
3. People — name, email, role (Admin can change). Remove member. Last-admin guard exists — surface the error, don’t hide the control.
4. Invite — email + locked role + copy link. Honest: “Email delivery is not connected.”
5. Connectors **status** — kind · status · last sync · error. CTA to `/settings/connectors`. Last sync is `—` until a real sync.
6. Session copy (7-day cookie; no SSO).
7. Flag policy — per-catalog threshold + bounds. Org Admin save. Audit log of before/after. Prompt: recompute Flags after save.
8. Funds — name, vintage, currency, committed capital.

### 5.13 Connectors — `/settings/connectors`

**Job:** Org Admin pastes secrets; product stays honest until a health check.

**Layout:** three cards (OneDrive, Affinity, Granola).

Each card:

- Vendor label + **status badge** (`not connected` / configured / connected / error).
- Help copy (what key, what it writes). Granola → **subjective sources only**. Affinity ownership only with a verified field id.
- Last successful sync or —.
- Last error (alert).
- Fields (password-style for secrets). Save · Test connection · Connect · Disconnect.
- OneDrive: delegated vs app-only; redirect URI is an operator concern — keep it in help, not a fake “wizard success”.

**Non-admin:** read-only “Only Org Admin can paste keys.”

**Never:** green “Connected” from a saved key alone; invented last-sync; fake Graph/Affinity/Granola field names.

### 5.14 Auth screens — `/login` `/signup` `/onboard` `/invite`

Calm, single-column, institutional — not a consumer growth funnel.

| Screen | Job | Honest copy |
| --- | --- | --- |
| Login | Work email + password | SSO and email reset are not connected. |
| Signup | User + org (or user then invite) | Empty book. Optional FIXTURE seed is labelled, never implied as V3 data. |
| Onboard | Create org if signup’s org step failed | Domain auto-join is not connected. Invite link is the join path. |
| Invite | Accept / decline as offered role | Expired / wrong-email / already used states. Masked email when needed. |

Errors: wrong password does **not** reveal which field failed. Invite email mismatch names the requirement, not a generic 403.

---

## 6. Cross-cutting UI atoms (design these once)

| Atom | Behavior |
| --- | --- |
| **Fact chip** | Fact + locator → clickable, downloads source. Not a fact → `—` (unfact). Optional FX note underneath. |
| **Objective / subjective lanes** | Always paired, always labelled. Different surface color/type — not just a tag. |
| **Empty** | Explains how to get data onto the book. No illustrative metrics. |
| **Incomplete** | Partial number + “incomplete / missing N”. |
| **Refuse** | Ask, FX, one-pager-without-company, unit-unknown. Same honesty pattern. |
| **Severity** | `high` / `med` / `low` + color. Not icon-only. |
| **Role gating** | Hide write controls for Viewer; don’t tease disabled “Confirm” without explanation on `/companies/new`. |
| **Density** | Tables are the native language. Cards for pulses only. Prefer 14px institutional type, tight leading, hairline rules. |

### Current tokens (starting point — not sacred)

The shipping CSS is a **calm paper/ink** system (`apps/web/src/app/globals.css`). You may replace it; do not replace the *semantics*.

| Token | Today | Meaning |
| --- | --- | --- |
| `--paper` / `--ink` | warm off-white / near-black | Book, not a dark ops console unless you have a strong reason |
| `--forest` | deep green | Action / focus — not “AI magic” |
| `--subjective` | muted violet | Subjective lane only |
| `--danger` / `--warn` | brick / ochre | Errors and medium flags |
| Serif headings + sans body | Source Serif 4 / IBM Plex Sans | Institutional, not startup-gradient |

---

## 7. Non-goals (V1)

Do **not** spend design time on:

- Cloning [v3.heisenbug.in](https://v3.heisenbug.in/) or the `v3_agentic_os` demo chrome.
- A public LP portal, ILPA folder tree, or fundraising data room.
- Deal-sourcing / pipeline CRM (Affinity’s job).
- Fund accounting, capital calls, K-1s (Carta / Juniper Square).
- Mobile-native apps or a consumer onboarding mascot.
- Chat-GPT-style Ask that answers before citations exist.
- Auto-posting extracts, silent unit conversion, or “we filled 0 for you”.
- Invented Affinity / Microsoft Graph / Granola / ILPA field names.
- Billing, usage meters, or a marketing homepage inside the app.
- Decorative “AI copilot” illustrations on Command.

---

## 8. Design principles (locked product rules → visual rules)

1. **Cite or refuse.** If it cannot be sourced, it is not a fact. Chips, Ask, NAV, reports, and exports share this rule.
2. **Missing ≠ 0.** `—` / “not reported”. Charts and roll-ups skip nulls. Never coalesce to zero.
3. **Propose → review → confirm.** LLM / parser never writes objective financial facts into the book. Inbox is the ritual, not a speed-bump to hide.
4. **Headline numbers are computed, not narrated.** Deterministic runway / MOIC / XIRR / NAV. The UI may explain the formula; it may not “smooth” a gap.
5. **Objective and subjective stay visibly separate.** Two lanes, two colors, two report columns. Subjective never from MIS-only input.
6. **Corrections are sacred.** Edited inbox rows and correction notes survive re-parse. Show attribution (who / when).
7. **FX is a triple or a refusal.** Rate + date + source on every converted figure.
8. **Units are declared.** Lakh / crore / USD detected explicitly; never inferred from magnitude.
9. **FY is April–March** unless the company profile overrides. “Q1” = Apr–Jun.
10. **Restatements version history.** Current vs prior must be inspectable.
11. **Flags only from the catalog + evidence.** No free-text “insight” badges.
12. **Connectors stay honest.** “not connected” until OAuth/key + health check. No fake success.
13. **Fixtures are labelled.** `FIXTURE_ONLY` banner; never present seed numbers as V3’s book.
14. **Dense, calm, desktop-first, institutional.** Partner-meeting software. Provenance over decoration. First principles — not a demo clone.
15. **Empty org is empty.** No illustrative NAV, no fake portfolio to “show the UI”.

---

## 9. Designer deliverables checklist

Please deliver against the **current route map**, not a greenfield sitemap.

### Must have

- [ ] Sitemap / IA matching §4 (Morning / Rituals / Firm + auth).
- [ ] Desktop wireframes (low-fi) for: Command, Company detail (dual commentary), Inbox confirm, Vault, Flags, NAV, Compare, Ask (answer + refuse), Reports, Connectors, Settings (people + flag policy), Login / Signup / Onboard / Invite.
- [ ] Annotated empty, loading, error, incomplete, refuse, and Viewer (read-only) states for Command, Inbox, Company, NAV, Ask, Connectors.
- [ ] Fact-chip + unfact (`—`) + FX-note spec (one component, all ritual screens).
- [ ] Dual-lane commentary spec (company page + monthly pack columns).
- [ ] Role matrix overlay (what Viewer vs Analyst vs Partner vs Org Admin sees on Inbox, NAV lock, Settings, Connectors).
- [ ] Visual principles: type scale, table density, color (objective / subjective / severity / forest action) — **or** a reasoned replacement of the paper/ink tokens.
- [ ] Honest connector cards (status vocabulary + never-fake last-sync).
- [ ] 15-minute onboard storyboard (profile → vault → inbox → Command).
- [ ] Responsive note: rail collapse / table scroll — tablet usable; phone is best-effort.

### Nice to have

- [ ] Mid-fi mock of Company detail (the money page) and Command coverage table.
- [ ] Motion: none required; if any, 150ms opacity only — no number count-up (that implies invented interpolation).
- [ ] Accessibility: skip link, focus rings, contrast on `—` chips and severity text, do not use color as the only flag signal.
- [ ] Content deck: empty-state sentences that stay anti-hallucination (use §4.3 language).

### Explicitly not requested

- Marketing site, pitch deck, or mascot.
- LP portal or billing screens.
- High-fidelity clone of v3.heisenbug.in.
- New routes or feature names that are not in this inventory (propose in writing; do not add to the sitemap as if shipped).

---

## 10. Live preview and engineering constraints

| Item | Value |
| --- | --- |
| Live preview | https://venture-os-saurabh-gupta.vercel.app |
| Repo | https://github.com/saurabh4269/venture_os |
| Domain | ventureos.xyz |
| UI app | `apps/web` — Next.js 15 App Router |
| Shell / nav / Fact chip | `apps/web/src/components/Shell.tsx` |
| Tokens | `apps/web/src/app/globals.css` |
| Stack (locked) | Better Auth · Hono API · Postgres + RLS · BullMQ · OpenAI via `packages/llm` · first-principles UI |

The preview may be empty or fixture-labelled depending on the deployed org. **Empty is correct.** If you need labelled rows locally: `pnpm demo:vc` (see root `AGENTS.md`) — still `FIXTURE_ONLY`.

Engineering will implement your system on these routes. Prefer improving hierarchy, density, and provenance over adding pages.

---

## 11. Source of truth (read these; do not invent beyond them)

| Doc | Role |
| --- | --- |
| [`docs/00_README.md`](../00_README.md) | Index + anti-hallucination rules |
| [`docs/brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md`](../brief/V3_Requirement_Brief_v3_Gargi_2026-09-03.md) | **Functional SoT** (V3 behavior wins) |
| [`docs/01_PRODUCT_SPEC.md`](../01_PRODUCT_SPEC.md) | Product contract (vision, roles, non-goals, flags) |
| [`docs/02_GAP_MATRIX.md`](../02_GAP_MATRIX.md) | Shipped vs remaining (This-repo column) |
| [`docs/02b_PRODUCTION_GAP_ANALYSIS.md`](../02b_PRODUCTION_GAP_ANALYSIS.md) | Deeper production gaps |
| [`docs/03_ARCHITECTURE.md`](../03_ARCHITECTURE.md) · [`docs/DECISION.md`](../DECISION.md) | Locked stack |
| [`docs/04_BUILD_PLAN.md`](../04_BUILD_PLAN.md) | Phased delivery |
| [`docs/05_DATA_MODEL.md`](../05_DATA_MODEL.md) | Invariants (null, restatement, provenance, FX) |
| [`docs/connectors/`](../connectors/) | Connector field rules — do not invent vendor fields |
| Root [`AGENTS.md`](../../AGENTS.md) | Agent + UI posture (“dense calm desktop”) |

**Historical only:** [`docs/brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md`](../brief/V3_Requirement_Brief_v1_Adishree_2026-08-26.md) — Gargi Sep 3 supersedes.

**Demo / UX reference only — never copy UI, never treat as production data:**

- https://v3.heisenbug.in/ — narrative walkthrough
- https://github.com/saurabh4269/v3_agentic_os — domain/IA reference only
- https://www.v3.ventures — public names only

---

## 12. Success metrics the UI must not undermine

From the brief — treat as acceptance, not marketing copy on the dashboard:

| Metric | Target | UI implication |
| --- | --- | --- |
| Auto ingest | ≥90% OneDrive-path without re-key | Inbox still exists; hide friction, not the confirm step |
| Accuracy | Near-zero headline error; one-click source | Fact chips on every headline |
| Analyst time | ≥80% less assembly | Reports in minutes; Ask instead of opening ten files |
| Ask | All figures cited or “not available” | Refuse is a first-class success state |
| Onboard | 15 minutes to first structured output | Wizard + empty states point at the next action |
| Flags | High catch, low false positives | Evidence always visible; mute/snooze respected |
| Adoption | Everyday use | Morning rail; Command is the home, not Settings |
