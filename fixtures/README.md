# Fixtures

All files under this tree are **`FIXTURE_ONLY`**. They must never be treated as a live book.

| Path | Role |
| --- | --- |
| `FIXTURE_ONLY-sample-mis.csv` | Tiny single-company smoke MIS |
| `connectors/` | Mock Affinity JSON for connector tests |
| `mis/FIXTURE_ONLY/` | Full V3-named portfolio MIS packs (varied formats) for extract / Confirm testing |

Regenerate MIS packs:

```bash
pnpm --filter @venture-os/db exec node ../../scripts/generate-fixture-mis.mjs
```

See `mis/FIXTURE_ONLY/README.md` and `MANIFEST.json`.
