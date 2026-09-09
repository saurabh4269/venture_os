# Coding-agent brief — Hero + Tools craft (Venture OS × CoreShift)

**Live SoT:** https://www.ventureos.xyz (marketing `/` only — not Command)  
**Reference SoT:** CoreShift keyframes `coreshift-landing/keyframes/01.png` (hero), `06.png`–`07.png` (integrations) + Contra/Dribbble video motion language  
**Live evidence:** `audit/live-00`…`live-09`  
**Repo:** `saurabh4269/venture_os` · branch work from **`main`** · touch `apps/web/src/components/marketing/*` + `.mkt` in `globals.css`  
**Scope:** Hero constellation + headline/CTA block · "Connect the sources" / tools arc section. Do **not** redesign Command.

---

## 0. The problem in one sentence

CoreShift's hero and tools feel like a **finished product shot** — calm, intentional, one clear focal story. Ours feel like a **dev collage** — too many competing ornaments, weak hierarchy, and geometry that reads skewed rather than composed.

This brief is about **vibe and craft first**. Geometry is a means, not the goal.

---

## 1. Target vibe (lock this)

| Dial | CoreShift (target feel) | Venture OS live (avoid) |
| --- | --- | --- |
| Mood | Quiet confidence; "expensive white card on soft paper" | Busy SaaS demo / sticker sheet |
| Density | Sparse; every node earns its place | Crowded constellation + particle spaghetti |
| Hierarchy | One hero idea → one CTA; tools: one active logo owns the stage | Everything similar weight; purple hub fights headline |
| Motion | Soft, purposeful bob; scroll/carousel with clear focus | Random orbit + purple flow dots that look unfinished |
| Color | Neutral stage; **one** accent moment (CTA or active tool) | Purple glow + multicolor toys + coral CTAs at once |
| Finish | Soft layered shadows, consistent radii, airy padding | Flat/uneven padding; caption cramped to edge; "Pause" looking like leftover UI |
| Brand (Venture OS override) | Paper `#FAFAFA`, ink `#09090B`, Newsreader display + Geist UI, solid **ink** primary CTA | Gray `#f3f4f6`, Inter, purple hub, coral buttons |

**Emotional target:** institutional product landing that still feels kinetic — **Swiss calm + soft depth**, not playful HR SaaS cosplay.

**Venture OS honesty (non-negotiable):** no fake KPIs, logos-as-customers, NPS, or "live NAV." Connector copy stays honest ("wired / not connected until health check"). Prefer product-semantic marks (Cite / Confirm / Book / Flags / Ask / Affinity / OneDrive / Granola) over CoreShift's portrait photos, balloons, googly eyes.

---

## 2. Why the hero feels haphazard (diagnosis)

From live shots + `HeroConstellation.tsx` on `main`:

1. **No enclosing stage** — CoreShift sits the whole hero inside one large rounded white "shot card." Ours float constellation + type on bare gray; nothing frames the story → unfinished.
2. **Too many node species** — hub check + bulb + balloon + shield + eyes + letter tiles V/O + OneDrive/Affinity/Granola chips. CoreShift uses ~6 peripherals with **two photo plates** for human warmth and clear size tiers. Ours read as random stickers.
3. **Spokes ≠ nodes** — SVG paths and CSS-positioned nodes are loosely related; joints/dots don't land on icon centers → "broken wiring" vibe.
4. **Purple flow dots + glow** — continuous particle motion reads as WIP / gaming HUD, not finished marketing.
5. **Hierarchy inversion** — purple glowing hub competes with (or overpowers) the H1. In CoreShift, hub is strong but **headline + orange CTA** still win the bottom half with clear air.
6. **Vertical rhythm broken** — large empty band between constellation and H1; constellation wider than text measure → skewed, not centered as one unit.
7. **CTA split personality** — header "Get started" is ink; hero CTA is coral → brand feels undecided.
8. **Type vibe** — Inter + tight marketing sans everywhere; CoreShift's finish comes partly from confident display scale + subtext that's clearly secondary. We need Newsreader (or locked display) for H1.

---

## 3. Why the tools section feels skewed / unfinished

From live `ConnectorArc` + shots:

