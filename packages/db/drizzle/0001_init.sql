-- Venture OS initial schema + RLS. Applied by packages/db/src/migrate.ts

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  active_organization_id text
);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "organization" (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata text
);

CREATE TABLE IF NOT EXISTS "member" (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "invitation" (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text,
  status text NOT NULL,
  expires_at timestamptz NOT NULL,
  inviter_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "team" (
  id text PRIMARY KEY,
  name text NOT NULL,
  organization_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS "team_member" (
  id text PRIMARY KEY,
  team_id text NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS "org_settings" (
  org_id text PRIMARY KEY REFERENCES "organization"(id) ON DELETE CASCADE,
  fy_start_month integer NOT NULL DEFAULT 4,
  base_currency text NOT NULL DEFAULT 'INR',
  display_currency text NOT NULL DEFAULT 'EUR'
);

CREATE TABLE IF NOT EXISTS "funds" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  name text NOT NULL,
  vintage integer,
  currency text NOT NULL DEFAULT 'INR',
  committed_capital double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funds_org_idx ON funds (org_id);

CREATE TABLE IF NOT EXISTS "companies" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  sector text,
  stage text,
  country text,
  fy_start_month integer,
  website text,
  unit_hint text,
  currency_hint text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companies_org_idx ON companies (org_id);

CREATE TABLE IF NOT EXISTS "positions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  instrument text NOT NULL DEFAULT 'equity',
  cost_basis double precision,
  cost_currency text NOT NULL DEFAULT 'INR',
  ownership_pct double precision,
  shares double precision,
  invested_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS positions_org_idx ON positions (org_id);

CREATE TABLE IF NOT EXISTS "documents" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'other',
  filename text NOT NULL,
  storage_key text NOT NULL,
  mime text NOT NULL,
  sha256 text,
  period_start date,
  period_end date,
  uploaded_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_org_idx ON documents (org_id);
CREATE INDEX IF NOT EXISTS documents_company_idx ON documents (company_id);

CREATE TABLE IF NOT EXISTS "parse_jobs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  error text,
  started_at timestamptz,
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS "source_refs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_refs_org_idx ON source_refs (org_id);

CREATE TABLE IF NOT EXISTS "inbox_items" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  source_ref_id uuid REFERENCES source_refs(id),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  proposed jsonb NOT NULL,
  confidence double precision NOT NULL DEFAULT 0,
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_by text NOT NULL DEFAULT 'system',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inbox_org_status_idx ON inbox_items (org_id, status);

CREATE TABLE IF NOT EXISTS "metric_values" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  grain text NOT NULL,
  value_numeric double precision,
  unit text NOT NULL,
  currency text NOT NULL,
  value_inr_crore double precision,
  value_eur double precision,
  fx_rate double precision,
  fx_date date,
  fx_source text,
  source_ref_id uuid NOT NULL REFERENCES source_refs(id),
  restatement_of_id uuid,
  version integer NOT NULL DEFAULT 1,
  lane text NOT NULL DEFAULT 'objective',
  confirmed_by text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  inbox_item_id uuid
);
CREATE INDEX IF NOT EXISTS metric_values_org_company_idx ON metric_values (org_id, company_id, metric_key);
CREATE UNIQUE INDEX IF NOT EXISTS metric_values_version_uidx ON metric_values (org_id, company_id, metric_key, period_start, period_end, version);

CREATE TABLE IF NOT EXISTS "corrections" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  patched_value double precision,
  patched_unit text,
  patched_currency text,
  reason text NOT NULL,
  actor_user_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "commentary" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  lane text NOT NULL,
  body text NOT NULL,
  source_ref_id uuid REFERENCES source_refs(id),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marks" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  as_of date NOT NULL,
  method text NOT NULL,
  value double precision,
  currency text NOT NULL DEFAULT 'INR',
  fx_rate double precision,
  fx_date date,
  fx_source text,
  rationale text,
  source_ref_id uuid REFERENCES source_refs(id),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "flag_events" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  severity text NOT NULL,
  evidence jsonb NOT NULL,
  source_ref_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flag_events_org_idx ON flag_events (org_id, status);

CREATE TABLE IF NOT EXISTS "reports" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ask_queries" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  refused boolean NOT NULL,
  citations jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "fx_rates" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text REFERENCES "organization"(id) ON DELETE CASCADE,
  pair text NOT NULL,
  rate double precision NOT NULL,
  as_of date NOT NULL,
  source text NOT NULL
);

CREATE TABLE IF NOT EXISTS "connectors" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_ref_id uuid REFERENCES source_refs(id),
  body text NOT NULL,
  tsv tsvector
);
CREATE INDEX IF NOT EXISTS document_chunks_org_idx ON document_chunks (org_id);
CREATE INDEX IF NOT EXISTS document_chunks_tsv_idx ON document_chunks USING gin (tsv);

-- RLS on every tenant table
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'funds','companies','positions','documents','parse_jobs','source_refs','inbox_items',
    'metric_values','corrections','commentary','marks','flag_events','reports','ask_queries',
    'fx_rates','connectors','document_chunks','org_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_org_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (org_id = current_setting(''app.current_org_id'', true)) WITH CHECK (org_id = current_setting(''app.current_org_id'', true))',
      t || '_org_isolation', t
    );
  END LOOP;
END $$;
