-- channel_alerts used a random id as its only uniqueness, so every radar sync
-- re-inserted the same breakout alerts. Collapse duplicates, then enforce one
-- alert per (video_id, alert_type) and index the "latest alerts" query.

BEGIN;

-- Keep the oldest alert per video/type, but preserve "read" if any copy was read.
UPDATE channel_alerts a
SET is_read = true
FROM (
  SELECT video_id, alert_type
  FROM channel_alerts
  GROUP BY video_id, alert_type
  HAVING bool_or(is_read)
) r
WHERE a.video_id = r.video_id AND a.alert_type = r.alert_type;

DELETE FROM channel_alerts a
USING channel_alerts b
WHERE a.video_id = b.video_id
  AND a.alert_type = b.alert_type
  AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_alerts_video_type
  ON channel_alerts (video_id, alert_type);

CREATE INDEX IF NOT EXISTS idx_channel_alerts_created
  ON channel_alerts (created_at DESC);

-- Redundant with the UNIQUE constraints on the same columns.
DROP INDEX IF EXISTS idx_channels_yt_id;
DROP INDEX IF EXISTS idx_users_email;

COMMIT;
