# Gap matrix — Gargi brief vs build

Checkboxes reflect **this repository**, not the historical demo. Update when a slice lands.

Legend: `[x]` shipped in-repo · `[~]` partial / stub · `[ ]` not started

| Brief item | Status | Notes |
| --- | --- | --- |
| Multi-tenant orgs + RLS | [x] | Better Auth orgs; RLS policies in `packages/db` |
| Roles Org Admin / Partner / Analyst / Viewer | [x] | Better Auth organization roles |
| Signup / invite / login | [x] | Email+password + invitations |
| Company vault upload PDF/XLSX | [x] | MinIO / fs object store |
| OneDrive MIS API | [~] | Settings stub: **not connected** |
| Affinity CRM | [~] | Settings stub: **not connected** |
| Granola transcripts | [~] | Settings stub: **not connected** |
| Parse pipeline → inbox | [x] | XLSX + PDF text; low confidence → inbox |
| Firm schema catalog | [x] | `packages/core` catalog |
| Mixed units explicit; ambiguous → review | [x] | `unit_ambiguity` inbox kind |
| Missing ≠ 0 | [x] | Core math + UI `—` |
| Dual INR crore + EUR with FX triple | [x] | Fields + conversion helper |
| FY Apr–Mar + override | [x] | `fiscal.ts` |
| Restatements versioned | [x] | `restatement_of_id` + version |
| Attributable corrections survive re-parse | [x] | `correction` table + parse apply |
| 15-min onboarding wizard | [x] | Create → upload → extract → confirm |
| Every figure clickable to source | [x] | Provenance chip → document locator |
| Command live dashboard | [x] | Pulse + Needs-a-look + coverage |
| Fund rollup | [x] | Positions + marks |
| Quarterly NAV | [x] | Deterministic as-of |
| Monthly objective vs subjective | [x] | Separate commentary lanes |
| Reports PDF / PPTX / XLSX | [x] | Real file downloads; simple layouts |
| Ask cited; refuse if unknown | [x] | FTS + grounded complete; refuse path tested |
| Risk flags + evidence | [x] | Catalog detectors |
| Cross-company compare | [x] | Book-only matrix |
| LP / ILPA room | [~] | Documented Phase 2 stub in Settings |
| Billing | [ ] | Out of scope |
| Perfect OCR | [ ] | Out of scope; low confidence → inbox |
| 90%+ auto ingest (live folders) | [~] | Upload path real; folder watch needs OneDrive |
| Seed never default | [x] | `pnpm seed:demo` only; FIXTURE_ONLY |

Update this file in the same PR as behaviour changes.
