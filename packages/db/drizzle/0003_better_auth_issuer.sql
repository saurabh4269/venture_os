ALTER TABLE "account" ADD COLUMN IF NOT EXISTS issuer text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS updated_at timestamptz;
