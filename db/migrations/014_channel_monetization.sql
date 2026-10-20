-- Monetization Tracker: ad status read from the public watch page of a channel's latest
-- long-form video (yt_ad flag), checked by the scan worker on a rotation.
ALTER TABLE channels ADD COLUMN IF NOT EXISTS monetized BOOLEAN;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS monetization_checked_at TIMESTAMPTZ;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS monetization_changed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_channels_monetization_checked ON channels (monetization_checked_at NULLS FIRST);

-- One row per status flip. The change happened somewhere between previous_checked_at and detected_at.
CREATE TABLE IF NOT EXISTS channel_monetization_events (
  id BIGSERIAL PRIMARY KEY,
  channel_id VARCHAR(64) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  monetized BOOLEAN NOT NULL,
  previous_checked_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  video_id VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_monetization_events_detected ON channel_monetization_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_monetization_events_channel ON channel_monetization_events (channel_id, detected_at DESC);
