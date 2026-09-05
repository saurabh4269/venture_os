-- P0: separate ciphertext/nonce/key_version from metadata; credential audit (no secret material).

ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS secret_ciphertext text;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS secret_nonce text;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS secret_key_version integer;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS secret_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS "connector_audits" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  kind text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connector_audits_org_idx ON "connector_audits" (org_id, created_at DESC);

ALTER TABLE "connector_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_audits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS connector_audits_org_isolation ON "connector_audits";
CREATE POLICY connector_audits_org_isolation ON "connector_audits"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "connector_audits" TO venture_os_app;
