-- Relevance scoring for the scan worker: richer video/channel metadata (free
-- with the same API calls), a 0-100 relevance score that filters out noise from
-- tiny channels, and a marker so Discord reports only surface new finds.

BEGIN;

ALTER TABLE videos ADD COLUMN IF NOT EXISTS category_id SMALLINT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE videos ADD COLUMN IF NOT EXISTS language VARCHAR(16);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS relevance_score REAL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS discord_reported_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_videos_relevance ON videos (relevance_score DESC NULLS LAST);

ALTER TABLE channels ADD COLUMN IF NOT EXISTS country VARCHAR(8);

COMMIT;
