# Research notes

## Higher-level picture (2026-09-07)

Greenfield book is live: upload/parse → Confirm → rituals/Ask/Reports. Connector infra sealed; live vendor calls need secrets. Cite drawer previews sheet windows and PDF page text; bbox OCR overlay still open.

## Historical demo (workflow only)

- URL: `https://v3.heisenbug.in`
- Sibling repo name: `saurabh4269/v3_agentic_os` (not a visual template)
- Useful: Command → company → Ask → confirm → one-pager ritual order
- Not useful: chrome, fonts, film landing, seeded illustrative NAV
- Demo itself labelled ownership / NAV / MIS / flags as **not the live book**

## V3 public context (names only)

Public site `https://v3.ventures`: consumer early-stage; India / Europe / US; Verlinvest-backed. Public brand names may appear in **FIXTURE_ONLY** seed copy as labels, never as default production rows, never with invented operating figures presented as fact, and **not** in public marketing chrome (D10).

## Stack lock vs older drafts

Handoffs that mentioned Clerk, WorkOS, Inngest, Claude-default, or R2-only are void. See `docs/DECISION.md`.

## Parser reality

- XLSX/CSV: `exceljs` — headers + alias map + unit tokens; fuzzy catalog suggest at capped confidence when exact alias misses.
- PDF: pdfjs layout tables + plain text; low confidence → Confirm. No bbox OCR claim.
- DOCX: supported on the parse path; treat layout as fragile.
- LLM assist: propose → Confirm only; JSON fence salvage for structured replies; never writes the book.
- Cite preview: bounded sheet window (`packages/db` sheet-preview) + PDF page text APIs — not full tiler / OCR.

## Better Auth

Organization plugin + custom roles. Drizzle adapter (`better-auth/adapters/drizzle` or `@better-auth/drizzle-adapter` depending on installed major). Confirm against the installed package README before inventing table names — use `auth generate` output as the field list.

## FTS

`to_tsvector('english', ...)` on chunk body + document title. Ask retrieval is SQL first; LLM second.
