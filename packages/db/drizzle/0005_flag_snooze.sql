ALTER TABLE flag_events ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;
ALTER TABLE flag_events ADD COLUMN IF NOT EXISTS note text;
