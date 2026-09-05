# V3 Scratch — visual system (Stitch SoT)

**Status:** Shipped in `apps/web` (2026-09-05).  
**Supersedes:** [`BOOK_UI.md`](../BOOK_UI.md) paper/forest tokens — **do not extend Book UI**.

## Source of truth screens

| Screen | Stitch ID | File |
| --- | --- | --- |
| Landing | `bf39caef…` | `sot/landing-bf39.png` |
| Login | `1cdaf426…` | `sot/login-1cda.png` |
| Command home | `d437aeb1…` | `sot/command-home-d437.png` |

Conflict rule: Gargi brief wins on product behavior; architecture docs win on stack; these three Stitch screens win on visual layout.

## Locked tokens

| Token | Hex | Use |
| --- | --- | --- |
| Background | `#FAFAFA` | Page canvas |
| Surface | `#FFFFFF` | Cards, rail, auth card |
| Ink | `#09090B` | Type, primary CTA |
| Muted | `#71717A` | Secondary text |
| Rule | `#E4E4E7` | 1px borders |
| Primary CTA | `#09090B` | Buttons — **black**, not forest |
| Cite / verified | `#059669` | CITE chips and cite accents **only** |
| Cite soft | `#D1FAE5` | Cite chip background |
| Subjective | `#5B21B6` | Partner commentary lane **only** |
| Subjective soft | `#EDE9FE` | Subjective surfaces |

## Typography

- **Newsreader** — marketing headlines, panel titles, brand wordmark (italic on auth).
- **Inter** — UI labels, tables, KPI figures, body.

## Forbidden

- Paper `#f3efe6`, forest `#244c3c` as primary system
- "Request access" (use **Sign up** → `/signup`)
- Fake logos, AUM, health %, invented portfolio metrics on marketing or empty book
- Emerald outside cite/verified affordances

## Chrome mapping

| Area | Implementation |
| --- | --- |
| `/` landing | `MarketingLanding` + `LandingChrome` — anonymous first paint, no `/api/me` |
| Auth | `AuthFrame` — centered card, Sign up link on login |
| App shell | `Shell` — 56px icon rail, topbar search, Create CTA |
| Command | KPIs Companies / Open flags / Needs look / Last sync (`—` when empty); Pipeline Activity from book; Ask OS panel → `/api/ask` |
| Cite | `.cite` emerald chips; `Fact` + citation drawer unchanged |

## Motion

- Marketing hero: GSAP fade-in (`prefers-reduced-motion` respected)
- App panels: framer-motion optional on future passes

## Libraries (required handoff)

| Library | Use |
| --- | --- |
| **shadcn/ui** | `button`, `card`, `badge`, `tabs`, `dialog`, `alert-dialog`, `sheet`, `tooltip`, `separator`, `skeleton`, `input`, `label`, `dropdown-menu`, `scroll-area`, `table`, `sonner` — app chrome, auth forms, Command |
| **lucide-react** | Icon rail, search, marketing + shell icons |
| **GSAP + ScrollTrigger** | Marketing landing scroll + hero entrance |
| **framer-motion** | App page transitions (`Shell`), auth card, feature cards |
| **@react-three/fiber + drei + three** | `HeroAtmosphere` soft wireframe mesh (disabled when `prefers-reduced-motion`) |

Installed in `apps/web/package.json`. Init via `components.json` + `npx shadcn@latest init`.

## Files

- Tokens: `apps/web/src/app/globals.css`, `packages/ui/src/index.ts`
- Landing: `apps/web/src/components/marketing/*`
- Shell: `apps/web/src/components/Shell.tsx`
- Ask OS embed: `apps/web/src/components/AskOsPanel.tsx`
- PWA manifest: `apps/web/src/app/manifest.ts` (`#FAFAFA` / `#09090B`)
