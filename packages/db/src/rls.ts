/** Tenant tables that must have RLS + FORCE + org_id policy. */
export const RLS_TABLES = [
  "funds",
  "companies",
  "positions",
  "documents",
  "parse_jobs",
  "source_refs",
  "inbox_items",
  "metric_values",
  "corrections",
  "commentary",
  "marks",
  "flag_events",
  "reports",
  "ask_queries",
  "fx_rates",
  "connectors",
  "document_chunks",
  "org_settings",
  "nav_period_locks",
  "flag_policy_audits",
] as const;

export function rlsSql(): string {
  return RLS_TABLES.map(
    (table) => `
ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ${table}_org_isolation ON "${table}";
CREATE POLICY ${table}_org_isolation ON "${table}"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));
`,
  ).join("\n");
}
