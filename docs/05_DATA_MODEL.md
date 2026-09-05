# Data model — entities & hard invariants

**Status:** Locked for design-partner V1  
**Pack date:** 2026-09-05 (Asia/Calcutta)  
**Rule:** Schema changes require migrations. Demo seed JSON is not a model.

---

## 1. Core entities (org-scoped unless noted)

Every tenant table includes `org_id` (UUID) and is covered by **RLS**. Platform tables (e.g. global FX sources, feature flags) are explicit exceptions and never store firm portfolio facts.

| Entity | Purpose | Key fields (conceptual) |
| --- | --- | --- |
| **Organization** | VC firm tenant | name, slug, domains[], plan/entitlements |
| **OrgDomain** | Verified email domains | domain, verified_at, verify_method |
| **Membership** | User ↔ org | user_id, role (`org_admin` / `partner` / `analyst` / `viewer`), status |
| **User** | Auth principal (provider id) | email, name; no cross-org data without membership |
| **Fund** | Vehicle | name, reporting_currency, evergreen flags |
| **Company** | Portfolio company | name, stage, fy_calendar (`apr_mar` default / `calendar`), base_currency, fund links |
| **CompanyProfile** | Mapping defaults | template_id, unit defaults, OneDrive folder id, Affinity id, Granola links |
| **Vault** | Document container | type: `company_vault` / `firm_library` / `lp_data_room`; company_id nullable |
| **Document** | Immutable raw file | vault_id, storage_key, content_hash, mime, source (`upload` / `onedrive` / …), version |
| **DocumentChunk** | Searchable unit | document_id, locator, text, tsv / FTS vector |
| **ExtractionJob** | Parse/extract run | document_id, status, model/provider meta, idempotency_key |
| **ExtractionProposal** | LLM/deterministic propose | field_key, period, value?, unit?, currency?, confidence, locator, status (`pending` / `accepted` / `rejected`) |
| **MetricDefinition** | Firm schema dictionary | key, group, unit semantics, aggregation rules, null policy |
| **MetricFact** | **Book** (SoR for numbers) | company_id, fund_id?, metric_key, period, value **nullable**, unit, currency_native, amount_native, fx_rate?, fx_date?, fx_source?, document_id, locator, extraction_id?, restatement_of?, is_current, created_by |
| **Correction** | Human override ledger | targets fact identity (company, metric, period, doc lineage), new_value nullable, reason, user_id, created_at; **survives reparse** |
| **Restatement** | Links fact versions | prior_fact_id, new_fact_id, reason, effective_at |
| **ValuationMark** | Quarterly NAV marks | company/fund, as_of, fair_value, method, approved_by, bridge payload |
| **Commentary** | Split narrative | kind: `objective` / `subjective`; period; body; source_refs[]; **subjective only from transcripts** |
| **Transcript** | Granola (or upload) notes | company_id, occurred_at, source, storage/chunk links |
| **Flag** | Risk/anomaly instance | catalog_key, severity, company_id, period?, evidence_refs[], status (open/snoozed/muted) |
| **FlagPolicy** | Firm thresholds | catalog_key, params JSON, spectrum config |
| **AskSession / AskMessage** | Q&A audit | org_id, citations[], refused bool |
| **ConnectorAccount** | OAuth / API key | provider, status (`not_connected` / `configured` / `connected` / `error`), `secret_ciphertext` + `nonce` + `key_version` (never plaintext), last_sync_at only after real sync |
| **SyncCursor** | Connector progress | connector_id, cursor, last_success_at |
| **AuditEvent** | Tamper-evident log | actor, action, entity_ref, payload, created_at |
| **ReportArtifact** | Generated export | type, storage_key, params, created_by |

Identity rule: prefer UUID PKs; never expose other orgs IDs in URLs without membership check.

---

## 2. Period & money shapes

**Period:** `{fy_label?, quarter?, month?, start_date, end_date, calendar_kind}`  
Default firm FY = **April–March** (“Q1” = Apr–Jun) unless `Company.fy_calendar` overrides.

**Money / dual currency:**