1. **Arc pose too extreme** — `rotate: a * 40`, `x: sin(a)*248`, scale jump to `1.3` at center → outer tiles look **tipped over**, not gently fanned. CoreShift: shallow upward arc, mild tilt (±10–20°), even gaps, center slightly larger **and upright**.
2. **Caption / stage padding** — label sits too close to bottom of the white card; big empty headroom above headline → unbalanced.
3. **"Pause" as chrome** — tiny centered Pause control reads like debug UI, not product craft. Hide behind hover/focus or icon-only with aria-label.
4. **Fan vs "finished carousel"** — blur/opacity exist in code but weak; center doesn't clearly "own" the stage; autoplay caption remount feels abrupt vs soft crossfade.
5. **Extra honesty cards under the arc** (Active companies / Open flags / Coverage) in the same white stage compete with the tools story — CoreShift keeps the integrations card **pure**: icon + title + one caption. Move honesty strips **out** of the tools card or into a separate quieter row.
6. **Icon set inconsistency** — smiley/Granola + Zoho + Drive + Excel + cloud: fine if honest, but equal visual finish (same tile size, padding, shadow) matters more than logo count.

---

## 4. Coding-agent instructions — HERO

### 4.1 Composition (vibe → layout)

1. Wrap hero (nav can stay global) content in a **single large rounded stage card** (≈24–32px radius) on paper bg — soft ambient shadow. Constellation + H1 + sub + CTAs live **inside** that card as one composition.
2. Treat layout as **two bands inside the card**:
   - **Upper 55%:** constellation only (symmetric, contained).
   - **Lower 45%:** H1 → sub → primary CTA (+ optional ghost). Generous padding; no collision with nodes.
3. Constrain constellation to a **max width ~720–800px** centered; do not let nodes bleed full viewport width past the text measure.
4. Vertical spacing scale (feel, not rigid): nav clearance → constellation → **48–72px** air → H1 → **16–24px** → sub → **28–40px** → CTA. Kill the "floating islands" gap.

### 4.2 Constellation craft

1. **Cull to 5–7 nodes total** including hub. Suggested Venture OS set:
   - Hub: ink/zinc rounded square, subtle soft shadow — **no purple glow** (small emerald only if you must signal "confirmed" — keep quiet).
   - Peripherals: Cite, Confirm, Book, Flags, Ask (Lucide-style) + at most 2 connector chips (Affinity, OneDrive) — **drop** balloon, eyes, letter stickers, smiley.
2. Place nodes on a **designed ellipse / two rings** with intentional asymmetry (like CoreShift), not CSS scatter. Each spoke endpoint must **meet the node center**.
3. Size tiers: hub ~64–72px; near nodes ~48–56px; far ~40–44px. Same corner radius language (squircle).
4. Spokes: 1px, low-contrast ink/zinc at ~20–30% opacity. Joint dots optional, **same** color family as spokes — not purple particles.
5. Motion: independent soft Y-bob (2–6px, staggered phase). Optional gentle mouse parallax **≤8px**. **Remove** SVG `animateMotion` flow dots.
6. Load: short stagger pop-in (opacity + scale 0.92→1). `prefers-reduced-motion`: static final pose.

### 4.3 Type + CTA vibe

1. H1: Newsreader (or approved display), ~clamp 40–56px, tight leading, ink. One line preferred on desktop.
2. Sub: Geist, muted zinc, max-width ~36–40ch, centered.
3. Primary CTA: **solid ink pill**, white label, soft shadow, hover lift 2–4px / 150–300ms. Match header CTA. **No coral / orange gradient.**
4. Optional ghost secondary: hairline border, no fill competition with primary.
5. Optional blur→sharp on H1 enter (CoreShift language) — quiet, once.

### 4.4 Hero acceptance

- [ ] Looks like one framed product shot, not stickers on gray.
- [ ] Hub does not outshine H1; H1 is the emotional anchor.
- [ ] No purple particle rain; no toy icons.
- [ ] Tokens paper/ink; Newsreader + Geist.
- [ ] Reduced-motion calm.
- [ ] Side-by-side with `keyframes/01.png`: same **calm finished** energy (not pixel clone).

---

## 5. Coding-agent instructions — TOOLS / INTEGRATIONS

### 5.1 Composition (vibe → layout)

