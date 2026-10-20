-- Title and thumbnail history per video, to surface A/B tests and post-publish
-- changes. Titles come from each Data API refresh; thumbnails from the ETag of
-- i.ytimg.com, which is the Unix time the current thumbnail was set.

BEGIN;

CREATE TABLE IF NOT EXISTS video_variants (
  youtube_video_id VARCHAR(32) NOT NULL,
  kind VARCHAR(16) NOT NULL,                 -- 'title' or 'thumbnail'
  value TEXT NOT NULL,                       -- title text, or thumbnail ETag
  set_at TIMESTAMPTZ,                        -- thumbnails: when YouTube says it was set
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (youtube_video_id, kind, value)
);
CREATE INDEX IF NOT EXISTS idx_video_variants_seen ON video_variants (kind, first_seen_at DESC);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumb_checked_at TIMESTAMPTZ;

COMMIT;
