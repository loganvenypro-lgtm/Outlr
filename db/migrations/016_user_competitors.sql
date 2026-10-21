-- The competitors the creator picked during onboarding: the home shows these first.
-- tracked_channels is shared by every user, so it can't say whose competitor a channel is.
ALTER TABLE users ADD COLUMN IF NOT EXISTS competitor_channel_ids TEXT[] NOT NULL DEFAULT '{}';
