-- Background scan pipeline (scripts/scan-worker.mjs):
-- per-run reports, view-count history for velocity, a shared YouTube API quota
-- ledger, and freshness timestamps used to schedule refreshes by priority.

BEGIN;

CREATE TABLE IF NOT EXISTS scan_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(16) NOT NULL DEFAULT 'running',
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT
);

-- View-count history. Purged after 30 days (YouTube API data retention policy).
CREATE TABLE IF NOT EXISTS video_stat_snapshots (
  youtube_video_id VARCHAR(32) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count BIGINT NOT NULL,
  like_count INTEGER,
  comment_count INTEGER,
  PRIMARY KEY (youtube_video_id, captured_at)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON video_stat_snapshots (captured_at);

-- YouTube Data API units consumed per quota day (quota resets at midnight Pacific).
CREATE TABLE IF NOT EXISTS api_quota_usage (
  day DATE PRIMARY KEY,
  units INTEGER NOT NULL DEFAULT 0,
  calls JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_rss_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_stats_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rss_error_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_channels_last_rss ON channels (last_rss_at NULLS FIRST);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS last_stats_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS views_per_hour REAL;
CREATE INDEX IF NOT EXISTS idx_videos_channel_pub ON videos (channel_id, published_at DESC);

COMMIT;
