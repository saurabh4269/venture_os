-- Gap close: company revenue definition / last round; ownership prior; auto-confirm; monthly pack; ops events.

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS revenue_definition text NOT NULL DEFAULT 'unspecified';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS last_round_label text;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS last_round_at date;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS post_money double precision;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS post_money_currency text;

ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS prior_ownership_pct double precision;

ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS auto_confirm_min_confidence double precision;
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS monthly_pack_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS monthly_pack_day integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "ops_events" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  value double precision,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_events_org_idx ON "ops_events" (org_id, event_key, created_at DESC);

ALTER TABLE "ops_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ops_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_events_org_isolation ON "ops_events";
CREATE POLICY ops_events_org_isolation ON "ops_events"
  USING (org_id = current_setting('app.current_org_id', true))
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "ops_events" TO venture_os_app;
