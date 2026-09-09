# v0 Venture OS — inspiration scaffolds

Production-quality React + Tailwind + recharts tab scaffolds for a coding agent.
**Not wired to API.** Structure and density only — steal IA from Dribbble, keep Scratch tokens.

## Tokens (Scratch)

| Token | Value |
|-------|-------|
| Surface | `#FAFAFA` |
| Card | `#FFFFFF` |
| Ink | `#09090B` |
| Muted | `#71717A` |
| Border | `#E4E4E7` |
| Cite / verified | `#059669` |
| Subjective only | `#5B21B6` |

**Honesty:** missing = `—` (never invent KPIs or fill charts with fabricated zeros). Chart series use **EXAMPLE** labels only. Null points = visual gaps.

## Component → Dribbble source → live tab

| Component | Dribbble source(s) | Live tab / shot |
|-----------|--------------------|-----------------|
| `CommandDashboard.tsx` | CashFlix (`03`) + ecommerce (`05`) + social (`02`) | Command · `live-ventureos/command.png` |
| `NavDashboard.tsx` | CashFlix (`03`) + data-viz (`01`) | NAV · `live-ventureos/nav.png` |
| `ComparePeers.tsx` | ecommerce (`05`) + social (`02`) + data-viz (`01`) | Compare · `live-ventureos/compare.png` |
| `AskCopilot.tsx` | conversational AI (`04`) | Ask · `live-ventureos/ask.png` |
| `CompanyDetail.tsx` | CashFlix (`03`) + social/ecommerce trend panels | Company detail · `live-ventureos/company-detail.png` |
| `CompaniesTable.tsx` | social (`02`) tables + ecommerce (`05`) density | Companies · `live-ventureos/companies.png` |
| `ConfirmQueue.tsx` | conversational AI (`04`) HITL + social/ecommerce badges | Confirm · `live-ventureos/confirm.png` |
| `FlagsPanel.tsx` | data-viz (`01`) / social (`02`) / ecommerce (`05`) alerts | Flags · `live-ventureos/flags.png` |
| `ReportsHub.tsx` | data-viz (`01`) + social/ecommerce export modules | Reports · `live-ventureos/reports.png` |
| `SourcesVault.tsx` | conversational AI (`04`) citation / provenance | Sources · `live-ventureos/sources.png` |

See also: `PAIRING.md` (chart types), `package-hint.md` (deps), `../AUDIT.md` (constraints).

## Usage

Copy into the app tree. Each file is `'use client'`. Install `recharts` and `lucide-react`. Wire real data later — placeholders intentionally show `—` / EXAMPLE.
