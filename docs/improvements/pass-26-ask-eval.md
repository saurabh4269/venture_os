# Pass 26 — Ask eval / citation harness

**Date:** 2026-09-04  
**Surface:** Ask refuse path + CI golden cases  
**Evidence:** Brief §6 Q&A; NEXT.md item 4; anti-hallucination #6.

## Issues

### 1. P0 — Unsourced digits could pass if a reviewer only checked `decideAsk`

**Wrong:** Token overlap can succeed while the LLM still invents `99`.

**Should:** `refuseUnsourcedDigits` after completion. Any invented numeral → refuse.

**Fix:** Core helper used by `/api/ask`.

### 2. P0 — No golden questions

**Wrong:** Unit tests covered empty corpus and one invented 99. Not the brief examples.

**Should:** Fixture-shaped goldens in `ask.eval.test.ts` (cash, marketing 2 Cr, runway, ownership, FX, dash≠0).

**Fix:** 12 labelled cases. `FIXTURE_ONLY` evidence — not a live book.

### 3. P1 — Invented marketing spend

**Wrong:** “3 companies spend more than 2 Cr on marketing” when evidence has no marketing line.

**Should:** Refuse.

### 4. P1 — Invented runway months

**Wrong:** Completing “18 months” from cash+burn without a booked runway figure.

**Should:** Refuse 18. Allow 6 only if 6 is in evidence.

### 5. P1 — Empty corpus still answering NAV

**Wrong:** “Fund NAV is 140” from empty evidence.

**Should:** Refuse.

### 6. P1 — Ownership guessed from MIS

**Wrong:** Affinity is not connected. Completing 12.5% from revenue/cash.

**Should:** Refuse.

### 7. P1 — Zero vs missing

**Wrong:** “Burn is 0” when evidence says not reported.

**Should:** Refuse. Reported `0` in evidence is allowed.

### 8. P1 — Cross-name count invented

**Wrong:** “4 companies have cash below 2” from one Alpha row.

**Should:** Refuse.

### 9. P1 — FX invented without triple

**Wrong:** Completing EUR from INR-only evidence.

**Should:** Refuse.

### 10. P1 — API used `inventedNumbers` inline

**Wrong:** Easy to drift from the helper.

**Should:** Call `refuseUnsourcedDigits`.

### 11. P2 — Ask UI swallowed fetch errors

**Wrong:** Failed POST looked like a hang.

**Should:** `role="alert"` error line.

### 12. P2 — Question field had no label

**Wrong:** a11y.

**Should:** `htmlFor="ask-q"`.

### 13. P2 — Citations still required to resolve

**Wrong:** Already true; harness must not weaken it.

**Should:** Keep `citationsFrom` evidence-only.

### 14. P2 — Tokenize still strips punctuation

**Wrong:** `2 Cr` tokens as `2` and `cr`. Fine. Do not special-case rupee signs into invented amounts.

### 15. P3 — Live eval against seeded fixture org

**Wrong:** Needs `SEED_DEMO=1` and a running API. Not in default CI.

**Should:** Deferred. Goldens are evidence-string unit tests.

### 16. P3 — Semantic entailment beyond digits

**Wrong:** “cash is healthy” is subjective and not a digit invention.

**Should:** Digit gate only. Subjective MIS still blocked elsewhere.

## Residual

- No nightly eval against a live fixture org.
- No bbox citation highlight.
