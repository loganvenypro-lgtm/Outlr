-- Daily channel stats history, used by Channel Trends for "+views 24h" and
-- "+subscribers 24h". Purged after 30 days (YouTube API data retention policy).

CREATE TABLE IF NOT EXISTS channel_stat_snapshots (
  youtube_channel_id VARCHAR(64) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscriber_count INTEGER,
  total_views BIGINT NOT NULL,
  video_count INTEGER,
  PRIMARY KEY (youtube_channel_id, captured_at)
);
CREATE INDEX IF NOT EXISTS idx_channel_snapshots_captured ON channel_stat_snapshots (captured_at);
