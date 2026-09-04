# Pass 05 — Ask

**Date:** 2026-09-04  
**Surface:** cited answers; refuse when not in corpus; no invented numbers

## Issues

1. **P0 — `no_overlap` unused.** Any FTS hit (cover page) counted as evidence. **Fix:** `filterEvidenceByTokens` + `decideAsk(evidence, tokens)`.
2. **P0 — LLM could invent numerals.** No post-check. **Fix:** `inventedNumbers` → refuse + keep citations.
3. **P1 — Citation `<a href>` dropped cookies.** **Fix:** `downloadAuthed`.
4. **P1 — No company scope in UI.** API had `companyId`. **Fix:** company select.
5. **P1 — tsquery built from raw tokens.** Special chars 500. **Fix:** sanitise tokens.
6. **P2 — Refuse copy is honest.** Kept `ASK_REFUSAL`.
7. **P2 — Empty book refuses.** Covered by `empty_corpus` test.
8. **P2 — Citations without locator.** Excerpt only; residual.
9. **P2 — History of asks not listed.** Residual.
10. **P2 — “venture” fallback tsquery** if tokens empty after sanitise. Residual risk of broad hit — decideAsk still filters.
11. **P3 — No streaming.** Residual.
12. **P3 — No eval harness beyond unit tests.** Residual.
13. **P2 — Unknown fact with overlapping English still answers.** Residual (FTS).
14. **P2 — minLength 3 on textarea.** Added.
15. **P2 — Busy state existed.** Kept.
16. **P2 — Missing OpenAI key still returns extract, not invention.** Kept.

## Tests
`ask.test.ts`: empty, overlap, citations, invented numbers.