```
amount_native + currency_native
optional: amount_eur, amount_inr_cr
fx_rate + fx_date + fx_source   # required whenever a converted display is shown
```

No silent “approx” FX. If rate missing → show native only or “FX unavailable”.

**Units:** store detected unit enum (`lakh` / `crore` / `inr` / `usd` / …). Convert only via declared rules; never infer unit from magnitude alone.

---

## 3. Hard invariants (non-negotiable)

### I1 — Missing ≠ 0

- `MetricFact.value` is **nullable**.
- `null` means **not reported / unknown**, never zero.
- Aggregations, NAV inputs, charts, exports, and compare **skip nulls** (or show “—”).
- Forbidden: coalesce-null-to-zero in finance paths.
- UI copy: “—”, “not reported”, or “missing expected field” — not zero currency.

### I2 — Restatements are versions, not silent overwrites

- A restatement **inserts** a new `MetricFact` (or mark) and links via `Restatement` / `restatement_of`.
- Prior reported values remain queryable for history and bridges.
- Exactly one `is_current` (per company + metric + period + org) unless product defines multi-scenario marks explicitly.
- Reports and NAV pin the fact version they used.

### I3 — Corrections survive reparse

- Human `Correction` rows are append-only ledger entries (soft-delete only with audit).
- Re-parse may add new `ExtractionProposal`s; **commit/merge must apply corrections over model output**.
- Automated extract **never** overwrites a correction with LLM/deterministic propose.
- Golden test required: confirm → reparse same doc bytes/hash lineage → correction still wins.

### I4 — Org-scoped Ask (and all retrieval)

- Every Ask retrieval predicate includes `org_id` from the verified session (RLS + query).
- No shared global corpus. No demo seed in production Ask.
- Citations must resolve to documents/chunks/facts in **that** org.
- Insufficient evidence → refuse; do not guess across tenants or invent locators.

### I5 — Subjective commentary from transcripts only

- `Commentary.kind = subjective` requires source_refs to `Transcript` / Granola-derived chunks.
- MIS / financial documents may feed **objective** commentary only.
- Pipeline must reject subjective draft jobs that lack transcript evidence.
- UI never blends objective and subjective into one unlabeled block.

### Additional invariants (enforce in code + tests)

| ID | Rule |
| --- | --- |
| I6 | LLM never writes `MetricFact` directly; only proposals → validate ± human confirm. |
| I7 | Headline NAV / MOIC / IRR / runway / rollups = deterministic code over facts. |
| I8 | Every user-visible figure carries provenance (`document_id` + locator) or is marked derived with a documented formula. |
| I9 | Documents are immutable; new bytes ⇒ new `Document` version / hash. |
| I10 | Flags only from `FlagPolicy` catalog + deterministic rules + evidence; no freestyle categories in prompts. |
| I11 | Connectors: `not_connected` until real OAuth + sync; no fake success rows. |
| I12 | Dual-currency display without `fx_rate` + `fx_date` + source is a bug. |

---

## 4. Write paths (allowed)

```
upload/connector → Document (S3-compatible)
  → worker parse → DocumentChunk + ExtractionProposal
    → human/auto confirm → MetricFact (+ provenance)
      → optional Correction later
        → reparse merges proposals under Correction dominance
```

```
Transcript (Granola) → subjective Commentary draft → human edit/publish
MIS facts → objective Commentary draft → human edit/publish
```

```
MetricFact + ValuationMark → deterministic NAV / dashboard / compare / reports
Book + Chunks (FTS) → Ask (cite or refuse)
```

---

## 5. Explicit non-entities (do not invent)

- Do not invent Affinity / Graph / Granola / ILPA field names — stub interfaces + fixtures; mark `TODO(source-of-truth)`.
- Do not create a “global portfolio” table without `org_id`.
- Do not store objective KPIs inside commentary JSON as a bypass of `MetricFact`.

---

## 6. Fixture policy

Test data must be labeled `FIXTURE_ONLY` (org slug or flag). Never promote illustrative demo NAVs as default seed for real orgs.
