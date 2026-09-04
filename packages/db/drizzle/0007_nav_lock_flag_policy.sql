-- NAV period lock + firm flag-policy jsonb + report artifacts.

ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS flag_policy jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS artifact_status text NOT NULL DEFAULT 'inline';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS artifact_error text;

CREATE TABLE IF NOT EXISTS "nav_period_locks" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  as_of date NOT NULL,
  status text NOT NULL DEFAULT 'unofficial',
  locked_by text REFERENCES "user"(id),
  locked_at timestamptz,
  unlock_reason text,
  unlocked_by text REFERENCES "user"(id),
  unlocked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS nav_period_locks_org_asof_uidx ON "nav_period_locks" (org_id, as_of);

ALTER TABLE "nav_period_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nav_period_locks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nav_period_locks_org_isolation ON "nav_period_locks";
CREATE POLICY nav_period_locks_org_isolation ON "nav_period_locks"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "nav_period_locks" TO venture_os_app;
