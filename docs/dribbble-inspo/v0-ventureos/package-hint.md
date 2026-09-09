# Package hint — v0 Venture OS scaffolds

Install (peer / app deps) before wiring these components:

```bash
npm install recharts lucide-react
```

Expected stack context (not installed by this folder):

- React 18+ / Next.js App Router (`use client` on every scaffold)
- Tailwind CSS 3+
- TypeScript

These files are **inspiration scaffolds** — not a runnable package. Copy into the app tree and wire data / API later.

Tokens (Scratch, from AUDIT.md):

| Role | Hex |
|------|-----|
| Surface | `#FAFAFA` |
| Card | `#FFFFFF` |
| Ink | `#09090B` |
| Muted | `#71717A` |
| Border | `#E4E4E7` |
| Cite / verified | `#059669` |
| Subjective | `#5B21B6` |

Missing values render as `—`. Chart gaps stay null (never invent zeros).
