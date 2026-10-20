-- Automatic channel discovery (trending charts, niche searches, featured channels).

BEGIN;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS discovered_via VARCHAR(16);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS featured_checked_at TIMESTAMPTZ;

-- Niche search queries, rotated least-recently-run first.
CREATE TABLE IF NOT EXISTS discovery_queries (
  query TEXT PRIMARY KEY,
  source VARCHAR(16) NOT NULL,              -- 'seed' (config) or 'auto' (trending terms)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  runs INTEGER NOT NULL DEFAULT 0,
  videos_found INTEGER NOT NULL DEFAULT 0,
  new_channels INTEGER NOT NULL DEFAULT 0
);

-- Channels that failed the quality filter, so they aren't re-checked every run.
CREATE TABLE IF NOT EXISTS discovery_rejected (
  youtube_channel_id VARCHAR(64) PRIMARY KEY,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason VARCHAR(64)
);

COMMIT;
