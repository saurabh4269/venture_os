# Queued pass — Accessibility shell (queue-2)

**Repo:** `saurabh4269/venture_os` @ `main` (`925c284`)
**Primary surfaces:** `apps/web/src/components/Shell.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, auth pages (`login`/`signup`/`onboard`/`invite`), `Fact` chip, Settings, Command/Inbox loading states
**Brief SoT:** Partners live in the book all morning — keyboard, screen reader, and contrast must not be demo-only. Pass 01 fixed login labels; the chrome itself was not audited.
**Why under-covered:** Queue-1 / passes 02-22 chased data integrity. Shell a11y is what the next agent will skip if not queued.

---

## P0

1. **No skip link / no main landmark** — Layout is `.app > aside.rail + div.main` (`Shell.tsx`, `globals.css`). Keyboard users tab through every Morning/Book/Firm link before content. Add Skip to content as first focusable and `id="main"` on a real `<main>`.

2. **No focus-visible styles** — `globals.css` never defines focus rings. Buttons (`.btn`, `.chip`) and nav links rely on unpredictable UA outline. Require a 2px forest ring on interactive elements.

3. **Active route not exposed to AT** — Nav `Link` only toggles class `active` (`Shell.tsx` ~115-128). Set `aria-current="page"` on the current item (exactly one).

4. **Session gate is silent** — While `!ready`, Shell renders Checking your organisation with no `role="status"` / `aria-busy` (~97-102). Screen readers get nothing; tests cannot wait on a named busy state.

5. **Fact source control name is the number alone** — When `sourcePath` is set, chip is a button whose text is the formatted value (`Shell.tsx` ~189-192). SR hears 1.2 with no Open source document. Use aria-label with open source wording.

## P1

6. **Rail sections are not headings** — `.sec` Morning/Book/Firm are divs (~113-129). Promote to h2.sec inside nav or use role=group + aria-labelledby.

7. **Mobile rail is an endless vertical block** — At max-width 960px rail stacks above content with no collapse (`globals.css` ~154-158). Ten nav links push the book below the fold. Add disclosure Menu with aria-expanded.

8. **Org switcher announces nothing on change** — select has aria-label Organisation then full page reload (~80-84). On failure user may bounce to login. Keep focus, aria-live the new org name, avoid reload when possible.

9. **Sign out sits in muted text without a region** — Footer block (~132-138) is a bare div. Wrap in region aria-label Account; verify muted-on-paper-2 contrast meets 4.5:1.

10. **Command page errors lack role=alert** — Command err is a sev-high paragraph (`command/page.tsx` ~53). Login correctly uses role=alert; book pages should match.

11. **Loading copy not live** — Loading the book, Looking up the invite, inbox loads — none use aria-live=polite. SR users sit on stale empty states.

12. **Invite CTAs use Link styled as btn** — Visually buttons, semantically links (`invite/page.tsx` ~96-104). Ensure focus styles exist; keep link list discoverability.

13. **Fixture banner strength** — role=status (`Shell.tsx` ~142) may be easy to miss. For FIXTURE_ONLY misuse risk, use role=alert once on mount or assertive live the first time.

14. **Tables: sticky first column vs keyboard** — `.table-scroll` (`globals.css` ~81-88) has no keyboard affordance or caption. Add sr-only caption and make overflow container focusable or instruct.

## P2

15. **html lang=en only** — layout.tsx sets lang=en. Note latin-ext / Noto for Indian legal names; optional lang on foreign Ask excerpts later.

16. **No prefers-reduced-motion** — Org reload and future toasts should respect reduced motion.

17. **No forced-colors tweaks** — Forest-soft active nav can disappear in Windows high contrast. Use system borders.

18. **Color-only severity risk** — `.sev-high` / `.sev-med` are color classes; ensure Shell never adds badges without text High/Med.

19. **Hit target size** — Nav links padding 6px 8px; `.btn.sm` similarly compact. Aim for WCAG 2.2 target size on primary rail.

20. **Double aria-live on login errors** — sr-only polite region + visible role=alert (`login/page.tsx` ~77-84) can double-speak. Keep one.

21. **useBookSession secondary fetch** — Pages above Shell re-hit /api/me (~14-27). Role-gated buttons can flash enabled then disabled. Gate until context ready.

22. **Brand text not a link home** — Venture OS (`Shell.tsx` ~108-111) is inert. Link to /command with accessible name helps orientation.

## P3

23. **Font weight 560** — Non-standard; may ignore on fallbacks (`globals.css` ~27). Use 500/600 only (already loaded).

24. **Latin subset only** — `layout.tsx` subsets latin. Devanagari in company names may tofu. Add latin-ext at minimum; note Noto fallback.

25. **No axe in CI** — `apps/web` vitest passes with no tests and no axe. Add a Shell/login axe smoke (unit or Playwright).

26. **Disabled OAuth buttons rely on title** — Settings Connect disabled with title only. Point aria-describedby at the honest not connected copy.

---

## Manual check (partner laptop)

Keyboard-only: Tab from address bar to skip link to Command H1 to first card to org select to Sign out. VoiceOver: hear current nav page and fixture banner once.
