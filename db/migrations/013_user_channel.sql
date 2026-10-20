-- The creator's own channel, chosen during onboarding: drives the personalised home.
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_channel_id VARCHAR(64);
