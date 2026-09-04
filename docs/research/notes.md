# Research notes

## Historical demo (workflow only)

- URL: `https://v3.heisenbug.in`
- Sibling repo name: `saurabh4269/v3_agentic_os` (not a visual template)
- Useful: Command → company → Ask → inbox → one-pager ritual order
- Not useful: chrome, fonts, film landing, seeded illustrative NAV
- Demo itself labelled ownership / NAV / MIS / flags as **not the live book**

## V3 public context (names only)

Public site `https://v3.ventures`: consumer early-stage; India / Europe / US; Verlinvest-backed. Public brand names may appear in **FIXTURE_ONLY** seed copy as labels, never as default production rows, and never with invented operating figures presented as fact.

## Stack lock vs older drafts

Handoffs that mentioned Clerk, WorkOS, Inngest, Claude-default, or R2-only are void. See `docs/DECISION.md`.

## Parser reality

- XLSX: `exceljs` — headers + alias map + unit tokens in header/cells.
- PDF: text extract (`pdf-parse`); layout-fragile. Low confidence → inbox.
- Do not claim OCR completeness.

## Better Auth

Organization plugin + custom roles. Drizzle adapter (`better-auth/adapters/drizzle` or `@better-auth/drizzle-adapter` depending on installed major). Confirm against the installed package README before inventing table names — use `auth generate` output as the field list.

## FTS

`to_tsvector('english', ...)` on chunk body + document title. Ask retrieval is SQL first; LLM second.
