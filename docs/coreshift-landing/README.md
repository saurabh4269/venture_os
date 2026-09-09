# CoreShift landing — motion language (Venture OS adaptation)

Reference motion timeline for the public marketing homepage (`apps/web/src/components/marketing/`).  
Keyframe PNGs and the source MP4 live outside this repo; this doc is the **timing SoT** for implementation.

## Honesty constraints (Venture OS)

- Copy: **“The book for the investment team.”** / Get started / Log in.
- No fake portfolio KPIs, customer logos, or satisfaction scores.
- Schematic UI is allowed when **labeled** (e.g. “Schematic bars — not live NAV”).
- Connector carousel stays honest: MIS upload is live; Affinity / Graph / Granola show **not connected until health check**.
- Testimonials are **methodology quotes** (role titles only), not fabricated customer reviews.
- `prefers-reduced-motion`: disable pin/scrub, float loops, carousel autoplay, blur slides; show static fallbacks.

## Timeline (MP4)

| Time | Beat | Implementation |
| --- | --- | --- |
| **0:00** | Hero: constellation icons **bob on Y**; centered H1 + CTA | `HeroConstellation` + `BlurHeadline` + `MotionCta` in `LandingHeroSequence` |
| **0:01–0:03** | Hero **zoom / blur / fade**; next section **slides up**; cards **scale-in stagger** then **parallax spread** | GSAP `ScrollTrigger` scrub on `LandingHeroSequence` (`mkt-hero-pin`) — **reversible** on scroll back |
| **0:04–0:06** | Feature cards: **inner micro-anims** (bars grow, badge slide, list stagger) | `FeatureRiseCard` variants + `useInView` |
| **0:07–0:10** | Integrations **arc carousel**: curved path, center scale+opaque, edges rotate+blur, caption crossfade | `ArcCarousel` |
| **0:11–0:14** | Testimonials: **exit left + blur**, **enter from right sharp** | `TestimonialCarousel` + `AnimatePresence` |

## Stack

- **motion/react** (framer-motion v13) — springs, `AnimatePresence`, `useReducedMotion`, `useInView`
- **GSAP + ScrollTrigger** — hero morph timeline, blur headline enters, scroll-rise elsewhere

## Key files

| File | Role |
| --- | --- |
| `motion/LandingHeroSequence.tsx` | Pinned scroll morph hero → rise section |
| `motion/HeroConstellation.tsx` | Hub + satellite float |
| `motion/FeatureRiseCard.tsx` | Rise cards with inner micro-anims |
| `motion/ArcCarousel.tsx` | Sources arc carousel |
| `motion/TestimonialCarousel.tsx` | Methodology quote carousel |
| `motion/BlurHeadline.tsx` | GSAP blur→sharp slide |
| `motion/MotionCta.tsx` | 200ms hover lift on CTAs |
| `LandingChrome.tsx` | Floating pill nav |
| `MarketingLanding.tsx` | Section composition |

## Tokens

- Background: `#FAFAFA`
- Ink: `#09090B`
- CTAs: black pill, white label
- Typography: existing serif/sans stack (Source Serif 4 + IBM Plex Sans in repo)

## Reduced motion checklist

- [ ] No `ScrollTrigger` pin/scrub — hero and rise stack normally
- [ ] Constellation Y-bob loops off
- [ ] Arc + testimonial autoplay off
- [ ] Carousels: instant state change, no blur filters
- [ ] Micro-anims: final state shown immediately

## Out of scope

- Pixel-perfect CoreShift copy / HR branding
- Committing the reference MP4 to git
- Logged-in Command shell motion
