-- Channel trend score (0-100), computed by the scan worker: how much a channel
-- is outperforming its own normal, so small/medium channels that take off rank
-- above big channels that are just doing their usual numbers.

ALTER TABLE channels ADD COLUMN IF NOT EXISTS trend_score REAL;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS recent_ratio REAL; -- avg views of last 14 days' videos vs channel normal
CREATE INDEX IF NOT EXISTS idx_channels_trend ON channels (trend_score DESC NULLS LAST);
