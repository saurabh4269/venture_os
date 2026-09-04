# Pass 28 — Onboarding 15-minute path

**Date:** 2026-09-04  
**Surface:** signup → org → fund → company → upload → inbox  
**Evidence:** Brief §3 onboarding 15 minutes; gap #26; NEXT.md item 6.

## Issues

### 1. P1 — No timed script in docs

**Wrong:** Agents and Partners guessed the path.

**Should:** `docs/improvements/onboarding-15min.md` with a minute-by-minute happy path.

**Fix:** That file.

### 2. P1 — Company create swallowed errors

**Wrong:** Duplicate/validation fail looked like a no-op.

**Should:** Alert + busy on Create.

**Fix:** `companies/new`.

### 3. P1 — Wizard did not point at the sample MIS

**Wrong:** Friction: “which file?”

**Should:** `fixtures/FIXTURE_ONLY-sample-mis.csv` in the lede.

### 4. P1 — Double-submit on create

**Wrong:** Two companies from one impatient click.

**Should:** Disabled busy button.

### 5. P1 — File input label generic

**Wrong:** “First file”.

**Should:** “First MIS file”; accept xlsx/xls/csv/pdf (DOCX still unsupported).

### 6. P2 — Skip path unclear

**Wrong:** Skip goes to company detail with an empty vault — OK if copy says so.

**Should:** Existing skip. Script documents it.

### 7. P2 — Org create vs invite

**Wrong:** Signed-in no-org users already hit `/onboard`. Script starts there.

### 8. P2 — Fund picker already exists (pass 22)

**Wrong:** Do not regress.

**Should:** Script uses Settings fund or Main fund fallback.

### 9. P2 — Inbox still required

**Wrong:** Nothing auto-posts. Script must say so or Partners think extract failed.

**Should:** Step 3 copy unchanged + script clock.

### 10. P2 — Parse poll already exists

**Wrong:** If worker is down, parse sits queued.

**Should:** Script: start worker or `POST /api/parse/:id`.

### 11. P2 — Connector IDs still not connected

**Wrong:** Do not invent OneDrive folder fields in the wizard.

**Should:** Honest stub remains.

### 12. P2 — Signup still creates user before org

**Wrong:** Known. `/onboard` recovers.

**Should:** Script uses signup-with-org or onboard.

### 13. P2 — Viewer cannot onboard a name

**Wrong:** Correct. Script is for Org Admin / Analyst.

### 14. P3 — Timed measurement not instrumented

**Wrong:** No success-metric counter for “minutes to first confirm.”

**Should:** Deferred (anti-hallucination #13). Script is manual.

### 15. P3 — Domain auto-join

**Wrong:** Not connected.

**Should:** Script says invite copy-link.

### 16. P2 — Wizard mentions OneDrive stub

**Wrong:** Fine. Do not add fake Connect.

## Residual

- No product analytics clock.
- OAuth folder map still later.
