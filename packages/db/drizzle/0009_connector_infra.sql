-- Wave A connector infrastructure: sealed creds, honest sync timestamps, company mappings.

ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS sealed_credentials text;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE "connectors" ADD COLUMN IF NOT EXISTS last_health_at timestamptz;

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS onedrive_folder_id text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS onedrive_folder_path text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS affinity_company_id text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS granola_link text;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upload';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS external_id text;

CREATE TABLE IF NOT EXISTS "connector_cursors" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  company_id uuid REFERENCES "companies"(id) ON DELETE CASCADE,
  cursor text,
  last_success_at timestamptz
);

CREATE INDEX IF NOT EXISTS connector_cursors_org_idx ON "connector_cursors" (org_id, kind);

ALTER TABLE "connector_cursors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connector_cursors" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS connector_cursors_org_isolation ON "connector_cursors";
CREATE POLICY connector_cursors_org_isolation ON "connector_cursors"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "connector_cursors" TO venture_os_app;
