# 2026-09-04 — Merge official docs pack; no second tree

## What was wrong

This branch reconstructed kebab-case briefs and architecture files. `main` landed the official numbered pack (`docs/00_README.md` … `docs/06_AGENT_PROMPT.md`, raw PDFs) at `7ee2ef8`. Two trees would drift.

## What changed

- Merged `origin/main`.
- Deleted kebab-case duplicates. SoT is the numbered pack only.
- Extended `02_GAP_MATRIX.md` (This-repo column) and `04_BUILD_PLAN.md` checkboxes.
- Folded run/test/status notes into root `AGENTS.md` and `README.md`.
- CI: `pnpm/action-setup` now reads `packageManager` from `package.json` (10.33.3).

## Residual

Connectors, domain join, NAV approval, SOC2, billing, LP room, worker-pre-rendered report artifacts remain open in the official gap/plan files.
