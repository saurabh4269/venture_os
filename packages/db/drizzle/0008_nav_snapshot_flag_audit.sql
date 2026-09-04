-- Official NAV pack snapshot metadata + firm flag-policy audit trail.

ALTER TABLE "nav_period_locks" ADD COLUMN IF NOT EXISTS snapshot_key text;
ALTER TABLE "nav_period_locks" ADD COLUMN IF NOT EXISTS snapshot_sha256 text;
ALTER TABLE "nav_period_locks" ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

CREATE TABLE IF NOT EXISTS "flag_policy_audits" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  changed_by text NOT NULL REFERENCES "user"(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  "before" jsonb NOT NULL,
  "after" jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS flag_policy_audits_org_idx ON "flag_policy_audits" (org_id, changed_at DESC);

ALTER TABLE "flag_policy_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flag_policy_audits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flag_policy_audits_org_isolation ON "flag_policy_audits";
CREATE POLICY flag_policy_audits_org_isolation ON "flag_policy_audits"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "flag_policy_audits" TO venture_os_app;
