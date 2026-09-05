# Pass — V3 Scratch UI redesign

**Date:** 2026-09-05  
**Scope:** Chrome only — marketing, auth, app shell, ritual page tokens. Product spine unchanged.

## Shipped

- V3 Scratch tokens (`#FAFAFA` / `#09090B` / cite `#059669` / subjective `#5B21B6`)
- Landing SoT: "Truth you can cite.", feature cards, Precision Architecture, Ask.Refuse band
- Login SoT: Newsreader card, Sign up link (no Request access)
- Command SoT: icon rail, KPI strip with `—` on empty counts, Pipeline Activity, Ask OS panel
- Book paper/forest superseded — see `docs/design/stitch-v3/V3_SCRATCH.md`

## Libraries (installed & used)

- shadcn/ui components under `src/components/ui/` — Shell, login, Command, marketing CTAs
- lucide-react — replaces custom SVG rail icons in `Shell`
- GSAP + ScrollTrigger — `MarketingLanding` hero + scroll reveals
- framer-motion — `Shell` route transitions, login/signup motion
- R3F/Three — `HeroAtmosphere.tsx` on landing (reduced-motion safe)


- Better Auth, BFF `/api/me` no-store, anonymous landing first paint (PR #10 invariant)
- HITL inbox, cite drawer, connector vault contracts, dual commentary lanes
- Empty book honesty — no invented 124 companies or fake AUM

## E2E

- `landing.spec.ts`, `mobile.spec.ts`, `smoke.spec.ts` selectors updated for V3 copy and org menu sign-out
