-- Channel Finder data: creation date (growth speed), outlier rate (consistency
-- of hits) and an opportunity score (is this niche worth entering?).

BEGIN;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_created_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS outlier_rate REAL;        -- share of matured videos >= 3x the channel normal
ALTER TABLE channels ADD COLUMN IF NOT EXISTS opportunity_score REAL;   -- 0-100
CREATE INDEX IF NOT EXISTS idx_channels_opportunity ON channels (opportunity_score DESC NULLS LAST);

COMMIT;
