-- Create sessions table for PostgreSQL session storage
-- Required by connect-pg-simple package

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

-- Create index on expire column for efficient cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Optional: Add a function to clean up expired sessions automatically
-- This can be run as a periodic cron job
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expire < NOW();
END;
$$ LANGUAGE plpgsql;
