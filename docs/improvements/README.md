# Improvement log

Later QA passes drop dated notes here. Do not rewrite history in `02_GAP_MATRIX.md` without a matching note.

## Process

1. Create `docs/improvements/pass-NN-<workflow-slug>.md` (or `YYYY-MM-DD-slug.md` for merge notes).
2. State: what was wrong, evidence (test, screenshot, brief clause), what changed, residual risk.
3. Tick or annotate the matching row in `docs/02_GAP_MATRIX.md` (This-repo column).
4. If a decision changed, add a row to `docs/DECISION.md` instead of editing old rows.

Passes 01–42 are in this folder (`pass-01-auth-org.md` … `pass-42-connector-infra.md`).  
Post-42 cite / Confirm / Sources / ritual honesty work landed on `main` (2026-09-07). Reports slim, missing-blank UI, and position writes landed 2026-09-08. See `NEXT.md` and decisions D9–D11.  
15-minute onboard clock: `onboarding-15min.md`. Queue-2 source notes: `queue-2/`.  
Operator demo: `pnpm demo:vc` (`scripts/demo-vc.sh`).

## Do not use this folder for

- Feature ideas that contradict the Gargi brief (put those in a discussion, not silent code).
- Invented connector field lists.
- New “sample portfolios” that could be mistaken for the book.
