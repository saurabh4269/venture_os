-- Firm formula book overrides (labels / aliases / default units). Catalog keys only.
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS metric_book jsonb NOT NULL DEFAULT '{}'::jsonb;
