# Data model and hard invariants

Postgres + Drizzle. Every tenant table has `org_id uuid not null` and RLS:

```sql
USING (org_id = current_setting('app.current_org_id', true)::uuid)
```

Better Auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) follow the Better Auth Drizzle adapter. App `organization.id` **is** `org_id`.

---

## 1. Entities

```
organization
  ├── member / invitation / user
  ├── org_settings          fy_start_month, base_currency, display_currency
  ├── fund
  │     └── position ── mark
  ├── company
  │     ├── document ── parse_job
  │     │                 └── source_ref
  │     ├── inbox_item
  │     ├── metric_value          ← the book
  │     ├── correction
  │     ├── commentary            objective | subjective
  │     └── flag_event
  ├── report
  ├── ask_query
  ├── fx_rate
  └── connector                 always honest status
```

### Company

Identity + profile only. No cached “headline JSON” that can drift from the book. Headlines are queried from `metric_value` + `mark`.

### Document (vault)

`kind`: `mis` | `board_pack` | `transcript` | `mark_memo` | `other`  
`storage_key`, `sha256`, `mime`, optional `period_start` / `period_end`.

### Inbox item

Proposed fact. `status`: `pending` | `confirmed` | `edited` | `rejected`  
`kind`: `metric` | `unit_ambiguity` | `commentary` | `entity`  
`proposed` JSON + `confidence` + `locator` + `source_ref_id`.  
Confirm writes `metric_value` (or commentary) and never the other way around.

### Metric value (book)

```
metric_key, period_start, period_end, grain
value_numeric          -- nullable; null means missing
unit, currency
value_inr_crore, value_eur, fx_rate, fx_date, fx_source
source_ref_id          -- required to display as fact
restatement_of_id, version
confirmed_by, confirmed_at
lane                   -- objective | subjective; objective only for MIS-class
```

### Correction

```
company_id, metric_key, period_start, period_end
patched_value, patched_unit, patched_currency
reason, actor_user_id
active                 -- re-parse must reapply active rows
```

### Commentary

`lane` is `objective` | `subjective`. Separate rows. UI never concatenates them into one field.

### Position / mark

Position: cost, currency, ownership_pct, instrument, invested_at.  
Mark: as_of, method, value, currency, FX triple, rationale, source_ref_id.

### Flag event

`flag_key` ∈ catalog, `severity`, `evidence jsonb`, `source_ref_ids`, `status` open/ack/cleared.

### Connector

`kind` ∈ `onedrive` | `affinity` | `granola`  
`status` ∈ `not_connected` | `connected` | `error`  
v1 rows exist as `not_connected`. No fake `last_synced_at`.

---

## 2. Hard invariants

1. **Missing ≠ 0.** `value_numeric` null stays null through SQL aggregates (`sum` of empty is shown as — if any constituent is missing and the total claims completeness). Application math uses `packages/core` helpers that propagate null.
2. **No `source_ref_id` → not a fact.** API serializers drop or mark `unfact`.
3. **LLM never writes `metric_value`.** Only inbox confirm/edit paths do.
4. **Headlines in code.** `packages/core` for runway, MOIC, TVPI, DPI, XIRR, NAV rollup.
5. **Dual currency** requires `fx_rate`, `fx_date`, `fx_source` or the converted field is null.
6. **Ambiguous units** cannot become `metric_value` without a human unit decision.
7. **FY** is Apr–Mar unless `company.fy_start_month` or org settings override.
8. **Restatements** insert a new `metric_value` version; they do not `UPDATE` the old amount.
9. **Corrections survive re-parse.** Parse job loads active corrections and applies before upserting proposals.
10. **Flags** only from `FLAG_CATALOG`. Evidence required.
11. **Ask citations resolve** or the answer is a refusal.
12. **Connectors** do not report success without credentials.
13. **Fixtures** never seed unless `SEED_DEMO=1` / `pnpm seed:demo`.
14. **RLS** denies rows when `app.current_org_id` is unset or mismatched.

---

## 3. Metric catalog

Canonical keys live in `packages/schema` / `packages/core/src/catalog.ts`. Do not invent keys per demo company. Unknown extracted labels stay as proposals with `metric_key` null until mapped.

---

## 4. Periods

`grain`: `month` | `quarter` | `fy`  
Helpers in `packages/core/src/fiscal.ts` map a date + `fy_start_month` → period bounds.
