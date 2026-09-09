# CoreShift landing — motion language (Venture OS adaptation)

Reference motion timeline for the public marketing homepage (`apps/web/src/components/marketing/`).
Keyframe PNGs and the source MP4 live outside this repo; this doc is the **timing SoT** for implementation.

## Honesty constraints (Venture OS)

- Copy: **“The book for the investment team.”** / Get started / Log in.
- Public chrome does **not** name the design partner.
- No fake portfolio KPIs, customer logos, or satisfaction scores.
- Schematic UI is allowed when **labeled** (e.g. “Schematic bars — not live NAV”).
- Connector carousel stays honest: OneDrive / Affinity / Granola are wired; live tiles stay **not connected until a health check**.
- Testimonials are **methodology quotes** (role titles only), not fabricated customer reviews.
- `prefers-reduced-motion`: disable pin/scrub, float loops, carousel autoplay, blur slides; show static fallbacks.

## Timeline (MP4)

| Time | Beat | Implementation |
| --- | --- | --- |
| **0:00** | Hero: constellation icons **bob on Y**; centered H1 + CTA | `HeroConstellation` + static H1 + `MotionCta` in `LandingHeroSequence` |
| **0:01–0:03** | Next section **in flow** under the hero; cards rise when they enter view | `LandingHeroSequence` stacks (no pin) so theme and CTAs stay clickable after scroll |
| **0:04–0:06** | Feature cards: **inner micro-anims** (bars grow, badge slide, list stagger) | `FeatureRiseCard` variants + `useInView` |
| **0:07–0:10** | Integrations **arc carousel**: curved path, center scale+opaque, edges rotate+blur, caption crossfade | `ConnectorArc` |
| **0:11–0:14** | Methodology quotes: **exit left + blur**, **enter from right sharp** | `TestimonialCarousel` + `AnimatePresence` |

## Stack

- **motion/react** — springs, `AnimatePresence`, `useReducedMotion`, `useInView`
- **GSAP + ScrollTrigger** — blur headline enters, scroll-rise elsewhere

## Key files

| File | Role |
| --- | --- |
| `motion/LandingHeroSequence.tsx` | Hero + rise section in document flow |
| `HeroConstellation.tsx` | Semantic nodes on designed ellipse; spokes meet centers |
| `motion/FeatureRiseCard.tsx` | Rise cards with inner micro-anims |
| `ConnectorArc.tsx` | Sources arc carousel (real logos) |
| `motion/TestimonialCarousel.tsx` | Methodology quote carousel |
| `motion/BlurHeadline.tsx` | GSAP blur→sharp slide |
| `motion/MotionCta.tsx` | 200ms hover lift on ink CTAs |
| `LandingChrome.tsx` | Floating pill nav |
| `MarketingLanding.tsx` | Section composition |
| `HERO_TOOLS_CRAFT_BRIEF.md` | Vibe/craft SoT for hero + tools |

## Tokens

- Background: paper `#FAFAFA`
- Stage: `#FFFFFF`
- Ink: `#09090B`
- CTAs: solid ink
- Typography: Newsreader display (`--font-mkt-display`) · Geist UI (`--font-mkt`)

## Reduced motion checklist

- [x] No `ScrollTrigger` pin/scrub — hero and rise stack in document flow
- [x] Constellation Y-bob loops off
- [x] Arc + quote autoplay off
- [x] Carousels: instant state change, no blur filters
- [x] Micro-anims: final state shown immediately

## Out of scope

- Pixel-perfect CoreShift copy / HR branding
- Committing the reference MP4 to git
- Logged-in Command shell motion
- Naming the design partner on public chrome
