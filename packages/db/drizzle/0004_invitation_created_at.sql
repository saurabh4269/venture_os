-- Better Auth 1.7 organization invitations require created_at on the Drizzle schema.
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