1. Keep one white rounded stage card on paper bg — **only**: small section glyph → headline → optional one-line honest sub → arc → caption under center. Nothing else inside that card.
2. Move "Active companies / Open flags / Coverage" (or similar) **outside** this card if they remain on the page.
3. Padding inside card: even; caption needs **≥32–48px** breathing room above card bottom. Headline block shouldn't float in a huge empty upper void — tighten top padding so arc feels centered in the remaining space.
4. Section title vibe: confident, short — e.g. keep "Connect the sources…" but ensure sub doesn't visually compete with the arc.

### 5.2 Arc craft (feel finished, not skewed)

1. **Shallow upward convex arc** (CoreShift): visible seats = 5. Mild rotation on edges (~±12–18°), center **0°**, scale center ~1.12–1.18 (not 1.3+), neighbors ~0.92–1.0.
2. Even angular spacing; no overlapping cards; consistent tile size (≈72–88px) with identical internal icon padding.
3. Depth: center full opacity sharp; edges slightly smaller + light blur (1–2px) + slight opacity drop — DOF, not disappearing.
4. Caption: only under center; **crossfade** name + body (opacity + 6–10px Y). Don't remount jankily. Typography: strong name, quiet body.
5. Autoplay ~2.5–3.5s; pause on hover/focus. Replace naked "Pause" text with discreet control (or hover-only).
6. Shadows: soft multi-layer on tiles; same radius as hero squircles.
7. Mobile: horizontal row or reduced arc; don't keep extreme rotate on narrow screens.

### 5.3 Tools acceptance

- [ ] Reads as a deliberate fan/carousel, not a tipped scrapbook.
- [ ] One active tool clearly "on stage."
- [ ] Card interior is quiet — no competing honesty widgets.
- [ ] Side-by-side with `keyframes/06–07.png`: same spacing confidence.
- [ ] Honesty copy preserved; no fake "connected" claims.

---

## 6. Shared craft system (both sections)

Apply once in `.mkt` tokens:

| Token | Value / rule |
| --- | --- |
| Page bg | `#FAFAFA` |
| Stage bg | `#FFFFFF` |
| Ink | `#09090B` |
| Muted | zinc-500/600 |
| Radius stage | 24–32px |
| Radius tile/node | 16–20px |
| Shadow | soft ambient + light contact (neutral, not colored glow) |
| Accent | ink CTA only; emerald/violet **only** for product semantics if needed |
| Type | Newsreader display · Geist UI |
| Motion | 150–300ms UI; bob slow; honor `prefers-reduced-motion` |

**Do not:** purple brand glow, coral CTAs, Inter-forced marketing stack, emoji/toy icons, v0 purple templates, Command shell changes, fake metrics.

---

## 7. Files to touch

| File | Work |
| --- | --- |
| `HeroConstellation.tsx` | Redesign node set, positions tied to spokes, kill flow dots, stagger, neutral hub |
| `MarketingLanding.tsx` | Hero stage card structure; spacing; CTA ink; tools card purity |
| `LandingChrome.tsx` | Sticky floating pill; ink CTA consistency |
| `ConnectorArc.tsx` | Softer pose math; DOF; caption crossfade; quieter pause |
| `globals.css` (`.mkt*`) | Tokens, stage, constellation layout, tools stage padding, remove CoreShift-shot purple/coral |
| `layout.tsx` | Newsreader + Geist for marketing |
| `MarketingIcons.tsx` | Ensure Lucide-quality semantic set; drop toy assets from hero |

Optional prior art: PR #16 `marketing/motion/*` — cherry-pick patterns **after** tokens/vibe fix; do not merge purple-tainted preview blindly.

---

## 8. Implementation order

1. Tokens + type + stage card chrome (vibe foundation).  
2. Hero constellation cull + layout + CTA.  
3. Tools card purify + arc pose + caption.  
4. Sticky nav + reduced-motion pass.  
5. Visual QA vs `keyframes/01`, `06`, `07` and live screenshots.  
6. E2E: single hero H1; no Command regressions.

---

## 9. Agent one-liner

Make Venture OS marketing **hero** and **tools** feel like finished CoreShift product photography — calm stage, ruthless hierarchy, soft depth — while keeping Venture OS paper/ink honesty. Cull noise, frame the shot, tame the arc; geometry serves the vibe.
