# Venture OS — design intent

**Audience:** later UI / IA work  
**Status:** directional, not a pixel SoT  
**Pack date:** 2026-09-07  

Functional behaviour stays in the Gargi brief, numbered product docs, and `AGENTS.md`. If this file and those disagree on product rules, **those win**. This file only captures packaging and visual intent we agreed for the shell.

---

## Product posture

Venture OS is the **book** for a VC investment team: MIS and sources in, human confirm, then Command / Flags / NAV / Compare / Reports / Ask read only from confirmed facts.

Firms already have CRM, email, and drive. Do not compete with those surfaces. Own standardization, provenance, rituals, and cite-or-refuse answers.

Missing stays missing. Never invent figures, connector success, or portfolio news. Objective and subjective commentary stay visibly separate.

---

## Information architecture

Structure the shell by **job cadence**, not by dumping every feature as a peer tab.

Suggested shape (names can evolve; jobs should not):

| Zone | Job |
| --- | --- |
| **Today** | Glance: is the book current, what needs a human |
| **Book** | Coverage, confirm proposed extracts into facts, source files |
| **Review** | Exceptions, quarterly valuation, peer compare |
| **Output** | Packs generated from the book |

**Confirm** is the write-gate to the book (parser proposes, human confirms). It is not a CRM or mail inbox. Prefer language that says “confirm / proposed / queue” over “inbox” if that confuses operators who already live in Affinity or email.

**Ask** is first-class in the brief but should not crowd the ritual rail. Prefer a persistent agent entry (e.g. corner control) that opens a cite-or-refuse panel. A dedicated history route is fine; inventing unsourced “portfolio news” is not.

**Settings** is firm configuration, not a morning ritual. Prefer account / identity chrome (name, role, org) as the door to Settings, not another primary nav peer.

Deep work uses **page tabs**, not more rail items:

- Company: overview, book, commentary (split lanes), flags, sources, links  
- Settings: formula book, flag policy, connectors, firm, funds, people  

One glance should answer “what is this screen for?” If two jobs share a URL, split with tabs rather than endless scroll or another top-level nav item.

---

## Settings as the firm’s tuning surface

Each firm will define its own metric language and source wiring. Keep that under Settings:

- **Formula book** — firm metric dictionary, aliases, derived rules the OS already knows how to compute deterministically  
- **Flag policy** — thresholds for the agreed catalog  
- **Connectors** — OneDrive / Affinity / Granola with honest not-connected until real health  
- **Firm / funds / people** — FY, currencies, vehicles, roles  

Operate the book in the rail. Tune how *this* firm defines the book in Settings.

Do not treat an Excel add-in or LP formula paste as a V1 requirement. The useful idea is a firm-owned formula / metric book inside the product.

---

## Visual language

Inspiration from modern VC portfolio tools (dense dark rail, light work surface, strong accent, calm metric cards and charts) is welcome. **Do not clone** a competitor’s brand, marketing chrome, or demo-site skin.

Direction:

- Dark rail, light content, one clear accent for active / primary  
- Metric cards and honest charts where the book has series; empty stays empty  
- Color for evidence-backed status, not decorative “risk scores”  
- Institutional and calm; dense on desktop without clutter  

Avoid filling the UI with explanatory paragraphs, declarations, and ornamental punctuation. Prefer labels, structure, and empty states that teach by shape. If a control needs a paragraph to make sense, the packaging is wrong.

---

## Reference screens

`image-references/` is a **starting point** for packaging and viz craft only. Many screens are marketing mockups; several modules (captables, forecasting, peer-fund benchmarks, investee portal, Excel add-in) are **out of Venture OS V1 wedge**. Steal clarity of hierarchy; leave product scope to the brief.

---

## Non-goals for this layer

- Replacing Affinity, Carta, or fund accounting  
- LP data room / billing chrome as primary nav (later phases)  
- Global search that answers numbers without Ask’s citation gate  
- Auto-posting extracts into headlines without confirm  

---

## How to use this later

When iterating UI: keep the glance test, the cadence grouping, Settings-as-tuning, Ask as secondary chrome, and lean copy. Refresh tokens, density, and chart craft freely as long as provenance and brief invariants stay intact.
